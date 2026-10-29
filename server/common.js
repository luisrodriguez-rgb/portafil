/**
 * Piezas compartidas por los endpoints serverless (SVG y calendario):
 * motor cargado una vez, calendario de GitHub en caché y envío comprimido.
 */

const zlib = require('zlib');
const { loadEngine } = require('../action/lib');
const { cached } = require('./cache');
const { SVG_CSP, pageCsp, inlineScripts } = require('./security');

const USER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

// Caché de las piezas, en dos niveles:
//  - CACHE_OK, para el navegador y el proxy de imágenes de GitHub (camo): 30 min. Con más, un perfil enseñaba la
//    racha o el «hoy» de hace horas.
//  - CDN_CACHE, solo para la CDN de Vercel (Vercel-CDN-Cache-Control, no llega a nadie más): 2 h. Camo vuelve cada
//    30 min, pero la pieza solo se regenera cada 2 h: la mitad de invocaciones que con 1 h, que en el plan
//    Hobby (1 M al mes) es el límite que antes se agota.
// Mientras se regenera se sirve la copia anterior hasta 1 día; los datos de GitHub ya van en caché (server/cache.js).
const CACHE_OK = 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400';
const CDN_CACHE = 'max-age=7200, stale-while-revalidate=86400';

/** Cabeceras de una respuesta con la caché de la CDN de Vercel añadida si es una pieza servible (CACHE_OK) */
function withCdnCache(headers) {
  return headers['Cache-Control'] === CACHE_OK ? { ...headers, 'Vercel-CDN-Cache-Control': CDN_CACHE } : headers;
}
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
  for (const [name, value] of Object.entries(withCdnCache(securityHeaders(result)))) res.setHeader(name, value);

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

module.exports = { engine, USER_RE, CACHE_OK, CDN_CACHE, withCdnCache, calendarCache, getCalendarWeeks, securityHeaders, sendCompressed, userFromRequest };
