# Crece Millo · Entrega de diseño para Claude Code

Marca «Umbral» (tinta y bermellón) · v1.0 · 13 oct 2026 · Next.js 15 + React 19 + Tailwind CSS 4

**Cómo usar este paquete:** abre Claude Code en el repositorio de Crece Millo, copia esta carpeta completa dentro del repo (por ejemplo en `docs/diseno/`) y pega el contenido de `PROMPT-claude-code.md`. Orden sugerido: (1) tokens, tema y tipografía, (2) logo y activos, (3) componentes, (4) pantallas en el orden de la sección 4. En cada fase: contraste, móvil a 390 px y pruebas.

**Fuente visual:**
- `pantallas/*.png`: captura de cada pantalla.
- `pantallas/*.html`: la misma pantalla en HTML estático, para abrir en el navegador y copiar medidas y estilos.
- Canvas «Crece y Co-Piloto · Diseño», páginas **Marca final (Umbral)** y **Crece Millo · Pantallas** (12 secciones, escritorio 1366 y móvil 390, claro y oscuro, con notas de comportamiento).

---

## 0. Qué cambió frente a la v0.1

1. **Nueva marca «Umbral».** Una puerta torii con una llama entre los pilares. Reemplaza el símbolo de la C con el punto durazno en todas las pantallas.
2. **Nueva paleta:**
   - Sumi (tinta) `#1C1C21` y washi `#F5F2EC` como base.
   - Bermellón como acento: `#E0482D` para la marca y `#D1401F` para acción con texto blanco.
   - En oscuro: noche `#111114` y bermellón `#FF6B4A`.
   - Desaparecen el petróleo y el durazno.
   - Los colores de estado no cambian.
3. **Nueva sección Comunidad.** En la navegación lateral, el grupo «Emprendimiento» pasa a ser «Comunidad», con estas entradas:
   - Muro
   - En vivo
   - Emprendedores (Premium)
   - Co-Piloto de Negocio (Premium)

   El Co-Piloto y el dropshipping viven ahora dentro de **Comunidad › Emprendedores**.
4. **Pantalla nueva:** Comunidad › Emprendedores, en escritorio y móvil, claro y oscuro, con Premium y sin Premium.
5. **Activos con texto convertido a trazos** y exportados a PNG: favicon, ícono de app, imagen para redes y logos @2x.

## 1. Tokens (formato 1)

- `tokens.css` contiene:
  - `:root` (claro) y `[data-theme="dark"]` (oscuro).
  - Un bloque `@theme inline` para Tailwind 4 (`bg-surface`, `text-ink`, `bg-accent`, `fill-mark`…).
- `tokens.json` es el equivalente, con un grupo `brand` para la paleta de marca.
- **Token nuevo `mark`:** bermellón de marca. Úsalo solo para la llama del logo, ilustraciones y gráficos grandes. Nunca para texto, porque da 4,1:1.
- **Roles clave:**
  - **Claro:**
    - `brand` = sumi: botón principal, enlaces y pestaña activa.
    - `accent` = `#D1401F`: insignia PREMIUM, indicador activo y logros, siempre con texto blanco (4,7:1).
    - `nav-bg` = sumi.
    - `chart-1` = bermellón `#C63E22` (5,1:1).
    - `chart-2` = grafito.
  - **Oscuro:**
    - `brand` = `#F2EFEA`: botón claro con texto noche.
    - `accent` = `#FF6B4A`, con texto noche (6,7:1).
- **Contraste verificado** con WCAG 2.2 AA:
  - `muted` 5,6:1 sobre `bg` y 4,8:1 sobre `surface-3`.
  - `control-border` 3,6:1.
  - Texto principal 15:1 o más en ambos modos.
- **El bermellón nunca comunica error.** El negativo sigue siendo `#B42318` y siempre va con ícono y texto.
- **Tema:** selector Claro · Oscuro · Sistema, en la barra superior y en Configuración. Un script en `<head>` resuelve la preferencia y escribe `data-theme="light|dark"` en `<html>` antes del primer pintado.

## 2. Escala tipográfica (formato 2)

Fuentes Google: **Outfit** 400/500/600 (títulos y logotipo) e **IBM Plex Sans** 400/500/600 (texto e interfaz). En cifras, siempre `font-variant-numeric: tabular-nums`.

