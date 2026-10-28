/**
 * Cabecera del perfil (797×120): avatar, nombre, @usuario, ubicación, bio y cifras.
 * La barra de días activos repite la barra de progreso de la serpiente: es lo que une visualmente las piezas.
 */

const { T, LABELS, escapeXml, fmtNumber, truncate, wrap, text, framed } = require('./frame');
const { daysOf, yearSummary } = require('./data');

const WIDTH = T.size.full;
const HEIGHT = 120;

function render({ profile, weeks, tokens, lang }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const fs = T.font.size;
  const cx = 60;
  const cy = HEIGHT / 2;
  const r = cy - p;

  // Avatar recortado en círculo con un anillo del color de la serpiente; sin avatar, iniciales
  const words = String(profile.name || profile.login).split(/[\s_-]+/).map(w => [...w].find(ch => /\p{L}|\d/u.test(ch))).filter(Boolean);
  const initials = (words.length > 1 ? words.slice(0, 2) : [...String(profile.login).slice(0, 2)]).join('').toUpperCase();
  const avatar = profile.avatar
    ? `<clipPath id="za"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image href="${profile.avatar}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#za)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tokens.empty}"/>${text(cx, cy + 10, escapeXml(initials), { size: 28, weight: T.font.weight.heavy, fill: tokens.body, anchor: 'middle' })}`;
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r + 1}" fill="none" stroke="${tokens.body}" stroke-width="2"/>`;

  // Columna derecha: tres cifras y la barra de días activos
  const colW = 72;
  const rightX = WIDTH - p - colW * 3;
  const metrics = [
    [profile.followers, L.followers],
    [profile.publicRepos, L.repos],
    [profile.stars, L.stars]
  ];
  let right = '';
  metrics.forEach(([value, label], i) => {
    const x = rightX + i * colW;
    right += text(x, 46, fmtNumber(value, lang), { size: fs.value, weight: T.font.weight.bold, fill: tokens.text })
      + text(x, 62, escapeXml(label), { size: fs.label, fill: tokens.muted });
  });
  const year = yearSummary(daysOf(weeks));
  const barW = colW * 3 - 8;
  const fraction = year.days ? year.active / year.days : 0;
  right += text(rightX, 86, `${fmtNumber(year.active, lang)} ${escapeXml(L.activeDays)}`, { size: fs.label + 1, fill: tokens.muted })
    + text(rightX + barW, 86, `${Math.round(fraction * 100)}%`, { size: fs.label + 1, fill: tokens.muted, anchor: 'end' })
    + `<rect x="${rightX}" y="94" width="${barW}" height="8" rx="${T.radius.bar}" fill="${tokens.empty}"/>`
    + `<rect class="zx" x="${rightX}" y="94" width="${+(barW * fraction).toFixed(1)}" height="8" rx="${T.radius.bar}" fill="${tokens.body}"/>`;

  // Texto: el ancho disponible se calcula con la fuente monoespaciada
  const textX = cx + r + 20;
  const textW = rightX - textX - 24;
  const name = truncate(profile.name || profile.login, Math.floor(textW / (fs.display * T.font.charWidth)));
  const handle = [`@${profile.login}`, profile.location].filter(Boolean).join(' · ');
  const bio = wrap(profile.bio, Math.floor(textW / (fs.body * T.font.charWidth)), 2);
  let left = text(textX, 44, escapeXml(name), { size: fs.display, weight: T.font.weight.bold, fill: tokens.text })
    + text(textX, 64, escapeXml(truncate(handle, Math.floor(textW / (fs.body * T.font.charWidth)))), { fill: tokens.body });
  bio.forEach((line, i) => {
    left += text(textX, 86 + i * 16, escapeXml(line), { fill: tokens.muted });
  });

  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${profile.login} by Portafil`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: '', body: avatar + ring + left + right })
  };
}

module.exports = { render, needs: ['profile', 'calendar'], WIDTH, HEIGHT };
