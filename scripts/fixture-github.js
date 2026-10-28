/**
 * GitHub simulado para desarrollar sin token: cualquier usuario recibe un calendario y un perfil
 * deterministas (cuatro variantes según el nombre), y los que empiezan por "ghost" no existen.
 * Solo intercepta la API GraphQL; el resto de peticiones (avatares) van a la red de verdad.
 */

const { fixtureWeeks, fixtureProfile } = require('../tests/visual.helpers');

function variantOf(login) {
  let h = 0;
  for (const ch of login.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4;
}

function fixtureFetch(realFetch = fetch) {
  return async (url, init = {}) => {
    if (!String(url).startsWith('https://api.github.com/graphql')) return realFetch(url, init);
    const { query, variables } = JSON.parse(init.body);
    const login = String(variables.login);
    if (/^ghost/i.test(login)) {
      return { ok: true, json: async () => ({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'Could not resolve' }] }) };
    }
    const v = variantOf(login);
    if (query.includes('contributionCalendar')) {
      return { ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: fixtureWeeks(v) } } } } }) };
    }
    const p = fixtureProfile();
    const k = [1, 0.6, 1.4, 0.3][v];
    const languages = v % 2 ? [...p.languages].reverse() : p.languages;
    const user = {
      login, name: '', bio: p.bio, location: p.location, avatarUrl: null,
      followers: { totalCount: Math.round(p.followers * k) }, following: { totalCount: p.following },
      contributionsCollection: {
        totalCommitContributions: Math.round(p.totals.commits * k), totalPullRequestContributions: Math.round(p.totals.pullRequests * k),
        totalIssueContributions: Math.round(p.totals.issues * k), totalPullRequestReviewContributions: Math.round(p.totals.reviews * k),
        restrictedContributionsCount: 0
      },
      repositories: {
        totalCount: Math.round(p.publicRepos * k),
        nodes: [{ stargazerCount: Math.round(p.stars * k), languages: { edges: languages.map((l, i) => ({ size: l.size * (i === 0 ? 1 : k), node: { name: l.name } })) } }]
      }
    };
    return { ok: true, json: async () => ({ data: { user } }) };
  };
}

module.exports = { fixtureFetch };
