# Publicar la Action en GitHub Marketplace

La Action (`action.yml`) genera la serpiente y los modos de juego en el propio repositorio del usuario, sin depender del servidor de Portafil. Es la vía para quien prefiere no enlazar imágenes externas.

## Requisitos de GitHub

Según la documentación de GitHub (consultada el 28 de octubre de 2026):

- Repositorio público, con un único `action.yml` en la raíz (ya está, con `description` y `branding`: icono `grid`, color `gray-dark`).
- El `name` debe ser único: no puede coincidir con otra Action de Marketplace, con un usuario u organización de GitHub ajenos, con una categoría de Marketplace ni con un nombre de función de GitHub. "Portafil snake" no está comprobado: si GitHub lo rechaza al publicar, cambiarlo en `action.yml`.
- Los workflows de CI (`.github/workflows/`) pueden quedarse.
- Aceptar el acuerdo de desarrollador de Marketplace la primera vez (lo pide GitHub al publicar).

## Pasos

1. 👤 Poner el repositorio definitivo en `shared/brand.js` → `actionRef: 'OWNER/REPO@v1'` y regenerar `examples/` (`node scripts/build-examples.js`).
2. 👤 Crear la versión: `git tag -a v1.0.0 -m "Portafil v1.0.0"` y `git tag -f v1` (la etiqueta mayor que usan los workflows), y subir las etiquetas.
3. 👤 En GitHub, *Releases → Draft a new release* con `v1.0.0`, marcar **Publish this Action to the GitHub Marketplace** y elegir las categorías *Utilities* y *Publishing*.
4. En la descripción de la versión, una captura del kit completo (no solo de la serpiente) y el ejemplo de uso:

```yaml
- uses: OWNER/REPO@v1
  with:
    github_user_name: tu-usuario
    outputs: |
      dist/portafil-snake.svg?theme=paper
      dist/portafil-snake-dark.svg?theme=ink
      dist/portafil-pacman-dark.svg?theme=ink&game=pacman
```

## Al publicar versiones nuevas

Mover la etiqueta `v1` a la nueva versión compatible (`git tag -f v1 && git push -f origin v1`). Un cambio que rompa opciones del contrato (`docs/contract.md`) va en `v2`.
