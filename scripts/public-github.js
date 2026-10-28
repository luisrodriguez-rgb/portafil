/**
 * Datos reales de GitHub sin token, para desarrollar en local (node scripts/dev-server.js sin GITHUB_TOKEN).
 * Responde a las mismas consultas GraphQL que hace el servidor, pero con fuentes públicas:
 *   - perfil, seguidores, repos y estrellas: API REST pública (exactos)
 *   - calendario de contribuciones: github-contributions-api.jogruber.de (exacto; es la API que usaba la web)
 *   - commits, PRs, issues y revisiones del último año: búsqueda de GitHub (aproximados)
 *   - lenguajes: tamaño de cada repo repartido a su lenguaje principal (aproximado)
 * La API REST sin token permite 60 peticiones por hora y la búsqueda 10 por minuto: cada usuario cuesta
 * 2 + 4. En producción el servidor usa GraphQL con GITHUB_TOKEN y todo es exacto.
 */

const LEVEL_NAMES = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'perfila-dev' };

function graphqlError(type, message) {
  return { ok: true, json: async () => ({ data: { user: null }, errors: [{ type, message }] }) };
}

function httpError(res) {
  return { ok: false, status: res.status, statusText: res.statusText };
}

/** Calendario público -> semanas con el formato de GraphQL (domingo a sábado) */
function toWeeks(contributions) {
  const weeks = [];
  for (const c of contributions) {
    const weekday = new Date(`${c.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || !weeks.length) weeks.push({ contributionDays: [] });
    weeks[weeks.length - 1].contributionDays.push({
      date: c.date, weekday, contributionCount: c.count, contributionLevel: LEVEL_NAMES[Math.min(4, c.level || 0)]
    });
  }
  return weeks.slice(-53);
}

function publicFetch(realFetch = fetch) {
  const get = (url) => realFetch(url, { headers: HEADERS });
  const searchCount = async (path, query) => {
    const res = await get(`https://api.github.com/search/${path}?q=${encodeURIComponent(query)}&per_page=1`);
    if (!res.ok) return 0;
    return (await res.json()).total_count || 0;
  };

  return async (url, init = {}) => {
    if (!String(url).startsWith('https://api.github.com/graphql')) return realFetch(url, init);
    const { query, variables } = JSON.parse(init.body);
    const login = String(variables.login);

    if (query.includes('contributionCalendar')) {
      const res = await realFetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(login)}?y=last`);
      if (res.status === 404) return graphqlError('NOT_FOUND', `Could not resolve to a User with the login of '${login}'.`);
      if (!res.ok) return httpError(res);
      const data = await res.json();
      if (!data.contributions || !data.contributions.length) return graphqlError('NOT_FOUND', 'no contributions');
      return { ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: toWeeks(data.contributions) } } } } }) };
    }

    const userRes = await get(`https://api.github.com/users/${encodeURIComponent(login)}`);
    if (userRes.status === 404) return graphqlError('NOT_FOUND', `Could not resolve to a User with the login of '${login}'.`);
    if (!userRes.ok) return httpError(userRes);
    const u = await userRes.json();
    if (u.type && u.type !== 'User') return graphqlError('NOT_FOUND', 'not a user');
    const reposRes = await get(`https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed`);
    const repos = reposRes.ok ? (await reposRes.json()).filter(r => !r.fork) : [];

    const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const [commits, pullRequests, issues, reviews] = await Promise.all([
      searchCount('commits', `author:${login} committer-date:>=${since}`),
      searchCount('issues', `author:${login} type:pr created:>=${since}`),
      searchCount('issues', `author:${login} type:issue created:>=${since}`),
      searchCount('issues', `reviewed-by:${login} type:pr created:>=${since}`)
    ]);

    const user = {
      login: u.login, name: u.name || '', bio: u.bio || '', location: u.location || '',
      avatarUrl: u.avatar_url,
      followers: { totalCount: u.followers }, following: { totalCount: u.following },
      contributionsCollection: {
        totalCommitContributions: commits, totalPullRequestContributions: pullRequests,
        totalIssueContributions: issues, totalPullRequestReviewContributions: reviews, restrictedContributionsCount: 0
      },
      repositories: {
        totalCount: u.public_repos,
        nodes: repos.map(r => ({
          stargazerCount: r.stargazers_count,
          languages: { edges: r.language ? [{ size: (r.size || 1) * 1024, node: { name: r.language } }] : [] }
        }))
      }
    };
    return { ok: true, json: async () => ({ data: { user } }) };
  };
}

module.exports = { publicFetch, toWeeks };
