# Co-Piloto de Negocio (dropshipping) · Especificación para Claude Code

Crece Millo › Comunidad › Emprendedores · Premium · v1.0 · 13 oct 2026

Este documento explica **qué hace cada parte del Co-Piloto y cómo debe verse en Crece Millo**. Está escrito para que Claude Code lo construya en Next.js 15 + React 19 + Tailwind 4, con el mismo comportamiento que la app original y la nueva marca «Umbral».

## 0. Fuentes de verdad y orden de prioridad

Cuando algo no coincida, manda este orden:

1. **`motor/`**: el motor de cálculo copiado sin cambios del original, con `golden.json`. Tu versión en TypeScript debe pasar `node motor/verificar.mjs tu-motor.mjs` con 0 diferencias. Si no las pasa, el cálculo está mal, aunque «se vea bien».
2. **`original/CoPiloto_Trendo_v5.html`**: la app que funciona hoy, en un solo archivo. Para cualquier regla, texto o comportamiento no descrito aquí, el original manda. Ábrelo en el navegador y compáralo.
   - Las líneas citadas en este documento (por ejemplo, L868) son de ese archivo.
3. **`original/textos-con-demo/*.txt` y `original/capturas/*.png`**: lo que muestra el original con el estado de demostración `motor/estado-demo.json`. Sirven como prueba de aceptación: con ese estado, tu pantalla debe mostrar los mismos números.
4. **`diseno/pantallas/*.png` y `*.html`**: cómo se ve cada pantalla en Crece Millo, en escritorio 1366 y móvil 390. Los HTML son estáticos: sirven para copiar medidas, jerarquía y estilos, no la lógica.
5. **Este documento.**

**Reglas que no se negocian:**
- No cambies fórmulas, umbrales, veredictos ni nombres de métricas.
- El rediseño cambia la forma (marca, jerarquía, accesibilidad, formato es-CO) y la persistencia (de `localStorage` a la cuenta del usuario).

## 1. Dónde vive y cómo se navega

- **Ruta sugerida:** `/comunidad/emprendedores/copiloto/[seccion]`, con las secciones `ruta`, `productos`, `marketing`, `test`, `capital`, `crecer` y `bitacora`.
- Dentro de `productos` hay subpestañas por query o segmento: `ficha`, `evaluacion`, `resultados`, `analisis`, `precio`. Dentro de `marketing`: `ofertas`, `creativos`, `pagina`, `lanzamiento`.
- **Acceso:** solo Premium. Sin Premium se muestra la página Premium (`diseno/pantallas/CopPremiumEscritorio.png`), con la opción «Probar con un producto de ejemplo», que abre el Co-Piloto en modo demostración con `estado-demo.json` y sin guardar.
- **Navegación lateral de Crece Millo:** Comunidad › Muro · En vivo · Emprendedores · **Co-Piloto de Negocio** (insignia PREMIUM).
- **Encabezado del módulo** (`frag` de diseño, en todas las pantallas):
  - Ruta de navegación «Comunidad › Emprendedores».
  - Título «Co-Piloto de Negocio» con la insignia PREMIUM.
  - Selector de producto activo.
  - Barra de riesgo 1–10 con su etiqueta.
  - COP/USD y TRM.
  - Las 7 pestañas.
- **Barra «Tu siguiente paso»:** siempre visible debajo del encabezado. Reglas en §4.2.
- **Aviso al pie, siempre visible:** «Herramienta educativa y de apoyo a decisiones. No es asesoría financiera. El dropshipping tiene riesgo: puedes perder lo que inviertas en producto y anuncios.»

## 2. Modelo de datos (reemplaza el `localStorage` del original)

El original guarda todo en `localStorage["trendo_copiloto_v3"]` con la forma `S` (L599–619). En Crece Millo esto pasa a la base de datos por usuario. Hay que conservar la misma forma lógica para poder importar respaldos JSON del original.

