---
title: Por qué todos los perfiles de GitHub se ven iguales (y cómo intenté arreglarlo)
published: false
tags: github, opensource, svg, showdev
cover_image: https://DOMINIO/api/og/OWNER.png?theme=ink&lang=es
---

Abre diez perfiles de GitHub con README personalizado y vas a ver casi siempre lo mismo: una tarjeta de estadísticas con un tema, una de lenguajes con otro, una racha con un tercero, la serpiente verde que se come el gráfico de contribuciones y una fila de insignias de colores. Cada pieza es buena por separado. Juntas parecen un collage.

No es culpa de nadie. Cada herramienta resuelve un problema y elige su propio estilo. El README de un perfil, además, tiene una limitación fuerte: **GitHub no ejecuta JavaScript**. Lo que se ve son imágenes, así que la única forma de tener algo "vivo" es servir SVG con animación CSS desde una URL.

## La idea: un sistema, no widgets

[Portafil](https://DOMINIO) parte de otra pregunta: ¿y si todas las piezas del perfil salieran del mismo sistema visual?

- **Un solo dato:** escribes tu usuario de GitHub y ya está. Sin YAML ni token propio.
- **Siete estilos**, y todas las piezas cambian juntas: cabecera, estadísticas, racha, lenguajes, actividad semanal, versus, duelos.
- **Claro y oscuro de verdad:** cada pieza se pega con `<picture>`, así que tu perfil cambia con el modo de GitHub de quien lo visita.
- **Eliges qué usar:** una pieza suelta, varias o una plantilla completa con texto (desarrollador, estudiante, mantenedor).

Todas las tarjetas comparten los mismos *design tokens* (colores, tipografía monoespaciada, radios, medidas). La cabecera mide lo mismo que la serpiente y dos tarjetas pequeñas encajan exactamente en ese ancho. Esa es la parte aburrida que hace que el resultado parezca un diseño y no una pila de imágenes.

## Juegos que caben en un SVG

La serpiente que recorre el gráfico de contribuciones es la pieza más conocida de estos perfiles, así que la tomé como punto de partida y añadí más modos con la misma idea: tu gráfico es el tablero.

- **Juego de la vida:** las reglas de Conway aplicadas a tus contribuciones, en un tablero que da la vuelta por los bordes.
- **Pac-Man:** tus contribuciones son la comida, las más intensas son pastillas de poder y dos fantasmas persiguen con BFS.
- **Invasores:** una nave dispara a la celda viva más baja de cada columna.
- **Tetris:** la gravedad junta tu año "hacia el pasado" y las piezas entran desde hoy para completar semanas.

Lo interesante técnicamente es que no hay JavaScript en el resultado. Cada modo es una simulación determinista que corre en el servidor. Se anota lo que pasa en cada paso y eso se convierte en `@keyframes` de CSS. El mismo gráfico da siempre la misma partida, así que un SVG en caché de CDN es tan válido como uno recién generado.

El reto fue el peso. Un SVG de README no puede pesar megas. La primera versión de Pac-Man pesaba 135 KB porque los fantasmas giraban en cada casilla y cada giro es un fotograma. Bastó con que el BFS prefiera seguir recto cuando dos caminos son igual de cortos: bajó a unos 95 KB. Y como viaja comprimido con brotli, lo que se descarga son unos 7 KB.

## Duelos que traen a dos personas

Un duelo pone la misma IA sobre dos gráficos durante el mismo número de pasos. Gana el GitHub que más le da de comer a su serpiente. Cada duelo tiene:

- un SVG para el README con el marcador y la repetición,
- una página para compartir con su propia imagen para redes,
- un botón para retar al ganador.

Lo pensé como el mecanismo para que la herramienta crezca: un perfil normal involucra a una persona, un duelo a dos.

## Lo que aprendí

1. **La coherencia es una restricción, no un efecto.** Lo más útil fue decidir qué *no* hacer: nada de partículas, brillos ni piezas con estilo propio.
2. **Determinista lo hace todo más fácil.** Caché, pruebas de regresión visual por huella y la garantía de que la web, el README y el video del duelo dan el mismo ganador.
3. **Las redes no aceptan SVG.** Para que un enlace se vea bien en X o LinkedIn hay que rasterizar a PNG en el servidor, y en un entorno *serverless* eso implica llevar tus propias fuentes.

## Pruébalo

Escribe tu usuario en https://DOMINIO, elige un estilo y copia. El código está en https://github.com/OWNER/REPO. Si lo usas en tu perfil, me encantaría verlo.
