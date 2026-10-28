/**
 * Imagen para redes y página para compartir un perfil:
 *   GET /api/og/<usuario>.png              tarjeta 1200×630 del perfil (?theme=&lang=; .svg para depurar)
 *   GET /api/og/duel/<a>-vs-<b>.png        tarjeta del duelo
 *   GET /u/<usuario>                       página con la vista previa para redes que lleva a la web con ese perfil
 * Las redes leen las etiquetas og:image de la página; una persona que abre el enlace va directa a sus piezas.
 */

const { engine, USER_RE, getCalendarWeeks, sendCompressed } = require('./common');
const { getProfile } = require('./profile');
const { parsePair, runDuel } = require('./duel');
const { profileCardSvg, duelCardSvg, toPng } = require('./social');
const { T, escapeXml } = require('./cards/frame');
const { logRender } = require('./metrics');

const CACHE_OK = 'public, max-age=14400, s-maxage=21600, stale-while-revalidate=86400';
const CACHE_ERROR = 'public, max-age=300, s-maxage=300';
const SITE_HOST = new URL(engine.Brand.site).host;

// Las claves de la ruta las pone la reescritura de vercel.json; cualquier otra opción desconocida da 400:
// generar el PNG es lo más caro de la API y una query inventada no debe saltarse la caché del CDN
const ROUTE_KEYS = ['kind', 'slug', 'format', 'a', 'b'];

function readOptions(params) {
  const query = new URLSearchParams(params);
  for (const key of ROUTE_KEYS) query.delete(key);
  return { ...engine.SnakeCore.parseOptions(query.toString(), '', engine.SnakeCore.CARD_OPTION_VALUES) };
}

function errorResponse(status, message, cache) {
  return { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cache }, body: `Portafil: ${message}` };
}

function githubError(err) {
  if (err.code === 'NOT_FOUND') return errorResponse(404, 'usuario no encontrado', CACHE_ERROR);
  if (err.status === 401) return errorResponse(500, 'GITHUB_TOKEN del servidor no válido o caducado', 'no-store');
  return errorResponse(502, 'GitHub no respondió, inténtalo más tarde', 'no-store');
}

/**
 * Lógica pura de las tarjetas (testeable sin servidor).
 * kind: 'profile' | 'duel'; format: 'png' | 'svg'
 */
