/**
 * Crea la cuenta inicial (p. ej. la del administrador del proyecto) si no existe.
 *
 * Variables:
 *   BOOTSTRAP_USER_EMAIL     correo de la cuenta
 *   BOOTSTRAP_USER_PASSWORD  contraseña TEMPORAL (cámbiala en Configuración tras ingresar)
 *   BOOTSTRAP_USER_NAME      nombre visible (opcional)
 *   BOOTSTRAP_USER_COUNTRY   país, por defecto CO (opcional)
 *
 * Sin BOOTSTRAP_USER_EMAIL no hace nada. Si la cuenta ya existe, no la modifica.
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
  if (!password) throw new Error("Define BOOTSTRAP_USER_PASSWORD para crear la cuenta inicial.");
  const { ensureBootstrapUser } = await import("../src/server/services/users");
  const { closeDb } = await import("../src/lib/db/client");
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
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
