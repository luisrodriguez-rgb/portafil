/**
 * Registro de piezas del kit y el dashboard que las compone en una sola imagen (/api/kit/<usuario>.svg).
 * Cada pieza declara qué datos necesita (profile, calendar) para que el endpoint consulte solo lo justo.
 */

const { T, toSvg } = require('./frame');

const PIECES = {
  header: require('./header'),
  stats: require('./stats'),
  streak: require('./streak'),
  langs: require('./langs'),
  activity: require('./activity')
};

// Rejilla del dashboard: cabecera entera y dos filas de medias, con la separación del kit
const gap = T.space.gap;
const half = T.size.half;
const rowY = (row) => PIECES.header.HEIGHT + gap + row * (160 + gap);
const LAYOUT = [
  ['header', 0, 0],
  ['stats', 0, rowY(0)],
  ['streak', half + gap, rowY(0)],
  ['langs', 0, rowY(1)],
  ['activity', half + gap, rowY(1)]
];

const kit = {
  needs: ['profile', 'calendar'],
  render(data) {
    const width = T.size.full;
    const height = rowY(1) + 160;
    const content = LAYOUT.map(([kind, x, y]) => {
      const piece = PIECES[kind].render(data);
      return `<g transform="translate(${x} ${y})">${piece.content}</g>`;
    }).join('');
    return { width, height, title: `@${data.login} GitHub profile by GITHUB_SNAKE.EXE`, content };
  }
};

const KINDS = { ...PIECES, kit };

/** SVG final de una pieza. data: { profile, weeks, tokens, lang, login } */
function renderCard(kind, data) {
  return toSvg(KINDS[kind].render(data));
}

module.exports = { KINDS, renderCard, LAYOUT };
