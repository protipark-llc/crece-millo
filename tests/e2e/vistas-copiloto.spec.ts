import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test.describe("Vistas y Co-Piloto", () => {
  test("la vista Esencial oculta secciones y una sección se puede volver a activar", async ({ page }) => {
    await register(page);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toBeVisible();

    await page.goto("/configuracion");
    await page.getByRole("radio", { name: /Esencial/ }).click();
    await page.getByRole("button", { name: "Guardar vista" }).click();
    await expect(page.getByText(/Vista guardada/)).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/universidad\/finanzas$/);
    await expect(nav.getByRole("link", { name: "Flujo de caja" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Co-Piloto de Negocio" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toHaveCount(0);

    // Personalizada: partir de Esencial y sumar Diagnóstico.
    await page.goto("/configuracion");
    await page.getByRole("checkbox", { name: /Diagnóstico/ }).check();
    await expect(page.getByRole("radio", { name: /Personalizada/ })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Guardar vista" }).click();
    await expect(page.getByText(/Vista guardada/)).toBeVisible();
    await page.reload();
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Simulador" })).toHaveCount(0);
  });

  test("Co-Piloto: encabezado, siguiente paso, pestañas y guardado en la cuenta", async ({ page }) => {
    await register(page);
    // La dirección del Co-Piloto anterior lleva al nuevo.
    await page.goto("/comunidad/emprendedores/co-piloto");
    await expect(page).toHaveURL(/\/comunidad\/emprendedores\/copiloto\/ruta$/);
    await expect(page.getByRole("heading", { name: "Co-Piloto de Negocio" })).toBeVisible();

    // Cuenta nueva: 6 productos del original; «Tu siguiente paso» pide el costo real del activo.
    const select = page.getByLabel("Producto activo");
    await expect(select.locator("option")).toHaveCount(6);
    const coach = page.getByRole("region", { name: "Tu siguiente paso" });
    await expect(coach).toContainText("Masajeador de ojos térmico:");
    await expect(coach).toContainText("los costos son estimados");
    await expect(coach.getByRole("link", { name: "Ir a la ficha" })).toHaveAttribute("href", /\/copiloto\/productos\?vista=ficha$/);

    // Riesgo con teclado y producto activo; se guarda en la cuenta.
    const risk = page.getByRole("slider", { name: "Riesgo" });
    await risk.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("7 · Normal")).toBeVisible();
    await select.selectOption({ label: "Lámpara proyector" });
    await expect(coach).toContainText("Lámpara proyector:");
    await page.getByRole("button", { name: "USD" }).click();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    // Pestañas: Productos muestra la vista previa con el activo resaltado y precios en USD.
    await page.getByRole("link", { name: "Productos", exact: true }).click();
    await expect(page).toHaveURL(/\/copiloto\/productos$/);
    await expect(page.getByRole("button", { name: "Lámpara proyector" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/US\$\u00a0\d+/).first()).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Producto activo")).toHaveValue("lampara");
    await expect(page.getByText("7 · Normal")).toBeVisible();
    await expect(page.getByRole("button", { name: "USD" })).toHaveAttribute("aria-pressed", "true");
  });
});
