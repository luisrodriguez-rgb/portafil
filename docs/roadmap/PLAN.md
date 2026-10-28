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
| ✅ | Estudio rediseñado con el lenguaje de la portada: cabecera común, tablero en una tarjeta, controles y herramientas agrupados (Jugar / Llévatelo), modales limpios, sin lluvia matrix ni brillos; la página es neutra y el tema solo colorea el tablero | `play.html`, `css/studio.css` |
| ⬜ | Logo definitivo: trazado propio para el nombre (hoy usa la tipografía del sistema) | `assets/brand/` |
| ✅ | Servidor local que sirve la web y la API como Vercel, con datos de prueba sin token | `scripts/dev-server.js` |
| ⬜ | Conectar el repositorio remoto que pase el autor, poner `repo` y `actionRef` en `shared/brand.js` y hacer push | — |
| ⬜ | Elegir dominio y desplegar en Vercel con `GITHUB_TOKEN`; cambiar `site` en `shared/brand.js` | — |
| ⬜ | Comprobar disponibilidad del nombre y el dominio | — |

## Fase 3 · Modos y estados (`?game=`)

| Estado | Tarea | Dónde |
| --- | --- | --- |
| ✅ | Interfaz común: cada modo es una simulación determinista que devuelve una línea de tiempo (cambios de celda, actores, progreso) y un marco común la convierte en SVG con CSS, con la misma cabecera, rejilla y barra que la serpiente | `shared/games.js` |
| ✅ | Juego de la vida (B3/S23 en un toro de 53×7) desde tus contribuciones; las celdas se colorean por edad; para al extinguirse o estabilizarse, y deja latir a los osciladores hasta 30 generaciones | `GameModes.simulateLife` |
| ✅ | Pac-Man: tus contribuciones son la comida, hasta 4 celdas de nivel 4 son pastillas de poder, dos fantasmas persiguen con BFS, 3 vidas. Caminos rectos (menos giros, menos peso) | `GameModes.simulatePacman` |
| ✅ | Estados (`mood=auto`): la serpiente duerme tras 7 días sin contribuir (tablero atenuado, serpiente enroscada al final, zetas) y la cabecera muestra la racha cuando pasa de 7 días | `js/exporter.js` |
| ✅ | `?game=` y `?mood=` en el contrato, el endpoint, la Action y la galería web (grupo "Juegos") | `shared/snake-core.js`, `shared/kit-snippet.js`, `js/site.js` |
| ✅ | Invasores: tus contribuciones son la formación enemiga; una nave dispara a la celda viva más baja de cada columna, y las intensas aguantan dos disparos | `GameModes.invaders*` |
| ✅ | Tetris de lado: la gravedad junta tus contribuciones hacia el pasado (cada día de la semana se vuelve una barra) y las piezas entran desde hoy para completar semanas | `GameModes.tetris*` |
| ⬜ | Pieles por fecha (Halloween, fin de año). Pendiente de decidir: cambiarían el color que eligió cada usuario, y eso choca con el principio de coherencia; propuesta: solo con `mood=season` | — |
| ⬜ | Estados también en las tarjetas (p. ej. la tarjeta de racha "en racha") | — |
| ✅ | Interfaz común `create` / `step` / `view` (iniciar, avanzar, dibujar) en los cuatro modos; el SVG del README y el estudio usan la misma | `shared/games.js` |
| ✅ | Los cuatro modos en el estudio: selector "Juego", la IA juega la misma partida que el SVG y con "Juegas tú" se controla con teclado o cruceta (en el juego de la vida, clic en las celdas) | `play.html`, `js/arcade.js` |
| ⬜ | Piezas sin juego con el mismo motor: mapa de calor por día de la semana, "año en resumen", insignias de logros | — |

Pesos medidos con perfiles de prueba: juego de la vida 29-63 KB, Pac-Man 92-96 KB, invasores 109-110 KB, Tetris 88-89 KB (3-10 KB con brotli), serpiente dormida 28 KB. Simular cuesta 1-37 ms.

