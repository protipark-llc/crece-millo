# Fórmulas y criterios de cálculo

Todo el cálculo financiero vive en `src/lib/finance/` (funciones puras, sin base de datos ni UI) y se prueba en `tests/unit/`. El navegador (simulador) y el servidor usan **el mismo código**: no hay lógica financiera duplicada.

## Política monetaria y de redondeo (`src/lib/money/money.ts`)

| Regla | Detalle |
|---|---|
| Representación | Entero de **unidades menores** (centavos según ISO 4217: COP y USD = 2 decimales, CLP = 0). Columna `BIGINT` en PostgreSQL. |
| Presentación | Separada del valor: COP se muestra sin centavos (`displayDecimals = 0`), formato `Intl.NumberFormat` según la configuración regional. |
| Sumas y restas | Enteras, verificadas contra `Number.MAX_SAFE_INTEGER` (≈ 9 × 10¹⁵ centavos). |
| Porcentajes y prorrateos | `mulRatio` con `BigInt` y redondeo **half-up simétrico** (0,5 se aleja de cero). Los porcentajes se llevan a puntos básicos (centésimas de punto). |
| Tasas de interés | Potencias reales (`Math.pow`); el interés de cada periodo se redondea a la unidad menor con `roundMinor` (half-up, con corrección del error binario a 15 cifras). |
| Entrada de texto | `parseAmount`: con coma → coma decimal y puntos de miles (`1.200.000,50`); sin coma, varios puntos → miles; un punto seguido de exactamente 3 dígitos → miles (`1.200`); otro caso → decimal. Sin negativos (el signo lo da el tipo de movimiento) ni más decimales que la moneda. |
| Divisiones por cero | `ratio()` devuelve `null`; los indicadores muestran "Datos insuficientes" o "No aplica". |
| Monedas distintas | Solo se convierte con una tasa registrada por la persona con fecha y fuente (`exchange_rates`), usando la más reciente ≤ fecha del movimiento (o su inversa). Sin tasa, el importe se **excluye** de los totales y se muestra una advertencia. No se consultan servicios externos. |

## Fechas y periodos (`dates.ts`)

- Fechas de calendario `YYYY-MM-DD` sin hora; aritmética en UTC. "Hoy" se calcula con la zona horaria de la persona.
- Sumar meses ajusta al último día válido (31-ene + 1 mes = 28/29-feb). Años bisiestos probados.
- Semanas ISO (lunes a domingo).

## Recurrencias (`recurrence.ts`)

| Frecuencia | Regla |
|---|---|
| Diaria / semanal / cada dos semanas | inicio + n·(1 / 7 / 14) días |
| Mensual / trimestral / anual | inicio + n·(1 / 3 / 12) meses, anclado al día de inicio y ajustado a fin de mes |
| Quincenal | días **15 y último** de cada mes (quincena colombiana) |

- Las ocurrencias futuras son **virtuales** (se calculan, no se guardan). Una ocurrencia se materializa solo cuando la persona la confirma ("Realizado") u omite ("Omitir"), con `UNIQUE(recurrence_rule_id, occurrence_date)` + `ON CONFLICT DO NOTHING`: repetir la operación no duplica nada.
- Eliminar un movimiento que es ocurrencia de una recurrencia lo **anula** (no lo borra) para que no reaparezca.
- Ocurrencias de los últimos 31 días sin confirmar = **vencidas**: se asumen hoy en las proyecciones y se listan como pendientes.

## Saldos y flujo de caja (`cashflow.ts`)

