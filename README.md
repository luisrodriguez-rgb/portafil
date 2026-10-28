<p align="center">
  <img src="assets/brand/og.png" alt="Perfila: tu perfil de GitHub, con un solo estilo" width="100%">
</p>

<p align="center"><a href="README.en.md">English</a> · <b>Español</b></p>

# Perfila

**Tu perfil de GitHub, con un solo estilo.** Cabecera, estadísticas, racha, lenguajes, actividad, la serpiente que se come tus commits, versus y duelos contra otros perfiles: todas las piezas comparten tema, tipografía y medidas, así que tu perfil parece un solo diseño y no un collage de widgets.

Escribe tu usuario en la web, elige lo que quieras y copia el código. Sin YAML y sin configurar nada. GitHub no ejecuta JavaScript en un README, así que cada pieza es un SVG con animación CSS servido desde una URL.

## Piezas

| Pieza | URL | Muestra |
| --- | --- | --- |
| Cabecera | `/api/header/<usuario>.svg` | Avatar, nombre, bio, seguidores, repos, estrellas y días activos |
| Estadísticas | `/api/stats/<usuario>.svg` | Contribuciones, commits, PRs, issues, reviews y estrellas del último año |
| Racha | `/api/streak/<usuario>.svg` | Racha actual, la más larga y los últimos 30 días |
| Lenguajes | `/api/langs/<usuario>.svg` | Lenguajes por tamaño de código en tus repos públicos |
| Actividad | `/api/activity/<usuario>.svg` | Contribuciones por semana, 53 semanas |
| Todo en una | `/api/kit/<usuario>.svg` | Las cinco anteriores en una sola imagen |
| Serpiente | `/api/<usuario>.svg` | Una IA (BFS + Flood Fill) se come tu gráfico de contribuciones |
| Juego de la vida | `/api/<usuario>.svg?game=life` | Tus contribuciones evolucionan con las reglas de Conway |
| Pac-Man | `/api/<usuario>.svg?game=pacman` | Pac-Man se come tu gráfico mientras dos fantasmas lo persiguen |
| Invasores | `/api/<usuario>.svg?game=invaders` | Una nave dispara a tus contribuciones, columna a columna |
| Tetris | `/api/<usuario>.svg?game=tetris` | Tu año cae hacia el pasado y las piezas completan semanas |
| Versus | `/api/versus/<a>-vs-<b>.svg` | Tus cifras frente a las de otro perfil |
| Duelo | `/api/duel/<a>-vs-<b>.svg` | La misma IA en los dos gráficos, con marcador; la página `/duel/<a>-vs-<b>` sirve para compartir y retar |

Todas aceptan `theme` (`ink`, `paper`, `dark`, `light`, `cyberpunk`, `neon_cyan`, `amber_terminal`) y `lang` (`en`, `es`). La serpiente además acepta `morph`, `speed`, `pause` y `mood`: con `mood=auto` (por defecto) duerme si llevas una semana sin contribuir y presume de tu racha cuando pasa de 7 días. El contrato completo está en [docs/contract.md](docs/contract.md) y una plantilla lista para copiar en [docs/profile_readme_template.md](docs/profile_readme_template.md).

## Para compartir fuera de GitHub

`/api/og/<usuario>.png` es tu tarjeta de 1200×630 para LinkedIn o X, y `/u/<usuario>` es el enlace que la muestra al compartirlo. Los duelos tienen la suya en `/api/og/duel/<a>-vs-<b>.png`. En la web también hay plantillas de perfil con texto (desarrollador, estudiante, mantenedor) y una vista previa del README tal como se verá en GitHub.

## Estudio

En `/play.html` está el lado jugable: la serpiente en vivo, modo manual, duelo contra la IA, duelos entre perfiles en tiempo real, los cuatro modos de juego (los juega la IA o tú), Commit Art y clips de video para X, LinkedIn, Reels o TikTok.

## GitHub Action

Si prefieres no depender del servidor, la Action genera la serpiente en tu propio repositorio:

```yaml
- uses: perfila/perfila@v1   # referencia provisional, ver shared/brand.js
  with:
    github_user_name: tu-usuario
    outputs: |
      dist/perfila-snake.svg?theme=paper
      dist/perfila-snake-dark.svg?theme=ink
```

## Desarrollo

Node 20 o superior. Una sola dependencia, `@resvg/resvg-js`, para convertir las tarjetas para redes a PNG (`npm install`); la fuente que usan, JetBrains Mono, está en `assets/fonts` con su licencia OFL.

```bash
npm run dev
```

Levanta la web y la API en `http://localhost:3000` con datos reales de GitHub. Sin token usa las API públicas (perfil, calendario, seguidores y estrellas exactos; commits, PRs y lenguajes aproximados, y la web lo avisa). Con token, igual que en producción:

```bash
GITHUB_TOKEN=<token sin permisos> npm run dev
```

`npm run dev:fixture` usa datos de prueba inventados, sin red (lo usan las pruebas visuales); la web también lo avisa.

```bash
npm test
```

`npm run smoke` abre la portada y el estudio en Chrome sin ventana, con datos de prueba y las cabeceras de seguridad de `vercel.json`, y comprueba que se pintan (ruta de Chrome con `CHROME=...`).

| Carpeta | Qué hay |
| --- | --- |
| `index.html`, `css/`, `js/site.js` | La web: portada, campo de usuario y galería de piezas |
| `play.html`, `style.css`, `js/` | El estudio y el motor (serpiente, pathfinding, exportador SVG, duelo, video) |
| `shared/` | Lo que comparten web, API y Action: marca, design tokens, contrato, código para el README |
| `server/`, `api/` | Funciones de Vercel: serpiente, piezas, duelo y calendario |
| `action/` | GitHub Action |
| `tests/` | Pruebas, incluidas huellas visuales de cada SVG por tema |
| `docs/` | Marca, plan, contrato y métricas |

Despliegue: Vercel sirve la web y la API juntas; necesita la variable `GITHUB_TOKEN` (un token sin permisos basta). El dominio y el repositorio públicos se configuran en `shared/brand.js`.

Para aguantar mucho tráfico (`server/cache.js`):

- `GITHUB_TOKEN` admite varios tokens separados por comas: se usa el que más consultas le quedan. Cuando a todos les quedan menos de 500 en la hora, los datos se dan por buenos 6 h en lugar de 30 min.
- Con `KV_REST_API_URL` y `KV_REST_API_TOKEN` (Vercel KV o Upstash Redis) la caché se comparte entre instancias.
- Si GitHub falla, se sirve el último dato bueno de hasta 24 h en vez de un error.

## Documentación

- [Marca: nombre, logo, color y tono](docs/BRAND.md)
- [Plan y fases](docs/roadmap/PLAN.md)
- [Contrato de URL](docs/contract.md)
- [Métricas](docs/metrics.md)
- [Perfiles de ejemplo por estilo](examples/README.md)
- [Lanzamiento: listas, Marketplace, artículo y publicaciones](docs/launch/README.md)

Perfila nace del motor de GITHUB_SNAKE.EXE, del mismo autor.
