import { expect, test } from "@playwright/test";
import { createAccount, register } from "./helpers";

test("en móvil: menú navegable y sin desplazamiento horizontal", async ({ page }) => {
  await register(page, "Persona Móvil");
  await createAccount(page, "Ahorros", "1.000.000");
  for (const path of ["/universidad", "/universidad/finanzas", "/universidad/finanzas/movimientos", "/universidad/finanzas/presupuesto", "/universidad/finanzas/flujo-de-caja", "/universidad/finanzas/simulador"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `desbordamiento en ${path}`).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await page.getByRole("dialog", { name: "Más secciones" }).getByRole("link", { name: "Deudas" }).click();
  await expect(page).toHaveURL(/\/deudas/);
  await expect(page.getByRole("heading", { name: "Deudas y obligaciones" })).toBeVisible();
});
