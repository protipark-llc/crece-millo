import { expect, type Page } from "@playwright/test";

export async function register(page: Page, name = "Persona Prueba") {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@ejemplo.test`;
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("clave-segura-123");
  await page.getByLabel(/Acepto el tratamiento/).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/universidad\/finanzas\/diagnostico/);
  return email;
}

export async function createAccount(page: Page, name: string, opening: string, type = "Cuenta de ahorros") {
  await page.goto("/universidad/finanzas/cuentas");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear cuenta" }) });
  await form.getByLabel("Nombre").fill(name);
  await form.getByLabel("Tipo").selectOption({ label: type });
  await form.getByLabel("Fecha de apertura del registro").fill("2026-01-01");
  await form.getByLabel("Saldo inicial", { exact: true }).fill(opening);
  await form.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Cuenta creada.")).toBeVisible();
}

export async function newMovement(page: Page, kind: "Gasto" | "Ingreso" | "Transferencia", data: { description: string; amount: string; date?: string; from?: string; to?: string; status?: string }) {
  await page.goto("/universidad/finanzas/movimientos/nuevo");
  await page.getByRole("radio", { name: kind }).click();
  await page.getByLabel("Descripción").fill(data.description);
  await page.getByLabel("Importe", { exact: true }).fill(data.amount);
  if (data.from) await page.getByLabel(/Desde la cuenta|Cuenta de destino|Pagado desde/).selectOption({ label: `${data.from} (COP)` });
  if (data.to) await page.getByLabel("Hacia la cuenta").selectOption({ label: `${data.to} (COP)` });
  if (data.status) await page.getByLabel("Estado").selectOption({ label: data.status });
  await page.getByLabel(/^Fecha/).first().fill(data.date ?? "2026-02-10");
  await page.getByRole("button", { name: new RegExp(`^Registrar ${kind.toLowerCase()}`) }).click();
  await expect(page.getByText(/registrad[oa]/)).toBeVisible();
}
