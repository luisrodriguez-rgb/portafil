# Plantilla de perfil

Lo más rápido es la web: escribe tu usuario, elige las piezas y copia. Este archivo es la versión a mano.

1. Crea en GitHub un repositorio con **exactamente tu nombre de usuario** (`tu-usuario/tu-usuario`). GitHub muestra su `README.md` en tu perfil.
2. Pega uno de los bloques de abajo en ese `README.md` y cambia `tu-usuario`.
3. Listo: las piezas se actualizan solas cada pocas horas y cambian con el modo claro u oscuro de GitHub.

Cambia `theme=ink` / `theme=paper` por cualquiera de `dark`, `light`, `cyberpunk`, `neon_cyan` o `amber_terminal`, y quita `&lang=es` para tenerlo en inglés. El contrato completo de URL está en [contract.md](contract.md).

## Perfil completo

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/header/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/header/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario by Perfila" src="https://perfila.vercel.app/api/header/tu-usuario.svg?theme=paper&lang=es" width="100%">
</picture>

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/stats/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/stats/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario stats" src="https://perfila.vercel.app/api/stats/tu-usuario.svg?theme=paper&lang=es" width="390">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario streak" src="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=paper&lang=es" width="390">
</picture>
</p>

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/langs/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/langs/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario languages" src="https://perfila.vercel.app/api/langs/tu-usuario.svg?theme=paper&lang=es" width="390">
</picture>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/activity/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/activity/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario weekly activity" src="https://perfila.vercel.app/api/activity/tu-usuario.svg?theme=paper&lang=es" width="390">
</picture>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/tu-usuario.svg?theme=paper&lang=es">
  <img alt="snake eating @tu-usuario contributions by Perfila" src="https://perfila.vercel.app/api/tu-usuario.svg?theme=paper&lang=es" width="100%">
</picture>
```

## Una sola pieza

Cualquier pieza funciona sola. Por ejemplo, solo la racha:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=paper&lang=es">
  <img alt="@tu-usuario streak" src="https://perfila.vercel.app/api/streak/tu-usuario.svg?theme=paper&lang=es" width="390">
</picture>
```

## Duelo contra otro perfil

El duelo enlaza a su página, donde cualquiera puede verlo en grande y retar al ganador:

```html
<a href="https://perfila.vercel.app/duel/tu-usuario-vs-rival">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://perfila.vercel.app/api/duel/tu-usuario-vs-rival.svg?theme=ink&lang=es">
  <source media="(prefers-color-scheme: light)" srcset="https://perfila.vercel.app/api/duel/tu-usuario-vs-rival.svg?theme=paper&lang=es">
  <img alt="@tu-usuario vs @rival duel" src="https://perfila.vercel.app/api/duel/tu-usuario-vs-rival.svg?theme=paper&lang=es" width="100%">
</picture>
</a>
```

## Todo en una imagen

```html
<img src="https://perfila.vercel.app/api/kit/tu-usuario.svg?theme=ink&lang=es" width="100%">
```
