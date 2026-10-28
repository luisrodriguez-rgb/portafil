const test = require('node:test');
const assert = require('node:assert');
const { loadEngine } = require('../action/lib');
const { renderSnakeSvg, calendarCache } = require('../server/snake-svg');
const { fixtureWeeks, LEVEL_NAMES } = require('./visual.helpers');

const engine = loadEngine();
const { GameModes, SnakeCore } = engine;
const exporter = new engine.ExporterEngine();

/** Matriz 53×7 a partir de una lista de celdas [x, y, nivel] */
function gridOf(cells) {
  const grid = Array.from({ length: 53 }, (_, x) => Array.from({ length: 7 }, (_, y) => ({ x, y, level: 0, originalLevel: 0, count: 0, date: null })));
  for (const [x, y, level] of cells) Object.assign(grid[x][y], { level, originalLevel: level, count: level });
  return grid;
}

/** Calendario con fechas reales: los últimos `days` días con el recuento que diga countOf(díasAtrás) */
function datedGrid(countOf) {
  const weeks = [];
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  const start = today - (52 * 7 + end.getUTCDay()) * 86400000;
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const time = start + (w * 7 + d) * 86400000;
      if (time > today) break;
      const back = Math.round((today - time) / 86400000);
      const count = countOf(back);
      days.push({ date: new Date(time).toISOString().slice(0, 10), weekday: d, contributionCount: count, contributionLevel: LEVEL_NAMES[Math.min(4, count)] });
    }
    weeks.push({ contributionDays: days });
  }
  return SnakeCore.weeksToGrid(weeks);
}

test('juego de la vida: reglas de Conway en un toro, un blinker oscila y un bloque es estable', () => {
  const blinker = GameModes.simulateLife(gridOf([[10, 2, 3], [10, 3, 3], [10, 4, 3]]), { minGens: 6 });
  assert.strictEqual(blinker.end, 'cycle');
  assert.deepStrictEqual([...blinker.population].slice(0, 4), [3, 3, 3, 3]);
  // En la generación 1 el blinker queda horizontal: (9,3) y (11,3) nacen
  assert.deepStrictEqual([...blinker.cellChanges['9_3'][0]], [1, 2]);
  assert.deepStrictEqual([...blinker.cellChanges['10_2'][0]], [1, 0]);

  const block = GameModes.simulateLife(gridOf([[5, 1, 2], [6, 1, 2], [5, 2, 2], [6, 2, 2]]));
  assert.strictEqual(block.end, 'stable');

  const lonely = GameModes.simulateLife(gridOf([[20, 3, 4]]));
  assert.strictEqual(lonely.end, 'extinct');
  assert.strictEqual(lonely.generations, 1);
});

test('juego de la vida: respeta el presupuesto de peso', () => {
  const sim = GameModes.simulateLife(SnakeCore.weeksToGrid(fixtureWeeks(2)), { budget: 200 });
  assert.ok(sim.changes <= 200);
});

test('pac-man: determinista, lo comido cuadra con los fotogramas y las vidas no pasan de 3', () => {
  for (const variant of [0, 1, 2, 3]) {
    const grid = SnakeCore.weeksToGrid(fixtureWeeks(variant));
    const a = GameModes.simulatePacman(grid);
    const b = GameModes.simulatePacman(grid);
    assert.deepStrictEqual(JSON.stringify(a), JSON.stringify(b), 'misma matriz, misma partida');
    assert.strictEqual(Object.keys(a.cellChanges).length, a.eaten);
    assert.ok(a.lives >= 0 && a.lives <= 3);
    assert.strictEqual(a.pacPath.length, a.ticks + 1);
    a.ghostPaths.forEach(p => assert.strictEqual(p.length, a.ticks + 1));
    // Cada paso es de una casilla como mucho, salvo al volver a la salida tras perder una vida
    for (let s = 1; s < a.pacPath.length; s++) {
      const d = Math.abs(a.pacPath[s].x - a.pacPath[s - 1].x) + Math.abs(a.pacPath[s].y - a.pacPath[s - 1].y);
      assert.ok(d <= 1 || a.lifeLost.includes(s), `salto en el paso ${s}`);
    }
    assert.ok(a.power.length <= 4);
  }
});

test('los modos son SVG con CSS, sin JavaScript, y caben en el presupuesto de peso', () => {
  for (const variant of [0, 1, 2, 3]) {
    const grid = SnakeCore.weeksToGrid(fixtureWeeks(variant));
    for (const game of ['life', 'pacman']) {
      const svg = exporter.buildSvg(grid, { game, user: 'octocat', theme: 'cyberpunk', lang: 'es' });
      assert.ok(svg.startsWith('<svg'), game);
      assert.ok(svg.includes('#090614'), `${game} usa el tema`);
      assert.ok(!/<script|on[a-z]+=/i.test(svg), `${game} sin JavaScript`);
      assert.ok(svg.length < 120 * 1024, `${game} pesa ${svg.length} bytes`);
    }
  }
  const pac = exporter.buildSvg(SnakeCore.weeksToGrid(fixtureWeeks(0)), { game: 'pacman', lang: 'es' });
  assert.match(pac, /pac-man · [\d.]+ pts/);
  const life = exporter.buildSvg(SnakeCore.weeksToGrid(fixtureWeeks(0)), { game: 'life', lang: 'es' });
  assert.match(life, /juego de la vida · \d+ generaciones/);
});

test('estados: la serpiente duerme tras 7 días sin contribuir y presume de rachas de 7 o más', () => {
  const asleep = exporter.buildSvg(datedGrid(back => (back >= 9 && back % 3 ? 2 : 0)), { user: 'octocat', lang: 'es' });
  assert.match(asleep, /durmiendo · 9 días sin contribuciones/);
  assert.ok(asleep.length < 40 * 1024);

  const onStreak = exporter.buildSvg(datedGrid(back => (back <= 11 ? 3 : back % 2)), { user: 'octocat', lang: 'en' });
  assert.match(onStreak, /12-day streak/);

  // Hoy aún a cero no rompe la racha ni cuenta como día dormido
  const pending = exporter.activityOf(datedGrid(back => (back === 0 ? 0 : 1)));
  assert.strictEqual(pending.idle, 0);
  assert.ok(pending.streak >= 300);

  // mood=off: la serpiente de siempre
  const off = exporter.buildSvg(datedGrid(back => (back >= 9 && back % 3 ? 2 : 0)), { user: 'octocat', mood: 'off' });
  assert.ok(!/asleep|durmiendo/.test(off));
  assert.match(off, /contributions in the last year/);

  // Sin fechas (matriz aleatoria o Commit Art) no hay estado
  assert.strictEqual(exporter.activityOf(gridOf([[1, 1, 2]])), null);
});

test('el endpoint de la serpiente acepta ?game= y ?mood=', async () => {
  calendarCache.clear();
  const fetchImpl = async () => ({ ok: true, json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: fixtureWeeks(0) } } } } }) });
  const pac = await renderSnakeSvg({ user: 'octocat', query: 'game=pacman&theme=light', token: 't', fetchImpl });
  assert.strictEqual(pac.status, 200);
  assert.match(pac.body, /pac-man eating @octocat/);
  const life = await renderSnakeSvg({ user: 'octocat', query: 'game=life&mood=off', token: 't', fetchImpl });
  assert.match(life.body, /game of life/);
  const bad = await renderSnakeSvg({ user: 'octocat', query: 'game=tetris', token: 't', fetchImpl });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.body, /game/);
});
