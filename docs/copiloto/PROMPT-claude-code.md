# Prompt para Claude Code · Co-Piloto de dropshipping

Copia la carpeta `copiloto-dropshipping-para-code/` dentro del repositorio de Crece Millo (por ejemplo, en `docs/copiloto/`) y pega esto:

---

Vamos a construir el **Co-Piloto de Negocio** (dropshipping contraentrega, Shopify + Dropi) como módulo Premium de Crece Millo, en Comunidad › Emprendedores. Todo está en `docs/copiloto/`. Lee primero `README.md` y `ESPECIFICACION-COPILOTO.md`.

**Objetivo:** que funcione **igual** que la app original (`original/CoPiloto_Trendo_v5.html`) y se vea **igual** que los diseños (`diseno/pantallas/`), con el sistema de diseño de Crece Millo (`diseno/tokens.css`).

**Stack:** Next.js 15 (App Router), React 19, TypeScript y Tailwind CSS 4.

**Reglas que no se negocian:**
1. **El motor de cálculo no se reinterpreta: se porta.** Pasa `motor/copiloto-engine.mjs` a `lib/copiloto/engine.ts` sin cambiar ninguna fórmula y demuestra que `node docs/copiloto/motor/verificar.mjs <tu motor compilado>` da 0 diferencias. No sigas a la interfaz hasta lograrlo.
2. Las reglas, umbrales, textos de negocio y plantillas (ofertas, ganchos, guiones, WhatsApp, diagnóstico, siguiente paso) son los del original. Cuando dudes, abre el original en el navegador y compara.
3. **Formato es-CO en todo:** `$ 1.800.000`, `26,4 %`, `3,30×`, `8 oct 2026` y el signo menos real (−). Solo cambia el formateo, no el cálculo.
4. **Accesibilidad WCAG 2.2 AA.** Los estados siempre van con ícono y texto. Áreas táctiles de 44 px o más. Gráficas de un solo eje con «Ver datos en tabla». Ventanas con foco atrapado.
5. Usa solo los roles de `tokens.css` (nunca hex) e íconos de lucide-react. Los emojis se quedan solo dentro de los textos que la persona copia (anuncios, WhatsApp).
6. Los datos se guardan por usuario en la base de datos, con la misma forma lógica del estado `S` del original, para poder importar respaldos JSON de la app anterior.
7. El mentor con IA va por una ruta de servidor que llama a la API de Claude, con los mismos prompts y esquemas JSON del original. Nunca expongas la clave en el cliente.
8. **No inventes funciones.** Lo que no esté en el original ni en la especificación, márcalo como «futuro» y pregúntame.

**Plan por fases.** Al terminar cada fase, muéstrame qué cambió, corre lint y pruebas, y espera mi visto bueno:
1. Motor en TypeScript + `verificar.mjs` en verde + formateadores es-CO.
2. Modelo de datos, semilla con `motor/estado-demo.json` e importación y exportación de respaldo.
3. Layout del módulo: encabezado (producto activo, riesgo 1–10, COP/USD y TRM, 7 pestañas), «Tu siguiente paso» y pie.
4. Productos: tabla, ficha, evaluación, resultados de venta, análisis y estrategia.
5. Precio y margen.
6. Analizar test.
7. Marketing: ofertas, creativos, página y WhatsApp, plan de lanzamiento.
8. Crecer y Planificar capital.
9. Bitácora, Alta rápida, Ruta y Glosario.
10. Mentor con IA.
11. **Prueba de aceptación:** con `estado-demo.json`, cada pantalla debe mostrar los mismos números que `original/textos-con-demo/`. Revisa también móvil a 390 px y el modo oscuro.

Empieza por la fase 1: dime en qué archivos vas a portar el motor y cómo vas a correr `verificar.mjs`.
