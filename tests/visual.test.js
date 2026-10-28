const test = require('node:test');
const assert = require('node:assert');
const { loadEngine } = require('../action/lib');
const { fixtureWeeks, fixtureProfile, checkSnapshots } = require('./visual.helpers');

const engine = loadEngine();
const { SnakeCore } = engine;

test('la serpiente no cambia por accidente en ningún tema ni morfología', () => {
  const grid = SnakeCore.weeksToGrid(fixtureWeeks());
  const exporter = new engine.ExporterEngine();
  const outputs = {};
  for (const theme of SnakeCore.OPTION_VALUES.theme) {
    for (const morph of SnakeCore.OPTION_VALUES.morph) {
      outputs[`${theme}/${morph}`] = exporter.buildAnimatedSvg(grid, { theme, morph, user: 'octocat' });
    }
  }
  const { diff } = checkSnapshots('snake', outputs);
  assert.deepStrictEqual(diff, [], 'Cambió el SVG de la serpiente. Si es intencionado: UPDATE_SNAPSHOTS=1 node --test tests/visual.test.js');
});

test('las tarjetas del kit no cambian por accidente en ningún tema ni idioma', () => {
  const { renderCard, KINDS } = require('../server/cards');
  const { T } = require('../server/cards/frame');
  const outputs = {};
  for (const theme of SnakeCore.CARD_OPTION_VALUES.theme) {
    for (const lang of SnakeCore.CARD_OPTION_VALUES.lang) {
      for (const kind of Object.keys(KINDS)) {
        outputs[`${kind}/${theme}/${lang}`] = renderCard(kind, {
          profile: fixtureProfile(), weeks: fixtureWeeks(), tokens: T.get(theme), lang, login: 'octocat'
        });
      }
    }
  }
  const { diff } = checkSnapshots('cards', outputs);
  assert.deepStrictEqual(diff, [], 'Cambió el SVG de una tarjeta. Si es intencionado: UPDATE_SNAPSHOTS=1 node --test tests/visual.test.js');
});

test('el duelo y el versus no cambian por accidente', async () => {
  const { renderPairSvg } = require('../server/duel');
  const { fakePairGitHub } = require('./duel.helpers');
  const { fetchImpl } = fakePairGitHub();
  const outputs = {};
  for (const theme of SnakeCore.CARD_OPTION_VALUES.theme) {
    for (const kind of SnakeCore.PAIR_KINDS) {
      outputs[`${kind}/${theme}`] = (await renderPairSvg({ kind, pair: 'octocat-vs-hubot', query: `theme=${theme}`, token: 't', fetchImpl })).body;
    }
  }
  const { diff } = checkSnapshots('pairs', outputs);
  assert.deepStrictEqual(diff, [], 'Cambió el SVG del duelo o del versus. Si es intencionado: UPDATE_SNAPSHOTS=1 node --test tests/visual.test.js');
});

test('los modos de juego no cambian por accidente en ningún tema', () => {
  const grid = SnakeCore.weeksToGrid(fixtureWeeks(2));
  const exporter = new engine.ExporterEngine();
  const outputs = {};
  for (const theme of SnakeCore.OPTION_VALUES.theme) {
    for (const game of ['life', 'pacman']) {
      outputs[`${game}/${theme}`] = exporter.buildSvg(grid, { game, theme, user: 'octocat' });
    }
  }
  const { diff } = checkSnapshots('games', outputs);
  assert.deepStrictEqual(diff, [], 'Cambió el SVG de un modo de juego. Si es intencionado: UPDATE_SNAPSHOTS=1 node --test tests/visual.test.js');
});
