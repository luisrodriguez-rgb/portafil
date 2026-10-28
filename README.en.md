<p align="center">
  <img src="assets/brand/og.png" alt="Perfila: one style for your whole GitHub profile" width="100%">
</p>

<p align="center"><b>English</b> · <a href="README.md">Español</a></p>

# Perfila

**One style for your whole GitHub profile.** Header, stats, streak, languages, activity, the snake that eats your commits, versus and duels against other profiles: every piece shares theme, type and sizes, so your profile looks like one design instead of a collage of widgets.

Type your username on the web, pick what you like and copy the code. No YAML, nothing to configure. GitHub runs no JavaScript in a README, so every piece is an SVG with CSS animation served from a URL.

## Pieces

| Piece | URL | Shows |
| --- | --- | --- |
| Header | `/api/header/<user>.svg` | Avatar, name, bio, followers, repos, stars and active days |
| Stats | `/api/stats/<user>.svg` | Contributions, commits, PRs, issues, reviews and stars in the last year |
| Streak | `/api/streak/<user>.svg` | Current streak, longest and the last 30 days |
| Languages | `/api/langs/<user>.svg` | Languages by code size in your public repos |
| Activity | `/api/activity/<user>.svg` | Contributions per week, 53 weeks |
| All in one | `/api/kit/<user>.svg` | The five above in a single image |
| Snake | `/api/<user>.svg` | An AI (BFS + Flood Fill) eats your contribution graph |
| Game of Life | `/api/<user>.svg?game=life` | Your contributions evolve with Conway's rules |
| Pac-Man | `/api/<user>.svg?game=pacman` | Pac-Man eats your graph while two ghosts chase it |
| Invaders | `/api/<user>.svg?game=invaders` | A ship shoots your contributions, column by column |
| Tetris | `/api/<user>.svg?game=tetris` | Your year falls toward the past and pieces complete weeks |
| Versus | `/api/versus/<a>-vs-<b>.svg` | Your numbers next to another profile's |
| Duel | `/api/duel/<a>-vs-<b>.svg` | The same AI on both graphs, with the score; the `/duel/<a>-vs-<b>` page is for sharing and challenging |

All of them take `theme` (`ink`, `paper`, `dark`, `light`, `cyberpunk`, `neon_cyan`, `amber_terminal`) and `lang` (`en`, `es`). The snake also takes `morph`, `speed`, `pause` and `mood`: with `mood=auto` (the default) it sleeps after a week without contributions and shows off your streak once it passes 7 days. The full contract is in [docs/contract.md](docs/contract.md) and a ready-to-copy template in [docs/profile_readme_template.md](docs/profile_readme_template.md).

## Studio

`/play.html` is the playable side: the live snake, manual mode, duel against the AI, real-time duels between profiles, the four game modes (played by the AI or by you), Commit Art and video clips for X, LinkedIn, Reels or TikTok.

## GitHub Action

If you would rather not depend on the server, the Action generates the snake in your own repository:

```yaml
- uses: perfila/perfila@v1   # provisional reference, see shared/brand.js
  with:
    github_user_name: your-user
    outputs: |
      dist/perfila-snake.svg?theme=paper
      dist/perfila-snake-dark.svg?theme=ink
```

## Development

No dependencies: Node 20 or later.

```bash
npm run dev
```

Serves the web and the API at `http://localhost:3000` with fixture data (any username works; those starting with `ghost` do not exist). With real data:

```bash
GITHUB_TOKEN=<token with no scopes> npm run dev:live
```

```bash
npm test
```

Deployment: Vercel serves the web and the API together; it needs the `GITHUB_TOKEN` variable (a token with no scopes is enough). The public domain and repository are set in `shared/brand.js`.

## Docs (Spanish)

- [Brand: name, logo, color and tone](docs/BRAND.md)
- [Plan and phases](docs/roadmap/PLAN.md)
- [URL contract](docs/contract.md)
- [Metrics](docs/metrics.md)

Perfila grows out of the GITHUB_SNAKE.EXE engine, by the same author.
