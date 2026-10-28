# Perfila · plan

Perfila es un proyecto propio. Nace del motor de GITHUB_SNAKE.EXE (serpiente, pathfinding, exportador SVG, duelo, video), pero tiene su repositorio, su nombre y su marca (`docs/BRAND.md`). Lo que no sirve del proyecto anterior se quitó.

**Experiencia objetivo:** una sola entrada, tu usuario de GitHub. Con eso ves todo lo que Perfila puede generar y eliges pieza por pieza qué usar, sin YAML ni configuración.

Criterio que filtra todo: cada pieza mejora cómo se ve un perfil y sobrevive al proxy de imágenes de GitHub (SVG + CSS, sin JavaScript).

Estado: ✅ hecho · 🟡 parcial · ⬜ pendiente

## Hecho

| Fase | Qué | Estado |
| --- | --- | --- |
| 0 · Cimientos | Design tokens compartidos, contrato de URL versionado, regresión visual por huella, logs por petición, script de línea base | ✅ (falta medir la línea base tras desplegar) |
| 1 · Kit visual | Cabecera, estadísticas, racha, lenguajes, actividad y dashboard `kit`, con el mismo marco que la serpiente | ✅ |
| 2 · Duelo | Repetición del duelo en SVG, gráfica versus y página `/duel/<a>-vs-<b>` para compartir y retar | ✅ (vista previa en PNG pendiente, ver Fase 4) |

## Fase R · Independencia y marca (en curso)

| Estado | Tarea | Dónde |
| --- | --- | --- |
| ✅ | Nombre, paleta, tipografía y tono | `docs/BRAND.md` |
| ✅ | Logo de prueba: P de celdas, símbolo, wordmark y favicon | `assets/brand/`, `favicon.svg` |
| ✅ | Temas neutros `ink` (por defecto) y `paper` para todas las piezas | `shared/theme-tokens.js` |
| ✅ | Historial de git propio, sin el remoto ni la historia del proyecto anterior | `.git` |
| ✅ | Fuera lo que no sirve: perfiles destacados, documentación vieja, capturas, proxy de Cloudflare, cabeceras de Pages, carpetas de herramientas | — |
| ✅ | Web nueva: portada que explica qué hace, un solo campo de usuario, galería de todas las piezas con tema, idioma y "copiar" por pieza, y bloque README con solo lo elegido | `index.html`, `css/site.css`, `js/site.js` |
| ✅ | El juego, el duelo en vivo, Commit Art y el estudio de video pasan a `/play.html`, con la paleta neutra | `play.html`, `style.css`, `js/app.js` |
| ⬜ | Rediseñar el estudio con el mismo lenguaje limpio de la portada (hoy solo cambió la paleta; conserva la maquetación anterior) | `play.html`, `style.css` |
| ⬜ | Logo definitivo: trazado propio para el nombre (hoy usa la tipografía del sistema) | `assets/brand/` |
| ✅ | Servidor local que sirve la web y la API como Vercel, con datos de prueba sin token | `scripts/dev-server.js` |
| ⬜ | Conectar el repositorio remoto que pase el autor, poner `repo` y `actionRef` en `shared/brand.js` y hacer push | — |
| ⬜ | Elegir dominio y desplegar en Vercel con `GITHUB_TOKEN`; cambiar `site` en `shared/brand.js` | — |
| ⬜ | Comprobar disponibilidad del nombre y el dominio | — |

## Fase 3 · Modos y estados (`?game=`)

Interfaz común en `shared/game.js`: `init(grid)`, `step(state)` y una historia determinista que el exportador convierte en keyframes CSS. Límite: 45-120 KB por SVG.

1. Game of Life desde tus contribuciones.
2. Pac-Man (BFS existente con fantasmas como obstáculos).
3. Space Invaders sobre las columnas.
4. Tetris.
5. Estados según actividad: la serpiente duerme tras varios días sin commits, celebra rachas, pieles por fecha. También en las tarjetas.

Piezas que no son juegos con el mismo motor: mapa de calor por día de la semana, tarjeta "año en resumen", insignias de logros (`js/achievements.js` ya existe).

**Puerta:** interfaz común de juego y dos modos en producción. Cada modo aparece solo en la galería de la web.

## Fase 4 · Imagen para redes y plantillas

| Tarea | Notas |
| --- | --- |
| PNG 1200×630 por perfil y por duelo (tarjeta para LinkedIn/X y vista previa del enlace) | Exige rasterizar SVG en el servidor: primera dependencia (`@resvg/resvg-wasm`, ~2,5 MB). Decisión pendiente |
| Plantillas de perfil completas (web, estudiante, mantenedor) con texto además de piezas | En la galería, como punto de partida |
| Vista previa del README completo, tal como se verá en GitHub, antes de copiar | En la web |

**Puerta:** de abrir la web a tener el perfil publicado en menos de dos minutos.

## Fase 5 · Lanzamiento y distribución

Al cerrar la Fase R con el despliegue: listas *awesome* de README de perfil, GitHub Marketplace para la Action, artículo en dev.to ("por qué todos los perfiles se ven iguales"), clips verticales de duelos, un perfil de ejemplo por tema.

## Fuera de alcance (veto)

Más partículas o efectos, piezas con estilo propio, mover la API a Cloudflare Workers, prometer interactividad dentro del README.
