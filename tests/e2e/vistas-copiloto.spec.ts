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

    // Precio y margen: aplicar el recomendado cambia el precio de la ficha.
    await sub.getByRole("link", { name: "5 · Precio y margen" }).click();
    await expect(
      detalle.getByText("¿Cuánto cobro? · Precio recomendado"),
    ).toBeVisible();
    await expect(
      detalle.getByRole("heading", { name: "Salud del precio" }),
    ).toBeVisible();
    await detalle
      .getByRole("button", { name: "Aplicar precio recomendado" })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /Precio de venta: \$\u00a0\d/ }),
    ).toBeVisible();
    await sub.getByRole("link", { name: "1 · Ficha" }).click();
    await expect(
      detalle.getByLabel("Precio de venta", { exact: true }),
    ).not.toHaveValue("150000");
    await sub.getByRole("link", { name: "4 · Análisis y estrategia" }).click();
    await expect(page).toHaveURL(/vista=analisis/);
    await expect(
      detalle.getByRole("heading", { name: "Embudo" }),
    ).toBeVisible();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/vista=analisis/);
    await expect(
      page
        .getByRole("region", { name: "Masajeador de ojos térmico" })
        .getByRole("heading", { name: "Esperado vs. real" }),
    ).toBeVisible();
  });
  test("Co-Piloto · Analizar test: veredicto en vivo, guardar y queda en el producto", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/test");
    const form = page.getByRole("form", { name: "Datos del test" });
    await expect(
      page.getByRole("heading", { level: 2, name: "Faltan datos" }),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Guardar test" }),
    ).toBeDisabled();
    await form.getByLabel("Nombre del test").fill("Ojos · Meta · semana 1");
    await form.getByRole("spinbutton", { name: "Gasto en ads" }).fill("650000");
    await form.getByRole("spinbutton", { name: "Impresiones" }).fill("90000");
    await form.getByRole("spinbutton", { name: "Clics" }).fill("1050");
    await form
      .getByRole("spinbutton", { name: "Pedidos generados" })
      .fill("18");
    await form
      .getByRole("spinbutton", { name: "Pedidos confirmados" })
      .fill("16");
    await form
      .getByRole("spinbutton", { name: "Pedidos entregados" })
      .fill("13");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Escalar|Mantener|Optimizar/,
      }),
    ).toBeVisible();
    await expect(page.getByText("18/10")).toBeVisible();
    await form.getByRole("button", { name: "Guardar test" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Test guardado en la bitácora y en el producto" }),
    ).toBeVisible();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    // El formulario se guarda en la cuenta y el test aparece en el historial del producto.
    await page.reload();
    await expect(
      page.getByRole("spinbutton", { name: "Gasto en ads" }),
    ).toHaveValue("650000");
    await page.goto(
      "/comunidad/emprendedores/copiloto/productos?vista=resultados",
    );
    await expect(
      page
        .getByRole("cell", { name: "Meta Ads" })
        .or(page.getByRole("cell", { name: "TikTok Ads" }))
        .first(),
    ).toBeVisible();
  });
  test("Co-Piloto · Marketing: ofertas, creativos con checklist guardado, página y lanzamiento", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/marketing");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Masajeador de ojos térmico",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lleva 2 con descuento" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Usar esta oferta en el producto" })
      .first()
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Oferta aplicada al producto" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Oferta activa en el producto: upsell de/),
    ).toBeVisible();

    await page.getByLabel("Nombre de tu tienda").fill("Calma Casa");
    const sub = page.getByRole("navigation", {
      name: "Secciones de marketing",
    });
    await sub.getByRole("link", { name: "2 · Creativos y anuncios" }).click();
    await expect(
      page.getByRole("heading", {
        name: "10 ganchos para los primeros 3 segundos",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Regalo perfecto" }).click();
    await expect(
      page.getByRole("button", { name: "Regalo perfecto" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("checkbox", { name: "Una sola idea por video" })
      .check();
    await expect(page.getByText("1/8 listos")).toBeVisible();

    await sub.getByRole("link", { name: "3 · Página y WhatsApp" }).click();
    await expect(
      page.getByText(/Te escribimos de Calma Casa para confirmar/),
    ).toBeVisible();
    await sub.getByRole("link", { name: "4 · Plan de lanzamiento" }).click();
    await expect(
      page.getByRole("heading", { name: "Paso a paso" }),
    ).toBeVisible();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();

    await page.goto(
      "/comunidad/emprendedores/copiloto/marketing?vista=creativos",
    );
    await expect(
      page.getByRole("checkbox", { name: "Una sola idea por video" }),
    ).toBeChecked();
    await expect(
      page.getByRole("button", { name: "Regalo perfecto" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
  test("Co-Piloto · Planificar capital y Crecer: cálculo en vivo, guardar y CSV", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/capital");
    await expect(
      page.getByText("ROAS objetivo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Usar mis tests reales" }),
    ).toBeDisabled();
    await page.getByLabel("Intervalos (1–12)").fill("6");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(6);
    await page.getByRole("button", { name: "Guardar plan" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Plan guardado" }),
    ).toBeVisible();

    await page.goto("/comunidad/emprendedores/copiloto/crecer");
    await expect(
      page.getByText(/Es una simulación con tus supuestos, no una promesa/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Escenarios" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Aplicar mi perfil de riesgo" })
      .click();
    await page.getByRole("spinbutton", { name: "Meses" }).fill("12");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    expect((await download).suggestedFilename()).toBe(
      "simulacion_copiloto.csv",
    );
    await page.getByRole("button", { name: "Guardar simulación" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Simulación guardada" }),
    ).toBeVisible();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("spinbutton", { name: "Meses" })).toHaveValue(
      "12",
    );
  });
  test("Co-Piloto · Ruta, glosario y alta rápida (aceptación del paquete)", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/ruta");
    await expect(
      page.getByRole("heading", { name: "El método en 6 fases" }),
    ).toBeVisible();
    await expect(page.getByText(/de 25 pasos/)).toBeVisible();
    const f0a = page.getByRole("checkbox", {
      name: "Elegí mi nivel de riesgo en la barra superior",
    });
    await f0a.check();
    await expect(page.getByText("Guardado en tu cuenta")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("checkbox", {
        name: "Elegí mi nivel de riesgo en la barra superior",
      }),
    ).toBeChecked();
    // Las casillas automáticas no se marcan a mano.
    await page.getByRole("button", { name: /1 · Validar producto/ }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "Tengo al menos 3 productos candidatos cargados",
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("checkbox", {
        name: "Tengo al menos 3 productos candidatos cargados",
      }),
    ).toBeChecked();

    // Glosario con búsqueda.
    await page.getByRole("button", { name: "Glosario" }).click();
    const glos = page.getByRole("dialog", {
      name: "Glosario en lenguaje sencillo",
    });
    await glos
      .getByRole("searchbox", { name: "Buscar un término" })
      .fill("roas");
    await expect(glos.getByText(/Retorno sobre la publicidad/)).toBeVisible();
    await expect(glos.getByText(/Costo por adquisición/)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(glos).toBeHidden();

    // Alta rápida: Masajeador de cuello eléctrico a $ 45.000.
    await page.goto("/comunidad/emprendedores/copiloto/productos?alta=1");
    const qa = page.getByRole("dialog", { name: "Alta rápida de producto" });
    await qa
      .getByLabel("Nombre del producto")
      .fill("Masajeador de cuello eléctrico");
    await expect(qa.getByText("detectada")).toBeVisible();
    await qa.getByLabel("Costo proveedor (COP)").fill("45000");
    await qa
      .getByLabel(/Descripción o características/)
      .fill("6 modos de masaje, calor, recargable USB");
    await qa.getByRole("button", { name: "Calcular y completar" }).click();
    await expect(qa.getByText("$\u00a0169.900", { exact: true })).toBeVisible();
    await expect(qa.getByText("$\u00a0239.900", { exact: true })).toBeVisible();
    await expect(qa.getByText("$\u00a076.502", { exact: true })).toBeVisible();
    await expect(qa.getByText(/· Clase A$/)).toBeVisible();
    await qa.getByRole("button", { name: "Guardar producto" }).click();
    await expect(qa).toBeHidden();
    await expect(page).toHaveURL(/vista=evaluacion/);
    await expect(
      page.getByRole("region", { name: "Masajeador de cuello eléctrico" }),
    ).toBeVisible();
    await expect(page.getByLabel("Producto activo")).toHaveValue(/^p\d+$/);
  });

  test("Co-Piloto · Bitácora y modo ejemplo", async ({ page }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/bitacora");
    await expect(page.getByText("Aún no hay tests")).toBeVisible();
    await expect(
      page.getByText("Aún no guardas planes ni simulaciones"),
    ).toBeVisible();
    await expect(
      page.getByText("Tus datos se guardan en tu cuenta de Crece Millo.", {
        exact: false,
      }),
    ).toBeVisible();

    // Modo ejemplo: datos de la demostración, nada se guarda.
    await page.getByRole("button", { name: "Ver ejemplo" }).click();
    await expect(page.getByText(/Modo ejemplo\./)).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Combo 2× en la confirmación",
        exact: true,
      }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Tests a CSV (para Notion)" })
      .click();
    expect((await download).suggestedFilename()).toBe("tests_para_notion.csv");
    await page
      .getByRole("button", { name: "Salir del ejemplo" })
      .first()
      .click();
    await expect(page.getByText("Aún no hay tests")).toBeVisible();

    // Borrar todo pide escribir BORRAR.
    await page.getByRole("button", { name: "Borrar todo" }).click();
    const dlg = page.getByRole("dialog", {
      name: "¿Borrar todos tus datos del Co-Piloto?",
    });
    await dlg.getByRole("button", { name: "Borrar todo" }).click();
    await expect(dlg.getByText("Escribe BORRAR para confirmar.")).toBeVisible();
    await dlg.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
    await dlg.getByRole("button", { name: "Borrar todo" }).click();
    await expect(
      page.getByText(/volvió a empezar con los productos de ejemplo/),
    ).toBeVisible();
  });
  test("Co-Piloto · Mentor con IA (API simulada): análisis del test, ofertas y alta rápida", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/comunidad/emprendedores/copiloto/test");
    await page.getByRole("spinbutton", { name: "Gasto en ads" }).fill("650000");
    await page
      .getByRole("spinbutton", { name: "Pedidos generados" })
      .fill("18");
    await page
      .getByRole("button", { name: "Pedir análisis al mentor" })
      .click();
    await expect(
      page.getByText("Diagnóstico simulado del test."),
    ).toBeVisible();
    await expect(
      page.getByText(/Respuesta generada por IA\. No es asesoría financiera\./),
    ).toBeVisible();
    await expect(page.getByText(/Te quedan 24 consultas hoy/)).toBeVisible();

    await page.goto(
      "/comunidad/emprendedores/copiloto/marketing?vista=ofertas",
    );
    await page.getByRole("button", { name: "Generar ofertas con IA" }).click();
    await expect(page.getByText("Upsell simulado")).toBeVisible();

    await page.goto("/comunidad/emprendedores/copiloto/productos?alta=1");
    const qa = page.getByRole("dialog", { name: "Alta rápida de producto" });
    await qa
      .getByLabel("Nombre del producto")
      .fill("Masajeador de cuello eléctrico");
    await qa.getByLabel("Costo proveedor (COP)").fill("45000");
    await qa.getByRole("button", { name: "Calcular y completar" }).click();
    await qa.getByRole("button", { name: "Mejorar textos con IA" }).click();
    await expect(qa.getByLabel(/^Público objetivo/)).toHaveValue(
      "Público simulado",
    );
    await expect(qa.getByLabel(/^Nombre\s*automático/)).toHaveValue(
      "Masajeador cervical",
    );
  });
});
