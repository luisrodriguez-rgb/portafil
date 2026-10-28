# Perfila · marca

## Nombre

**Perfila**: de *perfil* y *perfilar* (dar forma, definir el contorno). Se lee igual en español y en inglés y dice lo que hace: darle forma a tu perfil de GitHub.

Alternativas que se descartaron: *Facet* (genérico y ocupado en muchas herramientas), *Lienzo* (difícil en inglés), *Readmi* (demasiado atado al archivo README). No se ha comprobado aún la disponibilidad del dominio ni de la marca: hacerlo antes del lanzamiento.

No usar "GitHub" ni "Octo" en el nombre ni en el logo: son marcas de GitHub.

## Idea

GitHub no deja ejecutar nada en un README, así que la mayoría de perfiles terminan siendo un collage de widgets que no se parecen entre sí. Perfila genera todas las piezas (cabecera, estadísticas, racha, lenguajes, actividad, serpiente, versus, duelo) con un mismo sistema visual, desde un solo dato: tu usuario.

**Promesa:** escribe tu usuario, elige lo que quieras, copia y pega.

## Logo

El símbolo es una **P hecha de celdas del calendario de contribuciones**: cuatro intensidades sobre una rejilla de 3×5, donde las celdas vacías siguen visibles muy tenues. Evoca el gráfico de contribuciones sin usar el verde de GitHub.

| Archivo | Uso |
| --- | --- |
| `assets/brand/mark.svg` | Símbolo solo (avatar, favicon, redes) |
| `assets/brand/wordmark.svg` | Símbolo + nombre (cabecera de la web, README) |
| `favicon.svg` | Favicon; cambia a claro en modo oscuro |

Es un logo de prueba: el símbolo es definitivo como idea, la tipografía del nombre es la del sistema y se sustituirá por un trazado propio.

## Color

La marca es **monocroma**. El color lo pone cada usuario al elegir el tema de sus piezas; la web y el logo no compiten con él.

| Token | Hex | Uso |
| --- | --- | --- |
| Tinta | `#111214` | Texto y fondo oscuro |
| Grafito | `#1B1D21` | Superficies en oscuro |
| Línea | `#2A2D33` | Bordes en oscuro |
| Niebla | `#8A8F98` | Texto secundario |
| Bruma | `#E4E5E8` | Bordes en claro |
| Papel | `#F6F6F4` | Fondo claro |

Rampa de celdas (logo y temas neutros): oscuro `#2E3137 · #4A4F57 · #7D838D · #C9CDD3`, claro `#D3D6DA · #A3A8B0 · #6B7079 · #2A2D33`.

Dos temas nuevos para las piezas siguen esta paleta: **`ink`** (oscuro, el tema por defecto) y **`paper`** (claro). Los cinco temas de color (`dark`, `light`, `cyberpunk`, `neon_cyan`, `amber_terminal`) siguen disponibles.

## Tipografía

- Interfaz: la sans del sistema (`system-ui`). Sin fuentes web: la página carga al instante y no llama a terceros.
- Piezas y código: monoespaciada del sistema (`ui-monospace`). En las piezas, además, permite calcular anchos de texto en el servidor.

## Tono

Corto y directo, en segunda persona. Bilingüe español/inglés. Sin jerga de "hacker" ni efectos: la herramienta se presenta limpia para que el perfil de cada uno sea el protagonista.
