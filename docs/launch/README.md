# Lanzamiento

Orden de trabajo para sacar Perfila al público. Lo que depende del autor (cuentas, publicar, enviar PR) está marcado con 👤; el resto ya está hecho en el repositorio.

## 1. Antes de anunciar nada

| | Tarea | Cómo comprobarlo |
| --- | --- | --- |
| 👤 | Desplegar en Vercel con la variable `GITHUB_TOKEN` (un token *fine-grained* sin permisos basta: solo lee datos públicos) | `GET /api/<usuario>.svg` devuelve 200 |
| 👤 | Elegir dominio y ponerlo en `shared/brand.js` (`site`), con el repositorio en `repo` y la Action en `actionRef`; después `node scripts/build-examples.js` para regenerar `examples/` | `npm test` en verde |
| 👤 | Comprobar que el nombre "Perfila" y el dominio están libres (ver `docs/BRAND.md`) | — |
| | Prueba de humo en producción con estas URL, en claro y en oscuro | todas responden 200 y se ven bien en un README de prueba |
| 👤 | Poner el perfil del autor con Perfila: es el ejemplo de la portada y de `examples/` (`demoUser`) | se ve en `github.com/<autor>` |
| 👤 | Medir la línea base: `GITHUB_TOKEN=... node scripts/baseline.js <owner/repo>` | `docs/metrics/baseline-<fecha>.json` |

URL para la prueba de humo (cambia `DOMINIO` y `USUARIO`):

```text
https://DOMINIO/?u=USUARIO
https://DOMINIO/api/header/USUARIO.svg
https://DOMINIO/api/kit/USUARIO.svg?theme=cyberpunk
https://DOMINIO/api/USUARIO.svg?game=pacman
https://DOMINIO/api/versus/USUARIO-vs-torvalds.svg
https://DOMINIO/duel/USUARIO-vs-torvalds
https://DOMINIO/api/og/USUARIO.png
https://DOMINIO/u/USUARIO
https://DOMINIO/play.html?u=USUARIO
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
| 3 | "Antes y después" de un perfil con widgets sueltos frente al mismo perfil con Perfila | el ángulo de coherencia es la propuesta principal |
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

En la lista de herramientas de awesome-github-profile-readme ya aparecen proyectos con varios temas y constructor visual (GitCard Studio, gitglance). La diferencia de Perfila no es tener temas, sino que **todas** las piezas (tarjetas, juegos, versus, duelos y tarjetas para redes) son un mismo sistema visual, se configuran con un solo dato y cambian juntas entre modo claro y oscuro. Ese es el mensaje en cada texto.