- Efecto sobre una cuenta: ingreso `+importe`; gasto `−importe`; transferencia `−importe` en origen y `+importe recibido` en destino.
- **Saldo registrado(f)** = saldo inicial + efectos de movimientos *realizados* con fecha efectiva ≤ f.
- **Saldo conciliado(f)** = igual, solo con movimientos marcados como conciliados.
- **Saldo proyectado(f)** = registrado(hoy) + previstos (guardados y recurrentes) hasta f.
- **Flujo neto del periodo** = ingresos efectivos − gastos efectivos. Las transferencias entre cuentas propias nunca son ingreso ni gasto.
- **Saldo final** = saldo inicial + ingresos − gastos + transferencias que entran/salen del conjunto de cuentas analizado (p. ej. caja → cuenta de inversión) + saldos iniciales de cuentas abiertas en el periodo − salidas estimadas. Invariante verificado en pruebas.
- Caja = cuentas líquidas (efectivo, corriente, ahorros, billetera digital). Las cuentas de inversión no son caja.
- Cada periodo distingue **real**, **previsto** (programado) y **estimado**:
  - Estimado (solo días futuros, se puede desactivar): gasto variable mensual = promedio de los últimos 3 meses completos con gastos *no programados* (sin recurrencia ni pagos de deudas), repartido por día; y cuotas mínimas de deudas activas en su día de pago hasta su amortización estimada (si ya hubo pago este mes, desde el mes siguiente).
- Escenarios de flujo de caja: base / optimista (+5 % ingresos, −5 % gastos) / conservador (−10 %, +10 %), editables; se aplican **solo** a lo proyectado y estimado.
- Alertas: primer día con saldo negativo, periodos con déficit (salidas > entradas), semanas con pagos programados > 1,75 × el promedio semanal, previstos vencidos.

## Presupuesto (`budget.ts`)

- Cada gasto se asigna a **una sola línea**: la de su categoría o, si no tiene, la de su categoría principal; si ninguna, "Sin presupuestar".
- Ejecutado = gastos realizados del mes. Comprometido = previstos pendientes del mes (guardados, recurrentes y cuotas estimadas de deudas).
- Saldo = presupuestado − ejecutado. % ejecución = ejecutado ÷ presupuestado (`null` si es 0). Desviación = ejecutado − presupuestado.
- Proyección al cierre (mes en curso): fijas = ejecutado + comprometido; variables = máx(ejecutado + comprometido, ejecutado + promedio mensual de la línea en los 3 meses previos × días restantes ÷ días del mes). Sin historia: ritmo diario × días del mes desde el día 5.
- Gasto anual ÷ 12: una línea puede guardarse como importe anual; mensual = anual ÷ 12 (half-up).
- Sin asignar = ingreso esperado − gastos presupuestados − meta de ahorro (base cero ⇒ 0). El presupuesto **no** es dinero disponible.
- Plantillas educativas opcionales: base cero, págate primero (10 % ahorro), 50/30/20 (20 %). Solo sugieren la meta de ahorro.

## Deudas (`debt.ts`)

| Tipo de tasa | Tasa mensual efectiva i |
|---|---|
| E.A. (efectiva anual) | i = (1 + r)^(1/12) − 1 |
| N.A.M.V. (nominal anual mes vencido) | i = r / 12 |
| M.V. (efectiva mensual) | i = r |

- Comparación entre deudas siempre en E.A. = (1 + i)¹² − 1. Ej.: 24 % N.A.M.V. = 2 % mensual ≈ 26,82 % E.A.
- Cuota fija (francés): C = P·i / (1 − (1 + i)^−n); con i = 0, C = P / n.
- Amortización: interés_t = redondeo(saldo × i); abono a capital = pago − interés − cargos. Si el pago no cubre interés + cargos, la deuda "nunca se termina" y se informa.
- Saldo pendiente = saldo registrado en la fecha base − Σ abonos a capital posteriores.
- Pago registrado: un gasto realizado en la cuenta (categoría Deudas) + desglose interés / cargos / capital en la deuda, en una sola transacción. Si no se informa el interés, se estima con un mes de interés y se marca como estimado.
- Estrategias: presupuesto mensual = Σ cuotas mínimas + extra; cada mes se pagan mínimos y el excedente va a la deuda prioritaria; al extinguirse una deuda su cuota pasa a la siguiente. Avalancha = mayor tasa efectiva (tasas desconocidas al final); bola de nieve = menor saldo; personalizada = prioridad definida. Deudas sin cuota mínima se excluyen y sin tasa se simulan al 0 %, **con advertencia**.

