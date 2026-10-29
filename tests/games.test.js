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
  // Entrada: los pasos 0-1 son el gráfico y el 2 la semilla. En la generación 1 (paso 3) el blinker queda
  // horizontal: (9,3) nace y brilla (4) y (10,2) muere dejando estela (1); en la 2 (paso 4) vuelve a nacer
  assert.deepStrictEqual([...blinker.cellChanges['9_3'][0]], [3, 4]);
  assert.deepStrictEqual([...blinker.cellChanges['10_2']].slice(0, 2).map(c => [...c]), [[3, 1], [4, 4]]);

  const block = GameModes.simulateLife(gridOf([[5, 1, 2], [6, 1, 2], [5, 2, 2], [6, 2, 2]]));
  assert.strictEqual(block.end, 'stable');

  const lonely = GameModes.simulateLife(gridOf([[20, 3, 4]]));
  assert.strictEqual(lonely.end, 'extinct');
  assert.strictEqual(lonely.generations, 1);
});

test('juego de la vida: con un perfil muy activo la semilla son los días intensos y la partida dura', () => {
  // 90 % de días activos: con todos vivos moría por sobrepoblación en la primera generación
  const cells = [];
  for (let x = 0; x < 53; x++) for (let y = 0; y < 7; y++) if ((x * 7 + y) % 10) cells.push([x, y, 1 + ((x * 3 + y * 5) % 4)]);
  const sim = GameModes.simulateLife(gridOf(cells));
  assert.ok(sim.seedLevel > 1, `semilla desde el nivel ${sim.seedLevel}`);
  assert.ok(sim.population[0] <= 53 * 7 * GameModes.LIFE_SEED_DENSITY, `${sim.population[0]} vivas al empezar`);
  assert.ok(sim.generations >= 5, `${sim.generations} generaciones`);
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
    for (const game of ['life', 'pacman', 'invaders', 'tetris']) {
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
  const bad = await renderSnakeSvg({ user: 'octocat', query: 'game=pong', token: 't', fetchImpl });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.body, /game/);
});

test('invasores: cada disparo acierta o se pierde, el daño cuadra y la IA limpia el tablero', () => {
  for (const variant of [0, 1, 2, 3]) {
    const grid = SnakeCore.weeksToGrid(fixtureWeeks(variant));
    const sim = GameModes.simulateInvaders(grid);
    assert.strictEqual(sim.cleared, true, `variante ${variant}`);
    assert.strictEqual(sim.shipPath.length, sim.ticks + 1);
    assert.ok(sim.shots.every(s => s.end !== null && s.end >= s.fire));
    assert.strictEqual(sim.shots.filter(s => s.hit).length, sim.hits);
    // Cada celda acaba a cero y solo pierde niveles
    for (const changes of Object.values(sim.cellChanges)) {
      assert.strictEqual(changes[changes.length - 1][1], 0);
      for (let i = 1; i < changes.length; i++) assert.ok(changes[i][1] < changes[i - 1][1]);
    }
    for (let s = 1; s < sim.shipPath.length; s++) assert.ok(Math.abs(sim.shipPath[s].x - sim.shipPath[s - 1].x) <= 1);
  }
});

test('tetris: la gravedad junta cada fila hacia el pasado y las piezas no se pisan', () => {
  const grid = SnakeCore.weeksToGrid(fixtureWeeks(1));
  const sim = GameModes.simulateTetris(grid);
  assert.ok(sim.placed > 10);
  assert.ok(['topout', 'pieces'].includes(sim.end));
  // Tras la compactación, cada fila es una barra continua desde la izquierda
  const s = GameModes.create('tetris', grid);
  for (let i = 0; i < GameModes.COMPACT_TICK; i++) GameModes.step(s);
  for (let y = 0; y < 7; y++) {
    const row = s.board.map(col => col[y] > 0);
    const first = row.indexOf(false);
    assert.ok(first === -1 || row.slice(first).every(v => !v), `fila ${y} con huecos`);
  }
  // Ninguna pieza ocupa una celda ya llena, y cada una llega más a la izquierda de donde entra
  const occupied = new Set();
  const start = GameModes.create('tetris', grid);
  for (let i = 0; i < GameModes.COMPACT_TICK; i++) GameModes.step(start);
  start.board.forEach((col, x) => col.forEach((v, y) => { if (v) occupied.add(`${x}_${y}`); }));
  for (const p of sim.pieces) {
    assert.ok(p.landX <= p.spawnX);
    for (const [dx, dy] of p.cells) {
      const key = `${p.landX + dx}_${p.y + dy}`;
      assert.ok(!occupied.has(key), `pieza encima de ${key}`);
      occupied.add(key);
    }
  }
  // Las semanas completas que cuenta son columnas llenas
  const full = [...Array(53).keys()].filter(x => [...Array(7).keys()].every(y => occupied.has(`${x}_${y}`)));
  assert.strictEqual(full.length, sim.lines);
});

