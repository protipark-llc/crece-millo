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

  test("Co-Piloto: precio recomendado, test con veredicto y ruta", async ({ page }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/co-piloto/productos/nuevo");
    await page.getByLabel("Nombre").fill("Lámpara de prueba");
    await page.getByLabel("Costo del producto").fill("40.000");
    await page.getByLabel("Envío de ida").fill("15.000");
    // El cálculo se ve mientras se escribe, antes de guardar.
    await expect(page.getByText("Precio recomendado").first()).toBeVisible();
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page).toHaveURL(/\/co-piloto\/productos\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "Lámpara de prueba" })).toBeVisible();

    await page.getByLabel("Días").fill("4");
    await page.getByLabel("Gasto en anuncios").fill("400.000");
    await page.getByLabel("Ventas").fill("2");
    await page.getByRole("button", { name: "Registrar test" }).click();
    await expect(page.getByText("Test registrado.")).toBeVisible();
    await expect(page.getByText("Parar", { exact: true })).toBeVisible();

    await page.goto("/comunidad/emprendedores/ruta");
    await page.getByRole("button", { name: /Marcar hecho/ }).first().click();
    await expect(page.getByText(/1 de 23/).first()).toBeVisible();
  });
});
