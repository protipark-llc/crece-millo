# Arquitectura

## Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Aplicación web | Next.js 15.5 (App Router, Server Components, Server Actions), React 19, TypeScript estricto | Un solo proyecto para UI y servidor; las mutaciones viajan como Server Actions (protección de origen incluida). |
| Base de datos | PostgreSQL 16 | Transacciones, restricciones, RLS, `DATE`/`BIGINT` exactos. |
| ORM / migraciones | Drizzle ORM + drizzle-kit (SQL versionado en `drizzle/`) | SQL transparente, claves foráneas compuestas, sin binarios externos. |
| Validación | Zod 4 | Esquemas en el servidor (`src/server/validation.ts`). |
| Estilos | Tailwind CSS 4 con tokens en `globals.css` (modo claro y oscuro) | Sistema de diseño consistente. |
| Gráficos | SVG propio (`src/components/charts`) | Sin dependencias; tooltip, teclado y vista de tabla. |
| Pruebas | Vitest (unitarias + integración con PostgreSQL real), Playwright (E2E escritorio y móvil) | |

## Estructura de carpetas

```
src/
  app/
    page.tsx, privacidad/           Páginas públicas
    (auth)/ingresar, registro       Autenticación
    (app)/layout.tsx                Shell autenticado (requireUser)
    (app)/universidad/              Inicio, progreso, rutas, biblioteca, lecciones
    (app)/universidad/finanzas/     Módulo de finanzas (panel, diagnóstico, movimientos, ingresos,
                                    gastos, cuentas, presupuesto, flujo-de-caja, deudas, objetivos,
                                    patrimonio, simulador, informes, recurrencias, categorías)
      actions.ts                    Server Actions del módulo
    (app)/configuracion/            Preferencias, tasas de cambio, exportación, eliminación de cuenta
  lib/
    money/                          Aritmética monetaria y catálogo de monedas/países
    finance/                        MOTOR FINANCIERO PURO (sin BD ni UI)
    education/                      Tipos y catálogo de contenido educativo
    db/                             Esquema Drizzle y cliente (withUser → RLS)
  server/
    services/                       Lógica de negocio con acceso a datos (testeable sin Next)
    action-utils.ts                 Envoltorio común de acciones (sesión → Zod → withUser → errores)
    session.ts, password.ts         Autenticación propia
    assistant/                      Contrato para un futuro asistente con IA
  components/                       UI: primitivas, formularios, gráficos, vistas del módulo
drizzle/                            Migraciones SQL versionadas (0000 esquema, 0001 RLS)
tests/unit | integration | e2e      Pruebas
scripts/                            migrate.ts, seed-demo.ts
```

## Flujo de una operación

`Formulario (cliente) → Server Action → runAction: sesión + Zod → withUser(userId): transacción con app.user_id (RLS) → servicio (validaciones de negocio, FK compuestas) → auditoría → revalidatePath → la página vuelve a calcular con el motor`.

Las páginas cargan todos los datos de la persona con `loadFinanceData` y calculan con el motor puro. Así, los números coinciden entre pantallas (panel, flujo de caja, presupuesto, informes).

## Modelo de datos (resumen)

| Tabla | Propósito |
|---|---|
| `users`, `sessions`, `login_attempts` | Identidad, sesiones (token hasheado), límite de intentos |
| `user_settings` | País, moneda, idioma regional, zona horaria, perfil del hogar, pasos del diagnóstico |
| `accounts` | Cuentas (tipo, moneda, saldo inicial, fecha de apertura, líquida o no) |
| `categories` | Árbol de dos niveles, naturaleza (esencial/discrecional) y comportamiento (fijo/variable) |
| `transactions` | Ingresos, gastos y transferencias; estado previsto/realizado/anulado; fecha prevista y efectiva; conciliación; ocurrencia de recurrencia; clave de idempotencia |
| `recurrence_rules` | Plantillas de movimientos que se repiten |
| `budgets`, `budget_lines` | Presupuesto mensual y líneas por categoría (con importe anual opcional) |
| `debts`, `debt_payments` | Deudas (tasa + tipo, cuota, mora, bien asociado) y pagos desglosados |
| `assets`, `asset_valuations` | Bienes con historial de valoraciones y fuente |
| `goals`, `goal_contributions` | Objetivos y aportes/retiros |
| `exchange_rates` | Tasas de cambio registradas por la persona (fecha y fuente) |
| `scenarios` | Supuestos guardados del simulador |
| `course_enrollments`, `lesson_progress` | Inscripción y progreso educativo (respuestas de cuestionarios) |
| `audit_log` | Registro de cambios financieros relevantes |

Integridad: claves foráneas compuestas `(id, user_id)` (un movimiento no puede apuntar a la cuenta de otra persona), `CHECK` (importes positivos, transferencias con destino distinto, estado realizado ⇔ fecha efectiva, desglose de pagos que cuadra), `UNIQUE` (ocurrencia por regla, idempotencia, presupuesto por mes), índices por usuario y fecha. Borrado: eliminar la cuenta de usuario elimina todo en cascada; cuentas con historia se archivan; categorías se archivan.

## Universidad: extensibilidad

- **Áreas** (`LEARNING_AREAS`): ocho dimensiones; solo finanzas está disponible, las demás se muestran como "próximamente" sin contenido ficticio.
- **Cursos → módulos (niveles) → lecciones** tipados en `src/lib/education/`. Cada lección admite bloques (texto, listas, ejemplos, fórmulas, avisos), cuestionario y reto práctico enlazado a una herramienta. Inscripción y progreso en BD por slugs estables.
- Para agregar un área: añadir su curso al catálogo (o un CMS que devuelva los mismos tipos), cambiar su estado a `available` y, si tiene herramientas propias, crear su carpeta bajo `src/app/(app)/universidad/<area>` y su motor en `src/lib/<area>`.
- Futuro: videos, lecturas, recursos descargables, evaluaciones y suscripciones se añaden como nuevos tipos de bloque o tablas, sin cambiar el modelo de progreso.

## Asistente inteligente

- Hoy: recomendaciones **deterministas** (`src/lib/finance/insights.ts`) con observación, datos usados, explicación, acción, impacto estimado e incertidumbre.
- Preparado: `src/server/assistant/context.ts` define el contexto agregado (sin textos libres ni nombres) y la interfaz `AssistantProvider`. No hay ninguna integración real con un modelo de IA ni se simula una.
