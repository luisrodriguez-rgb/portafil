/**
 * Tu año (797×340): el resumen del año natural para compartir en diciembre. A la izquierda, el total y cuánto
 * cambió frente al mismo periodo del año anterior, y «tu estilo»: una etiqueta según cómo contribuyes. A la
 * derecha, los momentos del año (mejor mes y día, día favorito, racha, proyecto del año, commits) y abajo la
 * forma del año, mes a mes. Datos de server/year.js.
 */

const { T, LABELS, escapeXml, fmtNumber, fmtDate, truncate, text, framed, delay } = require('./frame');
const { streaks } = require('./data');

const WIDTH = T.size.full;
const HEIGHT = 340;

/** Tu estilo: la primera regla que se cumple, de la más llamativa a la más general */
function styleOf({ total, prevTotal, days, longest, byWeekday, bestMonthShare }) {
  const active = days.filter(d => d.count > 0).length;
  const growth = prevTotal > 0 ? (total - prevTotal) / prevTotal : 0;
  const weekend = total ? (byWeekday[0] + byWeekday[6]) / total : 0;
  if (!total) return { key: 'quiet' };
  if (prevTotal > 0 && growth >= 0.5) return { key: 'rise', value: Math.round(growth * 100) };
  if (days.length && active / days.length >= 0.75) return { key: 'clockwork', value: Math.round((active / days.length) * 100) };
  if (longest >= 30) return { key: 'unstoppable', value: longest };
  if (weekend >= 0.35) return { key: 'weekend', value: Math.round(weekend * 100) };
  if (bestMonthShare >= 0.3) return { key: 'sprinter', value: Math.round(bestMonthShare * 100) };
  return { key: 'steady', value: active };
}