test('interfaz común: create, step y view en los cuatro modos, también con controles del jugador', () => {
  const grid = SnakeCore.weeksToGrid(fixtureWeeks(0));
  for (const mode of GameModes.MODES) {
    const s = GameModes.create(mode, grid, { player: true });
    for (let i = 0; i < 40 && !s.done; i++) GameModes.step(s, null);
    const v = GameModes.view(s);
    assert.strictEqual(v.levels.length, 53, mode);
    assert.ok(v.progress >= 0 && v.progress <= 1, mode);
    assert.ok(Array.isArray(v.actors), mode);
  }
  assert.throws(() => GameModes.create('pong', grid), /desconocido/);

  // Pac-Man del jugador sigue la última dirección pedida
  const pac = GameModes.create('pacman', grid, { player: true });
  GameModes.step(pac, { dir: 1 });
  GameModes.step(pac, null);
  assert.deepStrictEqual({ x: pac.pac.x, y: pac.pac.y }, { x: 0, y: 5 });

  // Invasores: la nave se mueve y dispara a petición
  const inv = GameModes.create('invaders', grid, { player: true });
  GameModes.step(inv, { move: -1, fire: true });
  assert.strictEqual(inv.ship, 25);
  assert.strictEqual(inv.shots.length, 1);

  // Tetris: la pieza del jugador cambia de fila y cae al pedirlo
  const tet = GameModes.create('tetris', grid, { player: true });
  while (!tet.active) GameModes.step(tet);
  const y0 = tet.active.y;
  GameModes.step(tet, { dy: 1 });
  assert.strictEqual(tet.active ? tet.active.y : y0 + 1, y0 + 1);
  GameModes.step(tet, { drop: true });
  assert.strictEqual(tet.placed, 1);

  // Juego de la vida: un clic enciende una celda sin avanzar de generación
  const life = GameModes.create('life', gridOf([]));
  GameModes.step(life, { toggle: [3, 3] });
  assert.strictEqual(life.alive[3][3], true);
  assert.strictEqual(life.gens, 0);
});

test('con gráficos muy intensos la serpiente y los juegos siguen dentro del presupuesto de peso', () => {
  // Todas las celdas activas: solo nivel 4, solo nivel 1 y mezclado
  for (const pick of [() => 4, () => 1, (x, y) => 1 + ((x * 7 + y * 3) % 4)]) {
    const cells = [];
    for (let x = 0; x < 53; x++) for (let y = 0; y < 7; y++) cells.push([x, y, pick(x, y)]);
    const grid = gridOf(cells);
    for (const morph of SnakeCore.OPTION_VALUES.morph) {
      const svg = exporter.buildAnimatedSvg(gridOf(cells), { morph, user: 'a-very-long-username-39' });
      assert.ok(svg.length < 120 * 1024, `serpiente ${morph} pesa ${svg.length} bytes`);
      assert.ok(svg.includes('100% DEVOURED'), 'aunque muerda de dos en dos, se come el gráfico entero');
    }
    for (const game of ['life', 'pacman', 'invaders', 'tetris']) {
      const svg = exporter.buildSvg(grid, { game, user: 'a-very-long-username-39' });
      assert.ok(svg.length < 120 * 1024, `${game} pesa ${svg.length} bytes`);
    }
  }
});
