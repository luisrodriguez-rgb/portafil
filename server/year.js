/**
 * Datos de «Tu año»: el año natural en curso (del 1 de enero a hoy) comparado con el mismo periodo del año
 * anterior, con sus totales y el proyecto del año. En enero se muestra el año anterior completo, para que la
 * pieza siga sirviendo al cerrar el año. Una sola consulta GraphQL por perfil, con la caché de server/cache.js.
 */

const { engine } = require('./common');
const { cached } = require('./cache');

const YEAR_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!, $prevFrom: DateTime!, $prevTo: DateTime!) {
  user(login: $login) {
    thisYear: contributionsCollection(from: $from, to: $to) {
      totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions
      contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount contributionLevel } } }
      commitContributionsByRepository(maxRepositories: 1) { repository { name } contributions { totalCount } }
    }
    lastYear: contributionsCollection(from: $prevFrom, to: $prevTo) { contributionCalendar { totalContributions } }
  }
}`;

const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

/** Periodo de la pieza: { year, partial, from, to, prevFrom, prevTo } en fechas AAAA-MM-DD (UTC, como GitHub) */
function periodOf(now = new Date()) {
  const y = now.getUTCFullYear();
  if (now.getUTCMonth() === 0) {
    // Enero: el año anterior completo frente al de antes
    return { year: y - 1, partial: false, from: iso(y - 1, 0, 1), to: iso(y - 1, 11, 31), prevFrom: iso(y - 2, 0, 1), prevTo: iso(y - 2, 11, 31) };
  }
  // El mismo periodo del año pasado (el 29 de febrero se compara con el 28)
  const prevDay = Math.min(now.getUTCDate(), new Date(Date.UTC(y - 1, now.getUTCMonth() + 1, 0)).getUTCDate());
  return { year: y, partial: true, from: iso(y, 0, 1), to: iso(y, now.getUTCMonth(), now.getUTCDate()), prevFrom: iso(y - 1, 0, 1), prevTo: iso(y - 1, now.getUTCMonth(), prevDay) };
}

/** Respuesta GraphQL -> datos de la pieza (el formato que lee server/cards/year.js) */
function normalizeYear(user, period) {
  const t = user.thisYear;
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const days = [];
  for (const week of t.contributionCalendar.weeks) {
    for (const d of week.contributionDays) {
      if (d.date >= period.from && d.date <= period.to) days.push({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 });
    }
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  const top = (t.commitContributionsByRepository || [])[0];
  return {
    year: period.year,
    partial: period.partial,
    until: days.length ? days[days.length - 1].date : period.to,
    days,
    total: days.reduce((sum, d) => sum + d.count, 0),
    prevTotal: user.lastYear.contributionCalendar.totalContributions,
    commits: t.totalCommitContributions,
    pullRequests: t.totalPullRequestContributions,
    issues: t.totalIssueContributions,
    reviews: t.totalPullRequestReviewContributions,
    topRepo: top ? { name: top.repository.name, commits: top.contributions.totalCount } : null
  };
}

async function fetchYear(user, token, fetchImpl = fetch, now = new Date()) {
  const period = periodOf(now);
  const vars = {
    from: `${period.from}T00:00:00Z`, to: `${period.to}T23:59:59Z`,
    prevFrom: `${period.prevFrom}T00:00:00Z`, prevTo: `${period.prevTo}T23:59:59Z`
  };
  const data = await engine.SnakeCore.queryUser(YEAR_QUERY, user, token, fetchImpl, vars);
  return normalizeYear(data, period);
}

// Una entrada por perfil y año: el 1 de enero no se mezcla con el año anterior
const yearCache = new Map();

function getYear(user, token, fetchImpl = fetch) {
  const { year } = periodOf();
  return cached(yearCache, 'year', `${user}:${year}`, token, fetchImpl, (t, f) => fetchYear(user, t, f));
}

module.exports = { YEAR_QUERY, periodOf, normalizeYear, fetchYear, getYear, yearCache };
