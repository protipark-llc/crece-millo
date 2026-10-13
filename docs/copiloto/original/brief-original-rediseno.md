# Prompt para Claude Design — Rediseño del Co-Piloto de Inversión (Trendo)

> Cómo usarlo: abre Claude Design, adjunta el archivo `CoPiloto_Trendo_v5.html` (y si quieres 2–3 capturas de pantalla de la app) y pega todo el texto que está debajo de la línea.

---

## Contexto

Diseña la nueva interfaz de **Co-Piloto de Inversión**, una aplicación web de la marca **Trendo** (powered by Protipark). Te adjunto la versión actual en un solo archivo HTML: funciona bien, pero se ve como una herramienta interna. Quiero que se vea y se sienta como un **producto SaaS premium**, al nivel de Stripe, Linear, Mercury o Notion, porque más adelante la voy a vender por suscripción a los miembros de una comunidad de emprendedores de e-commerce en Latinoamérica.

**Qué hace la app:** es un mentor de inversión para dropshipping contraentrega en Colombia (Shopify + Dropi). Ayuda a:
- elegir y evaluar productos;
- calcular el precio de venta y los márgenes sanos;
- generar ofertas (upsell, downsell, combos), creativos para anuncios, textos de la página y mensajes de WhatsApp;
- analizar los resultados de venta y decir si escalar, optimizar o matar un producto;
- planificar el capital y simular el crecimiento con reinversión e interés compuesto.

Un **nivel de riesgo de 1 a 10** gobierna todas las reglas.

**Usuario:** emprendedor colombiano de 25 a 45 años, sin formación financiera. Conoce poco de métricas como CPA, ROAS o AOV y abre la app tanto en el computador como en el celular. Necesita entender en segundos qué le dice cada número y qué hacer después.

## Objetivo del diseño

1. **Claridad ante todo:** cada pantalla responde una pregunta ("¿cuánto cobro?", "¿escalo o mato este producto?"). La respuesta principal se ve primero y en grande; el detalle va después.
2. **Didáctica:** explicaciones cortas en contexto, glosario a un clic, estados vacíos que enseñan qué hacer y una barra de "Tu siguiente paso" siempre visible.
3. **Dinámica:** respuesta inmediata al mover controles, transiciones suaves y gráficas que se actualizan en vivo.
4. **Confianza:** se debe sentir como una herramienta financiera seria, sin parecer un casino ni un "hazte rico rápido".

## Estructura que debes respetar

Navegación principal con 7 secciones:

1. **Ruta:** las 6 fases del método (Fundamentos → Validar producto → Montar tienda → Testear → Escalar → Sistematizar) con su progreso, el ritmo operativo y los módulos futuros (Bolsa y Propiedad raíz, deshabilitados).
2. **Productos:**
   - **Base de datos:** una tabla de productos con etapa, clase A/B/C, puntaje, precio, utilidad por pedido, gasto, ROAS y utilidad neta.
   - **Botón "Alta rápida":** abre una ventana donde se pega el texto de Dropi y la app calcula y completa todo.
   - **Ficha del producto** con 5 sub-pestañas:
     - Ficha (formulario);
     - Evaluación inicial (10 criterios de 1 a 5, puntaje grande y clase);
     - Resultados de venta (formulario de registro e historial);
     - Análisis y estrategia (KPIs, embudo, evolución, esperado vs. real, diagnóstico);
     - Precio y margen (controles deslizantes, gráfica precio vs. utilidad con la zona saludable, desglose de a dónde va cada peso, semáforo de salud y comparación de interés compuesto por precio).
3. **Marketing:**
   - Ofertas: tarjetas editables de upsell, downsell, combos y cross-sell.
   - Creativos: selector de ángulo, 10 ganchos, guiones de video, textos de anuncio y matriz de test 3×3.
   - Página y WhatsApp.
   - Plan de lanzamiento.
4. **Analizar test:** formulario y veredicto grande (Escalar / Optimizar / Matar) con su explicación.
5. **Planificar capital:** metas, tabla por periodo y propuesta del mentor con IA.
6. **Crecer:** simulador de interés compuesto con gráfica de crecimiento, escenarios pesimista, base y optimista, y un mapa de calor de sensibilidad.
7. **Bitácora:** historial, revisión semanal con el mentor, respaldo y exportación.

**Elementos globales:**
- Barra de riesgo de 1 a 10 (Pasivo / Normal / Agresivo) con un degradado de verde a ámbar a rojo.
- Selector de producto activo, moneda (COP/USD) y TRM.
- Barra "Tu siguiente paso", con ícono, mensaje y botón de acción.
- Glosario en una ventana.
- Respuestas del mentor de IA en tarjetas.

## Dirección visual

