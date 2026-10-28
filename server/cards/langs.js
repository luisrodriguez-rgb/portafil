/**
 * Lenguajes (390×160): barra apilada por tamaño de código y leyenda en dos columnas.
 * Usa los colores de serie del tema y no los de GitHub: con los de GitHub la tarjeta no combinaría con nada.
 */

const { T, LABELS, escapeXml, fmtNumber, truncate, text, framed, delay } = require('./frame');

const WIDTH = T.size.half;
const HEIGHT = 160;
const MAX_ITEMS = 6;
// Por debajo de esto un lenguaje se mostraba como «0,0 %»: pasa a «otros»
const MIN_SHARE = 0.5;

function fmtPct(value, lang) {
  if (value < MIN_SHARE) return `<${String(MIN_SHARE).replace('.', lang === 'es' ? ',' : '.')}%`;
  return `${value.toFixed(1).replace('.', lang === 'es' ? ',' : '.')}%`;
}

/** Los 5 primeros más "otros", o los 6 si no hay más */
function topLanguages(languages, otherLabel) {
  const total = languages.reduce((sum, l) => sum + l.size, 0);
  if (!total) return [];
  const visible = languages.filter(l => (l.size / total) * 100 >= MIN_SHARE);
  const items = visible.length <= MAX_ITEMS && visible.length === languages.length ? visible : visible.slice(0, MAX_ITEMS - 1);
  const rest = total - items.reduce((sum, l) => sum + l.size, 0);
  const result = items.map(l => ({ name: l.name, share: (l.size / total) * 100 }));
  if (rest) result.push({ name: otherLabel, share: (rest / total) * 100, other: true });
  return result;
}

function render({ profile, tokens, lang }) {
  const L = LABELS[lang];
  const p = T.space.padding;
  const items = topLanguages(profile.languages, L.other);
  const innerW = WIDTH - p * 2;

  let body = '';
  if (!items.length) {
    body = text(WIDTH / 2, 96, escapeXml(L.noCode), { fill: tokens.muted, anchor: 'middle' });
  } else {
    const colorOf = (item, i) => (item.other ? tokens.muted : tokens.series[i % tokens.series.length]);
    // Barra apilada recortada a un rectángulo redondeado; un hueco de 2 px separa los tramos
    body += `<clipPath id="zl"><rect x="${p}" y="44" width="${innerW}" height="10" rx="${T.radius.bar}"/></clipPath>`
      + `<rect x="${p}" y="44" width="${innerW}" height="10" rx="${T.radius.bar}" fill="${tokens.empty}"/><g clip-path="url(#zl)">`;
    let x = p;
    items.forEach((item, i) => {
      const w = (item.share / 100) * innerW;
      body += `<rect class="zx"${delay(i * 90)} x="${+x.toFixed(2)}" y="44" width="${+Math.max(0, w - (i < items.length - 1 ? 2 : 0)).toFixed(2)}" height="10" fill="${colorOf(item, i)}"/>`;
      x += w;
    });
    body += '</g>';

    // Leyenda en columnas: primero baja por la izquierda y luego por la derecha
    const colW = (innerW - T.space.gap) / 2;
    const maxName = Math.floor((colW - 14 - 48) / (T.font.size.body * T.font.charWidth));
    items.forEach((item, i) => {
      const col = Math.floor(i / 3);
      const x0 = +(p + col * (colW + T.space.gap)).toFixed(1);
      const y = 84 + (i % 3) * 24;
      body += `<g class="zf"${delay(300 + i * 60)}>`
        + `<rect x="${x0}" y="${y - 9}" width="9" height="9" rx="${T.radius.cell}" fill="${colorOf(item, i)}"/>`
        + text(x0 + 15, y, escapeXml(truncate(item.name, maxName)), { fill: tokens.text })
        + text(+(x0 + colW).toFixed(1), y, escapeXml(fmtPct(item.share, lang)), { size: T.font.size.label + 1, fill: tokens.muted, anchor: 'end' })
        + '</g>';
    });
  }

  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${profile.login} languages by Portafil`,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: L.languages, subtitle: L.bySize, right: `${fmtNumber(profile.publicRepos, lang, false)} ${L.repos}`, body })
  };
}

module.exports = { render, needs: ['profile'], WIDTH, HEIGHT, topLanguages };
