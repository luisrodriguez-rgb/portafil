/**
 * Marco común de las tarjetas del kit: mismo fondo, borde, radio, padding y fila de título que la cabecera
 * de la serpiente. Cada tarjeta solo dibuja su cuerpo; el marco garantiza que todas parezcan una sola pieza.
 *
 * Animación: solo de entrada (barras que crecen y celdas que aparecen), una vez. El estado final es el estilo base,
 * así que con prefers-reduced-motion o sin soporte de animación la tarjeta se ve completa.
 * Clases y keyframes con prefijo z para no chocar con las de la serpiente (c, s, h, k, r, p, d...) en el dashboard.
 */

const { engine } = require('../common');

const { ThemeTokens } = engine;
const T = ThemeTokens;
const FONT = T.font.family;

const LABELS = {
  en: {
    stats: 'stats', lastYear: 'last 12 months', contributions: 'contributions', commits: 'commits',
    pullRequests: 'pull requests', issues: 'issues', reviews: 'reviews', stars: 'stars', activeDays: 'active days',
    streak: 'streak', current: 'current', longest: 'longest', days: 'days', day: 'day', last30: 'last 30 days',
    today: 'today', pending: 'pending', noStreak: 'no streak yet',
    languages: 'languages', bySize: 'by code size', other: 'other', repos: 'repos', noCode: 'no public code yet',
    activity: 'activity', perWeek: 'per week', peak: 'peak', avg: 'avg', wk: 'wk', followers: 'followers',
    duel: 'duel', sameRules: 'same AI, same ticks', wins: 'wins', tie: 'tie', pts: 'pts', devoured: 'devoured',
    versus: 'versus', currentStreak: 'current streak', longestStreak: 'longest streak', topLanguage: 'top language',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  },
  es: {
    stats: 'estadísticas', lastYear: 'últimos 12 meses', contributions: 'contribuciones', commits: 'commits',
    pullRequests: 'pull requests', issues: 'issues', reviews: 'revisiones', stars: 'estrellas', activeDays: 'días activos',
    streak: 'racha', current: 'actual', longest: 'más larga', days: 'días', day: 'día', last30: 'últimos 30 días',
    today: 'hoy', pending: 'pendiente', noStreak: 'sin racha todavía',
    languages: 'lenguajes', bySize: 'por tamaño de código', other: 'otros', repos: 'repos', noCode: 'aún sin código público',
    activity: 'actividad', perWeek: 'por semana', peak: 'máx', avg: 'media', wk: 'sem', followers: 'seguidores',
    duel: 'duelo', sameRules: 'misma IA, mismos ticks', wins: 'gana', tie: 'empate', pts: 'pts', devoured: 'devorado',
    versus: 'versus', currentStreak: 'racha actual', longestStreak: 'racha más larga', topLanguage: 'lenguaje principal',
    months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  }
};

function escapeXml(text) {
  return String(text).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
}

/** 1234 -> 1,234 · 12840 -> 12.8k (en) / 12,8k (es); compact=false nunca abrevia (marcadores ajustados) */
function fmtNumber(n, lang = 'en', compact = true) {
  const value = Number(n) || 0;
  const dec = lang === 'es' ? ',' : '.';
  if (compact && value >= 1e6) return `${(value / 1e6).toFixed(1).replace('.', dec).replace(`${dec}0`, '')}M`;
  if (compact && value >= 1e4) return `${(value / 1e3).toFixed(1).replace('.', dec).replace(`${dec}0`, '')}k`;
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'es' ? '.' : ',');
}

/** '2026-10-03' -> 'Oct 3' / '3 oct' */
function fmtDate(iso, lang = 'en') {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  const month = LABELS[lang].months[m - 1];
  return lang === 'es' ? `${d} ${month}` : `${month} ${d}`;
}

/** Ancho aproximado en px: la fuente es monoespaciada */
const textWidth = (text, size) => [...String(text)].length * size * T.font.charWidth;

/** Corta a maxChars caracteres (no bytes: respeta emojis y tildes) con '…' */
function truncate(text, maxChars) {
  const chars = [...String(text)];
  return chars.length <= maxChars ? chars.join('') : chars.slice(0, Math.max(1, maxChars - 1)).join('').trimEnd() + '…';
}

