# Contrato de URL · v1

Las URL de este documento ya están pegadas en perfiles reales. Regla: **se pueden añadir opciones y valores, nunca quitarlos ni cambiar su significado**. Un cambio incompatible exige subir `CONTRACT_VERSION` en `shared/snake-core.js`. `tests/contract.test.js` guarda una copia congelada de esta lista y falla si algo desaparece.

## Serpiente

`GET /api/<usuario>.svg`

| Opción | Valores | Por defecto |
| --- | --- | --- |
| `theme` | `ink`, `paper`, `dark`, `light`, `cyberpunk`, `neon_cyan`, `amber_terminal` | `ink` |
| `speed` | `normal`, `fast`, `relaxed` | `normal` |
| `morph` | `matrix_viper`, `capsule`, `retro` | `matrix_viper` |
| `pause` | `fast`, `medium`, `none` | `fast` |
| `lang` | `en`, `es` | `en` |

La GitHub Action acepta las mismas opciones en cada línea de `outputs`.

## Kit visual

`GET /api/<pieza>/<usuario>.svg`

| Pieza | Tamaño | Contenido |
| --- | --- | --- |
| `header` | 797×120 | Avatar, nombre, usuario, ubicación, bio, seguidores, repos y estrellas |
| `stats` | 390×160 | Contribuciones del año, commits, PRs, issues, reviews y estrellas |
| `streak` | 390×160 | Racha actual, racha más larga del último año y los últimos 30 días |
| `langs` | 390×160 | Lenguajes por tamaño en los repos públicos propios (sin forks) |
| `activity` | 390×160 | Contribuciones por semana, 53 semanas |
| `kit` | 797×474 | Las cinco anteriores en una sola imagen |

| Opción | Valores | Por defecto |
| --- | --- | --- |
| `theme` | igual que la serpiente | `ink` |
| `lang` | `en`, `es` | `en` |

Los anchos encajan con la serpiente (797 px): una pieza `half` de 390 px más 17 px de separación más otra de 390 px.

## Dos perfiles

| Ruta | Tamaño | Contenido |
| --- | --- | --- |
| `/api/duel/<a>-vs-<b>.svg` | 797×442 | Marcador y repetición animada del duelo (misma IA, 480 ticks) |
| `/api/versus/<a>-vs-<b>.svg` | 797×278 | Comparación de cifras sin juego |
| `/duel/<a>-vs-<b>` | página HTML | Resultado, enlace para compartir, reto y código para el README |

Opciones: `theme` y `lang`, como las tarjetas. Si un usuario contiene `-vs-`, la pareja se pasa como `?a=<usuario>&b=<usuario>`.

## Errores

Todas las rutas responden con un SVG legible (no una imagen rota) y el código HTTP correspondiente: 400 opción o usuario no válido, 404 usuario inexistente, 500 configuración del servidor, 502 GitHub no respondió.

## Caché

SVG correctos: `max-age=14400, s-maxage=21600, stale-while-revalidate=86400`. Errores: 5 minutos. Calendario y perfil en memoria de la función: 30 minutos.