## Objetivos y fondo de emergencia (`goals.ts`)

- Faltante = máx(0, meta − acumulado). Aporte mensual = techo(faltante ÷ meses restantes). Con rendimiento supuesto i > 0: aporte = (meta − acumulado·(1+i)ⁿ)·i / ((1+i)ⁿ − 1) — no se usa por defecto.
- Escenarios: ±6 y +12 meses de plazo, meta −20 %.
- Meses sugeridos del fondo: 3 base; +3 si los ingresos son variables, +1 si mixtos, +1 con personas a cargo, +1 si el hogar depende de un solo ingreso; máximo 12. Se explica el criterio y es editable.
- Cobertura (meses) = fondo ÷ gasto esencial mensual de referencia (promedio de 3 meses).
- Disponible sin comprometer = caja − Σ acumulado en objetivos. Un aporte es una **asignación** de dinero que ya se tiene; no mueve saldos.

## Patrimonio (`networth.ts`)

- Patrimonio neto = activos − pasivos a una fecha. Activos = saldos de cuentas + último avalúo ≤ fecha. Saldos negativos (sobregiros) cuentan como pasivo.
- Liquidez separada: líquido / semilíquido / ilíquido. Un inmueble no es caja.
- Balance por bien (como en el libro de referencia): Valor, Deuda asociada, Valor neto (puede ser negativo).
- Historia mensual calculada a partir de saldos, avalúos y abonos a cada fecha (no se guardan "fotos").

## Indicadores (`indicators.ts`)

| Indicador | Fórmula | Periodo |
|---|---|---|
| Ingresos netos | Σ ingresos realizados (sin transferencias) | Mes en curso |
| Gastos efectivos | Σ gastos realizados (incluye pagos de deudas) | Mes en curso |
| Flujo neto | ingresos − gastos | Mes en curso |
| Tasa de ahorro | (ingresos − gastos) ÷ ingresos; `null` si ingresos = 0 | Mes en curso |
| Gastos esenciales / discrecionales | según el gasto o su categoría | Mes en curso |
| Ejecución del presupuesto | ejecutado ÷ presupuestado | Mes en curso |
| Saldo de caja | Σ saldos registrados de cuentas líquidas | Hoy |
| Obligaciones de deuda | Σ cuotas mínimas mensuales | Mensual |
| Relación cuotas / ingresos | Σ cuotas mínimas ÷ ingreso neto mensual de referencia (prom. 3 meses) | Mensual |
| Cobertura de emergencia | fondo ÷ gasto esencial mensual | Hoy |
| Patrimonio neto y variaciones | activos − pasivos; hoy − cierre mes anterior; hoy − hace 12 meses | — |

Ejemplo verificado en pruebas: saldo inicial COP 1.000.000, ingresos 3.000.000, gastos 2.200.000 → flujo neto 800.000, saldo final 1.800.000, tasa de ahorro 26,67 %.

## Simulador (`scenarios.ts`)

Mes t: ingreso_t = ingreso base × (1 + Δ) − pérdida temporal; gasto_t = (esenciales + discrecionales) × (1 + Δ) + nueva cuota + compra; deuda_t según estrategia; caja_t = caja_{t−1}·(1 + i si caja > 0) + ingreso − gasto − pagos de deuda; patrimonio_t = caja + otros activos (constantes) − deudas. Los gastos base excluyen pagos de deudas para no contarlos dos veces. El rendimiento de la caja es 0 % salvo que la persona lo suponga (con advertencia). Las variables de mayor impacto se calculan quitando cada supuesto. Es una función pura: **no escribe en la base de datos**.