| Entidad | Campos (ver original) | Notas |
|---|---|---|
| `copiloto_settings` (1 por usuario) | `risk` (1–10, por defecto 5), `cur` ("COP" o "USD"), `trm` (3300), `active` (id de producto), `marca` (nombre de la tienda), `checks` (mapa id→bool de la Ruta), `ptab`, `pf` (filtros de la tabla) | `ptab` y `pf` pueden ser estado de interfaz |
| `copiloto_products` | Todos los campos de `PDEF` (L605–607) + `id`, `nombre`, `costo`, `precio`, `flete`, `fleteRet`, `entrega`, `com`, `costoReal` (bool), `score` (10 criterios 1–5) | Valores por defecto y preajustes: `DEF_PRODUCTS` (L592), `PRESET` (L608), `withDefaults` (L614) |
| `copiloto_tests` | `id`, `ts`, `risk`, `productId`, `producto`, `form` (fecha, canal, días, ads, imp, clics, ped, conf, ent, aov, notas, nombre, meta), `c` (resultado de `E.test`), `verdict` (texto), `meta` | Se crean desde Resultados de venta (L734) y desde Analizar test (L1073) |
| `copiloto_pricing` (1 por producto) | Supuestos `q` de Precio y margen (`pcDefaults`, L786) | En el original es `S.pc[productId]` |
| `copiloto_marketing` (1 por producto) | `tab`, `ang` (índice del ángulo), `off` (ediciones de precio, costo y % de cada oferta) | En el original es `S.mk[productId]` |
| `copiloto_plans` / `copiloto_sims` | `id`, `ts`, `tipo`, `risk`, `form`, `resumen` | Ver `savePlan` (L1095) y `saveSim` (L1128) |
| Formularios persistentes | `testForm`, `planForm`, `simForm` con sus valores por defecto (L600–602) | Se guardan al escribir |

- **Respaldo:** exportar e importar JSON con la forma `S` (L1140–1141). La importación del original sigue funcionando: «Importar respaldo de la app anterior».
- **CSV:** «Productos para Notion» (L772, separador `;` y las columnas exactas) y «Tests a CSV» (L1142).
- **Usuario nuevo:** se cargan los 6 productos por defecto con sus preajustes, como en el original.

## 3. Formato y unidades (es-CO)

El original usa `$129.900`, `3.30×` y `26,4%`. En Crece Millo:

- **Dinero:** `$ 129.900`, con espacio y punto de miles, sin decimales. Los negativos llevan el signo menos real: `−$ 12.000`. En USD: `US$ 39`, convertido con `n / trm`.
- **Porcentajes:** `26,4 %`, con coma decimal y espacio antes de `%`.
- **Multiplicadores:** `3,30×`.
- **Fechas:** `8 oct 2026`.
- **Los cálculos no cambian.** Solo cambia el formateo: crea `formatMoney`, `formatPct`, `formatX` y `formatMeses` (el `mesTxt` de L627) y úsalos en todas partes.
- **Detalle de `E.diagnose`:** arma textos con `money()` y `pct()`. En el motor portado, inyecta los formateadores es-CO con `setFormatters`. Para pasar `verificar.mjs`, usa los formateadores de `casos.mjs`.

## 4. Elementos globales

### 4.1 Riesgo 1–10

- **Etiqueta:**
  - 1–3: **Pasivo**.
  - 4–7: **Normal**.
  - 8–10: **Agresivo**.

  En el diseño son 10 segmentos con texto «5 · Normal», nunca solo color.
- **Reglas que gobierna:** salen de `E.rules(r)` (L474). Con n = (r−1)/9:

| Regla | Fórmula | r = 1 | r = 5 | r = 10 |
|---|---|---|---|---|
| Holgura exigida sobre el CPA máximo | 0,40 − 0,30n | 40 % | 26,7 % | 10 % |
| Margen mínimo (utilidad/pedido ÷ ticket) | 0,20 − 0,10n | 20 % | 15,6 % | 10 % |
| Pedidos para decidir | 10 | 10 | 10 | 10 |
| Corte sin ventas (× CPA máximo) | 1,5 + n | 1,5× | 1,9× | 2,5× |
| Asignación y reinversión en el simulador | 50 + 40n | 50 % | 72 % | 90 % |
| k, mult, start (analizador y plan) | 0,7 + 0,7n; 1,8 − 0,75n; 0,25 + 0,45n | ver `golden.json` | | |
| Subida de presupuesto al escalar | round(15 + 15n) | 15 % | 22 % | 30 % |

