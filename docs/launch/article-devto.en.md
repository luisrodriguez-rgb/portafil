---
title: Why every GitHub profile looks the same (and how I tried to fix it)
published: false
tags: github, opensource, svg, showdev
cover_image: https://DOMINIO/api/og/OWNER.png?theme=ink
---

Open ten GitHub profiles with a custom README and you will mostly see the same thing: a stats card in one theme, a languages card in another, a streak card in a third, the green snake eating the contribution graph, and a row of colorful badges. Each piece is good on its own. Together they look like a collage.

Nobody did anything wrong. Every tool solves one problem and picks its own style. And a profile README has a hard limit: **GitHub runs no JavaScript**. Everything you see is an image, so the only way to make it feel alive is to serve SVG with CSS animation from a URL.

## The idea: a system, not widgets

[Perfila](https://DOMINIO) starts from a different question: what if every piece of the profile came from the same visual system?

- **One input:** type your GitHub username. No YAML, no token of your own.
- **Seven styles**, and every piece changes together: header, stats, streak, languages, weekly activity, versus, duels.
- **Real light and dark mode:** every piece is pasted as `<picture>`, so your profile follows the visitor's GitHub theme.
- **You pick what to use:** one piece, several, or a full template with text (developer, student, maintainer).

All cards share the same design tokens (colors, monospace type, radii, sizes). The header is exactly as wide as the snake, and two small cards fit that width exactly. That boring part is what makes it look like one design instead of a stack of images.

## Games that fit in an SVG

The snake walking the contribution graph is the best-known piece of these profiles, so I used it as the starting point and added more modes with the same idea: your graph is the board.

- **Game of Life:** Conway's rules applied to your contributions, on a board that wraps around its edges.
- **Pac-Man:** your contributions are food, the brightest ones are power pellets, and two BFS ghosts chase you.
- **Invaders:** a ship shoots the lowest live cell of each column.
- **Tetris:** gravity pulls your year "toward the past" and pieces come in from today to complete weeks.

The technically interesting part is that there is no JavaScript in the result. Each mode is a deterministic simulation that runs on the server. It records what happens at every step, and that becomes CSS `@keyframes`. The same graph always plays the same game, so a CDN-cached SVG is as good as a fresh one.

Weight was the challenge. A README SVG can't be megabytes. The first Pac-Man was 135 KB because the ghosts turned on every cell, and every turn is a keyframe. Making the BFS prefer going straight when two paths are equally short brought it down to about 95 KB. It travels brotli-compressed, so the download is about 7 KB.

## Duels bring two people

A duel runs the same AI on two graphs for the same number of steps. The GitHub that feeds its snake the most wins. Every duel has:

- an SVG for the README with the score and the replay,
- a share page with its own social image,
- a button to challenge the winner.

I designed it as the tool's growth loop: a normal profile involves one person, a duel involves two.

## What I learned

1. **Consistency is a constraint, not an effect.** The most useful decision was what *not* to do: no particles, no glows, no piece with a style of its own.
2. **Deterministic makes everything easier.** Caching, visual regression tests by fingerprint, and the guarantee that the web, the README and the duel video all agree on the winner.
3. **Social networks don't take SVG.** For a link to look good on X or LinkedIn you have to rasterize to PNG on the server, and on serverless that means shipping your own fonts.

## Try it

Type your username at https://DOMINIO, pick a style and copy. The code is at https://github.com/OWNER/REPO. If you use it on your profile, I'd love to see it.
