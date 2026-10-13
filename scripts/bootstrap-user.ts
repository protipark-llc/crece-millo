/**
 * Crea la cuenta inicial (p. ej. la del administrador del proyecto) si no existe.
 *
 * Variables:
 *   BOOTSTRAP_USER_EMAIL     correo de la cuenta
 *   BOOTSTRAP_USER_PASSWORD  contraseña TEMPORAL (cámbiala en Configuración tras ingresar)
 *   BOOTSTRAP_USER_NAME      nombre visible (opcional)
 *   BOOTSTRAP_USER_COUNTRY   país, por defecto CO (opcional)
 *
 * Sin BOOTSTRAP_USER_EMAIL no hace nada. Si la cuenta ya existe, no la modifica. En Vercel, si falta
 * la contraseña avisa y sigue (no bloquea el despliegue).
 * En Vercel solo actúa en el entorno Production (las vistas previas no tocan la base).
 * Usa MIGRATION_DATABASE_URL si existe (conexión de sesión), si no DATABASE_URL.
 * La contraseña nunca se imprime.
 */
if (process.env.MIGRATION_DATABASE_URL) process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;

async function main() {
  const email = process.env.BOOTSTRAP_USER_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_USER_PASSWORD ?? "";
  if (!email) {
    console.log("Cuenta inicial: omitida (BOOTSTRAP_USER_EMAIL no está definida).");
    return;
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log(`Cuenta inicial: omitida en el entorno de Vercel "${process.env.VERCEL_ENV}".`);
    return;
  }
  if (!password) {
    const msg = "Define BOOTSTRAP_USER_PASSWORD para crear la cuenta inicial.";
    if (!process.env.VERCEL) throw new Error(msg);
    // En Vercel no se bloquea el despliegue: el sitio se publica y la cuenta se crea en el siguiente.
    console.warn(`\n>>> Cuenta inicial: omitida. ${msg} Agrégala para Production y vuelve a desplegar.\n`);
    return;
  }
  const { ensureBootstrapUser } = await import("../src/server/services/users");
  const { closeDb } = await import("../src/lib/db/client");
  const { connectionHint, poolConfig } = await import("../src/lib/db/ssl");
  try {
    const r = await ensureBootstrapUser({
      email,
      password,
      name: process.env.BOOTSTRAP_USER_NAME?.trim() || email.split("@")[0]!,
      country: process.env.BOOTSTRAP_USER_COUNTRY?.trim() || "CO",
    });
    console.log(r.created ? `Cuenta inicial creada: ${email}` : `Cuenta inicial ya existía: ${email} (sin cambios)`);
    if (r.created && password.length < 10) {
      console.warn("Aviso: la contraseña inicial es corta. Cámbiala en Configuración y elimina BOOTSTRAP_USER_PASSWORD de Vercel.");
    }
  } catch (err) {
    const url = process.env.DATABASE_URL;
    const hint = url ? connectionHint(err, poolConfig(url).summary, process.env.DATABASE_CA_CERT) : null;
    if (hint) console.error(`\n>>> ${hint}\n`);
    throw err;
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
