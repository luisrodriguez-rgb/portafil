/**
 * Eventos de la web: POST /api/event con { event, ms, ... } enviado con navigator.sendBeacon.
 * Sirve para medir la puerta de la Fase 4: cuánto tarda alguien desde que abre la web hasta copiar su README.
 * Sin cookies ni usuario de GitHub: solo el nombre del evento, los milisegundos desde que cargó la página
 * y la configuración elegida. Todo valor se valida contra listas cerradas; lo demás se descarta.
 */

const { engine } = require('./common');

const EVENTS = ['user', 'copy', 'copy-piece', 'share', 'preview'];
const MAX_BODY = 1024;

function pick(value, allowed) {
  return allowed.includes(value) ? value : undefined;
}

function int(value, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : undefined;
}

/** Cuerpo recibido -> evento saneado, o null si no es válido */
function parseEvent(raw) {
  let data = raw;
  if (typeof raw === 'string' || Buffer.isBuffer(raw)) {
    const text = String(raw);
    if (text.length > MAX_BODY) return null;
    try { data = JSON.parse(text); } catch { return null; }
  }
  if (!data || typeof data !== 'object' || !EVENTS.includes(data.event)) return null;
  const { SnakeCore, KitSnippet } = engine;
  const event = {
    event: data.event,
    ms: int(data.ms, 24 * 3600 * 1000),
    pieces: int(data.pieces, 20),
    theme: pick(data.theme, SnakeCore.CARD_OPTION_VALUES.theme),
    template: pick(data.template, Object.keys(KitSnippet.TEMPLATES)),
    kind: pick(data.kind, Object.keys(KitSnippet.PIECES)),
    lang: pick(data.lang, ['en', 'es'])
  };
  for (const key of Object.keys(event)) if (event[key] === undefined) delete event[key];
  return event;
}

/** El cuerpo ya viene leído en Vercel (req.body); en el servidor local hay que leer el flujo */
function readBody(req) {
  if (req.body !== undefined) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);
    });
    req.on('end', () => resolve(size > MAX_BODY ? '' : Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end();
  }
  const event = parseEvent(await readBody(req));
  if (event && process.env.VERCEL) console.log(JSON.stringify({ evt: 'perfila.event', ...event }));
  res.statusCode = event ? 204 : 400;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

module.exports = { parseEvent, handler, EVENTS };
