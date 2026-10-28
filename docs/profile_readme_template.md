# Plantilla para tu Perfil Especial de GitHub (`luisrodriguez-rgb/luisrodriguez-rgb`)

Copia y pega este contenido en el archivo `README.md` de tu repositorio especial de GitHub (`https://github.com/luisrodriguez-rgb/luisrodriguez-rgb`):

## Kit visual completo (recomendado)

Cabecera, estadísticas, racha, lenguajes, actividad y serpiente con el mismo tema. Cada pieza cambia sola entre modo claro y oscuro con `<picture>`. No necesita workflow: el endpoint lee tus datos públicos y se actualiza cada pocas horas.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/header/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/header/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="@luisrodriguez-rgb by GITHUB_SNAKE.EXE" src="https://github-snake-ebon.vercel.app/api/header/luisrodriguez-rgb.svg?theme=light&lang=es" width="100%">
</picture>

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/stats/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/stats/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="@luisrodriguez-rgb stats" src="https://github-snake-ebon.vercel.app/api/stats/luisrodriguez-rgb.svg?theme=light&lang=es" width="49%">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/streak/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/streak/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="@luisrodriguez-rgb streak" src="https://github-snake-ebon.vercel.app/api/streak/luisrodriguez-rgb.svg?theme=light&lang=es" width="49%">
</picture>
</p>

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/langs/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/langs/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="@luisrodriguez-rgb languages" src="https://github-snake-ebon.vercel.app/api/langs/luisrodriguez-rgb.svg?theme=light&lang=es" width="49%">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/activity/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/activity/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="@luisrodriguez-rgb weekly activity" src="https://github-snake-ebon.vercel.app/api/activity/luisrodriguez-rgb.svg?theme=light&lang=es" width="49%">
</picture>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github-snake-ebon.vercel.app/api/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://github-snake-ebon.vercel.app/api/luisrodriguez-rgb.svg?theme=light&lang=es">
  <img alt="snake eating @luisrodriguez-rgb contributions by GITHUB_SNAKE.EXE" src="https://github-snake-ebon.vercel.app/api/luisrodriguez-rgb.svg?theme=light&lang=es" width="100%">
</picture>
```

Variantes: cambia `cyberpunk` por `dark`, `neon_cyan` o `amber_terminal`; quita `&lang=es` para inglés; o usa una sola imagen con todo:

```html
<img src="https://github-snake-ebon.vercel.app/api/kit/luisrodriguez-rgb.svg?theme=cyberpunk&lang=es" width="100%">
```

## Plantilla completa con texto

```markdown
# Hola, soy Luis Rodriguez 👋

> Desarrollador Frontend & Creador de Sistemas Interactivos.  
> Especializado en aplicaciones web de alto rendimiento, Canvas 2D / WebGL, algoritmos de grafos y herramientas para desarrolladores.

---

### Proyecto Destacado: GITHUB_SNAKE.EXE

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/luisrodriguez-rgb/luisrodriguez-rgb/output/github-contribution-grid-snake-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/luisrodriguez-rgb/luisrodriguez-rgb/output/github-contribution-grid-snake.svg">
    <img alt="Snake Contribution Animation" src="https://raw.githubusercontent.com/luisrodriguez-rgb/luisrodriguez-rgb/output/github-contribution-grid-snake.svg" width="100%">
  </picture>
</p>

* **[Probar Demo en Vivo](https://luisrodriguez-rgb.github.io/GITHUB_SNAKE.EXE/)**
* **[Ver Código en GitHub](https://github.com/luisrodriguez-rgb/GITHUB_SNAKE.EXE)**
* Motor interactivo a 60 FPS desarrollado con **Vanilla JavaScript** y **Canvas 2D**:
  * Pathfinding inteligente con búsqueda en anchura (**BFS**) y evaluación espacial de seguridad (**Flood Fill**).
  * Renderizado desacoplado con interpolación **LERP sub-píxel** sin vibraciones.
  * Creador de **Commit Art** con fuentes tipográficas bitmap y generación automática de scripts Bash (.sh).
  * Modo versus multijugador (IA vs Jugador).

---

### Tecnologías & Enfoque

* **Frontend & Gráficos**: JavaScript (ES6+), TypeScript, Canvas 2D, WebGL, Web Audio API, MediaRecorder API.
* **Arquitectura & Performance**: Algoritmos de grafos (BFS, DFS, Dijkstra), Autómatas celulares, Web Workers, Service Workers.
* **Infraestructura & Edge**: Cloudflare Workers, Pages, GitHub Actions, Docker, CI/CD.

---

### Conectemos

* **GitHub**: [github.com/luisrodriguez-rgb](https://github.com/luisrodriguez-rgb)
* **X (Twitter)**: [@Luis_RodG11](https://twitter.com/Luis_RodG11)
```