### 4.2 «Tu siguiente paso» (`renderCoach` y `coach`, L1043–1056)

Se evalúa en este orden y la primera regla que se cumple gana:

| Condición | Mensaje (resumen) | Botón |
|---|---|---|
| Menos de 3 productos | Carga al menos 3 productos candidatos… | Alta rápida |
| Costos estimados (sin `costoReal`, `sku` ni `linkDropi`) y sin tests | Los costos son estimados… carga el costo real | Ir a la ficha |
| No pasa la validación | No deja margen suficiente para tu riesgo | Precio y margen |
| Precio menor que el mínimo saludable | Tu precio está por debajo del mínimo saludable… recomendado X | Revisar precio |
| Sin upsell (`upTasa` = 0) | Agrega un combo o un upsell… | Ver ofertas |
| Sin tests | Todo listo para testear… lanza con $X diarios | Plan de lanzamiento |
| Veredicto «Pausar / matar» | Mata el test… y pasa al siguiente (mejor puntaje no descartado) | Abrir siguiente |
| Veredicto «Escalar…» | Está ganando. Sube el presupuesto X % cada 2–3 días… | Simular crecimiento |
| Otro | «{veredicto}. {porqué} Revisa el diagnóstico…» | Ver diagnóstico |

En el diseño, los emojis del original se reemplazan por íconos lucide: gift, rocket, search, calculator, film, octagon, trending-up y zap.

### 4.3 Glosario y ayudas «i»

- **Glosario:** 20 términos (`GLOS`, L628). Se abre en un panel lateral con buscador (`CopGlosarioEscritorio.png`).
- **Ayudas «i»:** cada indicador cuyo nombre coincide con la expresión de `GLOS` muestra un botón «i». En el original es un `title` (`tipFor`, L648). En Crece Millo debe ser un tooltip accesible por teclado (botón con `aria-describedby`).

### 4.4 Estados de color

- **Tonos del original:** `g` = bien, `a` = atención, `r` = riesgo o peligro, `b` = info.
- **Equivalencia en Crece Millo:**
  - `g` → `--pos`
  - `a` → `--warn`
  - `r` → `--neg`
  - `b` → `--info`
- **Siempre con ícono y palabra:** ✓, ⚠, ✕ o ⓘ. Ver la función `kpi` del diseño.
- **El bermellón de la marca nunca indica un estado.**

## 5. Secciones

Para cada sección se indica: pantalla de diseño, funciones del original y comportamiento. Los números de ejemplo son los de `estado-demo.json`.

### 5.1 Ruta (`CopInicioEscritorio`, L655–686)

- **Fases:** 6 fases (`FASES`), con 23 casillas.
  - Las casillas con `auto` se marcan solas según `autoCheck`: f1a ≥ 3 productos; f1b costo real, SKU o link; f1c pasa la validación; f3b hay al menos un test; f4a hay un test «Escalar». Se ven deshabilitadas, con la insignia «auto».
- **Fase actual:** la primera con menos del 100 %.
- **Resumen:** fase actual, riesgo, producto activo, si pasa la validación, CPA objetivo y presupuesto por test.
- **Ritmo operativo:** tabla de 4 filas. En el original las referencias dicen «Pestañas 2 y 4»; en Crece Millo usa los nombres de las secciones.
- **Módulos:** Dropshipping (activo); Bolsa y Propiedad raíz como **Futuro**.
- **«Ir a la herramienta de esta fase»:** cada fase con `tab` lleva a su sección.

### 5.2 Productos

**Base de datos** (`CopProductosEscritorio`, L707–716)
- **6 indicadores:**
  - Productos (n clase A · n clase B).
  - En test.
  - Ganadores (Ganador o Escalando).
  - Gasto total en ads.
  - Recaudo total.
  - Utilidad neta real (ROAS global).
- **Tabla:** 14 columnas, desplazamiento horizontal y fila activa resaltada.
- **Filtros:** búsqueda (nombre + categoría + sub-nicho), etapa (8 `ETAPAS`) y orden (puntaje, utilidad neta, utilidad por pedido, gasto, nombre).
- **Acciones:** Alta rápida · + En blanco · CSV para Notion.
- **Sugerencia:** veredicto del agregado de sus tests, o «Sin datos».
- **Insignias:**
  - Etapa: Ganador y Escalando = bien; En test y Validado = atención; Descartado y Pausado = riesgo; las demás, neutras.
  - Clase: A = bien, B = atención, C = riesgo.

