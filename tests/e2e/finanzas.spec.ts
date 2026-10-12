import { expect, test } from "@playwright/test";
import { createAccount, newMovement, register } from "./helpers";

test.describe("Finanzas personales (flujo completo con persistencia)", () => {
  test("rutas protegidas redirigen a ingresar", async ({ page }) => {
    await page.goto("/universidad/finanzas");
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test("ingreso, gasto, transferencia y saldos que persisten al recargar", async ({ page }) => {
    await register(page);
    // Estados vacíos
    await page.goto("/universidad/finanzas/deudas");
    await expect(page.getByText("No tienes deudas registradas")).toBeVisible();
    await page.goto("/universidad/finanzas/objetivos");
    await expect(page.getByText("Aún no tienes objetivos")).toBeVisible();

    await createAccount(page, "Cuenta principal", "1.000.000");
    await createAccount(page, "Billetera", "0", "Billetera digital (Nequi, Daviplata…)");

    await newMovement(page, "Ingreso", { description: "Salario febrero", amount: "3.000.000", from: "Cuenta principal" });
    await newMovement(page, "Gasto", { description: "Arriendo febrero", amount: "2.200.000", from: "Cuenta principal" });

    // Saldo 1.000.000 + 3.000.000 − 2.200.000 = 1.800.000
    await page.goto("/universidad/finanzas/cuentas");
    const row = page.getByRole("row", { name: /Cuenta principal/ });
    await expect(row).toContainText("1.800.000");

    // Transferencia entre cuentas propias: no cambia la caja total ni los ingresos/gastos
    await newMovement(page, "Transferencia", { description: "A la billetera", amount: "300.000", from: "Cuenta principal", to: "Billetera" });
    await page.reload();
    await page.goto("/universidad/finanzas/cuentas");
    await expect(page.getByRole("row", { name: /Cuenta principal/ })).toContainText("1.500.000");
    await expect(page.getByRole("row", { name: /Billetera/ })).toContainText("300.000");
    await expect(page.getByText("Caja disponible", { exact: true }).locator("..").locator("..")).toContainText("1.800.000");

    await page.goto("/universidad/finanzas/informes?meses=12");
    await expect(page.getByText("Ingresos del periodo", { exact: true }).locator("..").locator("..")).toContainText("3.000.000");
    await expect(page.getByText("Gastos del periodo", { exact: true }).locator("..").locator("..")).toContainText("2.200.000");
    await expect(page.getByText("Tasa de ahorro", { exact: true }).first().locator("..").locator("..")).toContainText("26,7");
  });

  test("valida entradas en el servidor y muestra errores comprensibles", async ({ page }) => {
    await register(page);
    await createAccount(page, "Ahorros", "500.000");
    await page.goto("/universidad/finanzas/movimientos/nuevo");
    await page.getByLabel("Descripción").fill("Sin importe");
    await page.getByRole("button", { name: /^Registrar gasto/ }).click();
    await expect(page.getByText("Ingresa un importe").first()).toBeVisible();
    await page.getByLabel("Importe", { exact: true }).fill("-50");
    await page.getByRole("button", { name: /^Registrar gasto/ }).click();
    await expect(page.getByText("El importe no puede ser negativo").first()).toBeVisible();
  });

  test("recurrencia: confirmar una ocurrencia no la duplica y el presupuesto compara plan y ejecución", async ({ page }) => {
    await register(page);
    await createAccount(page, "Nómina", "4.000.000");
    await page.goto("/universidad/finanzas/movimientos/nuevo");
    await page.getByLabel("Descripción").fill("Gimnasio");
    await page.getByLabel("Importe", { exact: true }).fill("100.000");
    await page.getByLabel("Categoría").selectOption({ label: "Gimnasio y deporte" });
    await page.getByLabel("Estado").selectOption({ label: "Previsto / por pagar" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    await page.getByLabel(/^Fecha prevista/).fill(today);
    await page.getByLabel("¿Se repite?").selectOption({ label: "Mensual" });
    await page.getByRole("button", { name: /^Registrar gasto/ }).click();
    await expect(page.getByText(/registrado con su recurrencia/)).toBeVisible();

    await page.goto("/universidad/finanzas/movimientos");
    const pending = page.locator("li").filter({ hasText: "Gimnasio" }).first();
    await pending.getByRole("button", { name: /Realizado/ }).click();
    await expect(page.getByRole("row", { name: /Gimnasio/ }).getByText("Realizado")).toBeVisible();
    await expect(page.getByRole("row", { name: /Gimnasio/ })).toHaveCount(1);

    // Presupuesto del mes
    await page.goto("/universidad/finanzas/presupuesto");
    await page.getByRole("button", { name: "Crear presupuesto" }).click();
    await expect(page.getByText("Plan frente a realidad")).toBeVisible();
    const lineForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Guardar línea" }) });
    await lineForm.getByLabel("Categoría").selectOption({ label: "Gimnasio y deporte" });
    await lineForm.getByLabel("Mensual").fill("80.000");
    await lineForm.getByRole("button", { name: "Guardar línea" }).click();
    const line = page.getByRole("row", { name: /Gimnasio y deporte/ });
    await expect(line).toContainText("100.000");
    await expect(line).toContainText("-$ 20.000");
  });

  test("la simulación no modifica los datos reales", async ({ page }) => {
    await register(page);
    await createAccount(page, "Mi caja", "2.000.000");
    await page.goto("/universidad/finanzas/simulador");
    await expect(page.getByText("Las simulaciones no modifican tus datos reales")).toBeVisible();
    await page.getByLabel(/Compra importante/).fill("10.000.000");
    await expect(page.getByText("Primer mes negativo").first()).toBeVisible();
    await page.getByLabel("Nombre").fill("Compra grande");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Escenario guardado.")).toBeVisible();
    await page.goto("/universidad/finanzas/cuentas");
    await expect(page.getByRole("row", { name: /Mi caja/ })).toContainText("2.000.000");
  });

  test("deuda: registrar pago descuenta la caja y abona a capital", async ({ page }) => {
    await register(page);
    await createAccount(page, "Pagos", "1.000.000");
    await page.goto("/universidad/finanzas/deudas/nueva");
    await page.getByLabel("Nombre").fill("Tarjeta");
    await page.getByLabel("Capital pendiente").fill("5.000.000");
    await page.getByLabel("Fecha de ese saldo").fill("2026-01-01");
    await page.getByLabel("Tasa de interés (%)").fill("24");
    await page.getByLabel("Tipo de tasa").selectOption("NAMV");
    await expect(page.getByText(/26,82 % efectivo anual/)).toBeVisible();
    await page.getByLabel("Cuota mínima mensual").fill("300.000");
    await page.getByRole("button", { name: "Registrar deuda" }).click();
    await expect(page).toHaveURL(/\/deudas$/);
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText(/Pago registrado/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("$ 4.800.000").first()).toBeVisible();
    await page.goto("/universidad/finanzas/cuentas");
    await expect(page.getByRole("row", { name: /Pagos/ })).toContainText("700.000");
  });

  test("lección: cuestionario calificado y progreso guardado", async ({ page }) => {
    await register(page);
    await page.goto("/universidad/rutas/finanzas-personales/foto-financiera-actual");
    const groups = page.locator("fieldset");
    const n = await groups.count();
    for (let i = 0; i < n; i++) await groups.nth(i).getByRole("radio").first().check();
    await page.getByRole("button", { name: "Revisar respuestas" }).click();
    await page.getByRole("button", { name: "Marcar lección como completada" }).click();
    await expect(page.getByText(/Lección completada: \d de \d/)).toBeVisible();
    await page.goto("/universidad/progreso");
    await expect(page.getByText("1 de 14")).toBeVisible();
  });
});
