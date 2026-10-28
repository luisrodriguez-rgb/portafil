/**
 * Versus (797×264): dos perfiles frente a frente sin juego. Gráfica de mariposa: las barras de @a crecen
 * hacia la izquierda y las de @b hacia la derecha desde las etiquetas del centro; en cada fila destaca quien gana.
 */

const { T, LABELS, escapeXml, fmtNumber, truncate, text, framed } = require('./frame');
const { daysOf, streaks, yearSummary } = require('./data');

const WIDTH = T.size.full;
const ROW_H = 26;
const TOP = 56;

function metricsOf(profile, weeks) {
  const days = daysOf(weeks);
  const s = streaks(days);
  return {
    contributions: yearSummary(days).total,
    currentStreak: s.current.length,
    longestStreak: s.longest.length,
    commits: profile.totals.commits,
    pullRequests: profile.totals.pullRequests,
    stars: profile.stars,
    followers: profile.followers,
    topLanguage: profile.languages.length ? profile.languages[0].name : '—'
  };
}

function render({ pair, tokens, lang }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const [A, B] = pair.map(({ profile, weeks }) => metricsOf(profile, weeks));
  const [loginA, loginB] = pair.map(({ profile }) => profile.login);
  const rows = ['contributions', 'currentStreak', 'longestStreak', 'commits', 'pullRequests', 'stars', 'followers'];
  const height = TOP + rows.length * ROW_H + 40;

  const center = WIDTH / 2;
  const labelW = 150;
  const areaW = center - labelW / 2 - p;
  const maxBar = areaW - 64; // sitio para la cifra al final de la barra
  const colorA = tokens.body;
  const colorB = tokens.head;

  const won = [0, 0];
  let body = '';
  rows.forEach((key, i) => {
    const y = TOP + i * ROW_H;
    const a = A[key];
    const b = B[key];
    const max = Math.max(a, b, 1);
    if (a !== b) won[a > b ? 0 : 1]++;
    const wa = Math.max(2, (a / max) * maxBar);
    const wb = Math.max(2, (b / max) * maxBar);
    const xa = center - labelW / 2 - wa;
    const xb = center + labelW / 2;
    const delayMs = i * 70;
    body += text(center, y + 9, escapeXml(L[key]), { size: T.font.size.label + 1, fill: tokens.muted, anchor: 'middle' })
      + `<rect class="zx" style="transform-origin:right;animation-delay:${delayMs}ms" x="${+xa.toFixed(1)}" y="${y}" width="${+wa.toFixed(1)}" height="12" rx="${T.radius.bar}" fill="${colorA}" opacity="${a >= b ? 1 : 0.45}"/>`
      + text(+(xa - 8).toFixed(1), y + 10, fmtNumber(a, lang), { weight: a > b ? T.font.weight.bold : undefined, fill: a >= b ? tokens.text : tokens.muted, anchor: 'end' })
      + `<rect class="zx" style="animation-delay:${delayMs}ms" x="${xb}" y="${y}" width="${+wb.toFixed(1)}" height="12" rx="${T.radius.bar}" fill="${colorB}" opacity="${b >= a ? 1 : 0.45}"/>`
      + text(+(xb + wb + 8).toFixed(1), y + 10, fmtNumber(b, lang), { weight: b > a ? T.font.weight.bold : undefined, fill: b >= a ? tokens.text : tokens.muted });
  });

  // Lenguaje principal: texto, no barra
  const yLang = TOP + rows.length * ROW_H + 14;
  body += `<line x1="${p}" y1="${yLang - 18}" x2="${WIDTH - p}" y2="${yLang - 18}" stroke="${tokens.border}"/>`
    + text(center, yLang, escapeXml(L.topLanguage), { size: T.font.size.label + 1, fill: tokens.muted, anchor: 'middle' })
    + text(center - labelW / 2, yLang, escapeXml(truncate(A.topLanguage, 24)), { fill: colorA, anchor: 'end' })
    + text(center + labelW / 2, yLang, escapeXml(truncate(B.topLanguage, 24)), { fill: colorB });

  // Fila de título: @a a la izquierda, marcador de filas ganadas en el centro, @b a la derecha
  const nameMax = Math.floor((center - 90 - p) / (T.font.size.value * T.font.charWidth));
  body += text(p, 30, escapeXml(truncate(`@${loginA}`, nameMax)), { size: T.font.size.value, weight: T.font.weight.bold, fill: colorA })
    + text(WIDTH - p, 30, escapeXml(truncate(`@${loginB}`, nameMax)), { size: T.font.size.value, weight: T.font.weight.bold, fill: colorB, anchor: 'end' })
    + text(center, 30, `${escapeXml(L.versus)} · ${won[0]}–${won[1]}`, { weight: T.font.weight.bold, fill: tokens.text, anchor: 'middle' });

  return {
    width: WIDTH,
    height,
    title: `@${loginA} vs @${loginB} by GITHUB_SNAKE.EXE`,
    content: framed({ width: WIDTH, height, tokens, title: '', body })
  };
}

module.exports = { render, metricsOf };
