# Auditoría inicial y material de referencia

## Estado del repositorio al iniciar

- Repositorio `crece-millo` **vacío**: sin commits, sin ramas remotas, sin código, configuración ni base de datos. No había funcionalidades que reutilizar ni trabajo que pudiera sobrescribirse.
- Por eso el stack se eligió desde cero (ver `ARQUITECTURA.md`), priorizando un modelo de datos íntegro, cálculos exactos y pruebas reales sobre PostgreSQL.
- Entorno disponible: Node 22, PostgreSQL 16 local, Chromium para Playwright.

## Material de referencia revisado

### Libro «Un inmueble al año no hace daño» (6 fotografías de páginas, pp. ~84–88)

| Concepto en el libro | Cómo se incorporó |
|---|---|
| Balance personal con columnas **Valor / Deuda / Activo** por bien (inmuebles, vehículos, muebles, cuentas, deudas por cobrar, fondo de retiro, tarjetas…), donde un vehículo puede tener valor neto negativo | Página de Patrimonio: tabla Valor / Deuda / Valor neto por bien, deudas asociadas a bienes (`secured_asset_id`), cuentas por cobrar y fondos de pensiones/cesantías como tipos de activo. Probado con las cifras del ejemplo del libro (carro con −3.000). |
| **Flujo de caja mensual** con columnas Subtotal / Total / **% de ingresos**, empezando por la fila **Ahorros** | Presupuesto con distribución porcentual sobre el ingreso esperado y meta de ahorro; plantilla "Págate primero". |
| Gastos anuales (impuesto de la casa, ropa, vacaciones) **divididos entre 12** y reservados cada mes | Líneas de presupuesto con importe anual ÷ 12; mencionado en el diagnóstico y en lecciones. |
| Revisar pagos con tarjeta de crédito/débito para que todo esté en el presupuesto | Conciliación de movimientos, detección de posibles duplicados, "Sin presupuestar". |
| Categorías detalladas (vivienda, servicios, alimentación, transporte, hijos, salud, mascotas, vestuario, seguros, deudas familiares, deuda con la empresa, crédito de educación, ayuda a parientes, donaciones, hobbies…) | Categorías iniciales de dos niveles inspiradas en esa tabla y adaptadas a Colombia; tipos de deuda "familiar", "con la empresa" y "crédito educativo". |
| Ingresos de adulto 1 / adulto 2 / otros | Fuentes de ingreso por movimiento y categoría "Aportes de terceros (gastos compartidos)". |

Comparación con buenas prácticas: se conservaron las ideas anteriores. No se adoptaron reglas universales (porcentajes fijos de ahorro o de vivienda); las plantillas son opcionales y explicadas como referencia.

### Hoja de cálculo de presupuesto adjunta

Se analizó únicamente su **estructura** (no se copiaron datos personales al repositorio ni a los datos de demostración):

- Matriz concepto × mes con gastos agrupados (vehículo, bancos, suscripciones, vivienda, personales, mascota, otros) → categorías de dos niveles y presupuesto mensual por categoría.
- Aportes de compañeros de vivienda que reducen el gasto neto → categoría de ingreso "Aportes de terceros".
- Ahorro calculado como porcentaje del salario y "restante libre" → meta de ahorro y "sin asignar".
- Hoja de **personas que deben dinero** → activo tipo "cuenta por cobrar".
- Hoja de **deudas** informales y un crédito educativo con **mora y días de mora** → deudas con tipos familiar/empresa/educativo, campos de días y valor en mora, y recomendaciones prioritarias cuando hay mora.

## Riesgos detectados en el planteamiento y decisiones

- Un ingreso futuro no es dinero disponible → estados previsto/realizado/anulado y saldos registrado/conciliado/proyectado.
- Las transferencias entre cuentas propias no son ingresos ni gastos → modelo de una fila con origen y destino.
- Doble conteo de deudas (cuota como gasto + amortización) → el pago es un gasto de caja y el abono a capital reduce el pasivo; el simulador excluye pagos de deudas del gasto base.
- Proyecciones que solo incluyen lo programado subestiman el gasto → estimaciones explícitas y separadas (gasto variable promedio y cuotas de deuda).
- Dinero con decimales → enteros en unidades menores y política de redondeo documentada.
