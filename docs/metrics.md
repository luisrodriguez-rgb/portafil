# Métricas

La señal principal es **cuántos perfiles reales usan el endpoint**, no las estrellas. Hay dos fuentes:

## 1. Logs de la función (adopción real)

Cada petición a `/api/...` escribe una línea JSON en los Runtime Logs de Vercel (`server/metrics.js`):

```json
{"evt":"portafil.render","endpoint":"stats","user":"octocat","theme":"cyberpunk","status":200,"ms":41}
```

`endpoint` es `snake`, `calendar`, la pieza del kit (`header`, `stats`, `streak`, `langs`, `activity`, `kit`) o del duelo (`duel`, `versus`, `duel-page`; ahí `user` es la pareja `a-vs-b`), y las imágenes para redes (`og-profile`, `og-duel`, `share-page`). Solo se registra el usuario de GitHub, que ya es público en la URL; ni IPs ni cookies.

Los Runtime Logs del plan gratuito duran poco, así que para medir semanas hay que exportarlos (Log Drain o descarga desde el panel) y contar:

| Métrica | Cálculo |
| --- | --- |
| Perfiles únicos por semana | `user` distintos con `status` 200 |
| Perfiles que usan más de una pieza | `user` con 2 o más `endpoint` distintos |
| Temas más usados | conteo por `theme` |
| Duelos compartidos | visitas a `duel-page` frente a `duel` creados; usuarios nuevos que aparecen tras un `duel-page` |
| Perfiles compartidos fuera de GitHub | peticiones a `og-profile` y `share-page` (las redes piden la imagen al mostrar el enlace) |
| Coste | percentil 95 de `ms` por `endpoint` |

### Eventos de la web

La web envía a `POST /api/event` (`server/event.js`) unos pocos eventos, sin cookies ni usuario de GitHub, y nunca si el navegador pide Do Not Track o Global Privacy Control:

```json
{"evt":"portafil.event","event":"copy","ms":74213,"pieces":6,"theme":"cyberpunk","template":"developer","lang":"es"}
```

| Evento | Cuándo |
| --- | --- |
| `user` | se cargan las piezas de un usuario |
| `copy` | se copia el bloque README completo (`pieces`: cuántas piezas) |
| `copy-piece` | se copia una pieza suelta (`kind`) |
| `preview` | se abre la vista previa del README |
| `share` | se copia el enlace o se descarga la tarjeta para redes |

**Puerta de la Fase 4** (publicar el perfil en menos de dos minutos): la mediana de `ms` del primer `copy` de cada visita, por debajo de 120000. Como aproximación de "publicado", cruzarlo con perfiles nuevos en los logs de render en las horas siguientes.

La CDN sirve la mayoría de las visitas sin llegar a la función (caché de 6 h), así que estas cifras cuentan **perfiles**, no visitas al perfil.

## 2. Repositorio (alcance)

```bash
GITHUB_TOKEN=ghp_xxx node scripts/baseline.js luisrodriguez-rgb/Perfila
```

Guarda `docs/metrics/baseline-<fecha>.json` con estrellas, forks, visitas y clones de 14 días, principales referentes, y una aproximación de adopción por búsqueda de código (READMEs que enlazan el endpoint y workflows que usan la Action). Ejecutarlo al cerrar cada fase para comparar.
