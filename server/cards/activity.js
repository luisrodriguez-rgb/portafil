/**
 * Actividad (390×160): contribuciones por semana como gráfica de barras, 53 semanas con eje de meses.
 * El color de cada barra usa los niveles del calendario (l1-l4) según su altura respecto al pico,
 * así la gráfica se lee como el mismo calendario de la serpiente, plegado por semanas.
 */

const { T, LABELS, fmtNumber, text, framed, delay } = require('./frame');
const { weeklyTotals } = require('./data');

const WIDTH = T.size.half;
const HEIGHT = 160;

function render({ weeks, tokens, lang, login }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const totals = weeklyTotals(weeks);
  const n = Math.max(1, totals.length);
  const peak = Math.max(0, ...totals.map(w => w.total));
  const avg = totals.reduce((sum, w) => sum + w.total, 0) / n;

  const top = 46;
  const base = 126;
  const chartH = base - top;
  const step = (WIDTH - p * 2) / n;
  const barW = +(step * 0.7).toFixed(2);
  const level = (t) => (t === 0 ? tokens.empty : t > peak * 0.75 ? tokens.l4 : t > peak * 0.5 ? tokens.l3 : t > peak * 0.25 ? tokens.l2 : tokens.l1);

  let body = '';
  totals.forEach((w, i) => {
    const h = peak ? Math.max(2, (w.total / peak) * chartH) : 2;
    const x = +(p + i * step + (step - barW) / 2).toFixed(2);
    body += `<rect class="zy"${delay(i * 12)} x="${x}" y="${+(base - h).toFixed(2)}" width="${barW}" height="${+h.toFixed(2)}" rx="1.5" fill="${level(w.total)}"/>`;
  });

  // Media como línea discontinua y discreta
  if (peak) {
    const y = +(base - (avg / peak) * chartH).toFixed(2);
    body += `<line class="zf"${delay(600)} x1="${p}" y1="${y}" x2="${WIDTH - p}" y2="${y}" stroke="${tokens.muted}" stroke-dasharray="3 3" opacity=".6"/>`;
  }

  // Eje de meses: una etiqueta en la primera semana de cada mes, si no pisa la anterior
  let lastX = -Infinity;
  let lastMonth = null;
  totals.forEach((w, i) => {
    if (!w.start) return;
    const month = Number(w.start.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    const x = p + i * step;
    if (i === 0 || x - lastX < 26 || x > WIDTH - p - 16) return;
    body += text(+x.toFixed(1), 144, L.months[month], { size: T.font.size.label, fill: tokens.muted });
    lastX = x;
  });

  const right = `${L.peak} ${fmtNumber(peak, lang)}/${L.wk} · ${L.avg} ${fmtNumber(Math.round(avg), lang)}`;
  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${login} weekly activity by Perfila`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: L.activity, subtitle: L.perWeek, right, body })
  };
}

module.exports = { render, needs: ['calendar'], WIDTH, HEIGHT };
