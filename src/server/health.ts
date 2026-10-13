import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { connectionHint, hostKind, poolConfig, type HostKind } from "@/lib/db/ssl";
import journal from "../../drizzle/meta/_journal.json";

export interface HealthReport {
  app: "ok";
  environment: string;
  database: "ok" | "error";
  tls: string | null;
  /** Tipo de host y puerto (sin el host real) y código del último error de conexión. */
  connection: { host: HostKind | null; port: string | null; errorCode: string | null; issues: string[] };
  migrations: { applied: number | null; expected: number };
  initialAccount: "exists" | "missing" | "not_configured" | "unknown";
  problem: string | null;
}

/**
 * Diagnóstico sin datos sensibles: no expone host, usuarios, correos ni mensajes internos.
 * Sirve para verificar un despliegue sin acceso a los registros del servidor.
 */
export async function healthReport(): Promise<HealthReport> {
  const expected = journal.entries.length;
  const url = process.env.DATABASE_URL;
  const report: HealthReport = {
    app: "ok",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    database: "error",
    tls: null,
    connection: { host: null, port: null, errorCode: null, issues: [] },
    migrations: { applied: null, expected },
    initialAccount: process.env.BOOTSTRAP_USER_EMAIL ? "unknown" : "not_configured",
    problem: null,
  };
  if (!url) {
    report.problem = "DATABASE_URL no está definida en este entorno.";
    return report;
  }
  let summary;
  try {
    summary = poolConfig(url).summary;
  } catch {
    report.problem = "DATABASE_URL no es una URL válida: copia de nuevo la cadena de conexión de Supabase (y reemplaza [YOUR-PASSWORD]).";
    return report;
  }
  report.connection.host = hostKind(summary.host);
  report.connection.port = summary.port;
  report.connection.issues = summary.credentialIssues;
  report.tls = summary.mode === "verify-ca" ? "verificado con certificado" : summary.mode === "no-verify" ? "cifrado sin verificar" : `según la URL (sslmode=${summary.sslmodeInUrl ?? "no definido"})`;
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    report.database = "ok";
    const hasTable = await db.execute(sql`select to_regclass('drizzle.__drizzle_migrations') is not null as ok`);
    if ((hasTable.rows[0] as { ok: boolean }).ok) {
      const r = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
      report.migrations.applied = (r.rows[0] as { n: number }).n;
    } else {
      report.migrations.applied = 0;
    }
    if (report.migrations.applied < expected) {
      report.problem = "Faltan migraciones: despliega en Production con MIGRATE_ON_BUILD=true (o ejecuta npm run db:migrate contra Supabase).";
    }
    const email = process.env.BOOTSTRAP_USER_EMAIL?.trim().toLowerCase();
    if (email && report.migrations.applied > 0) {
      const u = await db.execute(sql`select exists(select 1 from users where email = ${email}) as ok`);
      report.initialAccount = (u.rows[0] as { ok: boolean }).ok ? "exists" : "missing";
      if (report.initialAccount === "missing" && !report.problem) {
        report.problem = "La cuenta inicial no existe todavía: se crea en el build de Production (revisa el registro: «Cuenta inicial creada»).";
      }
    }
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    report.connection.errorCode = e?.code ?? e?.cause?.code ?? null;
    report.problem =
      connectionHint(err, summary, process.env.DATABASE_CA_CERT) ??
      `No se pudo consultar la base de datos (código ${(err as { code?: string })?.code ?? "desconocido"}).`;
  }
  return report;
}
