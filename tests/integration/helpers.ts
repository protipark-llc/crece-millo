import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
    }
  } catch {
    /* noop */
  }
}
loadEnv();
// Las pruebas siempre apuntan a la base de pruebas.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

import { randomUUID } from "node:crypto";
import { registerUser } from "@/server/services/users";

export async function newUser(label = "u") {
  return registerUser({
    name: `Prueba ${label}`,
    email: `${label}-${randomUUID()}@ejemplo.test`,
    password: "clave-segura-123",
  });
}

export const TODAY = "2026-10-12";