**Ficha** (`CopFichaEscritorio`, `FICHA` L690)
- 3 grupos (Identificación, Economía, Mercado y estrategia) con los mismos campos y tipos.
- Se guarda al escribir. Cambiar el costo marca `costoReal = true`.
- Acciones: Duplicar producto y Eliminar producto. Eliminar no se permite si es el último, y siempre pide confirmación en un diálogo.

**Evaluación inicial** (`CopProductosEscritorio`, `E.evaluate` L514)
- 10 criterios de 1 a 5 con su peso (`E.CRIT`). En el diseño es un control segmentado 1–5 (`role="radiogroup"`).
- Puntaje = 65 % criterios + 35 % economía (margen ÷ 30 %).
- **Clase:**
  - C si no pasa la validación.
  - A si el puntaje es ≥ 75.
  - B si es ≥ 60.
  - C en los demás casos.
- Avisos `warn`, en este orden: validación, INVIMA, precio frente a la competencia (±15 %), competidores ≥ 15, precio tachado ≤ precio, sin upsell.
- **Unidad económica:** 10 indicadores y el aviso de validación, con los textos exactos de L726–729.

**Resultados de venta** (`CopResultadosEscritorio`, L730–740)
- Formulario de 11 campos.
- **Vista previa en vivo con `E.test`:** utilidad neta, ROAS, CPA, CTR y conversión.
- «Registrar resultado» solo se habilita si hay gasto o pedidos.
- **Al registrar:**
  - Se crea un test con su veredicto.
  - Si la etapa era Idea, Investigando o Validado, pasa a «En test».
  - Aviso: «Resultado registrado».
- **Historial:** 17 columnas, del más reciente al más antiguo. Eliminar pide confirmación.

**Análisis y estrategia** (`CopAnalisisEscritorio`, L741–763)
- **Estado vacío:** si no hay tests, mensaje y enlace a Resultados de venta.
- **9 indicadores** con sus umbrales:
  - CTR: bien si ≥ 1,2 %; atención si ≥ 0,8 %.
  - Conversión: bien si ≥ 1,5 %; atención si ≥ 0,8 %.
  - % confirmación: bien si ≥ 80 %.
  - % entrega: bien si ≥ 80 %; atención si ≥ 70 %.
  - CPA: bien si ≤ objetivo; atención si ≤ máximo.
- **Embudo:** el ancho es la raíz cuadrada del valor ÷ el máximo, y el % se calcula frente a la etapa anterior.
- **Esperado vs. real:** 5 filas. El botón «Usar el % de entrega real como esperado» actualiza `entrega`.
- **Evolución:**
  - **Cambio frente al original:** el original dibuja 3 líneas en un eje. En Crece Millo se mantiene un solo eje, cada serie con un trazo distinto y «Ver datos en tabla».
- **Diagnóstico:** `E.diagnose`.
- **Estrategia sugerida:** veredicto + porqué + plan (L761).
- **Acciones:**
  - «Aplicar etapa sugerida» usa `STAGE_FROM` (L704).
  - «Pedir estrategia al mentor» (§6).

**Precio y margen** (`CopPrecioEscritorio`, ya construido sobre el motor real, L781–847)
- 21 supuestos en 4 grupos (`PCF`), cada uno con campo + deslizador y sus mínimos, máximos y pasos.
- Valores por defecto de `pcDefaults`:
  - `cpa0` = CPA real si hay 3 o más pedidos; si no, 20 % del precio.
  - El techo se toma de la competencia × 1,15 o del precio tachado.
  - `margenMin` = round(14 − 6n).
- 8 indicadores, alertas, desglose «¿A dónde va cada peso?», salud 6/6 (`H5`), comparación de capital por precio con `E.sim` y tabla de precios.
- **Acciones:** Aplicar precio recomendado · Aplicar precio evaluado · Guardar supuestos en la ficha · Restablecer.
- **Cambio frente al original:** la gráfica tiene doble eje (utilidad mensual y margen %). En Crece Millo va en **dos gráficas apiladas con el mismo eje X**, como en el diseño.

