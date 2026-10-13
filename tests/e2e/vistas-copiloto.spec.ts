import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test.describe("Vistas y Co-Piloto", () => {
  test("la vista Esencial oculta secciones y una sección se puede volver a activar", async ({
    page,
  }) => {
    await register(page);
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toBeVisible();

    await page.goto("/configuracion");
    await page.getByRole("radio", { name: /Esencial/ }).click();
    await page.getByRole("button", { name: "Guardar vista" }).click();
    await expect(page.getByText(/Vista guardada/)).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/universidad\/finanzas$/);
    await expect(
      nav.getByRole("link", { name: "Flujo de caja" }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Co-Piloto de Negocio" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toHaveCount(0);

    // Personalizada: partir de Esencial y sumar Diagnóstico.
    await page.goto("/configuracion");
    await page.getByRole("checkbox", { name: /Diagnóstico/ }).check();
    await expect(
      page.getByRole("radio", { name: /Personalizada/ }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Guardar vista" }).click();
    await expect(page.getByText(/Vista guardada/)).toBeVisible();
    await page.reload();
    await expect(nav.getByRole("link", { name: "Diagnóstico" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Simulador" })).toHaveCount(0);
  });

  test("Co-Piloto: encabezado, siguiente paso, pestañas y guardado en la cuenta", async ({
    page,
  }) => {
    await register(page);
    // La dirección del Co-Piloto anterior lleva al nuevo.
    await page.goto("/comunidad/emprendedores/co-piloto");
    await expect(page).toHaveURL(/\/comunidad\/emprendedores\/copiloto\/ruta$/);
    await expect(
      page.getByRole("heading", { name: "Co-Piloto de Negocio" }),
    ).toBeVisible();

    // Cuenta nueva: 6 productos del original; «Tu siguiente paso» pide el costo real del activo.
    const select = page.getByLabel("Producto activo");
    await expect(select.locator("option")).toHaveCount(6);
    const coach = page.getByRole("region", { name: "Tu siguiente paso" });
    await expect(coach).toContainText("Masajeador de ojos térmico:");
    await expect(coach).toContainText("los costos son estimados");
    await expect(
      coach.getByRole("link", { name: "Ir a la ficha" }),
    ).toHaveAttribute("href", /\/copiloto\/productos\?vista=ficha$/);

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
    await expect(
      page.getByRole("button", { name: "Lámpara proyector" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/US\$\u00a0\d+/).first()).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Producto activo")).toHaveValue("lampara");
    await expect(page.getByText("7 · Normal")).toBeVisible();
    await expect(page.getByRole("button", { name: "USD" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  test("Co-Piloto · Productos: ficha, evaluación, resultado de venta y análisis", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/productos");
    await expect(
      page.getByRole("heading", { name: "Base de datos de productos" }),
    ).toBeVisible();
    const detalle = page.getByRole("region", {
      name: "Masajeador de ojos térmico",
    });
    const sub = detalle.getByRole("navigation", {
      name: "Secciones del producto",
    });
    await expect(sub.getByRole("link", { name: "1 · Ficha" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Ficha: el precio se guarda al escribir.
    const precio = detalle.getByLabel("Precio de venta", { exact: true });
    await precio.fill("150000");
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    // Evaluación: criterio 1–5 y la unidad económica.
    await sub.getByRole("link", { name: "2 · Evaluación inicial" }).click();
    await expect(page).toHaveURL(/vista=evaluacion/);
    await expect(
      detalle.getByText("Puntaje de evaluación inicial"),
    ).toBeVisible();
    await expect(
      detalle.getByRole("heading", { name: "Unidad económica" }),
    ).toBeVisible();
    const radio = detalle
      .getByRole("radiogroup")
      .first()
      .getByRole("radio", { name: /^5/ });
    await radio.click();
    await expect(radio).toHaveAttribute("aria-checked", "true");

    // Análisis sin datos.
    await sub.getByRole("link", { name: "4 · Análisis y estrategia" }).click();
    await expect(
      detalle.getByText("Aún no hay resultados de venta"),
    ).toBeVisible();

    // Resultados: registrar uno.
    await sub.getByRole("link", { name: "3 · Resultados de venta" }).click();
    const registrar = detalle.getByRole("button", {
      name: "Registrar resultado",
    });
    await expect(registrar).toBeDisabled();
    await detalle
      .getByRole("spinbutton", { name: "Gasto en ads" })
      .fill("120000");
    await detalle
      .getByRole("spinbutton", { name: "Impresiones" })
      .fill("20000");
    await detalle.getByRole("spinbutton", { name: "Clics" }).fill("300");
    await detalle
      .getByRole("spinbutton", { name: "Pedidos generados" })
      .fill("6");
    await registrar.click();
    await expect(
      page.getByRole("status").filter({ hasText: "Resultado registrado" }),
    ).toBeVisible();
    await expect(
      detalle.getByRole("table").last().locator("tbody tr"),
    ).toHaveCount(1);
    await expect(
      detalle.getByText("En test", { exact: true }).first(),
    ).toBeVisible();

    // Análisis con datos.
    await sub.getByRole("link", { name: "4 · Análisis y estrategia" }).click();
    await expect(
      detalle.getByRole("heading", { name: "Embudo" }),
    ).toBeVisible();
    await expect(detalle.getByText(/Estrategia sugerida ·/)).toBeVisible();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/vista=analisis/);
    await expect(
      page
        .getByRole("region", { name: "Masajeador de ojos térmico" })
        .getByRole("heading", { name: "Esperado vs. real" }),
    ).toBeVisible();
  });
});
