/**
 * Estadísticas (390×160): seis cifras del último año en una rejilla de 3×2.
 * Cada etiqueta lleva una celda del calendario como viñeta, con los colores de serie del tema.
 */

const { T, LABELS, escapeXml, fmtNumber, text, framed, delay } = require('./frame');
const { daysOf, yearSummary } = require('./data');

const WIDTH = T.size.half;
const HEIGHT = 160;

function render({ profile, weeks, tokens, lang }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const year = yearSummary(daysOf(weeks));
  const metrics = [
    [year.total, L.contributions],
    [profile.totals.commits, L.commits],
    [profile.totals.pullRequests, L.pullRequests],
    [profile.totals.issues, L.issues],
    [profile.totals.reviews, L.reviews],
    [profile.stars, L.stars]
  ];

  const colW = (WIDTH - p * 2) / 3;
  let body = '';
  metrics.forEach(([value, label], i) => {
    const x = +(p + (i % 3) * colW).toFixed(1);
    const y = i < 3 ? 76 : 128;
    body += `<g class="zf"${delay(i * 70)}>`
      + text(x, y, fmtNumber(value, lang), { size: T.font.size.value, weight: T.font.weight.bold, fill: i === 0 ? tokens.body : tokens.text })
      + `<rect x="${x}" y="${y + 9}" width="8" height="8" rx="${T.radius.cell}" fill="${tokens.series[i]}"/>`
      + text(x + 13, y + 17, escapeXml(label), { size: T.font.size.label, fill: tokens.muted })
      + '</g>';
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${profile.login} stats by Perfila`,
    content: framed({
      width: WIDTH, height: HEIGHT, tokens,
      title: L.stats, subtitle: L.lastYear,
      right: `${fmtNumber(year.active, lang)} ${L.activeDays}`,
      body
    })
  };
}

module.exports = { render, needs: ['profile', 'calendar'], WIDTH, HEIGHT };