### 5.3 Alta rápida (`CopAltaRapidaEscritorio`, L967–1035)

- **Ventana modal** con foco atrapado; Esc cierra.
- **Izquierda:**
  - Pegar el texto de Dropi y «Leer el texto pegado» (`qaParse` extrae nombre, costo, precio sugerido y stock con expresiones regulares).
  - Nombre y costo (obligatorios), precio sugerido, categoría (detectada por palabras clave `KW` y marcada «detectada»), tamaño del paquete (flete 16.000, 18.000 o 22.000), descripción, link, stock.
  - Casilla combo 2× (activa por defecto).
- **Derecha:**
  - Precio sugerido (`qaPrice` sobre `E.pricing`), precio tachado (~30 %), 6 indicadores y aviso del combo.
  - Campos con la etiqueta «automático»: público, beneficio, problema, ángulos, objeciones e INVIMA.
  - Puntajes estimados por categoría (`CAT_SC`).
- **Acciones:** Guardar producto · Mejorar textos con IA (`qaAI`, §6) · Recalcular.
- **Aceptación:** con «Masajeador de cuello eléctrico», $ 45.000 y la descripción del diseño, el resultado debe ser precio $ 169.900, tachado $ 239.900, utilidad por pedido $ 76.502 y clase A con 77.

### 5.4 Marketing (`CopOfertas`, `CopCreativos`, `CopPagina`, `CopLanzamiento`, L850–962)

- **Encabezado:**
  - «Marketing para {producto}» con categoría, público y beneficio.
  - Campo «Nombre de tu tienda» (`S.marca`), que se usa en los mensajes de WhatsApp.
  - Botón «Editar público, beneficio y ángulos», que lleva a la ficha.
- **Contexto:** `mkCtx` (L862) usa los textos de la ficha o, si faltan, los del nicho (`NICHE`, 10 categorías).
- **Ofertas** (`offerDefs` y `offerCalc`, L868–899):
  - 6 tarjetas editables (precio, costo, % de aceptación) con su resultado en vivo y su guion para copiar.
  - «Usar esta oferta en el producto» escribe el upsell en el producto y reinicia los supuestos de precio.
  - Ideas de complementos del nicho.
  - Mentor de ofertas.
- **Creativos** (`angles`, `hooks`, `scripts`, `adCopy`, L901–916):
  - Selector de ángulo, que se guarda por producto.
  - 10 ganchos, 4 guiones con tiempos, 3 textos de anuncio, 5 titulares, matriz 3×3 y checklist de 8 puntos. El checklist **es nuevo como estado guardado**: en el original es visual; guárdalo por producto.
  - Botón Copiar en cada bloque, con el aviso «Copiado».
- **Página y WhatsApp** (`renderPage`, L925): título, precio con su ahorro, beneficios, 6 preguntas frecuentes (3 salen de las objeciones), descripción completa y 7 mensajes de WhatsApp con `{variables}`.
- **Plan de lanzamiento** (`renderLaunch`, L939):
  - 4 indicadores: pauta diaria = máx(20.000, presupuesto del test ÷ 4).
  - Paso a paso de 5 días.
  - Tabla «Qué mirar».
  - Botones a Creativos y a Resultados.
- **Formato:** las plantillas son del original y no se cambian. Solo se cambia el formato del dinero a es-CO.

### 5.5 Analizar test (`CopTestEscritorio`, `CopTestMovil`, L1058–1076)

- **Formulario de 12 campos** (`TF`), con valores por defecto en `testForm`. Se guarda al escribir.
- **Veredicto** (`E.verdict`): Escalar, Escalar con cautela, Mantener y optimizar, Optimizar, Pausar / matar, Seguir midiendo o Faltan datos. Va en grande, con ícono, color del tono y su explicación.
- **Aviso:** si el CPA supera el CPA máximo, aparece «Cada pedido te cuesta X».
- **10 indicadores** con los umbrales de L1066–1069 (entrega: bien si ≥ 75 %; atención si ≥ 65 %).
- **Guardar test:** solo si hay gasto. Lo guarda en la bitácora y en el historial del producto, y pasa la etapa a «En test» si correspondía.
- **«Cómo decide el Co-Piloto»:** es un texto didáctico nuevo. Resume reglas existentes, no agrega lógica.

