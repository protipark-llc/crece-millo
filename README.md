# Crece · Universidad digital

Plataforma de crecimiento integral. Esta primera versión entrega la **Universidad digital** con su primer módulo funcional: **Finanzas personales**, un centro de control financiero (diagnóstico, ingresos, gastos, cuentas, presupuesto, flujo de caja, deudas, ahorro y objetivos, patrimonio, simulador e informes) unido a una ruta de aprendizaje de 7 niveles.

> Herramienta educativa. No es asesoría financiera, tributaria, legal ni de inversión certificada.

- Arquitectura y modelo de datos: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- Fórmulas y criterios de cálculo: [`docs/FORMULAS.md`](docs/FORMULAS.md)
- Seguridad y privacidad: [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md)
- Auditoría inicial y material de referencia: [`docs/AUDITORIA.md`](docs/AUDITORIA.md)
- Despliegue en Vercel + Supabase: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)

## Requisitos

- Node.js 22 y npm 10
- PostgreSQL 15 o superior (se usa `NULLS NOT DISTINCT` y RLS)

## Instalación

```bash
npm install
cp .env.example .env            # ajusta las cadenas de conexión

# Base de datos local (ejemplo con psql como superusuario)
psql -c "CREATE ROLE crece WITH LOGIN PASSWORD 'crece_dev' CREATEDB;"
psql -c "CREATE DATABASE crece_dev OWNER crece;"
psql -c "CREATE DATABASE crece_test OWNER crece;"   # pruebas de integración
psql -c "CREATE DATABASE crece_e2e OWNER crece;"    # pruebas E2E

npm run db:migrate              # aplica las migraciones de drizzle/ (esquema, RLS y blindaje)
npm run db:seed-demo            # opcional: usuario demo con datos FICTICIOS
npm run dev                     # http://localhost:3000
```

Usuario de demostración (tras `db:seed-demo`): `demo@crece.test` / `Demo-clave-2026`.

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL de la aplicación |
| `TEST_DATABASE_URL` | Base aislada para pruebas de integración (se borra y recrea) |
| `E2E_DATABASE_URL` | Base aislada para Playwright (se borra y recrea) |
| `SESSION_COOKIE_SECURE` | `true` en producción con HTTPS (en Vercel se activa sola) |
| `MIGRATION_DATABASE_URL`, `DATABASE_CA_CERT`, `DATABASE_POOL_MAX`, `MIGRATE_ON_BUILD` | Producción en Vercel + Supabase (ver `docs/DESPLIEGUE.md`) |
| `BOOTSTRAP_USER_EMAIL`, `BOOTSTRAP_USER_PASSWORD`, `BOOTSTRAP_USER_NAME` | Cuenta inicial creada al desplegar (`npm run user:bootstrap` en local) |

No hay secretos en el código ni claves de servicios externos: la versión actual no se conecta a bancos, tasas de cambio en línea ni modelos de IA.

### Cambios de esquema

Edita `src/lib/db/schema.ts`, genera la migración con `npm run db:generate` y aplícala con `npm run db:migrate`. Las políticas RLS están en `drizzle/0001_rls.sql` (migración manual): las tablas nuevas con datos personales deben agregarse ahí y a `RLS_TABLES`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y producción |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Unitarias + integración (PostgreSQL real) |
| `npm run test:unit` / `test:integration` | Por separado |
| `npm run test:e2e` | Compila y ejecuta Playwright (escritorio y móvil) |
| `npm run db:migrate` / `db:generate` / `db:seed-demo` | Base de datos |
| `npm run user:bootstrap` | Crea la cuenta inicial definida en `BOOTSTRAP_USER_*` si no existe |

## Pruebas

- **Unitarias** (`tests/unit`, 48): dinero y redondeo, fechas y bisiestos, recurrencias, saldos y flujo de caja (caso de referencia COP 1.000.000 + 3.000.000 − 2.200.000 = 1.800.000, tasa de ahorro 26,67 %), transferencias, monedas sin tasa, presupuesto, conversión de tasas, amortización, avalancha / bola de nieve, objetivos, patrimonio, escenarios, indicadores sin divisiones por cero y recomendaciones.
- **Integración** (`tests/integration`, 14): persistencia real, transferencias, idempotencia de formularios, recurrencias sin duplicados, presupuesto y reasignación, pagos de deuda transaccionales, objetivos, validación de entradas, restricciones de BD, **aislamiento entre usuarios (servicios, FK compuestas y RLS)** simulaciones que no modifican datos, cuenta inicial idempotente y cambio de contraseña.
- **E2E** (`tests/e2e`, 8): rutas protegidas, flujo completo ingreso → gasto → transferencia con recarga, validaciones, recurrencias + presupuesto, simulador, pago de deuda, lección con cuestionario y versión móvil sin desplazamiento horizontal.

## Cómo probar manualmente

