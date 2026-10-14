import { expect, test } from "@playwright/test";
import { createAccount, register } from "./helpers";

test("en móvil: menú navegable y sin desplazamiento horizontal", async ({
  page,
}) => {
  await register(page, "Persona Móvil");
  await createAccount(page, "Ahorros", "1.000.000");
  for (const path of [
    "/universidad",
    "/universidad/finanzas",
    "/universidad/finanzas/movimientos",
    "/universidad/finanzas/presupuesto",
    "/universidad/finanzas/flujo-de-caja",
    "/universidad/finanzas/simulador",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `desbordamiento en ${path}`).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Más secciones" })
    .getByRole("link", { name: "Deudas" })
    .click();
  await expect(page).toHaveURL(/\/deudas/);
  await expect(
    page.getByRole("heading", { name: "Deudas y obligaciones" }),
  ).toBeVisible();
});

test("en móvil: el Co-Piloto muestra el resultado primero y el formulario en una hoja inferior", async ({
  page,
}) => {
  await register(page, "Persona Móvil Co-Piloto");
  for (const path of [
    "ruta",
    "productos?vista=precio",
    "marketing?vista=creativos",
    "test",
    "capital",
    "crecer",
    "bitacora",
  ]) {
    await page.goto(`/comunidad/emprendedores/copiloto/${path}`);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.goto("/comunidad/emprendedores/copiloto/test");
  const verdict = page.getByRole("heading", { level: 2, name: "Faltan datos" });
  await expect(verdict).toBeVisible();
  const gasto = page.getByRole("spinbutton", { name: "Gasto en ads" });
  await expect(gasto).toBeHidden();
  const abrir = page.getByRole("button", { name: /Datos del test/ });
  await abrir.click();
  await expect(abrir).toHaveAttribute("aria-expanded", "true");
  await gasto.fill("650000");
  await page.getByRole("spinbutton", { name: "Pedidos generados" }).fill("18");
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(gasto).toBeHidden();
  await expect(abrir).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 2, name: /Escalar|Mantener|Optimizar/ }),
  ).toBeVisible();
});