### 5.6 Planificar capital (`CopPlanEscritorio`, L1077–1096)

- **Formulario** (`PLF`):
  - Unidad mes o semana.
  - Margen en % o en monto.
  - «Usar margen del producto» = `cmRatio`.
  - «Usar mis tests reales» = cm real (deshabilitado si no hay tests).
- **Cálculo:** `E.plan`.
- **6 indicadores.**
- **Alerta ROAS real frente al objetivo:**
  - Bien si es ≥ 1.
  - Atención si es ≥ 0,85.
  - Riesgo en los demás casos.
  - Info si no hay tests.
- **Alerta de pérdida a pleno.**
- **Tabla por intervalo.**
- **Acciones:** Guardar plan · Mentor de plan.

### 5.7 Crecer (`CopCrecerEscritorio`, L1098–1131)

- **Formulario** (`SF`): «Sugerir CPA» (`cpaSuggest`: CPA real o CPA objetivo) y «Aplicar mi perfil de riesgo» (asignación y reinversión según `rules`).
- **Cálculo:** `E.sim` con `testeo` = presupuesto por test × productos a testear.
- **8 indicadores:** patrimonio, ROI, tasa mensual, recuperas, duplicas, vs. CDT, fase de testeo y pauta diaria final.
- **Alerta de holgura del CPA:** riesgo, atención o bien.
- **Alerta de quiebra.**
- **Gráfica:** capital, capital + retirado, CDT y la línea de fin del testeo.
- **Escenarios:** pesimista (entrega −10 pp, CPA +25 %), base y optimista (+5 pp, −15 %).
- **Sensibilidad:** CPA × 0,6–1,4 frente a entrega del 60 al 90 %.
- **Detalle por ciclo, CSV y Guardar simulación.**
- **Cambios de forma:**
  - Se agrega arriba un aviso fijo: «Es una simulación con tus supuestos, no una promesa…», por el tono de Crece Millo (sin promesas de riqueza).
  - El mapa de calor usa los tonos `pos`, `warn` y `neg` con ícono en la leyenda, en vez de opacidades de verde y rojo.

### 5.8 Bitácora (`CopBitacoraEscritorio`, L1132–1148)

- **Contenido:**
  - 6 indicadores.
  - Tabla de tests (eliminar con confirmación).
  - Planes y simulaciones (estado vacío con ilustración y acción).
  - Revisión semanal con el mentor.
  - Respaldo: exportar o importar JSON, tests a CSV y «Borrar todo» (diálogo de confirmación con texto, nunca `confirm()` nativo).
- **Cambio de texto:** «Tus datos viven en este navegador» pasa a «Tus datos se guardan en tu cuenta de Crece Millo».

## 6. Mentor con IA

El original llama a `window.cowork.askClaude` (L1155) y, si no existe, deja copiar el prompt. En Crece Millo:

- **Ruta de servidor** `POST /api/copiloto/mentor`. Llama a la API de Claude desde el servidor y nunca expone la clave en el cliente. Exige sesión Premium y tiene límite de uso por usuario (por definir).
- **Armado del prompt:** `BASE` (L1150) + `ctx()` (L1151) + el prompt de cada acción + «Responde SOLO JSON válido con esta forma: {schema}».
- **7 acciones, cada una con su esquema** (copiar del original):

