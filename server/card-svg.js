/**
 * Endpoint de las tarjetas del kit: GET /api/<pieza>/<usuario>.svg?theme=...&lang=...
 * Piezas: header, stats, streak, langs, activity y kit (todas juntas). Comparte con la serpiente
 * la validación, la caché del calendario, la compresión y la política de caché en CDN.
 */

const { engine, USER_RE, getCalendarWeeks, sendCompressed, userFromRequest } = require('./common');
const { getProfile } = require('./profile');
const { KINDS, renderCard } = require('./cards');
const { messageCard, T } = require('./cards/frame');
const { logRender } = require('./metrics');

const CACHE_OK = 'public, max-age=14400, s-maxage=21600, stale-while-revalidate=86400';
const CACHE_ERROR = 'public, max-age=300, s-maxage=300';

function svgResponse(status, body, cacheControl) {
  return {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    },
    body
  };
}

/**
 * Lógica pura del endpoint (testeable sin servidor).
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
async function renderCardSvg({ kind, user, query = '', token, fetchImpl = fetch }) {
  const { SnakeCore } = engine;
  let options = {};
  let tokens = T.get('dark');
  const width = kind === 'header' || kind === 'kit' ? T.size.full : T.size.half;

  if (!KINDS[kind]) {
    return svgResponse(404, messageCard(`pieza '${kind}' desconocida. Válidas: ${Object.keys(KINDS).join(', ')}`, tokens, width), CACHE_ERROR);
  }
  try {
    // 'user' y 'kind' los añade la reescritura de la URL, no son opciones de la tarjeta
    const params = new URLSearchParams(query);
    params.delete('user');
    params.delete('kind');
    options = { ...SnakeCore.parseOptions(params.toString(), '', SnakeCore.CARD_OPTION_VALUES) };
    tokens = T.get(options.theme);
  } catch (err) {
    return svgResponse(400, messageCard(err.message, tokens, width), CACHE_ERROR);
  }
  if (!user || !USER_RE.test(user)) {
    return svgResponse(400, messageCard('usuario de GitHub no válido', tokens, width), CACHE_ERROR);
  }
  if (!token) {
    return svgResponse(500, messageCard('falta GITHUB_TOKEN en el servidor', tokens, width), 'no-store');
  }

  const needs = KINDS[kind].needs;
  let profile = null;
  let weeks = null;
  try {
    // En paralelo y cada una con su caché: las seis piezas de un perfil cuestan dos consultas a GitHub
    [profile, weeks] = await Promise.all([
      needs.includes('profile') ? getProfile(user, token, fetchImpl) : null,
      needs.includes('calendar') ? getCalendarWeeks(user, token, fetchImpl) : null
    ]);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return svgResponse(404, messageCard(`no existe el usuario ${user}`, tokens, width), CACHE_ERROR);
    if (err.status === 401) return svgResponse(500, messageCard('GITHUB_TOKEN del servidor no válido o caducado', tokens, width), 'no-store');
    return svgResponse(502, messageCard('GitHub no respondió, inténtalo más tarde', tokens, width), 'no-store');
  }

  const login = profile ? profile.login : user;
  const body = renderCard(kind, { profile, weeks: weeks || [], tokens, lang: options.lang === 'es' ? 'es' : 'en', login });
  return svgResponse(200, body, CACHE_OK);
}

/** Adaptador para funciones serverless de Node (req/res de Vercel) */
async function handler(req, res) {
  // /api/<pieza>/<usuario>.svg se reescribe a /api/card?kind=<pieza>&user=<usuario> (vercel.json)
  const start = Date.now();
  const { url, user } = userFromRequest(req, 'svg');
  const kind = url.searchParams.get('kind') || (url.pathname.match(/\/api\/([a-z]+)\/[^/]+\.svg$/) || [])[1] || '';
  const result = await renderCardSvg({ kind, user, query: url.search, token: process.env.GITHUB_TOKEN });
  sendCompressed(req, res, result);
  logRender({ endpoint: kind, user, theme: url.searchParams.get('theme'), status: result.status, start });
}

module.exports = { renderCardSvg, handler };