/** Parte un texto en líneas de hasta maxChars; la última se corta con '…' si sobra texto */
function wrap(text, maxChars, maxLines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const candidate = line ? `${line} ${words[i]}` : words[i];
    if ([...candidate].length <= maxChars) { line = candidate; continue; }
    if (line) lines.push(truncate(line, maxChars));
    line = words[i];
    if (lines.length === maxLines) {
      line = '';
      lines[maxLines - 1] = truncate(`${lines[maxLines - 1]} ${words.slice(i).join(' ')}`, maxChars);
      break;
    }
  }
  if (line) lines.push(truncate(line, maxChars));
  return lines.slice(0, maxLines);
}

/** <text> con la fuente del kit */
function text(x, y, content, { size = T.font.size.body, weight, fill, anchor, opacity, cls } = {}) {
  return `<text x="${x}" y="${y}"${cls ? ` class="${cls}"` : ''} font-size="${size}"${weight ? ` font-weight="${weight}"` : ''}`
    + `${anchor ? ` text-anchor="${anchor}"` : ''}${opacity ? ` opacity="${opacity}"` : ''} fill="${fill}">${content}</text>`;
}

/** Retraso de la animación de entrada (escalonado) */
const delay = (ms) => ` style="animation-delay:${Math.round(ms)}ms"`;

/** CSS de animación compartido: zx crece en horizontal, zy en vertical, zf aparece */
const CARD_CSS = 'text{font-family:' + FONT + '}'
  + '.zx,.zy{transform-box:fill-box;animation:zx .9s cubic-bezier(.2,.7,.2,1) both}.zx{transform-origin:left}'
  + '.zy{transform-origin:bottom;animation-name:zy}.zf{animation:zf .6s ease-out both}'
  + '@keyframes zx{from{transform:scaleX(0)}}@keyframes zy{from{transform:scaleY(0)}}@keyframes zf{from{opacity:0}}'
  + '@media (prefers-reduced-motion:reduce){.zx,.zy,.zf{animation:none}}';

/**
 * Cuerpo de una tarjeta con su marco y fila de título (sin la etiqueta <svg>): el dashboard las compone así.
 * title: texto en negrita; subtitle: a continuación, atenuado; right: texto atenuado alineado a la derecha.
 */
function framed({ width, height, tokens, title, subtitle = '', right = '', body }) {
  const p = T.space.padding;
  const titleY = p + 10; // misma línea base que el título de la serpiente
  const sub = subtitle ? `<tspan fill="${tokens.muted}" font-weight="${T.font.weight.regular}"> · ${escapeXml(subtitle)}</tspan>` : '';
  return `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${T.radius.card - 0.5}" fill="${tokens.bg}" stroke="${tokens.border}"/>`
    + (title ? text(p, titleY, escapeXml(title) + sub, { weight: T.font.weight.bold, fill: tokens.text }) : '')
    + (right ? text(width - p, titleY, escapeXml(right), { size: T.font.size.label + 1, fill: tokens.muted, anchor: 'end' }) : '')
    + body;
}

/** Documento SVG completo de una pieza */
function toSvg({ width, height, title, content }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">`
    + `<title>${escapeXml(title)}</title><style>${CARD_CSS}</style>${content}</svg>`;
}

/** Tarjeta de error legible, con el tema pedido si se pudo leer */
function messageCard(message, tokens = T.get('ink'), width = T.size.half) {
  const height = 60;
  const lines = wrap(`Perfila: ${message}`, Math.floor((width - 32) / (12 * T.font.charWidth)), 2);
  const y0 = lines.length === 1 ? 35 : 27;
  const body = lines.map((l, i) => text(width / 2, y0 + i * 16, escapeXml(l), { anchor: 'middle', fill: tokens.text })).join('');
  return toSvg({
    width, height, title: message,
    content: `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${T.radius.card - 0.5}" fill="${tokens.bg}" stroke="${tokens.border}"/>${body}`
  });
}

module.exports = { T, LABELS, escapeXml, fmtNumber, fmtDate, textWidth, truncate, wrap, text, delay, framed, toSvg, messageCard, CARD_CSS };
