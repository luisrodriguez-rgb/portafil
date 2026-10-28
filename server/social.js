/**
 * Tarjetas para redes (1200×630): lo que se ve al compartir un perfil o un duelo en X, LinkedIn, WhatsApp...
 * Esas redes no aceptan SVG, así que se dibuja un SVG estático con el mismo sistema visual de las piezas
 * y se rasteriza a PNG con resvg y las fuentes incluidas (assets/fonts, JetBrains Mono, licencia OFL).
 */

const fs = require('fs');
const path = require('path');
const { T, escapeXml, fmtNumber, truncate, wrap } = require('./cards/frame');
const { metricsOf } = require('./cards/versus');

const W = 1200;
const H = 630;
const MARGIN = 72;
const FONT = "'JetBrains Mono', ui-monospace, monospace";
const FONT_FILES = ['Regular', 'Bold', 'ExtraBold'].map(w => path.join(__dirname, '..', 'assets', 'fonts', `JetBrainsMono-${w}.ttf`));

/** Rangos de caracteres de una fuente TrueType (tabla cmap, formatos 4 y 12) */
function fontRanges(file) {
  const buf = fs.readFileSync(file);
  const numTables = buf.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    if (buf.toString('latin1', 12 + i * 16, 16 + i * 16) === 'cmap') cmap = buf.readUInt32BE(20 + i * 16);
  }
  const ranges = [];
  if (cmap < 0) return ranges;
  const subtables = buf.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const at = cmap + buf.readUInt32BE(cmap + 8 + i * 8);
    const format = buf.readUInt16BE(at);
    if (format === 12) {
      const groups = buf.readUInt32BE(at + 12);
      for (let g = 0; g < groups; g++) ranges.push([buf.readUInt32BE(at + 16 + g * 12), buf.readUInt32BE(at + 20 + g * 12)]);
    } else if (format === 4) {
      const segs = buf.readUInt16BE(at + 6) / 2;
      for (let s = 0; s < segs; s++) {
        const end = buf.readUInt16BE(at + 14 + s * 2);
        const start = buf.readUInt16BE(at + 16 + segs * 2 + s * 2);
        if (start !== 0xffff) ranges.push([start, end]);
      }
    }
  }
  return ranges;
}

let coverage = null;
/**
 * Solo los caracteres que la fuente incluida sabe dibujar: resvg pinta un cuadro vacío por cada emoji, ideograma
 * o letra árabe (no hay fuentes del sistema en el servidor). Los demás se quitan; si no queda nada, devuelve ''.
 */
function printable(value) {
  if (!coverage) coverage = fontRanges(FONT_FILES[0]);
  const ok = (cp) => coverage.some(([a, b]) => cp >= a && cp <= b);
  return [...String(value || '')].filter(ch => /\s/.test(ch) || ok(ch.codePointAt(0))).join('').replace(/\s+/g, ' ').trim();
}

const TEXT = {
  en: { contributions: 'contributions', current: 'current streak', longest: 'longest streak', language: 'top language', days: 'days', wins: 'wins', tie: 'tie', pts: 'pts', devoured: 'devoured', duel: 'GitHub duel · same AI, same ticks' },
  es: { contributions: 'contribuciones', current: 'racha actual', longest: 'racha más larga', language: 'lenguaje principal', days: 'días', wins: 'gana', tie: 'empate', pts: 'pts', devoured: 'devorado', duel: 'duelo de GitHub · misma IA, mismos ticks' }
};

// La P de celdas del logo (docs/BRAND.md), en el color del tema
const MARK = [[0, 0, 1], [1, 0, 0.72], [2, 0, 0.5], [0, 1, 1], [2, 1, 0.72], [0, 2, 1], [1, 2, 0.72], [2, 2, 0.5], [0, 3, 0.72], [0, 4, 0.5]];

function text(x, y, content, { size, weight = 400, fill, anchor } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}"${anchor ? ` text-anchor="${anchor}"` : ''} fill="${fill}">${content}</text>`;
}

