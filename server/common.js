/**
 * Piezas compartidas por los endpoints serverless (SVG y calendario):
 * motor cargado una vez, calendario de GitHub en caché y envío comprimido.
 */

const zlib = require('zlib');
const { loadEngine } = require('../action/lib');
const { cached } = require('./cache');
const { SVG_CSP, pageCsp, inlineScripts } = require('./security');

const USER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

// Caché de las piezas: 30 min en el navegador y 1 h en las cachés compartidas (la CDN de Vercel y el proxy de
// imágenes de GitHub, camo, que respeta s-maxage). Con más, un perfil enseñaba la racha o el «hoy» de hace horas.
// Mientras se regenera se sirve la copia anterior hasta 1 día; los datos de GitHub ya van en caché (server/cache.js).
const CACHE_OK = 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400';
const engine = loadEngine();

// Calendario de cada usuario en la caché de dos niveles (server/cache.js): varios estilos del SVG y el JSON de la web
// del mismo perfil cuestan una sola consulta a GitHub
const calendarCache = new Map();

function getCalendarWeeks(user, token, fetchImpl = fetch) {
  return cached(calendarCache, 'calendar', user, token, fetchImpl, (t, f) => engine.SnakeCore.fetchCalendarWeeks(user, t, f));
}

/** Cabeceras de la respuesta más su Content-Security-Policy según el tipo (server/security.js) */
function securityHeaders(result) {
  const headers = { 'X-Content-Type-Options': 'nosniff', ...result.headers };
  const type = String(headers['Content-Type'] || '');
  if (!headers['Content-Security-Policy']) {
    if (type.startsWith('image/svg+xml')) headers['Content-Security-Policy'] = SVG_CSP;
    else if (type.startsWith('text/html')) headers['Content-Security-Policy'] = pageCsp(inlineScripts(String(result.body)));
  }
  return headers;
}

/** Envía { status, headers, body } comprimido con brotli (calidad 5, ~2 ms) o gzip según Accept-Encoding */
function sendCompressed(req, res, result) {
  res.statusCode = result.status;
  for (const [name, value] of Object.entries(securityHeaders(result))) res.setHeader(name, value);

  let body = Buffer.from(result.body);
  const accepted = String((req.headers && req.headers['accept-encoding']) || '');
  res.setHeader('Vary', 'Accept-Encoding');
  if (/\bbr\b/.test(accepted)) {
    body = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
    res.setHeader('Content-Encoding', 'br');
  } else if (/\bgzip\b/.test(accepted)) {
    body = zlib.gzipSync(body);
    res.setHeader('Content-Encoding', 'gzip');
  }
  res.setHeader('Content-Length', body.length);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Usuario de /api/<usuario>.<ext> (reescrito a ?user=) */
function userFromRequest(req, ext) {
  const url = new URL(req.url, 'http://localhost');
  const fromPath = url.pathname.match(new RegExp(`/([^/]+)\\.${ext}$`));
  return { url, user: url.searchParams.get('user') || (fromPath ? fromPath[1] : '') };
}

module.exports = { engine, USER_RE, CACHE_OK, calendarCache, getCalendarWeeks, securityHeaders, sendCompressed, userFromRequest };
