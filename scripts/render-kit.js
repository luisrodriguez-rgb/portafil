#!/usr/bin/env node
/**
 * Renderiza todas las piezas del kit de un usuario en una carpeta, en todos los temas.
 *   GITHUB_TOKEN=... node scripts/render-kit.js <usuario> [carpeta]   datos reales (API GraphQL)
 *   node scripts/render-kit.js --fixture [carpeta]                    datos fijos de las pruebas, sin red
 * Sirve para las capturas del README (assets/showcase/kit) y para revisar cambios visuales a ojo.
 */

const fs = require('fs');
const path = require('path');
const { renderCardSvg } = require('../server/card-svg');
const { renderSnakeSvg } = require('../server/snake-svg');
const { KINDS } = require('../server/cards');
const { engine } = require('../server/common');
const { fixtureWeeks, fixtureProfile } = require('../tests/visual.helpers');

async function main() {
  const args = process.argv.slice(2);
  const fixture = args[0] === '--fixture';
  const user = fixture ? 'octocat' : args[0];
  const outDir = path.resolve(args[1] || path.join('dist', 'kit', user || ''));
  if (!user) throw new Error('Uso: node scripts/render-kit.js <usuario> [carpeta]  |  --fixture [carpeta]');

  let token = process.env.GITHUB_TOKEN;
  let fetchImpl = fetch;
  if (fixture) {
    // GraphQL simulado: el perfil y el calendario de las pruebas visuales
    const p = fixtureProfile();
    token = 'fixture';
    fetchImpl = async (url, init) => {
      const query = JSON.parse(init.body).query;
      const user = query.includes('contributionCalendar')
        ? { contributionsCollection: { contributionCalendar: { weeks: fixtureWeeks() } } }
        : {
          login: p.login, name: p.name, bio: p.bio, location: p.location, avatarUrl: null,
          followers: { totalCount: p.followers }, following: { totalCount: p.following },
          contributionsCollection: {
            totalCommitContributions: p.totals.commits, totalPullRequestContributions: p.totals.pullRequests,
            totalIssueContributions: p.totals.issues, totalPullRequestReviewContributions: p.totals.reviews,
            restrictedContributionsCount: 0
          },
          repositories: {
            totalCount: p.publicRepos,
            nodes: [{ stargazerCount: p.stars, languages: { edges: p.languages.map(l => ({ size: l.size, node: { name: l.name } })) } }]
          }
        };
      return { ok: true, json: async () => ({ data: { user } }) };
    };
  }
  if (!token) throw new Error('Falta GITHUB_TOKEN (o usa --fixture)');

  fs.mkdirSync(outDir, { recursive: true });
  for (const theme of engine.SnakeCore.CARD_OPTION_VALUES.theme) {
    for (const kind of Object.keys(KINDS)) {
      const res = await renderCardSvg({ kind, user, query: `theme=${theme}`, token, fetchImpl });
      if (res.status !== 200) throw new Error(`${kind}/${theme}: ${res.status}`);
      fs.writeFileSync(path.join(outDir, `${kind}-${theme}.svg`), res.body);
    }
    const snake = await renderSnakeSvg({ user, query: `theme=${theme}`, token, fetchImpl });
    fs.writeFileSync(path.join(outDir, `snake-${theme}.svg`), snake.body);
  }
  console.log(`Kit de @${user} en ${outDir}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
