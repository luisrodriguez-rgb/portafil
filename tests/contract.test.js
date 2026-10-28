const test = require('node:test');
const assert = require('node:assert');
const { loadEngine } = require('../action/lib');

const { SnakeCore, ThemeTokens } = loadEngine();

// Copia congelada del contrato v1 (docs/contract.md). Si esta prueba falla, un perfil publicado dejaría de verse:
// en vez de editar esta lista, añade la opción nueva sin quitar las viejas, o sube CONTRACT_VERSION.
const V1 = {
  snake: {
    theme: ['ink', 'paper', 'dark', 'light', 'cyberpunk', 'neon_cyan', 'amber_terminal'],
    speed: ['normal', 'fast', 'relaxed'],
    morph: ['matrix_viper', 'capsule', 'retro'],
    pause: ['fast', 'medium', 'none'],
    lang: ['en', 'es'],
    game: ['snake', 'life', 'pacman', 'invaders', 'tetris'],
    mood: ['auto', 'off']
  },
  cards: {
    theme: ['ink', 'paper', 'dark', 'light', 'cyberpunk', 'neon_cyan', 'amber_terminal'],
    lang: ['en', 'es']
  },
  kinds: ['header', 'stats', 'streak', 'langs', 'activity', 'kit'],
  pairKinds: ['duel', 'versus']
};

function assertSuperset(current, frozen, label) {
  for (const [key, values] of Object.entries(frozen)) {
    assert.ok(current[key], `${label}: desapareció la opción '${key}'`);
    for (const value of values) {
      assert.ok(current[key].includes(value), `${label}: desapareció el valor '${key}=${value}'`);
    }
  }
}

test('el contrato v1 sigue vigente: ninguna opción ni valor publicado desaparece', () => {
  assert.strictEqual(SnakeCore.CONTRACT_VERSION, 1);
  assertSuperset(SnakeCore.OPTION_VALUES, V1.snake, 'serpiente');
  assertSuperset(SnakeCore.CARD_OPTION_VALUES, V1.cards, 'tarjetas');
  for (const kind of V1.kinds) assert.ok(SnakeCore.CARD_KINDS.includes(kind), `desapareció la pieza '${kind}'`);
  for (const kind of V1.pairKinds) assert.ok(SnakeCore.PAIR_KINDS.includes(kind), `desapareció la pieza de dos perfiles '${kind}'`);
});

test('cada tema del contrato tiene sus design tokens completos', () => {
  const required = ['text', 'muted', 'bg', 'border', 'empty', 'l1', 'l2', 'l3', 'l4', 'head', 'body', 'glow', 'spine', 'series'];
  const themes = new Set([...SnakeCore.OPTION_VALUES.theme, ...SnakeCore.CARD_OPTION_VALUES.theme]);
  // Copias del contexto principal: los arrays del sandbox tienen otro prototipo
  assert.deepStrictEqual([...themes].sort(), [...ThemeTokens.names()].sort());
  for (const theme of themes) {
    const tokens = ThemeTokens.themes[theme];
    for (const key of required) assert.ok(tokens[key], `al tema '${theme}' le falta '${key}'`);
    assert.ok(tokens.series.length >= 6, `el tema '${theme}' necesita 6 colores de serie`);
  }
});

test('las tarjetas validan con su propio contrato', () => {
  assert.deepStrictEqual({ ...SnakeCore.parseOptions('theme=light&lang=es', '', SnakeCore.CARD_OPTION_VALUES) }, { theme: 'light', lang: 'es' });
  assert.throws(() => SnakeCore.parseOptions('morph=retro', '', SnakeCore.CARD_OPTION_VALUES), /Opción desconocida 'morph'/);
});
