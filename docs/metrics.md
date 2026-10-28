# Métricas

La señal principal es **cuántos perfiles reales usan el endpoint**, no las estrellas. Hay dos fuentes:

## 1. Logs de la función (adopción real)

Cada petición a `/api/...` escribe una línea JSON en los Runtime Logs de Vercel (`server/metrics.js`):

```json
{"evt":"gse.render","endpoint":"stats","user":"octocat","theme":"cyberpunk","status":200,"ms":41}
```

`endpoint` es `snake`, `calendar`, la pieza del kit (`header`, `stats`, `streak`, `langs`, `activity`, `kit`) o del duelo (`duel`, `versus`, `duel-page`; ahí `user` es la pareja `a-vs-b`). Solo se registra el usuario de GitHub, que ya es público en la URL; ni IPs ni cookies.

Los Runtime Logs del plan gratuito duran poco, así que para medir semanas hay que exportarlos (Log Drain o descarga desde el panel) y contar:

| Métrica | Cálculo |
| --- | --- |
| Perfiles únicos por semana | `user` distintos con `status` 200 |
| Perfiles que usan más de una pieza | `user` con 2 o más `endpoint` distintos |
| Temas más usados | conteo por `theme` |
| Duelos compartidos | visitas a `duel-page` frente a `duel` creados; usuarios nuevos que aparecen tras un `duel-page` |
| Coste | percentil 95 de `ms` por `endpoint` |

La CDN sirve la mayoría de las visitas sin llegar a la función (caché de 6 h), así que estas cifras cuentan **perfiles**, no visitas al perfil.

## 2. Repositorio (alcance)

```bash
GITHUB_TOKEN=<token con acceso al repo> node scripts/baseline.js
```

Guarda `docs/metrics/baseline-<fecha>.json` con estrellas, forks, visitas y clones de 14 días, principales referentes, y una aproximación de adopción por búsqueda de código (READMEs que enlazan el endpoint y workflows que usan la Action). Ejecutarlo al cerrar cada fase para comparar.
