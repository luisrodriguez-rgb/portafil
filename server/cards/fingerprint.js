/**
 * Tu huella (797×300): el año de contribuciones en un círculo, distinto para cada perfil. Las 53 semanas van
 * alrededor en el sentido del reloj desde arriba y los 7 días son anillos (domingo dentro, sábado fuera), con
 * los niveles del calendario. A la derecha, lo que el resto de piezas no cuenta: el día de la semana y el mes
 * en que más contribuyes, la racha más larga, la constancia y el ritmo de cada día de la semana.
 * Entrada: las semanas aparecen en barrido, como un radar (una sola vez).
 */

const { T, LABELS, escapeXml, fmtNumber, fmtDate, text, framed, delay } = require('./frame');
const { daysOf, streaks, yearSummary } = require('./data');

const WIDTH = T.size.full;
const HEIGHT = 300;

// Círculo: centro, radio interior (el hueco del total) y exterior; cada anillo es un día de la semana
const CX = 146;
const CY = 168;
const R_IN = 36;
const R_OUT = 104;
const RING = (R_OUT - R_IN) / 7;
const WEEKS = 53;

const pt = (r, angle) => `${+(CX + r * Math.cos(angle)).toFixed(1)} ${+(CY + r * Math.sin(angle)).toFixed(1)}`;

/** Arco de una celda: una línea gruesa sobre el anillo, entre dos ángulos (en radianes) */
function cell(week, weekday, color) {
  const span = (Math.PI * 2) / WEEKS;
  const gap = span * 0.14;
  const a0 = -Math.PI / 2 + week * span + gap / 2;
  const a1 = a0 + span - gap;
  const r = R_IN + (weekday + 0.5) * RING;
  return `<path d="M${pt(r, a0)}A${r} ${r} 0 0 1 ${pt(r, a1)}" stroke="${color}" stroke-width="${+(RING - 1.6).toFixed(1)}" fill="none"/>`;
}

function render({ weeks, tokens, lang, login }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const colors = [tokens.empty, tokens.l1, tokens.l2, tokens.l3, tokens.l4];
  const recent = weeks.slice(-WEEKS);
  const offset = WEEKS - recent.length;
  const days = daysOf(recent);
  const summary = yearSummary(days);

  // Círculo: un grupo por semana para que la entrada sea un barrido
  let body = '';
  for (let w = 0; w < WEEKS; w++) {
    const week = recent[w - offset];
    const byDay = new Map(week ? week.contributionDays.map(d => [d.weekday, d]) : []);
    let arcs = '';
    for (let d = 0; d < 7; d++) {
      const day = byDay.get(d);
      const level = day ? ({ NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 })[day.contributionLevel] || 0 : 0;
      arcs += cell(w, d, colors[level]);
    }
    body += `<g class="zf"${delay(w * 16)}>${arcs}</g>`;
  }

  // Meses alrededor del círculo, en la primera semana de cada uno
  let lastMonth = null;
  recent.forEach((week, i) => {
    const first = week.contributionDays[0];
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    if (i === 0) return;
    const angle = -Math.PI / 2 + (i + offset + 0.5) * ((Math.PI * 2) / WEEKS);
    const [x, y] = pt(R_OUT + 12, angle).split(' ');
    body += text(x, +(Number(y) + 3).toFixed(1), L.months[month], { size: 9, fill: tokens.muted, anchor: 'middle' });
  });

  // Total en el centro
  body += text(CX, CY + 2, fmtNumber(summary.total, lang), { size: 18, weight: T.font.weight.heavy, fill: tokens.text, anchor: 'middle', cls: 'zf' })
    + text(CX, CY + 16, escapeXml(L.contributionsShort), { size: 9, fill: tokens.muted, anchor: 'middle', cls: 'zf' });

  // Ritmo: contribuciones por día de la semana y por mes
  const byWeekday = Array(7).fill(0);
  const byMonth = new Map();
  for (const d of days) {
    byWeekday[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;
    const key = d.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) || 0) + d.count);
  }
  const favDay = summary.total ? byWeekday.indexOf(Math.max(...byWeekday)) : -1;
  const [bestMonth, bestMonthCount] = [...byMonth].reduce((best, m) => (m[1] > best[1] ? m : best), ['', 0]);
  const { longest } = streaks(days);
  const share = favDay >= 0 ? Math.round((byWeekday[favDay] / summary.total) * 100) : 0;

  // Cuatro cifras en rejilla de 2×2 y, debajo, las barras del ritmo semanal
  const x0 = 316;
  const colW = (WIDTH - p - x0) / 2;
  const metric = (i, label, value, sub) => {
    const x = +(x0 + (i % 2) * colW).toFixed(1);
    const y = 76 + Math.floor(i / 2) * 64;
    return `<g class="zf"${delay(500 + i * 90)}>`
      + text(x, y, escapeXml(label), { size: T.font.size.label + 1, fill: tokens.muted })
      + text(x, y + 22, escapeXml(value), { size: T.font.size.value, weight: T.font.weight.bold, fill: i === 0 ? tokens.body : tokens.text })
      + text(x, y + 38, escapeXml(sub), { size: T.font.size.label, fill: tokens.muted })
      + '</g>';
  };
  const dash = '—';
  body += metric(0, L.favoriteDay, favDay >= 0 ? L.weekdays[favDay] : dash, favDay >= 0 ? L.shareOf(share) : '');
  body += metric(1, L.bestMonth, bestMonthCount ? `${L.months[Number(bestMonth.slice(5, 7)) - 1]} ${bestMonth.slice(0, 4)}` : dash,
    bestMonthCount ? `${fmtNumber(bestMonthCount, lang)} ${L.contributions}` : '');
  body += metric(2, L.longestStreak, `${longest.length} ${longest.length === 1 ? L.day : L.days}`,
    longest.length ? `${fmtDate(longest.start, lang)} – ${fmtDate(longest.end, lang)}` : L.noStreak);
  body += metric(3, L.consistency, `${summary.days ? Math.round((summary.active / summary.days) * 100) : 0}%`,
    L.activeOf(summary.active, summary.days));

  // Ritmo semanal: una barra por día, de lunes a domingo
  const peak = Math.max(1, ...byWeekday);
  const barTop = 218;
  const barBase = 266;
  const barStep = (WIDTH - p - x0) / 7;
  body += text(x0, barTop - 8, escapeXml(L.weeklyRhythm), { size: T.font.size.label + 1, fill: tokens.muted });
  [1, 2, 3, 4, 5, 6, 0].forEach((d, i) => {
    const h = Math.max(2, (byWeekday[d] / peak) * (barBase - barTop - 4));
    const x = +(x0 + i * barStep).toFixed(1);
    const w = +(barStep * 0.62).toFixed(1);
    const color = d === favDay ? tokens.l4 : byWeekday[d] > peak * 0.5 ? tokens.l3 : byWeekday[d] ? tokens.l2 : tokens.empty;
    body += `<rect class="zy"${delay(700 + i * 50)} x="${x}" y="${+(barBase - h).toFixed(1)}" width="${w}" height="${+h.toFixed(1)}" rx="2" fill="${color}"/>`
      + text(+(x + w / 2).toFixed(1), barBase + 14, L.weekdaysShort[d], { size: T.font.size.label, fill: tokens.muted, anchor: 'middle' });
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${login} contribution fingerprint by Portafil`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: L.fingerprint, subtitle: L.lastYear, right: `@${login}`, body })
  };
}

module.exports = { render, needs: ['calendar'], WIDTH, HEIGHT };
