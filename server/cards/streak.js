/**
 * Racha (390×160): racha actual y más larga del último año, y los últimos 30 días como celdas del calendario.
 * Si hoy aún no hay contribuciones, la celda de hoy va con borde discontinuo: la racha sigue viva.
 */

const { T, LABELS, escapeXml, fmtNumber, fmtDate, text, framed, delay } = require('./frame');
const { daysOf, streaks } = require('./data');

const WIDTH = T.size.half;
const HEIGHT = 160;

function render({ weeks, tokens, lang, login }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const fs = T.font.size;
  const days = daysOf(weeks);
  const { current, longest, todayPending, today } = streaks(days);
  const range = (s) => (s.length ? `${fmtDate(s.start, lang)} – ${fmtDate(s.end, lang)}` : L.noStreak);
  const unit = (n) => (n === 1 ? L.day : L.days);

  const half = WIDTH / 2;
  const block = (x, s, label, color) =>
    text(x, 72, fmtNumber(s.length, lang), { size: fs.hero, weight: T.font.weight.heavy, fill: color })
    + text(x + fmtNumber(s.length, lang).length * fs.hero * T.font.charWidth + 6, 72, escapeXml(unit(s.length)), { size: fs.body, fill: tokens.muted })
    + text(x, 92, `${escapeXml(label)} · ${escapeXml(range(s))}`, { size: fs.label, fill: tokens.muted });

  let body = block(p, current, L.current, tokens.body)
    + `<line x1="${half - 8}" y1="44" x2="${half - 8}" y2="96" stroke="${tokens.border}"/>`
    + block(half + 4, longest, L.longest, tokens.text);

  // Últimos 30 días: celdas del mismo tamaño relativo que el calendario de la serpiente
  const last = days.slice(-30);
  const gap = 2;
  const cell = (WIDTH - p * 2 - gap * 29) / 30;
  const colors = [tokens.empty, tokens.l1, tokens.l2, tokens.l3, tokens.l4];
  const activeCount = last.filter(d => d.count > 0).length;
  body += text(p, 118, escapeXml(L.last30), { size: fs.label, fill: tokens.muted })
    + text(WIDTH - p, 118, `${activeCount}/${last.length}`, { size: fs.label, fill: tokens.muted, anchor: 'end' });
  last.forEach((d, i) => {
    const x = +(p + i * (cell + gap)).toFixed(2);
    const isToday = i === last.length - 1;
    const pendingStroke = isToday && todayPending ? ` stroke="${tokens.body}" stroke-dasharray="2 2"` : '';
    body += `<rect class="zf"${delay(i * 18)} x="${x}" y="126" width="${+cell.toFixed(2)}" height="${+cell.toFixed(2)}" rx="${T.radius.cell}" fill="${colors[d.level] || colors[0]}"${pendingStroke}/>`;
  });

  const todayText = todayPending ? `${L.today}: ${L.pending}` : `${L.today}: +${today ? today.count : 0}`;
  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${login} streak by Portafil`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: L.streak, subtitle: L.lastYear, right: todayText, body })
  };
}

module.exports = { render, needs: ['calendar'], WIDTH, HEIGHT };