| Uso | Familia | Tamaño / interlineado | Peso | Extra |
|---|---|---|---|---|
| Cifra grande | Plex | 40 / 44 | 600 | tnum, −0,02 em |
| Título de página | Outfit | 32 / 38 (móvil 26 / 32) | 500 | −0,02 em |
| Respuesta principal (frase) | Outfit | 32 / 38 escritorio · 24 / 30 móvil | 500 | |
| Sección | Outfit | 20 / 26 | 500 | |
| Tarjeta | Plex | 16 / 22 | 600 | |
| Valor de indicador | Plex | 22 / 28 | 600 | tnum |
| Cuerpo | Plex | 15 / 24 (lección 16 / 26; publicación del muro 15 / 23) | 400 | |
| Tabla / lista | Plex | 14 / 20 | 400–500 | tnum en cifras |
| Ayuda | Plex | 12 / 16 | 400 | color `muted` |
| Sobretítulo | Plex | 11 / 16 | 600 | 0,1 em, mayúsculas |
| Logotipo | Outfit | según el activo | «CRECE» 600 + «MILLO» 400 | 0,08 em, mayúsculas; en la app usa el SVG |

## 3. Componentes (formato 3)

Medidas en px. Todos los elementos interactivos tienen estos estados: normal, hover (120 ms), foco (anillo de 2 px en `focus`, separado 2 px), presionado, deshabilitado y cargando. Los campos además tienen estado de error.

| Componente | Variantes | Medidas | Notas de estado |
|---|---|---|---|
| Botón | primario, secundario, fantasma, peligro, acento | alto 44 (md), 36 (sm, solo escritorio), 52 (lg, acción principal en móvil); padding 16; radio 8; texto 14/600 | hover `brand-hover`; presionado `brand-pressed`; deshabilitado `surface-3` + `muted`; cargando: spinner de 16 + verbo en gerundio, `aria-busy` |
| Campo de dinero | normal, foco, error, deshabilitado | alto 44 (móvil 48), radio 8, borde 1 `control-border`; prefijo «$» en `muted`; texto alineado a la derecha, tnum | `inputmode="numeric"`, punto de miles al escribir, sin decimales; error: borde 2 `neg` + mensaje con ícono |
| Selector / casilla / radio | — | alto 44; casilla de 20×20 con área táctil de 44 | `accent-color: var(--brand)` |
| Control segmentado | tema, tipo de movimiento, escenario, filtro | contenedor `surface-2` con padding 3–4, opción de alto 36–40, radio 8 | seleccionado: `surface` + `shadow-sm`; `role="radiogroup"` |
| Tarjeta | normal, destacada (borde 2 `brand`), tenue (`surface-2`), oscura (`nav-bg`, para «Tu siguiente paso» y la herramienta principal) | radio 12, borde 1 `border`, padding 16–24 | sin sombra salvo en capas flotantes |
| Tarjeta de indicador | con dato, «Datos insuficientes», cargando | padding 16; etiqueta 13 `muted`; valor 22/600; subtexto 12 | estado siempre con ícono + palabra (Bien / Atención / Riesgo) |
| Aviso | bien, atención, peligro, info | radio 12, padding 12×14, fondo `*-soft` | ícono 18–20 + palabra en negrita + texto |
| Insignia | ingreso, gasto, transferencia, previsto, conciliado, anulado, por confirmar, PREMIUM, tipo de publicación | alto 24 (22 en móvil), radio 6, 12/600 | anulado: texto tachado; PREMIUM: `accent` + `accent-ink` |
| Barra de progreso / presupuesto | normal, atención, pasado | alto 6–10, radio total; marca «hoy» de 2×16 en `ink`; comprometido rayado | estado escrito debajo |
| Tabla | — | celda con padding 10–12; encabezado 12/500 `muted`; desplazamiento horizontal dentro del contenedor | fila resaltada: `brand-soft`; importes con signo menos real |
| Gráficos | línea (real sólida, proyectado discontinua, estimado punteada), barras apiladas, barras horizontales | un solo eje; punto destacado `chart-mark` | siempre con leyenda escrita y «Ver datos en tabla» |
| Navegación lateral | activo, hover, foco, normal | ancho 240, ítem de alto 34–44, fondo `nav-bg`; activo: `nav-active-bg` (bermellón translúcido) | logo Umbral en cuadro blanco; insignia PREMIUM en Emprendedores y Co-Piloto |
| Pestañas de sección | — | alto 44, indicador inferior de 3 px (`brand` en el Co-Piloto, `accent` en Comunidad) | `aria-current="page"` |
| Navegación inferior móvil | 5 destinos con botón + central | alto 72; FAB de 56 con borde 4 `bg` | «Más» abre una hoja con el resto |
| Hoja inferior / panel lateral | registro rápido | hoja: radio 16 arriba, asa de 40×4; panel: ancho 440 | entra en 260 ms; Esc cierra; foco atrapado |
| Teclado de importe | — | teclas de alto 52, radio 8, `surface-2` | teclas 000 y borrar |
| Selector de categoría con íconos | — | celdas de alto 60–64, 4 columnas | seleccionado: borde 2 `brand` + `brand-soft` |
| Diálogo de confirmación | — | radio 16, padding 24, `shadow-lg` | foco inicial en «Cancelar» |
| Estado vacío | — | ilustración de horizonte (línea + sol en `mark`) + título + 1 frase + 1 acción | nunca solo texto |
| Tarjeta de lección | con video, en progreso | miniatura 16:9, barra de avance | «Retomar en el minuto X» |
| Insignia de logro | — | 96–120, fondo `accent` | solo en logros |
| **Nuevo · Publicación del muro** | avance, duda, resultado de test; con test adjunto; con respuesta destacada | tarjeta con padding 16–18; avatar de 36 (32 en móvil) con iniciales; insignia de tipo con ícono; acciones fantasma sm «Me sirve · N», «N comentarios», guardar | test adjunto: subtarjeta `surface-2` con veredicto (ícono + texto); botones con `aria-pressed` |
| **Nuevo · Publicación fijada / video** | — | portada 16:9 (210 escritorio, 180 móvil) en `nav-bg`, botón de play de 64 blanco, duración abajo a la derecha, «Fijado» arriba a la izquierda | el video lleva subtítulos y transcripción |
| **Nuevo · Compositor** | Premium, sin Premium (se oculta y aparece un aviso info) | campo de 44 en `surface-2`; chips Avance / Duda / Adjuntar test; Publicar (sm primario) | etiqueta accesible oculta |
| **Nuevo · Tarjeta de evento en vivo** | próximo, en vivo, grabado | bloque de fecha 56 (mes en `accent`, día 22/600); insignia de estado con punto | «Recordarme» / «Enviar mi tienda» |
| **Nuevo · Tarjeta de herramienta Premium** | activa, bloqueada | activa: `nav-bg` con producto activo y precio recomendado; bloqueada: borde 2 `brand`, candado, lista de lo que incluye, aviso de riesgo y «Ver Premium» | precio «[por definir]» |
| **Nuevo · Pila de avatares** | — | 30 px, superpuestos −8, borde 2 `surface` | `aria-hidden`, con el conteo escrito al lado |

