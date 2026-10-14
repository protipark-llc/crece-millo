# Co-Piloto · avance de la construcción

Plan por fases de `PROMPT-claude-code.md`. Decisiones del dueño del producto (13 oct 2026):

- **Acceso:** abierto para todas las cuentas mientras no exista el cobro. La página Premium queda lista para cuando lo haya.
- **Reemplaza al Co-Piloto anterior.** Los productos, valores, tests y avance que cada persona ya tenía se migran la primera vez que abre el nuevo (ver «Migración»).
- **Ruta:** las 25 casillas del original (la especificación decía 23).
- **Modo demostración:** solo en el navegador, sin guardar.
- **Mentor con IA y simulador:** a criterio de implementación; simulador «realista y escalable» (tope de pauta y aviso claro, sin cambiar el modelo).

## Fase 1 · Motor y formato ✓

- `src/lib/copiloto/engine.ts`: port sin cambios. `npm run copiloto:verificar` → 2.494 comprobaciones idénticas. La misma comparación corre en `tests/unit/copiloto-motor.test.ts`.
- `src/lib/copiloto/format.ts`: `$ 129.900`, `−$ 12.000`, `US$ 39`, `26,4 %`, `3,30×`, `15 días`, `8 oct 2026`.

## Fase 2 · Datos, migración y respaldo ✓

- Tablas `copiloto_settings`, `copiloto_products`, `copiloto_tests`, `copiloto_product_state` (pc y mk) y `copiloto_saved` (planes y simulaciones), con RLS forzada (migración `0004`).
- `src/lib/copiloto/state.ts`: forma `S`, constantes del original (generadas desde el HTML, no escritas a mano), `withDefaults`, `defaultState` y `parseBackup` (v3 y v4, validado con zod).
- `src/lib/copiloto/logic.ts`: `prodTests`, `pcDefaults` y los CSV «Productos para Notion» y «Tests a CSV» con sus columnas exactas.
- `src/server/services/copiloto.ts`: `loadState` (crea el estado en la primera visita, con candado para pestañas simultáneas), cambios puntuales, importar y borrar todo.
- Descargas: `/api/copiloto/exportar/respaldo`, `/productos` y `/tests`. Acciones: importar respaldo y borrar todo (la interfaz llega con la Bitácora).

### Migración desde el Co-Piloto anterior

| Antes | Ahora |
|---|---|
| Nombre, proveedor, notas | `nombre`, `proveedor`, `notas` |
| Estado idea / prueba / ganador / pausado / descartado | Etapa Idea / En test / Ganador / Pausado / Descartado |
| Costo, envío de ida y de regreso, otros costos (centavos) | `costo`, `flete`, `fleteRet`, `empaque` (pesos) |
| Comisión de recaudo + plataforma | `com` |
| % de devoluciones | `entrega` = 100 − devoluciones; `conf` = 100 (no había cancelaciones) |
| Margen objetivo | `meta` |
| Precio elegido (o el recomendado que mostraba) | `precio` |
| CPA esperado | CPA de referencia en Precio y margen (`pc.cpa0`) |
| Tests (gasto, días, pedidos, canal) | Tests del original recalculados con `E.test` y `E.verdict` (riesgo 5) |
| Plan de capital | `planForm.cap` / `simForm.cap` y costos fijos |
| Pasos de la ruta con equivalente claro | Casillas del original (`f0b`, `f2a`, `f2b`, `f2c`, `f2e`, `f3a`, `f3c`, `f4c`, `f5c`) |

Las tablas anteriores no se borran: quedan como respaldo hasta confirmar la migración en producción.

## Fase 3 · Layout del módulo ✓

- Rutas `/comunidad/emprendedores/copiloto/{ruta, productos, marketing, test, capital, crecer, bitacora}`; las subpestañas van en `?vista=` (`ficha`, `evaluacion`, `resultados`, `analisis`, `precio`; `ofertas`, `creativos`, `pagina`, `lanzamiento`). El estado guarda los códigos del original (`producto`, `eval`, `lanz`…) para que los respaldos sigan siendo compatibles (`src/lib/copiloto/nav.ts`).
- El estado se carga una vez en el layout y vive en el navegador (`src/components/copiloto/store.tsx`): cambiar de pestaña no consulta la base; cada cambio se guarda en segundo plano (espera de 450 ms al escribir, en orden, se vacía al ocultar la pestaña) con el indicador «Guardando… / Guardado en tu cuenta / Reintentar». En modo ejemplo no guarda nada.
- Encabezado: producto activo, riesgo 1–10 (10 segmentos con «5 · Normal»; es un control deslizante accesible con teclado), COP/USD, TRM y las 7 pestañas con `aria-current`.
- «Tu siguiente paso»: `coach()` del original portado sin cambios (`src/lib/copiloto/logic.ts`), con íconos lucide en lugar de emojis (💰 → `coins`, que faltaba en la especificación).
- Pie con el aviso de la especificación más «Solo invierte capital que puedas perder.» del original.
- Las direcciones del Co-Piloto anterior redirigen al nuevo. El Panel y Emprendedores leen el estado nuevo.
- Sin la insignia PREMIUM: el acceso está abierto para todas las cuentas.

## Fase 4 · Productos ✓

- Base de datos con 6 indicadores, búsqueda, etapa, orden y 14 columnas; «En blanco», «Alta rápida» y «CSV para Notion».
- Ficha (se guarda al escribir; cambiar el costo marca `costoReal`), Duplicar y Eliminar con diálogo.
- Evaluación inicial: 10 criterios 1–5 (radiogroup con flechas), puntaje y clase, unidad económica y validación con los textos del original.
- Resultados de venta: registro con vista previa en vivo e historial de 17 columnas; pasa la etapa a «En test» como el original.
- Análisis y estrategia: 9 indicadores con umbrales, embudo, esperado vs. real, evolución (con tabla), diagnóstico y estrategia sugerida, «Aplicar etapa sugerida».

