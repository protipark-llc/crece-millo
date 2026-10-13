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
- Mientras llegan las fases 4–9, cada sección dice qué traerá; Productos muestra una vista previa de solo lectura para revisar los datos migrados.

## Diferencias encontradas en el paquete (manda el original)

- Ruta: 25 casillas (no 23); la insignia dice «automático».
- Asignación con riesgo 5: 67,8 % (el original la redondea a 70 % con «Aplicar mi perfil»); 72 % es solo el valor inicial del formulario.
- Pie del original: termina en «Solo invierte capital que puedas perder.».
- «Usar esta oferta» existe en 4 de las 6 ofertas; las preguntas frecuentes son las objeciones + 3 fijas.
- CSV: números con punto decimal y BOM (no llevan formato es-CO).
- Diseños de Precio y margen (06, 07, 20, 18), Ruta (01, 19) y «Tu siguiente paso» usan números que no salen del estado de demostración: se toma la forma del diseño y los números del motor.
