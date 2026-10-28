# Lanzamiento

Orden de trabajo para sacar Portafil al público. Lo que depende del autor (cuentas, publicar, enviar PR) está marcado con 👤; el resto ya está hecho en el repositorio.

## 1. Antes de anunciar nada

Estado al 28-10-2026: el repositorio luisrodriguez-rgb/portafil es público y tiene la etiqueta `v1`; la web está desplegada en https://perfila-mauve.vercel.app sin `GITHUB_TOKEN` (todas las piezas dan 500).

| | Tarea | Cómo comprobarlo |
| --- | --- | --- |
| 👤 | En Vercel, *Settings → Environment Variables*: `GITHUB_TOKEN` con un token *fine-grained* sin ningún permiso (solo lee datos públicos), en Production y Preview. Después *Deployments → Redeploy* | `npm run check:deploy -- https://perfila-mauve.vercel.app` |
| 👤 | En Vercel, *Settings → Domains → Add*: `portafil.vercel.app` (es gratis y está libre). Es el dominio de `Brand.site`, de los README y de `examples/`: sin él, sus imágenes no cargan. Con dominio propio más adelante, cambiar `site` en `shared/brand.js` y `node scripts/build-examples.js` | `npm run check:deploy` (sin URL usa `Brand.site`) |
| 👤 | Opcional, para tráfico alto: en Vercel, *Storage → Upstash (Redis)* y conectarlo al proyecto; crea `KV_REST_API_URL` y `KV_REST_API_TOKEN` y la caché se comparte entre instancias (`server/cache.js`) | en los logs, menos consultas a GitHub |
| 👤 | Datos del repositorio en GitHub (descripción, web y temas), con el comando de abajo o desde la rueda de *About* | se ven en la portada del repositorio |
| 👤 | Poner el perfil del autor con Portafil: hay una propuesta en `docs/launch/perfil-autor.md` | se ve en `github.com/luisrodriguez-rgb` |
| 👤 | Probar en GitHub de verdad: las piezas de media anchura (390 px) en escritorio y en móvil, el modo claro y oscuro en la app de GitHub y el botón «Crear mi README en GitHub» con una cuenta sin README de perfil | — |
| 👤 | Medir la línea base: `GITHUB_TOKEN=ghp_xxx node scripts/baseline.js luisrodriguez-rgb/portafil` | `docs/metrics/baseline-<fecha>.json` |

Datos del repositorio (con `gh auth login` hecho):

```bash
gh repo edit luisrodriguez-rgb/portafil --description "Tu perfil de GitHub con un solo estilo: cabecera, estadísticas, racha, lenguajes, juegos sobre tu gráfico de contribuciones y duelos. SVG animado, sin JavaScript." --homepage https://portafil.vercel.app --add-topic github-profile,profile-readme,readme,github-stats,github-readme-stats,svg,contribution-graph,github-actions
```

`npm run check:deploy` recorre la web y cada ruta de `vercel.json` con un usuario real, y comprueba código 200, tipo de contenido, cabeceras de seguridad y que los datos vienen de la API oficial. Además, a ojo:

```text
https://portafil.vercel.app/?u=USUARIO
https://portafil.vercel.app/play.html?u=USUARIO
https://portafil.vercel.app/duel/USUARIO-vs-torvalds
```

Comprobar también la vista previa del enlace `/u/USUARIO` y `/duel/...` con el inspector de tarjetas de X o LinkedIn (Post Inspector).

## 2. Día del lanzamiento

1. 👤 Publicar el artículo en dev.to (`articulo-devto.md`, versión en inglés en `article-devto.en.md`).
2. 👤 Publicar en X y LinkedIn con la tarjeta del propio perfil y un clip (`publicaciones.md`).
3. 👤 Publicar la Action en GitHub Marketplace (`marketplace.md`).
4. 👤 Abrir los PR a las listas *awesome* (`listas-awesome.md`), con el artículo ya publicado para enlazarlo.

## 3. Primeras cuatro semanas

| Semana | Contenido | Por qué |
| --- | --- | --- |
| 1 | Duelo del autor contra un perfil conocido de la comunidad hispana, con su clip vertical | cada duelo involucra a dos personas y su enlace trae a más |
| 2 | Un modo de juego por publicación: Pac-Man, invasores, Tetris, juego de la vida | cada modo es un contenido aparte (Fase 3) |
| 3 | "Antes y después" de un perfil con widgets sueltos frente al mismo perfil con Portafil | el ángulo de coherencia es la propuesta principal |
| 4 | Revisar métricas y decidir la siguiente fase | ver abajo |

## 4. Cómo saber si funciona

Se mide con los logs de la función y los eventos de la web (`docs/metrics.md`):

| Pregunta | Señal | Meta inicial |
| --- | --- | --- |
| ¿Lo usan perfiles reales? | usuarios distintos con render 200 por semana | se fija tras la primera semana |
| ¿Usan el sistema o una pieza suelta? | perfiles con 2 o más piezas distintas | más de la mitad |
| ¿Es rápido publicar? | mediana de `ms` del primer `copy` por visita | menos de 2 minutos (puerta de la Fase 4) |
| ¿Los duelos traen gente? | `duel-page` frente a `duel`, y usuarios nuevos tras un `duel-page` | más de la mitad de duelos compartidos |
| ¿Se comparte fuera de GitHub? | `og-profile` y `share-page` | — |

## Contexto competitivo (comprobado el 28 de octubre de 2026)

| Proyecto | Estrellas | Qué hace |
| --- | --- | --- |
| anuraghazra/github-readme-stats | 79.853 | tarjetas de estadísticas y lenguajes |
| lowlighter/metrics | 17.337 | infografías con decenas de plugins |
| DenverCoder1/github-readme-streak-stats | 7.185 | tarjeta de racha |
| Platane/snk | 6.163 | serpiente sobre el gráfico de contribuciones (GitHub Action) |

En la lista de herramientas de awesome-github-profile-readme ya aparecen proyectos con varios temas y constructor visual (GitCard Studio, gitglance). La diferencia de Portafil no es tener temas, sino que **todas** las piezas (tarjetas, juegos, versus, duelos y tarjetas para redes) son un mismo sistema visual, se configuran con un solo dato y cambian juntas entre modo claro y oscuro. Ese es el mensaje en cada texto.
