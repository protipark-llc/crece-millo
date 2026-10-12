/**
 * Configuración TLS para PostgreSQL gestionado (Supabase).
 *
 * - DATABASE_CA_CERT: certificado(s) raíz en PEM. Se normaliza para tolerar cómo se pega en
 *   paneles web: saltos de línea convertidos en espacios, "\n" literales o comillas.
 * - DATABASE_SSL_NO_VERIFY=true: último recurso. Cifra la conexión sin verificar el
 *   certificado (vulnerable a suplantación en la red). Preferir siempre DATABASE_CA_CERT.
 *
 * node-postgres da prioridad a los parámetros de la URL sobre las opciones explícitas, así
 * que cuando la configuración TLS viene de estas variables se quitan los `ssl*` de la URL.
 */
import type { PoolConfig } from "pg";

const PEM_RE = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;

/** Reconstruye PEM válidos a partir de texto pegado; devuelve [] si no hay certificados. */
export function normalizePem(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const text = raw.replace(/\\n/g, "\n").replace(/^["']|["']$/g, "");
  const out: string[] = [];
  for (const m of text.matchAll(PEM_RE)) {
    const body = (m[1] ?? "").replace(/[^A-Za-z0-9+/=]/g, "");
    if (!body) continue;
    const lines = body.match(/.{1,64}/g) ?? [];
    out.push(["-----BEGIN CERTIFICATE-----", ...lines, "-----END CERTIFICATE-----"].join("\n"));
  }
  return out;
}

export interface SslSummary {
  mode: "url" | "verify-ca" | "no-verify";
  certificates: number;
  host: string;
  port: string;
  sslmodeInUrl: string | null;
}

export function poolConfig(url: string, env: Record<string, string | undefined> = process.env): { config: PoolConfig; summary: SslSummary } {
  const u = new URL(url);
  const summary: SslSummary = { mode: "url", certificates: 0, host: u.hostname, port: u.port || "5432", sslmodeInUrl: u.searchParams.get("sslmode") };
  const stripSsl = () => {
    for (const k of ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat", "ssl"]) u.searchParams.delete(k);
  };
  const certs = normalizePem(env.DATABASE_CA_CERT);
  if (certs.length) {
    stripSsl();
    summary.mode = "verify-ca";
    summary.certificates = certs.length;
    return { config: { connectionString: u.toString(), ssl: { ca: certs, rejectUnauthorized: true } }, summary };
  }
  if (env.DATABASE_SSL_NO_VERIFY === "true") {
    stripSsl();
    summary.mode = "no-verify";
    return { config: { connectionString: u.toString(), ssl: { rejectUnauthorized: false } }, summary };
  }
  return { config: { connectionString: url }, summary };
}

export function describeSsl(s: SslSummary): string {
  const how =
    s.mode === "verify-ca"
      ? `TLS verificado con ${s.certificates} certificado(s) de DATABASE_CA_CERT`
      : s.mode === "no-verify"
        ? "TLS SIN verificar (DATABASE_SSL_NO_VERIFY=true)"
        : `según la URL (sslmode=${s.sslmodeInUrl ?? "no definido"})`;
  return `Base de datos ${s.host}:${s.port} · ${how}`;
}

/** Mensaje de ayuda para errores típicos de conexión (sin exponer secretos). */
export function connectionHint(err: unknown, s: SslSummary, rawCa: string | undefined): string | null {
  const code = (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  if (code === "SELF_SIGNED_CERT_IN_CHAIN" || code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" || code === "DEPTH_ZERO_SELF_SIGNED_CERT") {
    if (s.mode === "verify-ca") {
      return "El certificado de DATABASE_CA_CERT no corresponde al servidor. Descarga de nuevo el certificado en Supabase (Project Settings → Database → SSL Configuration) y pega el contenido completo.";
    }
    if (rawCa && rawCa.trim()) {
      return "DATABASE_CA_CERT está definida pero no contiene un certificado PEM legible (debe incluir -----BEGIN CERTIFICATE----- y -----END CERTIFICATE-----).";
    }
    return "Falta DATABASE_CA_CERT en este entorno de Vercel (y la URL pide TLS verificado). Agrégala con el certificado de Supabase o quita ?sslmode=require de la URL.";
  }
  if (code === "28P01") return "Usuario o contraseña incorrectos: revisa que reemplazaste [YOUR-PASSWORD] y que el usuario del pooler incluye el sufijo .<project-ref>.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENETUNREACH" || code === "EHOSTUNREACH") {
    const kind = hostKind(s.host);
    if (kind === "placeholder") return "La URL todavía tiene un texto de ejemplo en lugar del host real: copia de nuevo la cadena de conexión de Supabase.";
    if (kind === "supabase-direct") {
      return "DATABASE_URL usa la conexión directa de Supabase (db.<ref>.supabase.co), que solo funciona por IPv6 y Vercel no la alcanza. Usa la del pooler: Supabase → Connect → Transaction pooler (host aws-…pooler.supabase.com, puerto 6543).";
    }
    if (kind === "supabase-pooler" && code === "ENOTFOUND") return "El host del pooler no existe: copia la URL exacta desde Supabase → Connect (la región del host debe coincidir con la del proyecto).";
    if (kind === "supabase-pooler") return "El pooler de Supabase no respondió: comprueba que el proyecto no esté pausado (Supabase lo pausa tras días sin uso) y que el puerto sea 6543 o 5432.";
    return "No se pudo alcanzar el servidor: revisa el host y el puerto (pooler de transacción 6543, de sesión 5432).";
  }
  return null;
}

export type HostKind = "supabase-pooler" | "supabase-direct" | "placeholder" | "local" | "other";

/** Clasifica el host sin exponerlo: suficiente para diagnosticar la configuración. */
export function hostKind(host: string): HostKind {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return "local";
  if (!h || /[<>]|your|xxx|ejemplo|example/.test(h)) return "placeholder";
  if (h.endsWith(".pooler.supabase.com")) return "supabase-pooler";
  if (h.endsWith(".supabase.co")) return "supabase-direct";
  return "other";
}
