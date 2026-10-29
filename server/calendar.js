/**
 * Endpoint de calendario: GET /api/calendar/<usuario>.json
 * Sustituye a la API de terceros (github-contributions-api.jogruber.de) en la web, con el mismo formato
 * ({ contributions: [{ date, count, level }] }) para reutilizar su parser. Lee la API GraphQL oficial de GitHub
 * y no dibuja nada, así que cuesta muy poca CPU; la CDN lo cachea por usuario.
 */

const { engine, USER_RE, CACHE_OK, getCalendarWeeks, sendCompressed, userFromRequest } = require('./common');
const { logRender } = require('./metrics');

const CACHE_ERROR = 'public, max-age=300, s-maxage=300';

function jsonResponse(status, data, cacheControl) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(data)
  };
}

/** Lógica pura del endpoint (testeable sin servidor) */
async function renderCalendarJson({ user, token, fetchImpl = fetch }) {
  if (!user || !USER_RE.test(user)) {
    return jsonResponse(400, { error: 'usuario de GitHub no válido' }, CACHE_ERROR);
  }
  if (!token) {
    return jsonResponse(500, { error: 'falta GITHUB_TOKEN en el servidor' }, 'no-store');
  }

  let weeks;
  try {
    weeks = await getCalendarWeeks(user, token, fetchImpl);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return jsonResponse(404, { error: `no existe el usuario ${user}` }, CACHE_ERROR);
    if (err.status === 401) return jsonResponse(500, { error: 'GITHUB_TOKEN del servidor no válido o caducado' }, 'no-store');
    return jsonResponse(502, { error: 'GitHub no respondió' }, 'no-store');
  }

  const levels = engine.SnakeCore.LEVELS;
  const contributions = [];
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      contributions.push({ date: day.date, count: day.contributionCount, level: levels[day.contributionLevel] ?? 0 });
    }
  }
  return jsonResponse(200, { user, source: 'github-graphql', contributions }, CACHE_OK);
}

async function handler(req, res) {
  // /api/calendar/<usuario>.json se reescribe a /api/calendar?user=<usuario> (vercel.json)
  const start = Date.now();
  const { user } = userFromRequest(req, 'json');
  const result = await renderCalendarJson({ user, token: process.env.GITHUB_TOKEN });
  sendCompressed(req, res, result);
  logRender({ endpoint: 'calendar', user, theme: null, status: result.status, start });
}

module.exports = { renderCalendarJson, handler };