1. **Registro**: `/registro` → país Colombia → acepta la política → llegas al Diagnóstico.
2. **Diagnóstico** (`/universidad/finanzas/diagnostico`): completa el perfil (estabilidad de ingresos, dependientes). Observa la lista "¿Qué podemos calcular con fiabilidad?" cambiar a medida que registras datos.
3. **Cuentas**: crea "Ahorros" con saldo inicial 1.000.000 y "Billetera" con 0.
4. **Ingreso**: Movimientos → Nuevo → Ingreso 3.000.000 realizado; repite con "¿Se repite? Quincenal" para ver la recurrencia.
5. **Gasto**: 2.200.000 realizado. En Cuentas el saldo registrado es 1.800.000. Recarga la página: persiste.
6. **Transferencia**: 300.000 de Ahorros a Billetera → saldos 1.500.000 / 300.000; la caja total y los ingresos/gastos no cambian.
7. **Previstos y recurrencias**: crea un gasto previsto mensual; en Movimientos aparece en "Pendientes"; pulsa "Realizado" dos veces rápido: solo se registra una vez.
8. **Conciliación**: en la tabla de movimientos usa el doble check; en Cuentas cambia el saldo conciliado.
9. **Presupuesto**: crea el del mes (opcionalmente con plantilla), agrega líneas mensuales y una anual (÷ 12), excede una categoría y reasigna desde otra.
10. **Flujo de caja**: cambia entre vista mensual/semanal/diaria, escenarios conservador/base/optimista y activa "Solo lo programado" para ver la diferencia de las estimaciones.
11. **Deudas**: registra una tarjeta (24 % N.A.M.V. → se muestra ≈ 26,82 % E.A.), registra un pago y verifica el abono a capital y el descuento en la cuenta; compara estrategias con un abono extra.
12. **Objetivos**: crea un fondo de emergencia por meses de gasto esencial; registra aportes y un retiro.
13. **Patrimonio**: registra un vehículo y asócialo a un crédito: aparece su valor neto (puede ser negativo).
14. **Simulador**: agrega una pérdida de ingresos de 3 meses o una compra grande; guarda el escenario; vuelve a Cuentas: nada cambió.
15. **Informes**: revisa la tendencia y exporta CSV. En Configuración exporta todos tus datos en JSON.
16. **Universidad**: abre una lección, responde el cuestionario y márcala como completada; mira "Mi progreso".
17. **Aislamiento**: crea un segundo usuario en otra ventana privada: no ve los datos del primero.
18. **Móvil**: abre el sitio con ancho de 390 px; usa el menú ☰.

## Diseño y marca

La interfaz sigue la entrega de diseño v1 (marca «Umbral»): `docs/diseno/crece-millo-v1/`
(especificación, tokens, activos y capturas de cada pantalla). Los tokens viven en
`src/app/tokens.css` y los componentes usan solo roles (`bg-surface`, `text-ink`, `bg-accent`…).
El tema claro, oscuro o del sistema se elige en la barra superior o en Configuración.
Los íconos de cada sección se conservan (`docs/ICONOS.md`). La sección Comunidad es una vista
previa con datos de ejemplo; su modelo de datos propuesto está en `docs/COMUNIDAD.md`.

## Limitaciones conocidas

- Contenido educativo: 14 lecciones de texto con cuestionarios; no hay videos, docentes ni certificaciones.
- Sin integraciones bancarias, Open Banking ni tasas de cambio automáticas (por diseño en esta versión).
- Tarjetas de crédito se modelan como deudas (no como cuentas con cupo); las compras con tarjeta se registran como gasto y el pago como pago de deuda.
- Las cuotas de deuda proyectadas se asumen desde las cuentas líquidas en conjunto (no por cuenta).
- Sin recuperación de contraseña por correo ni verificación de correo (sí hay cambio de contraseña en Configuración); ver `docs/SEGURIDAD.md`.
- Todos los datos de una persona se cargan por página: adecuado para volúmenes personales; para miles de movimientos por año conviene paginar/agregar en SQL.
- Los aspectos tributarios (renta, seguridad social de independientes) solo se categorizan; requieren validación profesional local.

## Próximas mejoras recomendadas (impacto / esfuerzo)

| Mejora | Impacto | Esfuerzo |
|---|---|---|
| Recuperación de contraseña y verificación de correo | Alto | Bajo |
| Importar extractos CSV/Excel con detección de duplicados | Alto | Medio |
| Tarjetas de crédito como cuentas con cupo y fecha de corte | Alto | Medio |
| Recordatorios de vencimientos (correo / notificaciones) | Alto | Medio |
| Rol de BD de solo DML + CSP con nonces + límite por IP | Alto | Bajo |
| Asistente con IA usando `src/server/assistant/context.ts` | Medio | Medio |
| CMS para contenido educativo, videos y evaluaciones | Medio | Alto |
| Hogares compartidos (varios adultos, gastos compartidos) | Medio | Alto |
| Siguientes áreas de la universidad | Alto | Alto |