## 4. Pantallas (formato 4)

Todas en escritorio 1366 y móvil 390, claro y oscuro, y en estado vacío donde aplica. Las capturas están en `pantallas/` con el mismo número.

1. Panel de finanzas: `PanelEscritorio*`, `PanelMovil*` (01–03)
2. Registro rápido y Movimientos: `MovEscritorio*`, `MovMovil*` (04–05)
3. Primer uso y diagnóstico: `Diag*` (06–07)
4. Presupuesto: `Pres*` (08–09)
5. Flujo de caja: `Flujo*` (10–11)
6. Deudas: `Deudas*` (12–13)
7. Simulador: `Sim*` (14–15)
8. Lección: `Leccion*` (16–17)
9. Inicio de la universidad: `Uni*` (18–19)
10. Landing, Ingresar y Crear cuenta: `Acceso*` (20–21)
11. Co-Piloto de Negocio (Premium): Ruta, Precio y margen (con el motor real), página Premium y móvil (22–25). Ruta de navegación: **Comunidad › Emprendedores**.
12. **Nuevo · Comunidad › Emprendedores** (26–31): la sección de la comunidad que reúne el dropshipping y el Co-Piloto.
    - **Encabezado:**
      - Ruta «Comunidad › Emprendedores», título «Emprendedores · Dropshipping» con la insignia PREMIUM.
      - Pila de avatares: 1.284 miembros, 96 activos hoy.
      - Pestañas: Muro · Ruta · En vivo (1) · Retos · Miembros.
    - **Columna principal (muro):**
      - Compositor.
      - Video fijado de Alejandro (marcador de su contenido).
      - Publicaciones de miembros (ficticias):
        - Laura M.: resultado de test con veredicto «Optimizar» y una respuesta destacada.
        - Andrés P.: duda sobre devoluciones.
        - Valentina R.: avance.
    - **Columna derecha:**
      - Tus herramientas: Co-Piloto con el producto activo «Masajeador de ojos térmico», precio recomendado $ 249.900 y rango $ 198.000 – $ 270.000, más atajos a la calculadora, la bitácora y el plan de capital.
      - Tu ruta de dropshipping: 9 de 23 pasos, fase 3.
      - Próximo en vivo: jue 15 oct 2026, 7:00 p. m.
      - Reto de la semana: 1 de 3.
      - Normas del grupo.
    - **Sin Premium:** el muro se puede leer; un aviso info explica que publicar y usar las herramientas requiere Premium, y la tarjeta de herramientas aparece bloqueada con el aviso de riesgo.
    - **Móvil:**
      - Tarjeta del Co-Piloto arriba, con la ruta en 6 segmentos.
      - Compositor de una línea, evento en vivo, video fijado y 2 publicaciones.
      - Reto de la semana.

