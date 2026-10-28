/**
 * Content-Security-Policy de lo que genera el servidor (la de las páginas estáticas está en vercel.json).
 *   - SVG: sin scripts ni recursos externos; solo su CSS y las imágenes incrustadas (avatar en data URI).
 *     Si alguien abre el SVG directamente en el navegador, nada en él puede ejecutarse.
 *   - Páginas del duelo y para compartir: solo su propio script, autorizado por su hash.
 */

const crypto = require('crypto');

const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

/** CSP de una página HTML del servidor; scripts: el texto de cada <script> en línea que lleva */
function pageCsp(scripts = []) {
  const hashes = scripts.map(s => `'sha256-${crypto.createHash('sha256').update(s).digest('base64')}'`);
  return [
    "default-src 'none'",
    `script-src ${hashes.length ? hashes.join(' ') : "'none'"}`,
    "style-src 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

/** Texto de los <script> en línea de un HTML (sin atributo src) */
function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

module.exports = { SVG_CSP, pageCsp, inlineScripts };
