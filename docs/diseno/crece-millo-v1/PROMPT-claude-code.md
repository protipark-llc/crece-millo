# Prompt para Claude Code

Copia esta carpeta dentro del repositorio (por ejemplo en `docs/diseno/crece-millo-v1/`) y pega el texto de abajo en Claude Code.

---

Vamos a aplicar el diseño v1.0 de Crece Millo (marca «Umbral») al proyecto. Todo está en `docs/diseno/crece-millo-v1/`:

- `entrega-para-claude-code.md`: especificación completa con tokens, tipografía, componentes, pantallas, activos, cambios de texto y decisiones.
- `tokens.css` y `tokens.json`: tokens de color, tipo, espacio, radios, sombras y movimiento para claro y oscuro, con bloque `@theme inline` para Tailwind 4.
- `assets/`: logo, favicon, íconos de app e imagen para redes, en SVG con el texto en trazos y en PNG.
- `pantallas/`: captura PNG y HTML estático de cada pantalla. Úsalas como referencia visual; ábrelas antes de construir cada una.

Stack: Next.js 15 (App Router), React 19 y Tailwind CSS 4.

Reglas que no se negocian:
- Usa solo los roles de `tokens.css` (`bg-surface`, `text-ink`, `bg-accent`…). Nunca escribas colores hex en componentes.
- Cumple WCAG 2.2 AA. Los estados siempre llevan ícono y texto, nunca solo color. Áreas táctiles de 44 px o más.
- Español de Colombia con tuteo. Moneda `$ 1.800.000`, porcentajes `26,67 %`, fechas `12 oct 2026` y signo menos real (−).
- Un solo eje por gráfico.
- Íconos de lucide-react.
- Fuentes con `next/font/google`: Outfit e IBM Plex Sans. En cifras, `tabular-nums`.
- No cambies la lógica de negocio ni el motor de cálculo del Co-Piloto. Si una pantalla necesita algo que hoy no existe, déjalo como «futuro» y avísame.
- No inventes datos. En las demos, los datos son ficticios.

Plan de trabajo. Al terminar cada fase, muéstrame qué cambió, corre lint y pruebas, y espera mi visto bueno antes de seguir:

1. **Tema y tokens.**
   - Importa `tokens.css` en `globals.css`.
   - Agrega el script de tema en `<head>` (Claro · Oscuro · Sistema, sin parpadeo).
   - Agrega el selector de tema en la barra superior y en Configuración.
2. **Marca.**
   - Reemplaza el logo anterior por los SVG de `assets/`.
   - Configura favicon, `apple-touch-icon`, manifest (íconos 192, 512 y maskable) y la imagen Open Graph.
   - Crea un componente `<Logo variant="horizontal|simbolo" tone="claro|oscuro" />`.
3. **Componentes base.** Construye los de la sección 3, incluidos los nuevos de Comunidad: publicación, compositor, evento en vivo, tarjeta de herramienta Premium y pila de avatares.
4. **Navegación.** El grupo «Emprendimiento» pasa a «Comunidad» (Muro, En vivo, Emprendedores, Co-Piloto de Negocio). Cambia las rutas de navegación del Co-Piloto a «Comunidad › Emprendedores».
5. **Pantallas,** en el orden de la sección 4 de la entrega.
6. **Comunidad › Emprendedores.**
   - Primero solo la interfaz, con datos de ejemplo.
   - Después propón el modelo de datos (publicaciones, comentarios, reacciones, eventos, retos), la moderación y los permisos Premium. Escríbelo antes de crear tablas.

Empieza por revisar el proyecto y decirme qué archivos vas a tocar en la fase 1.