Sistema de diseño navegable: `CM-Kit` (32). Marca: `CM-Umbral` (33).

## 5. Activos (formato 5)

En `assets/`. Todo el texto de los SVG está convertido a trazos y no depende de fuentes instaladas.

- **Símbolo:**
  - `simbolo.svg`: cuadro sumi con la puerta blanca y la llama.
  - `simbolo-claro.svg`: para fondos oscuros.
  - `simbolo-sin-fondo.svg` y `simbolo-sin-fondo-blanco.svg`.
  - `simbolo-una-tinta-negra.svg` y `simbolo-una-tinta-blanca.svg`.
- **Favicon:**
  - `favicon.svg`, con trazo grueso para 16–20 px.
  - `favicon.ico`, con 16, 32 y 48 px.
- **App:**
  - `app-icon.svg`, a sangre: el sistema operativo redondea las esquinas.
  - `app-icon-maskable.svg`, con zona segura.
- **Logos:**
  - `logo-horizontal.svg`, `logo-horizontal-oscuro.svg`, `logo-horizontal-una-tinta.svg`, `logo-horizontal-blanco.svg`.
  - `logo-vertical.svg` y `logo-vertical-oscuro.svg`.
- **Redes:** `imagen-redes-1200x630.svg`, con el lema «Cruza la puerta. Enciende lo tuyo.».
- **`png/`:**
  - `favicon-16/32/48.png`.
  - `apple-touch-icon-180.png`.
  - `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
  - `simbolo-1024.png`.
  - `imagen-redes-1200x630.png`.
  - `logo-*@2x.png`.
- **Reglas de uso:**
  - Tamaño mínimo de 24 px con el trazo normal; a 20 px o menos, usa el favicon.
  - Espacio libre alrededor igual al alto de la llama.
  - No cambies el color de la llama, no lo rotes, no lo estires y no le pongas degradados.
- **Ilustraciones:** horizonte (línea + sol en `mark`) hecho en SVG dentro de cada pantalla. Conviene volverlo un componente `<Horizonte />`.

## 6. Cambios de texto (formato 6)

| Pantalla | Texto actual | Texto nuevo |
|---|---|---|
| Global | Crece · Universidad | CRECE MILLO (logo) · «Crece Millo» en texto |
| Navegación | Emprendimiento › Co-Piloto de Negocio | **Comunidad** › Muro · En vivo · Emprendedores · Co-Piloto de Negocio |
| Co-Piloto (ruta de navegación y sobretítulos) | Crece Millo › Emprendimiento | Comunidad › Emprendedores |
| Landing | En Emprendimiento ya está el Co-Piloto de Negocio… | En la Comunidad, la sección Emprendedores ya tiene el Co-Piloto de Negocio… |
| Comunidad (nuevo) | — | «Emprendedores · Dropshipping» · «Construye tu tienda acompañado: herramientas, una ruta clara y gente que va en lo mismo.» |
| Comunidad (nuevo) | — | Compositor: «Comparte un avance, una duda o el resultado de un test» |
| Comunidad (nuevo) | — | Sin Premium: «Puedes leer el muro. Para publicar, comentar y usar las herramientas de esta sección necesitas Premium.» |
| Comunidad (nuevo) | — | Normas: «Compartimos números reales, también los malos.» · «Nada de promesas de ganancias rápidas.» · «Preguntar no es de novatos: es de los que avanzan.» |
| Comunidad (nuevo) | — | Pie: «Comunidad educativa. Los resultados de otros miembros no son garantía de los tuyos. No es asesoría financiera.» |
| Panel | Tu centro de control | ¿Cómo voy este mes? → frase de estado, p. ej. «Vas bien: tu caja cubre el mes. Ojo con Mercado, que ya va en 83 %.» |
| Panel | Recomendaciones | Qué puedes hacer |
| Panel | Caja proyectada · próximos 90 días | Tu caja en los próximos 90 días · «El punto más bajo llega el 7 dic 2026, con $ 3.820.000, porque…» |
| Panel | Completa tu diagnóstico financiero | Diagnóstico: 6 de 8 pasos. Con los dos que faltan… |
| Movimientos | Pendientes y próximos 30 días | Por confirmar y próximos 30 días |
| Movimientos | Realizado (acción) | Ya lo pagué (gastos vencidos) |
| Movimientos | Filtrar | (se quita: filtra al instante) · Limpiar → Limpiar filtros |
| Nuevo movimiento | Registrar gasto | Guardar gasto · Guardar y otro |
| Nuevo movimiento | Descripción (obligatoria) | Descripción (opcional; usamos la categoría) |
| Diagnóstico | Completar abajo / Registrar cuentas → | Paso guiado en la misma pantalla · «Guardar y seguir» · «Saltar por ahora» |
| Diagnóstico | — | Bienvenida: «Antes de cualquier plan, veamos dónde estás.» · Resultado: «Este es tu punto de partida.» |
| Presupuesto | X % ejecutado | Pagado completo · Quedan $ X · Comprometido, falta pagar · Al cierre te pasarías $ X |
| Flujo de caja | Déficit previsto en el mes que inicia el 2026-10-01… | «Te alcanza en los próximos 6 meses, con un bache en diciembre.» · fechas en formato «1 oct 2026» |
| Flujo de caja | Recalcular | (se quita: recalcula al instante) |
| Deudas | Comparar estrategias de pago | ¿Qué deuda pago primero? + frase con fecha de salida y ahorro |
| Simulador | Simulador de escenarios | ¿Qué pasa si…? |
| Lección (cierre) | — | «Ya sabes leer una tasa» + insignia |
| Universidad | — | «Retoma donde quedaste…» · «Tus 8 áreas de crecimiento» |
| Landing | — | «Sabe dónde estás. Decide qué sigue.» |
| Co-Piloto | Co-Piloto de Inversión (Trendo) | Co-Piloto de Negocio (Comunidad › Emprendedores · Premium) |

## 7. Decisiones (formato 7)

**Cambiado y por qué**
1. **Marca Umbral:**
   - Una puerta torii, que marca el paso a otra etapa, con la llama, que es el hambre de crecer.
   - Tinta y bermellón dan una base sobria con un acento cálido.
   - El símbolo es independiente del nombre por si el nombre cambia.
2. **Botón principal en sumi, no en bermellón:** así el rojo no compite con los estados de error y la interfaz se ve sobria. El bermellón se reserva para la marca, lo Premium, el indicador activo y los logros.
3. **El Co-Piloto y el dropshipping pasan a Comunidad › Emprendedores.** Así las herramientas quedan junto a la gente que las usa, y la ruta, los en vivo y los retos acompañan al Co-Piloto.
4. **El muro favorece números reales:** se puede adjuntar un test del Co-Piloto, las normas están a la vista y no hay rankings por dinero, por el tono no culpabilizante y sin promesas.
5. **Se mantiene lo de la v0.1:**
   - Respuesta principal arriba en Panel, Flujo, Deudas y Simulador.
   - Registro rápido.
   - Diagnóstico guiado.
   - Recálculo al instante.
   - Un eje por gráfico.
   - Aviso de riesgo en todo el Co-Piloto.

**Pendiente o en duda**
- **Comunidad (nuevo por construir):** muro, comentarios, reacciones, en vivo, retos y miembros no existen hoy. Hay que definir:
  - El modelo de datos: publicaciones, comentarios, reacciones, eventos, retos e inscripciones.
  - La moderación: reportar, ocultar y roles de moderador.
  - Las notificaciones.
  - La plataforma de video en vivo.
  - Las personas y cifras de la comunidad en los diseños son ficticias.
- **Premium:** precio, cobro en línea y lista de acceso anticipado siguen siendo «futuro».
- **Respeto cultural:** el torii tiene carga religiosa en Japón. Úsalo simplificado y con respeto, y valídalo con alguien de la cultura si la marca sale de Colombia.
- **Revisión de marca:** «Millos» se asocia a Millonarios F.C. Haz la búsqueda en la SIC antes de registrar nombre y logo.
- **Frase principal del Panel:** requiere una regla nueva (déficit > categoría sobre ritmo > en orden).
- **Flujo de caja:** confirmar que el motor calcula el punto más bajo día a día.
- **Textos entre corchetes:** videos, citas y foto los escribe o graba Alejandro.

Herramienta educativa; no es asesoría financiera. Todos los datos de los diseños son ficticios.
