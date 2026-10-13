# Co-Piloto de dropshipping · paquete para Claude Code

Todo lo necesario para construir el Co-Piloto de Negocio dentro de Crece Millo (Comunidad › Emprendedores · Premium), con la misma lógica del original y la marca Umbral.

| Carpeta / archivo | Qué es | Para qué lo usa Claude Code |
|---|---|---|
| `PROMPT-claude-code.md` | Texto para pegar en Claude Code | Arrancar el trabajo con el plan y las reglas |
| `ESPECIFICACION-COPILOTO.md` | Especificación funcional y de diseño, sección por sección, con referencias de línea al original | Saber qué construir y cómo debe comportarse |
| `motor/copiloto-engine.mjs` | Motor de cálculo original (precio, unidad económica, evaluación, veredicto, diagnóstico, plan, simulador), sin cambios | Portarlo a TypeScript |
| `motor/golden.json` + `motor/verificar.mjs` | 2.494 comprobaciones con los resultados exactos del original | `node motor/verificar.mjs ruta/a/tu-motor.mjs` debe dar 0 diferencias |
| `motor/estado-demo.json` | Estado de demostración (6 productos, 3 tests, formularios) | Semilla de datos y modo «Probar con un producto de ejemplo» |
| `original/CoPiloto_Trendo_v5.html` | La app original funcionando, en un archivo | Fuente de verdad de reglas, plantillas de texto y comportamiento |
| `original/capturas/` y `original/textos-con-demo/` | Lo que muestra el original con el estado de demostración | Pruebas de aceptación: mismos números en la nueva interfaz |
| `diseno/pantallas/*.png` y `*.html` | 22 pantallas en el diseño Crece Millo: las 7 secciones, subpestañas, ventanas, oscuro y móvil | Referencia visual exacta (medidas, jerarquía, textos) |
| `diseno/tokens.css` y `tokens.json` | Tokens de la marca Umbral (claro y oscuro, Tailwind 4) | Estilos: usar solo roles, nunca hex |

Complementa el paquete `crece-millo-v1` (marca, logo, resto de la app). Datos de los diseños: ficticios.