- **Estilo:** fintech premium, limpio, con mucho aire y una jerarquía tipográfica fuerte. Modo claro como principal y modo oscuro como alternativa.
- **Paleta base (puedes refinarla):** índigo profundo `#0B1231` (marca y encabezados), azul eléctrico `#385BFF` (acción principal), verde `#14A37F` (sano / ganar), ámbar `#D98E00` (atención), rojo `#E2405F` (detener / perder), fondos `#F4F6FB` y blanco, texto `#141A3A` y secundario `#6A7194`. El semáforo verde/ámbar/rojo tiene significado de negocio: úsalo con consistencia y nunca de forma decorativa.
- **Tipografía:** Sora (o similar geométrica) para la interfaz y JetBrains Mono (o una monoespaciada con cifras tabulares) para los números. Las cifras clave van grandes; la moneda es COP con punto de miles (ej. $129.900).
- **Componentes a diseñar:**
  - Tarjeta KPI: etiqueta, valor grande, subtexto, estado de color e ícono "i" con definición.
  - Veredicto (grande, con ícono y explicación).
  - Control deslizante con campo numérico.
  - Tabla de datos con filas seleccionables, estados vacíos y scroll horizontal en móvil.
  - Tarjeta de oferta editable con resultado en vivo.
  - Tarjeta de gancho o guion con botón Copiar.
  - Pestañas y sub-pestañas, barra de progreso de fase con casillas.
  - Ventana modal, aviso tipo toast y alertas informativas, de éxito, de atención y de peligro.
  - Recuadro didáctico ("¿Para qué sirve?").
  - Gráficas de línea, barras horizontales tipo embudo, barra apilada de desglose y mapa de calor.
- **Iconografía:** un solo set de líneas (estilo Lucide o Phosphor) en lugar de emojis.
- **Microinteracciones:** cambios de número animados, transiciones de 150–200 ms, estados de hover y foco visibles, y "esqueletos" mientras responde la IA.
- **Accesibilidad:** contraste AA, objetivos táctiles de 44 px o más en móvil y que el color nunca sea la única señal (siempre acompañado de texto o ícono).
- **Responsive:**
  - Escritorio con navegación lateral fija y contenido a dos columnas (controles a la izquierda, resultados a la derecha).
  - Tablet a una columna.
  - Móvil con barra de navegación inferior de 5 íconos más un menú "Más", y la barra de riesgo plegable.

## Pantallas que necesito (con datos realistas de ejemplo)

Usa este producto de ejemplo: **Masajeador de ojos térmico**, costo del proveedor $56.000, precio recomendado $179.900, precio tachado $249.900, utilidad por pedido $64.690, CPA objetivo $47.439, ROAS 4,6×, % de entrega 83%, clase A con puntaje 78. Los demás productos del ejemplo: masajeador de cuello, lámpara proyector, difusor LED, mascarilla y mopa.

1. Ruta (inicio) con la barra de siguiente paso y las fases.
2. Productos: base de datos + ficha abierta en la sub-pestaña Evaluación.
3. Productos › Precio y margen (la pantalla estrella: controles a la izquierda, gráfica con la zona saludable y el precio recomendado destacado a la derecha).
4. Productos › Análisis y estrategia.
5. Ventana de Alta rápida con el resultado calculado.
6. Marketing › Ofertas y Marketing › Creativos.
7. Analizar test con un veredicto "Escalar".
8. Crecer (simulador de interés compuesto).
9. Versión móvil de las pantallas 1, 3 y 7.
10. Variante en modo oscuro de la pantalla 3.

## Entregables

1. **Sistema de diseño:** colores con sus roles, tipografía y escala, espaciado, radios, sombras y todos los componentes de arriba con sus estados (normal, hover, foco, deshabilitado, error, vacío, cargando).
2. **Las pantallas listadas**, en escritorio (1440 px) y móvil (390 px).
3. **Un prototipo navegable** entre las 7 secciones.
4. **Notas de implementación** para pasarlo a código: tokens de diseño como variables CSS (`--color-...`, `--space-...`, `--radius-...`) y una lista de los cambios de estructura frente al HTML actual.

## Restricciones

- **No cambies la lógica ni los textos de negocio:** fórmulas, reglas por nivel de riesgo, veredictos y nombres de métricas se quedan igual. El rediseño es de forma, jerarquía y experiencia.
- **Todo en español** y con tono cercano y directo (tuteo).
- **Debe poder implementarse en un solo archivo HTML** con CSS y JavaScript sin frameworks, sin depender de servicios externos y con las fuentes incluidas o con respaldo del sistema.
- **Siempre visible:** el aviso "Herramienta educativa y de apoyo a decisiones. No es asesoría financiera."

Antes de diseñar, propón 2 direcciones visuales distintas, cada una con una pantalla de muestra (la de Precio y margen), para elegir una y seguir con esa.