**Puerta:** interfaz común ✅ y cuatro modos listos ✅ (en producción en cuanto se despliegue).

## Fase 4 · Imagen para redes y plantillas

| Estado | Tarea | Dónde |
| --- | --- | --- |
| ✅ | Rasterizado en el servidor: primera dependencia, `@resvg/resvg-js` (binario nativo por plataforma, ~3 MB), con JetBrains Mono incluida (OFL) porque Vercel no trae fuentes; 15-30 ms por imagen | `server/social.js`, `assets/fonts/` |
| ✅ | Tarjeta 1200×630 del perfil (avatar, nombre, bio, el año de contribuciones y cuatro cifras) y del duelo (marcador y cómo quedó cada gráfico), con el tema elegido | `/api/og/<usuario>.png`, `/api/og/duel/<a>-vs-<b>.png` |
| ✅ | Página para compartir `/u/<usuario>` con la tarjeta como vista previa; la página del duelo usa la suya | `server/og.js`, `server/duel.js` |
| ✅ | En la web, sección "Para compartir fuera de GitHub": tarjeta, descargar PNG, copiar enlace, X y LinkedIn | `js/site.js` |
| ✅ | Plantillas de perfil con texto (desarrollador, estudiante, mantenedor, mínima): eligen piezas y añaden presentación y cierre con huecos [entre corchetes] | `KitSnippet.TEMPLATES` |
| ✅ | Vista previa del README tal como se verá en GitHub, en claro y en oscuro, antes de copiar | `KitSnippet.previewHtml`, `index.html` |
| ⬜ | Medir la puerta: tiempo desde abrir la web hasta publicar el perfil (requiere desplegar e instrumentar la web) | `docs/metrics.md` |

**Puerta:** de abrir la web a tener el perfil publicado en menos de dos minutos ⬜ (el recorrido ya es: usuario → plantilla o piezas → vista previa → copiar; falta medirlo con usuarios reales).

## Fase 5 · Lanzamiento y distribución

| Estado | Tarea | Dónde |
| --- | --- | --- |
| ✅ | Plan de lanzamiento: comprobaciones antes de anunciar, prueba de humo, día D, cuatro semanas de contenido y metas | `docs/launch/README.md` |
| ✅ | Un perfil de ejemplo por estilo, en la portada ("Así se ve un perfil completo", con "Usar este estilo") y en el repositorio, generado y comprobado por las pruebas | `examples/`, `scripts/build-examples.js` |
| ✅ | Medición de la puerta de la Fase 4: eventos de la web sin cookies ni usuario (`user`, `copy`, `preview`, `share`), respetando Do Not Track | `server/event.js`, `docs/metrics.md` |
| ✅ | Entradas y textos de PR para las tres listas *awesome* activas, comprobadas el 28 de octubre de 2026 | `docs/launch/listas-awesome.md` |
| ✅ | Guía para publicar la Action en Marketplace, con los requisitos actuales de GitHub | `docs/launch/marketplace.md` |
| ✅ | Artículo para dev.to en español e inglés ("por qué todos los perfiles se ven iguales") | `docs/launch/articulo-devto.md`, `docs/launch/article-devto.en.md` |
| ✅ | Publicaciones para X y LinkedIn (lanzamiento, duelo, un modo por semana) | `docs/launch/publicaciones.md` |
| ⬜ 👤 | Desplegar, poner dominio y repositorio en `shared/brand.js`, publicar artículo, posts, Action y PR | `docs/launch/README.md` |

**Puerta:** perfiles reales usando el endpoint cada semana y más de la mitad con dos o más piezas ⬜ (se mide tras el despliegue).

## Fuera de alcance (veto)

Más partículas o efectos, piezas con estilo propio, mover la API a Cloudflare Workers, prometer interactividad dentro del README.