/** Firma de la marca abajo a la derecha: la P de celdas y el nombre */
function brand(tokens, rightX, baseY) {
  const cell = 6;
  const gap = 1.6;
  const wordWidth = 'portafil'.length * 26 * T.font.charWidth;
  const x0 = rightX - wordWidth - 14 - (3 * cell + 2 * gap);
  const y0 = baseY - 5 * (cell + gap) + gap - 1;
  let out = '';
  for (const [x, y, o] of MARK) {
    out += `<rect x="${+(x0 + x * (cell + gap)).toFixed(1)}" y="${+(y0 + y * (cell + gap)).toFixed(1)}" width="${cell}" height="${cell}" rx="1.5" fill="${tokens.text}" fill-opacity="${o}"/>`;
  }
  return out + text(rightX, baseY - 6, 'portafil', { size: 26, weight: 700, fill: tokens.text, anchor: 'end' });
}

/** Calendario estático: 53×7 celdas en el ancho dado */
function calendar(levels, tokens, x0, y0, width) {
  const colors = [tokens.empty, tokens.l1, tokens.l2, tokens.l3, tokens.l4];
  const step = width / 53;
  const cell = +(step * 0.8).toFixed(2);
  let out = '';
  for (let x = 0; x < 53; x++) {
    for (let y = 0; y < 7; y++) {
      out += `<rect x="${+(x0 + x * step).toFixed(2)}" y="${+(y0 + y * step).toFixed(2)}" width="${cell}" height="${cell}" rx="${+(cell * 0.22).toFixed(2)}" fill="${colors[(levels[x] && levels[x][y]) || 0]}"/>`;
    }
  }
  return { svg: out, height: 7 * step - (step - cell) };
}

function levelsOfWeeks(weeks) {
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const recent = weeks.slice(-53);
  const offset = 53 - recent.length;
  const levels = Array.from({ length: 53 }, () => Array(7).fill(0));
  recent.forEach((week, i) => week.contributionDays.forEach(d => { levels[offset + i][d.weekday] = LEVEL[d.contributionLevel] || 0; }));
  return levels;
}

function frame(tokens, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${tokens.bg}"/>${body}</svg>`;
}

