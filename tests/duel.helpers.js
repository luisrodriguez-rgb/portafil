/**
 * GitHub simulado con dos perfiles distintos para el duelo y el versus:
 * cada login recibe su calendario (variante 0 o 1) y su perfil. Cuenta las consultas.
 */

const { fixtureWeeks, fixtureProfile } = require('./visual.helpers');

function fakePairGitHub(variants = { octocat: 0, hubot: 1 }) {
  const calls = { calendar: 0, profile: 0 };
  const fetchImpl = async (url, init = {}) => {
    const { query, variables } = JSON.parse(init.body);
    const variant = variants[variables.login.toLowerCase()];
    if (variant === undefined) {
      return { ok: true, json: async () => ({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }) };
    }
    if (query.includes('contributionCalendar')) {
      calls.calendar++;
      return { ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: fixtureWeeks(variant) } } } } }) };
    }
    calls.profile++;
    const p = fixtureProfile();
    const scale = variant ? 0.6 : 1;
    const user = {
      login: variables.login, name: '', bio: '', location: '', avatarUrl: null,
      followers: { totalCount: Math.round(p.followers * scale) }, following: { totalCount: 1 },
      contributionsCollection: {
        totalCommitContributions: Math.round(p.totals.commits * (variant ? 1.3 : 1)), totalPullRequestContributions: Math.round(p.totals.pullRequests * scale),
        totalIssueContributions: p.totals.issues, totalPullRequestReviewContributions: p.totals.reviews, restrictedContributionsCount: 0
      },
      repositories: {
        totalCount: p.publicRepos,
        nodes: [{ stargazerCount: Math.round(p.stars * scale), languages: { edges: (variant ? [...p.languages].reverse() : p.languages).map(l => ({ size: l.size, node: { name: l.name } })) } }]
      }
    };
    return { ok: true, json: async () => ({ data: { user } }) };
  };
  return { fetchImpl, calls };
}

module.exports = { fakePairGitHub };