## Fase 5 · Precio y margen ✓

- 21 supuestos en 4 grupos plegables (campo + deslizador; los máximos se fijan al construir el formulario, como el original), precio recomendado destacado (diseño 06), 8 indicadores, alertas, desglose «¿A dónde va cada peso?», salud N/6, capital por precio con escenario pesimista y tabla de precios.
- Gráfica: el diseño 06 usa una sola gráfica con el margen en línea discontinua; se siguió el diseño (con eje derecho de %), no las «dos gráficas apiladas» de la especificación.

## Fase 6 · Analizar test ✓

- 12 campos guardados en la cuenta, veredicto grande, aviso de CPA sobre el máximo, 10 indicadores y «Cómo decide el Co-Piloto» (resume las reglas de `E.verdict`, sin lógica nueva).

## Fase 7 · Marketing ✓

- Plantillas del original en `src/lib/copiloto/marketing.ts`; con la demostración salen idénticas al original (prueba `copiloto-marketing.test.ts`).
- El checklist del creativo se guarda por producto (`S.mk[pid].check`), como pide la especificación.

## Fase 8 · Planificar capital y Crecer ✓

- `E.plan` y `E.sim` sin cambios. Simulador «realista y escalable»: aviso fijo («Es una simulación con tus supuestos, no una promesa…») y aviso reforzado cuando la tasa mensual proyectada pasa de 15 %. El tope de pauta diaria del original sigue disponible.
- Sensibilidad con tonos e ícono (pierdes / menos de $ 1.000.000 / $ 1.000.000 o más), valor compacto visible y valor completo para lectores de pantalla.

## Fase 9 · Ruta, Bitácora, Alta rápida, Glosario y modo ejemplo ✓

- Ruta: 6 fases y 25 casillas (5 automáticas). Se conserva la numeración del original (Fase 0–5).
- Bitácora: tests, planes y simulaciones, respaldo JSON, importar (reemplaza todo y recarga), tests a CSV y «Borrar todo» con confirmación escrita.
- Alta rápida (ventana modal, `?alta=1`): con «Masajeador de cuello eléctrico» a $ 45.000 da $ 169.900, tachado $ 239.900 y utilidad $ 76.502. **Puntaje:** la captura del original (77, clase A) se tomó con la categoría en «Hogar» (primera opción del selector; el original solo detecta al escribir el nombre). Con la categoría detectada («Bienestar») el mismo producto da 76, también clase A. Ambos casos quedan en `copiloto-alta.test.ts`.
- Glosario lateral con búsqueda (botón en el encabezado).
- Modo ejemplo: botón «Ver ejemplo» en el encabezado (cookie de 6 horas). Carga la demostración del paquete, no guarda nada y conserva las direcciones. Los CSV se generan en el navegador para que exporten lo que se ve.

## Fase 10 · Mentor con IA ✓

- `POST /api/copiloto/mentor`. El servidor arma el prompt del original (BASE + ctx + acción + forma JSON) con el estado guardado de la persona (o el del ejemplo); el navegador solo envía la acción y, si aplica, el formulario del test o del plan o el borrador de Alta rápida. Así la ruta no sirve para enviar texto libre.
- Modelo `claude-opus-5-5`, esfuerzo `medium`, salida JSON estructurada y validada con zod antes de pintarla, y `fallbacks: "default"` (si el modelo declina, la API reintenta con el modelo recomendado).
- Límite: 25 consultas por persona y día (tabla `copiloto_mentor_uso`, RLS, migración 0005). Solo cuentan las respuestas exitosas.
- **Para activarlo en producción:** crear `ANTHROPIC_API_KEY` en Vercel › Settings › Environment Variables (Production). Sin la clave, el mentor muestra «todavía no está activado» y deja copiar el análisis para Claude, como el original.

## Fase 11 · Aceptación ✓

- Con la demostración, las 14 pantallas muestran los mismos montos y porcentajes que `original/textos-con-demo` (637 de 637).
- axe (WCAG 2.2 A/AA) sin hallazgos en las 14 pantallas en escritorio claro y en 390 px oscuro, ni en Alta rápida y Glosario. Sin desplazamiento horizontal en 390 px.
- 17 pruebas e2e (escritorio y móvil) con una API de Claude simulada para el mentor.

## Móvil · resultado primero ✓

- En menos de 1024 px, Analizar test, Precio y margen, Planificar capital y Crecer muestran primero el resultado (veredicto, precio recomendado, indicadores) y el formulario se abre en una hoja inferior con resumen («Datos del test · …»), como los diseños 20 y 22. Esc o «Cerrar» la cierran y el foco vuelve al botón. En escritorio no cambia nada.

## Diferencias encontradas en el paquete (manda el original)

- Ruta: 25 casillas (no 23); la insignia dice «automático».
- Asignación con riesgo 5: 67,8 % (el original la redondea a 70 % con «Aplicar mi perfil»); 72 % es solo el valor inicial del formulario.
- Pie del original: termina en «Solo invierte capital que puedas perder.».
- «Usar esta oferta» existe en 4 de las 6 ofertas; las preguntas frecuentes son las objeciones + 3 fijas.
- CSV: números con punto decimal y BOM (no llevan formato es-CO).
- Diseños de Precio y margen (06, 07, 20, 18), Ruta (01, 19) y «Tu siguiente paso» usan números que no salen del estado de demostración: se toma la forma del diseño y los números del motor.
- Alta rápida: el puntaje 77 de la especificación corresponde a la categoría «Hogar» de la captura; con «Bienestar» (detectada) es 76.