/** Tarjeta de un perfil: avatar, nombre, bio, el año de contribuciones y cuatro cifras */
function profileCardSvg({ profile, weeks, tokens, lang = 'en' }) {
  const t = TEXT[lang];
  const m = metricsOf(profile, weeks);
  const r = 58;
  const cx = MARGIN + r;
  const cy = MARGIN + r;
  const shownName = printable(profile.name) || profile.login;
  const location = printable(profile.location);
  const initials = String(shownName).split(/[\s_-]+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase();
  const avatar = profile.avatar
    ? `<clipPath id="a"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image href="${profile.avatar}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#a)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tokens.empty}"/>${text(cx, cy + 14, escapeXml(initials), { size: 40, weight: 800, fill: tokens.body, anchor: 'middle' })}`;
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="${tokens.body}" stroke-width="3"/>`;

  const textX = cx + r + 36;
  const maxChars = Math.floor((W - MARGIN - textX) / (24 * T.font.charWidth));
  const name = truncate(shownName, Math.floor((W - MARGIN - textX) / (52 * T.font.charWidth)));
  const handle = [`@${profile.login}`, location].filter(Boolean).join(' · ');
  let head = text(textX, MARGIN + 50, escapeXml(name), { size: 52, weight: 800, fill: tokens.text })
    + text(textX, MARGIN + 92, escapeXml(truncate(handle, maxChars)), { size: 24, fill: tokens.body });
  wrap(printable(profile.bio), maxChars, 2).forEach((line, i) => {
    head += text(textX, MARGIN + 132 + i * 32, escapeXml(line), { size: 24, fill: tokens.muted });
  });

  const cal = calendar(levelsOfWeeks(weeks), tokens, MARGIN, 290, W - MARGIN * 2);

  const stats = [
    [fmtNumber(m.contributions, lang), t.contributions],
    [`${m.currentStreak} ${t.days}`, t.current],
    [`${m.longestStreak} ${t.days}`, t.longest],
    [truncate(printable(m.topLanguage) || '—', 10), t.language]
  ];
  const colW = (W - MARGIN * 2 - 230) / stats.length;
  let row = '';
  stats.forEach(([value, label], i) => {
    const x = MARGIN + i * colW;
    row += text(x, 520, escapeXml(value), { size: 38, weight: 800, fill: i === 0 ? tokens.body : tokens.text })
      + text(x, 556, escapeXml(label), { size: 20, fill: tokens.muted });
  });

  return frame(tokens, avatar + ring + head + cal.svg + row + brand(tokens, W - MARGIN + 8, H - 66));
}

/** Tarjeta de un duelo: los dos usuarios, el marcador y cómo quedó cada gráfico al terminar */
function duelCardSvg({ duel, tokens, lang = 'en', url = '' }) {
  const t = TEXT[lang];
  const [a, b] = duel.players;
  const gap = 96;
  const half = (W - MARGIN * 2 - gap) / 2;
  let body = text(MARGIN, MARGIN + 24, escapeXml(t.duel), { size: 22, fill: tokens.muted });

  duel.players.forEach((p, i) => {
    const x = MARGIN + i * (half + gap);
    const won = duel.winner === i;
    const nameSize = 46;
    const label = t.wins.toUpperCase();
    const pillW = label.length * 18 * T.font.charWidth + 28;
    const name = truncate(`@${p.login}`, Math.floor((half - (won ? pillW + 16 : 0)) / (nameSize * T.font.charWidth)));
    body += text(x, 200, escapeXml(name), { size: nameSize, weight: 800, fill: won ? tokens.body : tokens.text })
      + text(x, 254, `${fmtNumber(p.score, lang, false)} ${t.pts}`, { size: 34, weight: 700, fill: tokens.text })
      + text(x, 290, `${p.percent}% ${t.devoured}`, { size: 22, fill: tokens.muted });
    if (won) {
      // Etiqueta junto al nombre del ganador
      const px = x + [...name].length * nameSize * T.font.charWidth + 16;
      body += `<rect x="${+px.toFixed(1)}" y="166" width="${+pillW.toFixed(1)}" height="40" rx="20" fill="${tokens.body}"/>`
        + text(+(px + pillW / 2).toFixed(1), 192, label, { size: 18, weight: 800, fill: tokens.bg, anchor: 'middle' });
    }
    // Cómo quedó su gráfico: cada mordisco del duelo le quitó un nivel a la celda
    const levels = p.grid.map(col => col.map(c => c.originalLevel || 0));
    for (const [key, bites] of Object.entries(p.simulation.cellBites)) {
      const [cx, cy] = key.split('_').map(Number);
      levels[cx][cy] = Math.max(0, levels[cx][cy] - bites.length);
    }
    const cal = calendar(levels, tokens, x, 340, half);
    body += cal.svg;
    // Barra de lo devorado
    const barY = +(340 + cal.height + 22).toFixed(1);
    body += `<rect x="${x}" y="${barY}" width="${half}" height="10" rx="5" fill="${tokens.empty}"/>`
      + `<rect x="${x}" y="${barY}" width="${+((half * p.percent) / 100).toFixed(1)}" height="10" rx="5" fill="${won ? tokens.body : tokens.muted}"/>`;
  });
  body += text(W / 2, 198, 'vs', { size: 30, weight: 700, fill: tokens.muted, anchor: 'middle' });
  if (duel.winner === -1) body += text(W / 2, 254, t.tie, { size: 26, weight: 700, fill: tokens.text, anchor: 'middle' });
  if (url) body += text(MARGIN, H - 72, escapeXml(url.replace(/^https?:\/\//, '')), { size: 22, fill: tokens.muted });

  return frame(tokens, body + brand(tokens, W - MARGIN + 8, H - 66));
}

let Resvg = null;
/** SVG -> PNG. La primera llamada carga el binario de resvg (solo en el servidor) */
function toPng(svg) {
  if (!Resvg) ({ Resvg } = require('@resvg/resvg-js'));
  const font = {
    fontFiles: FONT_FILES, loadSystemFonts: false,
    defaultFontFamily: 'JetBrains Mono', monospaceFamily: 'JetBrains Mono', sansSerifFamily: 'JetBrains Mono', serifFamily: 'JetBrains Mono'
  };
  return new Resvg(svg, { font, fitTo: { mode: 'width', value: W } }).render().asPng();
}

module.exports = { profileCardSvg, duelCardSvg, toPng, printable, W, H };
