# Perfil del autor con Portafil

`github.com/luisrodriguez-rgb` es el mejor ejemplo de Portafil: es el perfil de la portada y de `examples/` (`Brand.demoUser`). Esta propuesta conserva el README actual (cabecera, proyectos, roadmap) y cambia tres bloques. Los temas son **Tinta** (oscuro) y **Papel** (claro), los monocromos que ya usa el README, y cambian solos con el modo de GitHub.

Requisito: que `portafil.vercel.app` responda (ver `docs/launch/README.md`); si no, las imágenes no cargan.

## 1. Barra de enlaces: el motor pasa a ser Portafil

Sustituye el botón `LIVE_ENGINE-GITHUB__SNAKE.EXE` por:

```html
  <a href="https://portafil.vercel.app">
    <img src="https://img.shields.io/badge/LIVE_ENGINE-PORTAFIL-18181B?style=for-the-badge&logo=vercel&logoColor=FAFAFA" alt="Portafil" />
  </a>&nbsp;
```

## 2. Proyecto 04: de GITHUB_SNAKE.EXE a Portafil

Sustituye la celda `<!-- PROYECTO 04: GITHUB_SNAKE.EXE -->` completa (desde ese comentario hasta su `</td>`). El icono es el símbolo de Portafil; súbelo a `assets/portafil.svg` del repositorio de perfil desde `assets/brand/mark.svg`.

```html
    <!-- PROYECTO 04: PORTAFIL -->
    <td width="50%" valign="top">
      <h4>
        <img src="./assets/portafil.svg" width="30" height="30" align="absmiddle" alt="Portafil" />
        &nbsp; <code>04 // PORTAFIL</code>
      </h4>
      <p><strong>Motor de identidad visual para perfiles de GitHub</strong></p>
      <p>Genera todas las piezas de un perfil (cabecera, estadísticas, racha, lenguajes, actividad, duelos) con un único sistema de diseño, a partir de un usuario. Convierte el gráfico de contribuciones en <strong>serpiente con IA BFS + Flood Fill, Pac-Man, invasores, Tetris y el juego de la vida</strong>: simulados en el servidor y servidos como <strong>SVG con animación CSS</strong>, sin JavaScript. Incluye estudio jugable, duelos entre perfiles, tarjetas para redes y <strong>GitHub Action</strong>.</p>
      <p>
        <code>Node.js</code> <code>Vercel Functions</code> <code>SVG + CSS</code> <code>GraphQL</code> <code>BFS + Flood Fill AI</code>
      </p>
      <p>
        <a href="https://portafil.vercel.app">
          <img src="https://img.shields.io/badge/CREAR_MI_PERFIL-PORTAFIL-FAFAFA?style=flat-square&logo=vercel&logoColor=09090B&labelColor=09090B" alt="Portafil" />
        </a>
        <a href="https://portafil.vercel.app/play.html">
          <img src="https://img.shields.io/badge/ESTUDIO-18181B?style=flat-square" alt="Estudio" />
        </a>
        <a href="https://github.com/luisrodriguez-rgb/portafil">
          <img src="https://img.shields.io/badge/CÓDIGO_FUENTE-18181B?style=flat-square&logo=github" alt="Repo" />
        </a>
      </p>
    </td>
```

## 3. Telemetría: el dashboard y la serpiente de Portafil

Sustituye la sección `02 // TELEMETRÍA DE CONTRIBUCIONES & AUTOMATIZACIÓN` (desde su título hasta el `---` siguiente):

```html
### `02 // TELEMETRÍA DE CONTRIBUCIONES`

<div align="center">
  <a href="https://portafil.vercel.app/?u=luisrodriguez-rgb">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://portafil.vercel.app/api/kit/luisrodriguez-rgb.svg?theme=ink&lang=es">
      <img alt="Dashboard de contribuciones de @luisrodriguez-rgb" src="https://portafil.vercel.app/api/kit/luisrodriguez-rgb.svg?theme=paper&lang=es" width="100%">
    </picture>
  </a>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://portafil.vercel.app/api/luisrodriguez-rgb.svg?theme=ink&lang=es">
    <img alt="Serpiente con IA devorando el gráfico de contribuciones de @luisrodriguez-rgb" src="https://portafil.vercel.app/api/luisrodriguez-rgb.svg?theme=paper&lang=es" width="100%">
  </picture>
</div>

<p>
  Datos reales de mi calendario, servidos en vivo por <a href="https://portafil.vercel.app"><strong>Portafil</strong></a>: la misma IA (BFS + Flood Fill) devora el 100% de la matriz y todo el panel comparte un solo sistema visual. <a href="https://portafil.vercel.app/?u=luisrodriguez-rgb"><strong>Crea el tuyo en un minuto →</strong></a>
</p>
<p>
  ¿Tu GitHub le gana al mío? <a href="https://portafil.vercel.app/duel/luisrodriguez-rgb-vs-torvalds"><strong>Rétame en un duelo de perfiles →</strong></a> (cambia <code>torvalds</code> por tu usuario en la página del duelo)
</p>

---
```

La serpiente ya no depende del workflow diario de GITHUB_SNAKE.EXE: la sirve la API y se actualiza sola. El workflow y la rama `output` del repositorio de perfil se pueden borrar cuando esto esté publicado.