async function renderSocialCard({ kind, slug, query = '', format = 'png', token, fetchImpl = fetch, origin = engine.Brand.site }) {
  const params = new URLSearchParams(query);
  let options;
  try {
    options = readOptions(params);
  } catch (err) {
    return errorResponse(400, err.message, CACHE_ERROR);
  }
  const tokens = T.get(options.theme);
  const lang = options.lang === 'es' ? 'es' : 'en';
  if (!token) return errorResponse(500, 'falta GITHUB_TOKEN en el servidor', 'no-store');

  let svg;
  try {
    if (kind === 'duel') {
      const { users, error } = parsePair(slug, params);
      if (error) return errorResponse(400, error, CACHE_ERROR);
      const weeks = await Promise.all(users.map(u => getCalendarWeeks(u, token, fetchImpl)));
      const duel = runDuel(users, weeks);
      svg = duelCardSvg({ duel, tokens, lang, url: `${origin}/duel/${users[0]}-vs-${users[1]}` });
    } else {
      if (!USER_RE.test(slug || '')) return errorResponse(400, 'usuario de GitHub no válido', CACHE_ERROR);
      const [profile, weeks] = await Promise.all([getProfile(slug, token, fetchImpl), getCalendarWeeks(slug, token, fetchImpl)]);
      svg = profileCardSvg({ profile, weeks, tokens, lang });
    }
  } catch (err) {
    return githubError(err);
  }

  if (format === 'svg') {
    return { status: 200, headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': CACHE_OK, 'Access-Control-Allow-Origin': '*' }, body: svg };
  }
  return {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_OK, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' },
    body: toPng(svg)
  };
}

const PAGE_TEXT = {
  en: { title: (u) => `@${u}'s GitHub profile · Portafil`, description: 'Header, stats, streak, languages, activity and games for a GitHub profile, all in one style.', go: (u) => `See @${u}'s pieces` },
  es: { title: (u) => `Perfil de GitHub de @${u} · Portafil`, description: 'Cabecera, estadísticas, racha, lenguajes, actividad y juegos para un perfil de GitHub, todo con un solo estilo.', go: (u) => `Ver las piezas de @${u}` }
};

/** Página para compartir un perfil: metadatos para redes y redirección a la web */
function renderSharePage({ user, query = '', origin, acceptLanguage = '' }) {
  const params = new URLSearchParams(query);
  const lang = params.get('lang') === 'es' || (!params.get('lang') && /^es\b/i.test(acceptLanguage)) ? 'es' : 'en';
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  if (!USER_RE.test(user || '')) {
    return { status: 302, headers: { ...headers, Location: `${origin}/`, 'Cache-Control': CACHE_ERROR }, body: '' };
  }
  const theme = engine.SnakeCore.CARD_OPTION_VALUES.theme.includes(params.get('t')) ? params.get('t') : 'ink';
  const P = PAGE_TEXT[lang];
  const image = `${origin}/api/og/${user}.png?theme=${theme}${lang === 'es' ? '&lang=es' : ''}`;
  const target = `${origin}/?u=${encodeURIComponent(user)}${theme !== 'ink' ? `&t=${theme}` : ''}`;
  const e = escapeXml;
  const body = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(P.title(user))}</title>
<meta name="description" content="${e(P.description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(P.title(user))}">
<meta property="og:description" content="${e(P.description)}">
<meta property="og:url" content="${e(`${origin}/u/${user}`)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${e(image)}">
<meta http-equiv="refresh" content="0; url=${e(target)}">
<link rel="canonical" href="${e(`${origin}/u/${user}`)}">
<style>body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#0e0f11;color:#ecedef;display:grid;place-items:center;min-height:100vh}a{color:inherit}</style>
</head>
<body><a href="${e(target)}">${e(P.go(user))}</a></body>
</html>`;
  return { status: 200, headers: { ...headers, 'Cache-Control': CACHE_OK }, body };
}

/** Adaptador para Vercel: /api/og?kind=profile|duel|page&slug=...&format=png|svg (ver vercel.json) */
async function handler(req, res) {
  const start = Date.now();
  const url = new URL(req.url, 'http://localhost');
  const kind = url.searchParams.get('kind') || 'profile';
  const slug = url.searchParams.get('slug') || '';
  const rawHost = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim();
  const host = /^[a-z0-9.-]+(:\d+)?$/i.test(rawHost) ? rawHost : SITE_HOST;
  const proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  const result = kind === 'page'
    ? renderSharePage({ user: slug, query: url.search, origin, acceptLanguage: (req.headers && req.headers['accept-language']) || '' })
    : await renderSocialCard({ kind, slug, query: url.search, format: url.searchParams.get('format') || 'png', token: process.env.GITHUB_TOKEN, origin });
  if (result.headers.Location) {
    res.statusCode = result.status;
    res.setHeader('Location', result.headers.Location);
    res.end();
  } else if (Buffer.isBuffer(result.body)) {
    // El PNG ya está comprimido: se envía tal cual
    res.statusCode = result.status;
    for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
    res.setHeader('Content-Length', result.body.length);
    res.end(req.method === 'HEAD' ? undefined : result.body);
  } else {
    sendCompressed(req, res, result);
  }
  logRender({ endpoint: kind === 'page' ? 'share-page' : `og-${kind}`, user: slug, theme: url.searchParams.get('theme'), status: result.status, start });
}

module.exports = { renderSocialCard, renderSharePage, handler };
