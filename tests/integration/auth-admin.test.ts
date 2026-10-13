import "./helpers";
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { authenticate, changePassword, ensureBootstrapUser } from "@/server/services/users";
import { passwordRule } from "@/server/validation";

afterAll(async () => {
  await closeDb();
});

describe("cuenta inicial (bootstrap)", () => {
  it("se crea una sola vez y no reescribe la contraseña en despliegues posteriores", async () => {
    const email = `ceo-${randomUUID()}@ejemplo.test`;
    const first = await ensureBootstrapUser({ email, name: "CEO", password: "temporal1" });
    expect(first.created).toBe(true);
    await expect(authenticate(email, "temporal1")).resolves.toMatchObject({ email });
    const second = await ensureBootstrapUser({ email: email.toUpperCase(), name: "Otro", password: "distinta99" });
    expect(second).toEqual({ created: false, id: first.id });
    await expect(authenticate(email, "distinta99")).rejects.toThrow(/incorrectos/);
    await expect(ensureBootstrapUser({ email: "sin-arroba", name: "x", password: "temporal1" })).rejects.toThrow();
  });
});

describe("cambio de contraseña", () => {
  it("verifica la actual, cambia el hash y cierra las sesiones existentes", async () => {
    const email = `cambio-${randomUUID()}@ejemplo.test`;
    const { id } = await ensureBootstrapUser({ email, name: "Persona", password: "clave-x12" });
    await getDb().insert(sessions).values({ id: `s-${randomUUID()}`, userId: id, expiresAt: new Date(Date.now() + 86_400_000) });
    await expect(changePassword(id, "equivocada", "Nueva-clave-2026")).rejects.toThrow(/actual no es correcta/);
    await expect(changePassword(id, "clave-x12", "clave-x12")).rejects.toThrow(/distinta/);
    await changePassword(id, "clave-x12", "Nueva-clave-2026");
    await expect(authenticate(email, "clave-x12")).rejects.toThrow();
    await expect(authenticate(email, "Nueva-clave-2026")).resolves.toMatchObject({ id });
    expect(await getDb().select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0);
  });

  it("la nueva contraseña cumple la regla del registro", () => {
    expect(passwordRule.safeParse("clave-x12").success).toBe(false);
    expect(passwordRule.safeParse("Nueva-clave-2026").success).toBe(true);
  });
});