| Acción | Dónde | Función | Esquema JSON |
|---|---|---|---|
| Estrategia del producto | Análisis | `mentorProduct` L775 | estado, diagnostico, estrategia[3], creativos, pagina_oferta, logistica, presupuesto, siguiente_paso |
| Ofertas personalizadas | Ofertas | `mentorOffers` L958 | upsells[], downsells[], cross_sells[] (nombre, precio, por_que, mensaje) |
| Más creativos | Creativos | `mentorCreatives` L961 | ganchos[], guiones[] (titulo, duracion, escenas[]), textos[], titulares[] |
| Mejorar textos (alta rápida) | Alta rápida | `qaAI` L1036 | nombre_corto, categoria, publico, beneficio, dolor, angulos[5], objeciones[5], invima, score{10} |
| Análisis del test | Analizar test | `mentorTest` L1162 | veredicto, diagnostico, acciones[], ajuste_ads, foco_ux, riesgo, siguiente_paso |
| Propuesta de capital | Planificar capital | `mentorPlan` L1166 | proposito, propuesta_capital, proximos_pasos[3], justificacion_riesgo, advertencia |
| Revisión semanal | Bitácora | `mentorWeekly` L1170 | resumen, escalar[], optimizar[], matar[], siguiente_test, capital_semana, foco_semana[3] |

- **Respuesta en la interfaz:** tarjeta del mentor con esqueleto mientras carga, `aria-live="polite"` y, al final, «Respuesta generada por IA. No es asesoría financiera.».
- **Si falla:** mostrar el error y la opción «Copiar el análisis para Claude», como en el original.
- **Validación de la respuesta:** usar un esquema (zod) antes de pintar.

## 7. Diseño · reglas de traducción

- **Tokens:** usa solo los de `tokens.css` (paquete `crece-millo-v1`). Componentes nuevos de este módulo:
  - Tarjeta de indicador.
  - Veredicto grande.
  - Deslizador con campo.
  - Control segmentado 1–5.
  - Tarjeta de oferta.
  - Bloque para copiar.
  - Burbuja de WhatsApp.
  - Línea de tiempo del lanzamiento.
  - Mapa de calor accesible.
  - Recuadro didáctico «¿Para qué sirve?» (borde izquierdo `accent`).
  - Tarjeta del mentor.
- **Escritorio:** formulario de 360 px a la izquierda y resultados a la derecha en Analizar test, Planificar capital y Crecer. Tablas anchas con desplazamiento horizontal dentro de su tarjeta.
- **Móvil 390:**
  - Pestañas con desplazamiento horizontal.
  - Formularios en una sola columna.
  - El resultado principal (veredicto, precio recomendado) va primero y el formulario se abre en una hoja inferior (`CopMovil*`, `CopTestMovil`).
  - Áreas táctiles de 44 px o más.
- **Emojis:** dentro de los textos de WhatsApp y anuncios se quedan, porque son contenido que la persona copia. En la interfaz se reemplazan por íconos.
- **Accesibilidad:**
  - Tabs y subtabs con `aria-current`.
  - Deslizadores con etiqueta y campo numérico enlazado.
  - Gráficas con `role="img"` y resumen en `aria-label`, más «Ver datos en tabla».
  - Avisos de copiado con `role="status"`.

## 8. Plan de construcción sugerido

1. Portar el motor a `lib/copiloto/engine.ts` y pasar `verificar.mjs` (compilando a JS o con tsx).
2. Crear el modelo de datos y la importación de `estado-demo.json` como semilla de demostración.
3. Crear el layout del módulo: encabezado, «Tu siguiente paso», pestañas y pie.
4. Construir las pantallas en este orden: Productos (tabla + ficha + evaluación), Precio y margen, Resultados y Análisis, Analizar test, Marketing, Crecer, Planificar capital, Bitácora, Alta rápida, Ruta y Glosario.
5. Mentor con IA (ruta de servidor).
6. **Aceptación:** con `estado-demo.json`, cada pantalla muestra los mismos números que `original/textos-con-demo/` (con el formato es-CO).

## 9. Pendientes y decisiones abiertas

- **Precio Premium y cobro en línea:** «futuro». Hoy, «Activar Premium» abre una lista de acceso anticipado.
- **Límite de consultas al mentor** por usuario y costo de la API.
- **Datos ya guardados por usuarios en el original:** ofrecer «Importar respaldo» en la primera visita.
- **Simulador:** con supuestos optimistas da crecimientos muy altos (ROI de 626 % en 6 meses con los datos de demostración). El modelo no se cambia, pero conviene revisar si se agrega un tope de pauta mensual o un aviso más fuerte. Es una decisión de negocio de Alejandro.
- **Integraciones con Notion y Drive:** hoy son exportaciones CSV y JSON. No hay integración directa: no la inventes.