function render({ year, tokens, lang, login }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const data = year || { year: new Date().getUTCFullYear(), partial: true, until: '', days: [], total: 0, prevTotal: 0, commits: 0, topRepo: null };
  const { days, total, prevTotal } = data;

  // Ritmo del año
  const byWeekday = Array(7).fill(0);
  const byMonth = Array(12).fill(0);
  let bestDay = null;
  for (const d of days) {
    byWeekday[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;
    byMonth[Number(d.date.slice(5, 7)) - 1] += d.count;
    if (d.count > 0 && (!bestDay || d.count > bestDay.count)) bestDay = d;
  }
  const bestMonth = total ? byMonth.indexOf(Math.max(...byMonth)) : -1;
  const favDay = total ? byWeekday.indexOf(Math.max(...byWeekday)) : -1;
  const { longest } = streaks(days);
  const style = styleOf({ total, prevTotal, days, longest: longest.length, byWeekday, bestMonthShare: total ? byMonth[bestMonth] / total : 0 });
  const [styleName, styleLine] = L.styles[style.key];

  // Izquierda: total, comparación y estilo
  let body = text(p, 84, fmtNumber(total, lang, false), { size: 40, weight: T.font.weight.heavy, fill: tokens.body, cls: 'zf' })
    + text(p, 106, escapeXml(L.contributionsIn(data.year)), { size: T.font.size.body, fill: tokens.muted, cls: 'zf' });
  if (prevTotal > 0) {
    const change = Math.round(((total - prevTotal) / prevTotal) * 100);
    const up = change >= 0;
    body += `<g class="zf"${delay(250)}>`
      + text(p, 134, escapeXml(`${up ? '▲' : '▼'} ${up ? '+' : ''}${fmtNumber(change, lang, false)} % ${L.vs} ${data.year - 1}`), { size: T.font.size.value - 2, weight: T.font.weight.bold, fill: up ? tokens.l4 : tokens.muted })
      + text(p, 151, escapeXml(data.partial ? L.samePeriod : L.wholeYear), { size: T.font.size.label, fill: tokens.muted })
      + '</g>';
  } else if (total > 0) {
    // Sin contribuciones públicas el año anterior: también es un dato que celebrar
    body += `<g class="zf"${delay(250)}>`
      + text(p, 134, escapeXml(`▲ ${L.upFromZero(data.year - 1)}`), { size: T.font.size.value - 2, weight: T.font.weight.bold, fill: tokens.l4 })
      + '</g>';
  }
  const pillW = Math.min(268, Math.max(120, [...styleName].length * 13 * T.font.charWidth + 26));
  body += `<g class="zf"${delay(450)}>`
    + text(p, 184, escapeXml(L.yourStyle), { size: T.font.size.label + 1, fill: tokens.muted })
    + `<rect x="${p}" y="192" width="${+pillW.toFixed(1)}" height="26" rx="13" fill="${tokens.empty}" stroke="${tokens.l3}"/>`
    + text(p + 13, 209, escapeXml(styleName), { size: 13, weight: T.font.weight.bold, fill: tokens.text })
    + text(p, 236, escapeXml(truncate(styleLine(style.value, { month: bestMonth >= 0 ? L.months[bestMonth] : '', prev: data.year - 1 }), 44)), { size: T.font.size.label + 1, fill: tokens.muted })
    + '</g>';

  // Derecha: los momentos del año en una rejilla de 3×2
  const x0 = 316;
  const colW = (WIDTH - p - x0) / 3;
  const dash = '—';
  const moments = [
    [L.bestMonth, bestMonth >= 0 ? L.months[bestMonth] : dash, bestMonth >= 0 ? `${fmtNumber(byMonth[bestMonth], lang)} ${L.contributions}` : ''],
    [L.bestDay, bestDay ? fmtDate(bestDay.date, lang) : dash, bestDay ? `${fmtNumber(bestDay.count, lang)} ${L.contributions}` : ''],
    [L.favoriteDay, favDay >= 0 ? L.weekdays[favDay] : dash, ''],
    [L.longestStreak, `${longest.length} ${longest.length === 1 ? L.day : L.days}`, longest.length ? `${fmtDate(longest.start, lang)} – ${fmtDate(longest.end, lang)}` : ''],
    [L.projectOfYear, data.topRepo ? truncate(data.topRepo.name, 14) : dash, data.topRepo ? `${fmtNumber(data.topRepo.commits, lang)} ${L.commits}` : ''],
    [L.commits, fmtNumber(data.commits || 0, lang), data.pullRequests ? `${fmtNumber(data.pullRequests, lang)} ${L.pullRequests}` : '']
  ];
  moments.forEach(([label, value, sub], i) => {
    const x = +(x0 + (i % 3) * colW).toFixed(1);
    const y = 70 + Math.floor(i / 3) * 70;
    body += `<g class="zf"${delay(300 + i * 80)}>`
      + text(x, y, escapeXml(label), { size: T.font.size.label + 1, fill: tokens.muted })
      + text(x, y + 22, escapeXml(value), { size: T.font.size.value - 1, weight: T.font.weight.bold, fill: i === 0 ? tokens.body : tokens.text })
      + (sub ? text(x, y + 38, escapeXml(sub), { size: T.font.size.label, fill: tokens.muted }) : '')
      + '</g>';
  });

  // Abajo: la forma del año, mes a mes (los meses que aún no han llegado, en hueco)
  const lastMonth = data.until ? Number(data.until.slice(5, 7)) - 1 : 11;
  const peak = Math.max(1, ...byMonth);
  const chartX = x0;
  const chartW = WIDTH - p - chartX;
  const step = chartW / 12;
  const base = 300;
  const top = 254;
  body += text(chartX, top - 8, escapeXml(L.yearShape), { size: T.font.size.label + 1, fill: tokens.muted });
  byMonth.forEach((count, m) => {
    const future = data.partial && m > lastMonth;
    const h = future ? 3 : Math.max(3, (count / peak) * (base - top - 4));
    const x = +(chartX + m * step + step * 0.15).toFixed(1);
    const w = +(step * 0.7).toFixed(1);
    const fill = future ? tokens.empty : m === bestMonth ? tokens.l4 : count > peak * 0.5 ? tokens.l3 : count ? tokens.l2 : tokens.empty;
    body += `<rect class="zy"${delay(600 + m * 40)} x="${x}" y="${+(base - h).toFixed(1)}" width="${w}" height="${+h.toFixed(1)}" rx="2" fill="${fill}"/>`
      + text(+(x + w / 2).toFixed(1), base + 14, L.months[m].slice(0, 1).toUpperCase(), { size: T.font.size.label, fill: tokens.muted, anchor: 'middle' });
  });

  const subtitle = data.partial && data.until ? L.untilDate(fmtDate(data.until, lang)) : '';
  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${login} ${data.year} in review by Portafil`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: L.yourYear(data.year), subtitle, right: `@${login}`, body })
  };
}

module.exports = { render, needs: ['year'], WIDTH, HEIGHT, styleOf };
