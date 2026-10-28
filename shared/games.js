/**
 * Modos de juego sobre el gráfico de contribuciones (?game=life | pacman | invaders | tetris).
 *
 * Interfaz común (iniciar, avanzar, dibujar):
 *   create(modo, grid, opciones) -> estado        estado.done indica el final de la partida
 *   step(estado, entrada)                          un paso; entrada null = juega la IA, o los controles del jugador
 *   view(estado) -> { levels, actors, score }      lo que hay que pintar ahora (el estudio lo dibuja en un canvas)
 * Mientras avanza, cada modo anota su línea de tiempo (cambios de celda, recorridos, progreso). Para el README,
 * la IA juega la partida entera y el marco común la convierte en un SVG animado solo con CSS, con la misma
 * cabecera, rejilla y barra que la serpiente. Sin JavaScript en el SVG: GitHub lo eliminaría.
 * Todo es determinista: el mismo gráfico da siempre la misma partida. Script plano (sin import/export).
 */

const GameModes = {
  COLS: 53,
  ROWS: 7,
  // Presupuesto de cambios de celda por SVG: mantiene cada modo en el rango de peso de la serpiente (45-120 KB)
  MAX_CELL_CHANGES: 3600,

  TEXT: {
    en: {
      life: 'game of life', generations: (n) => `${n} generations`,
      pacman: 'pac-man', pts: 'pts', lives: 'lives',
      invaders: 'invaders', hits: (n) => `${n} hits`,
      tetris: 'tetris', weeks: (n) => `${n} full ${n === 1 ? 'week' : 'weeks'}`, pieces: (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`
    },
    es: {
      life: 'juego de la vida', generations: (n) => `${n} generaciones`,
      pacman: 'pac-man', pts: 'pts', lives: 'vidas',
      invaders: 'invasores', hits: (n) => `${n} impactos`,
      tetris: 'tetris', weeks: (n) => `${n} ${n === 1 ? 'semana completa' : 'semanas completas'}`, pieces: (n) => `${n} ${n === 1 ? 'pieza' : 'piezas'}`
    }
  },

  MODES: ['life', 'pacman', 'invaders', 'tetris'],

  // ---------- Interfaz común ----------

  create(mode, grid, options = {}) {
    if (!this.MODES.includes(mode)) throw new Error(`Modo desconocido '${mode}'`);
    return this[`${mode}Create`](grid, options);
  },

  step(state, input = null) {
    if (!state.done) this[`${state.mode}Step`](state, input);
    return state;
  },

  view(state) {
    return this[`${state.mode}View`](state);
  },

  /** La IA juega la partida entera (para el SVG) */
  run(mode, grid, options) {
    const state = this.create(mode, grid, options);
    while (!state.done) this.step(state, null);
    return state;
  },

  // ---------- Marco común ----------

  /** Medidas de la serpiente (js/exporter.js): 797×160, celdas de 11 px con 3,5 px de separación */
  layout() {
    const cell = 11;
    const gap = 3.5;
    const pad = 16;
    const header = 30;
    const step = cell + gap;
    return {
      cell, pad, step,
      width: this.COLS * step + pad * 2 - gap,
      height: this.ROWS * step + pad * 2 - gap + header,
      gridTop: pad + header,
      cellX: (x) => Math.round(pad + x * step),
      cellY: (y) => Math.round(pad + header + y * step),
      toPx: (p) => `${+(pad + p.x * step).toFixed(2)}px,${+(pad + header + p.y * step).toFixed(2)}px`
    };
  },

  /** Reloj de la animación: los pasos ocupan el tramo activo y la pausa final el resto */
  timing(steps, stepDuration, pauseDuration) {
    const play = steps * stepDuration;
    const total = +(play + pauseDuration).toFixed(2);
    const active = (play / total) * 100;
    return {
      play, total,
      active: +active.toFixed(3),
      pct: (s) => +((s / steps) * active).toFixed(3),
      at: (seconds) => +((seconds / total) * 100).toFixed(3)
    };
  },

  escapeXml(text) {
    return String(text).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
  },

  fmt(n, lang) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'es' ? '.' : ',');
  },

  /**
   * Keyframes de traslación de un actor: solo giros, paradas y saltos (la animación lineal rellena lo demás).
   * Un salto (reaparecer en otro sitio) se hace en una milésima de porcentaje para que no cruce el tablero.
   */
  pathFrames(path, t, toPx) {
    const jump = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1;
    const last = path.length - 1;
    let frames = '';
    for (let s = 0; s <= last; s++) {
      const p = path[s];
      const prev = path[s - 1];
      const next = path[s + 1];
      if (prev && jump(prev, p)) frames += `${+(t.pct(s - 1) + 0.001).toFixed(3)}%{transform:translate(${toPx(p)})}`;
      const turn = prev && next && ((p.x - prev.x) !== (next.x - p.x) || (p.y - prev.y) !== (next.y - p.y));
      if (s === 0 || s === last || turn || (next && jump(p, next))) frames += `${t.pct(s)}%{transform:translate(${toPx(p)})}`;
    }
    return frames;
  },

  /**
   * SVG final de un modo. cellChanges: cambios de nivel por celda; restoreWave: al terminar, las celdas
   * vuelven a su nivel original en ola de izquierda a derecha (si no, saltan al inicio al reiniciar el bucle).
   */
  frame({ grid, tokens, title, credit, steps, stepDuration, pauseDuration, cellChanges, restoreWave, progress, body = '', css = '', gridClass = '' }) {
    const L = this.layout();
    const t = this.timing(steps, stepDuration, pauseDuration);
    const colors = [tokens.empty, tokens.l1, tokens.l2, tokens.l3, tokens.l4];
    const waveSeconds = Math.min(1, pauseDuration * 0.6);

    let cells = '';
    let cellCss = '';
    for (let x = 0; x < this.COLS; x++) {
      const restorePct = t.at(t.play + (waveSeconds * x) / (this.COLS - 1));
      for (let y = 0; y < this.ROWS; y++) {
        const c = grid[x] && grid[x][y];
        const orig = c ? c.originalLevel || 0 : 0;
        const changes = cellChanges[`${x}_${y}`];
        const attrs = `x="${L.cellX(x)}" y="${L.cellY(y)}" width="${L.cell}" height="${L.cell}" rx="2.5" fill="${colors[orig]}"`;
        if (!changes || !changes.length) {
          cells += `<rect ${attrs}/>`;
          continue;
        }
        const cls = `c${x}_${y}`;
        // Sin fotograma 0%: la animación parte del fill del atributo (el gráfico original)
        let frames = changes.map(([step, level]) => `${t.pct(step)}%{fill:${colors[level]}}`).join('');
        if (restoreWave) frames += `${Math.max(restorePct, t.pct(changes[changes.length - 1][0]) + 0.001)}%,100%{fill:${colors[orig]}}`;
        cells += `<rect class="${cls}" ${attrs}/>`;
        cellCss += `.${cls}{animation:${cls} ${t.total}s infinite steps(1,end)}@keyframes ${cls}{${frames}}`;
      }
    }

    // Barra de progreso de la cabecera, como en la serpiente
    const barW = 150;
    const barX = L.width - L.pad - barW;
    let barFrames = '0%{transform:scaleX(0)}';
    let lastFraction = 0;
    for (const [step, fraction] of progress) {
      if (fraction - lastFraction >= 0.02) {
        barFrames += `${t.pct(step)}%{transform:scaleX(${+fraction.toFixed(3)})}`;
        lastFraction = fraction;
      }
    }
    const finalFraction = progress.length ? progress[progress.length - 1][1] : 0;
    barFrames += `${t.active}%,100%{transform:scaleX(${+finalFraction.toFixed(3)})}`;

    const font = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    const header = `<text x="${L.pad}" y="${L.pad + 10}" font-family="${font}" font-size="12" font-weight="700" fill="${tokens.text}">${this.escapeXml(title)}</text>`
      + `<rect x="${barX}" y="${L.pad + 2}" width="${barW}" height="8" rx="4" fill="${tokens.empty}"/>`
      + `<rect class="pb" x="${barX}" y="${L.pad + 2}" width="${barW}" height="8" rx="4" fill="${tokens.body}"/>`;
    const headerCss = `.pb{transform-box:fill-box;transform-origin:left;animation:p ${t.total}s infinite linear}@keyframes p{${barFrames}}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}"><title>${this.escapeXml(credit)}</title>`
      + `<style>svg{background:${tokens.bg};border-radius:12px;border:1px solid ${tokens.border}}${headerCss}${cellCss}${typeof css === 'function' ? css(t) : css}</style>`
      + `${header}<g${gridClass ? ` class="${gridClass}"` : ''}>${cells}</g>${typeof body === 'function' ? body(t) : body}</svg>`;
  },

  levelsOf(grid) {
    const levels = [];
    for (let x = 0; x < this.COLS; x++) {
      const col = [];
      for (let y = 0; y < this.ROWS; y++) col.push(grid[x] && grid[x][y] ? grid[x][y].originalLevel || 0 : 0);
      levels.push(col);
    }
    return levels;
  },

  // ---------- Juego de la vida ----------

  /**
   * Conway (B3/S23) sobre un toro de 53×7 que arranca desde tus contribuciones. Las celdas vivas se
   * colorean por edad (recién nacidas tenues, veteranas intensas). Para al extinguirse, al estabilizarse,
   * a las maxGens generaciones o al agotar el presupuesto de peso; a los osciladores los deja latir hasta minGens.
   */
  lifeCreate(grid, { maxGens = 60, minGens = 30, budget = this.MAX_CELL_CHANGES } = {}) {
    const alive = this.levelsOf(grid).map(col => col.map(level => level > 0));
    return {
      mode: 'life', done: false, tick: 0, maxGens, minGens, budget,
      alive, age: alive.map(col => col.map(() => 0)), shown: this.levelsOf(grid),
      cellChanges: {}, population: [alive.flat().filter(Boolean).length],
      seen: new Map([[alive.flat().map(Number).join(''), 0]]), used: 0, gens: 0, end: 'limit'
    };
  },

  /** Una generación. En el estudio, input.toggle = [x, y] enciende o apaga una celda sin avanzar */
  lifeStep(s, input) {
    const W = this.COLS;
    const H = this.ROWS;
    if (input && input.toggle) {
      const [x, y] = input.toggle;
      s.alive[x][y] = !s.alive[x][y];
      s.age[x][y] = 0;
      s.shown[x][y] = s.alive[x][y] ? 2 : 0;
      s.seen = new Map();
      return;
    }
    const g = s.gens + 1;
    if (g > s.maxGens) { s.done = true; return; }
    const next = [];
    const nextAge = [];
    for (let x = 0; x < W; x++) {
      next.push([]);
      nextAge.push([]);
      for (let y = 0; y < H; y++) {
        let n = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if ((dx || dy) && s.alive[(x + dx + W) % W][(y + dy + H) % H]) n++;
          }
        }
        const lives = s.alive[x][y] ? n === 2 || n === 3 : n === 3;
        next[x].push(lives);
        nextAge[x].push(lives ? (s.alive[x][y] ? s.age[x][y] + 1 : 0) : 0);
      }
    }

    // Cambios visibles de esta generación; si no caben en el presupuesto, se para antes
    const genChanges = [];
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        const level = next[x][y] ? Math.min(4, 2 + nextAge[x][y]) : 0;
        if (level !== s.shown[x][y]) genChanges.push([x, y, level]);
      }
    }
    if (s.used + genChanges.length > s.budget) { s.done = true; return; }
    for (const [x, y, level] of genChanges) {
      (s.cellChanges[`${x}_${y}`] = s.cellChanges[`${x}_${y}`] || []).push([g, level]);
      s.shown[x][y] = level;
    }
    s.used += genChanges.length;
    s.alive = next;
    s.age = nextAge;
    s.gens = g;
    s.tick = g;
    const count = s.alive.flat().filter(Boolean).length;
    s.population.push(count);
    if (count === 0) { s.end = 'extinct'; s.done = true; return; }
    const sig = s.alive.flat().map(Number).join('');
    // Estable: ya no cambia nada. Oscilante: se deja latir hasta minGens, que es lo vistoso
    if (s.seen.has(sig)) {
      s.end = s.seen.get(sig) === g - 1 ? 'stable' : 'cycle';
      if (s.end === 'stable' || g >= s.minGens) { s.done = true; return; }
    }
    s.seen.set(sig, g);
  },

  lifeView(s) {
    return { levels: s.shown, actors: [], score: s.gens, progress: Math.min(1, s.gens / Math.max(1, s.minGens)) };
  },

  simulateLife(grid, options) {
    const s = this.run('life', grid, options);
    return { steps: Math.max(1, s.gens), generations: s.gens, cellChanges: s.cellChanges, population: s.population, end: s.end, changes: s.used };
  },

  buildLifeSvg(grid, options = {}) {
    const tokens = ThemeTokens.get(options.theme);
    const lang = options.lang === 'es' ? 'es' : 'en';
    const T = this.TEXT[lang];
    const sim = this.simulateLife(grid);
    const user = options.user ? String(options.user) : '';
    const progress = [];
    for (let g = 1; g <= sim.generations; g++) progress.push([g, g / sim.generations]);
    return this.frame({
      grid, tokens,
      title: [user ? `@${user}` : '', T.life, T.generations(sim.generations)].filter(Boolean).join(' · '),
      credit: `game of life from ${user ? `@${user}` : 'a GitHub'} contributions by Perfila`,
      // Las partidas cortas (se estabiliza enseguida) van más despacio para que se puedan seguir
      steps: sim.steps, stepDuration: sim.generations < 12 ? 0.8 : 0.4, pauseDuration: 2.5,
      cellChanges: sim.cellChanges, restoreWave: false, progress
    });
  },

  // ---------- Pac-Man ----------

  DIRS: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }],

  /**
   * BFS en la rejilla (sin paredes; los bordes no se cruzan). blocked(x, y) excluye celdas; devuelve el primer paso
   * o null. En cada nodo prueba primero la dirección con la que llegó: entre caminos igual de cortos elige el más
   * recto, que se ve más natural y necesita menos fotogramas (cada giro es un keyframe).
   */
  bfsStep(from, isGoal, blocked, firstDir = 0) {
    const W = this.COLS;
    const H = this.ROWS;
    const key = (p) => p.y * W + p.x;
    const prev = new Map([[key(from), null]]);
    const dirIn = new Map([[key(from), firstDir]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      if (i > 0 && isGoal(cur.x, cur.y)) {
        let p = cur;
        while (prev.get(key(p)) && key(prev.get(key(p))) !== key(from)) p = prev.get(key(p));
        return { step: p, dist: this.distOf(prev, cur, from) };
      }
      const d0 = dirIn.get(key(cur));
      for (let k = 0; k < 4; k++) {
        const di = (d0 + [0, 1, 3, 2][k]) % 4;
        const d = this.DIRS[di];
        const n = { x: cur.x + d.x, y: cur.y + d.y };
        if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H || prev.has(key(n)) || blocked(n.x, n.y)) continue;
        prev.set(key(n), cur);
        dirIn.set(key(n), di);
        queue.push(n);
      }
    }
    return null;
  },

  distOf(prev, end, from) {
    const W = this.COLS;
    let d = 0;
    let p = end;
    while (p && !(p.x === from.x && p.y === from.y)) { p = prev.get(p.y * W + p.x); d++; }
    return d;
  },

  /**
   * Pac-Man recorre tu gráfico: cada contribución es comida (más puntos cuanto más intensa) y hasta cuatro
   * celdas de nivel 4 son pastillas de poder que asustan a los fantasmas. Dos fantasmas persiguen con BFS;
   * si te alcanzan pierdes una vida y todos vuelven a su sitio. Determinista: mismo gráfico, misma partida.
   */
  pacmanCreate(grid, { maxTicks = 480, lives = 3, player = false } = {}) {
    const W = this.COLS;
    const H = this.ROWS;
    const food = this.levelsOf(grid);
    let remaining = 0;
    const fours = [];
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        if (food[x][y] > 0) remaining++;
        if (food[x][y] === 4) fours.push({ x, y });
      }
    }
    // Pastillas repartidas a lo largo del año: los cuartiles de las celdas de nivel 4
    const power = new Set();
    if (fours.length) for (let i = 0; i < Math.min(4, fours.length); i++) {
      const p = fours[Math.floor(((i + 0.5) * fours.length) / Math.min(4, fours.length))];
      power.add(`${p.x}_${p.y}`);
    }
    const pacStart = { x: 0, y: 3 };
    const ghostStarts = [{ x: W - 1, y: 0 }, { x: W - 1, y: H - 1 }];
    return {
      mode: 'pacman', done: false, tick: 0, maxTicks, lives, player,
      food, remaining, total: remaining, power, pacStart, ghostStarts,
      pac: { ...pacStart }, dir: 0, wantDir: 0,
      ghosts: ghostStarts.map(p => ({ ...p, scaredUntil: -1, dir: 2 })),
      score: 0,
      pacPath: [{ ...pacStart, dir: 0 }],
      ghostPaths: ghostStarts.map(p => [{ x: p.x, y: p.y }]),
      scared: ghostStarts.map(() => []), // [inicio, fin] de cada susto por fantasma
      cellChanges: {}, progress: [], lifeLost: [], scores: [0]
    };
  },

  /** Un paso. Con player, input.dir (0 derecha, 1 abajo, 2 izquierda, 3 arriba) gira a Pac-Man; si no, juega la IA */
  pacmanStep(s, input) {
    if (!(s.tick < s.maxTicks && s.remaining > 0 && s.lives > 0)) { s.done = true; return; }
    const W = this.COLS;
    const H = this.ROWS;
    const tick = ++s.tick;
    const same = (a, b) => a.x === b.x && a.y === b.y;
    const isScared = (g) => g.scaredUntil >= tick;
    const danger = (x, y) => s.ghosts.some(g => !isScared(g) && Math.abs(g.x - x) + Math.abs(g.y - y) <= 1);
    const onGhost = (x, y) => s.ghosts.some(g => !isScared(g) && g.x === x && g.y === y);

    let move = null;
    if (s.player) {
      // Sigue recto en la última dirección pedida, como en la máquina
      if (input && input.dir !== undefined) s.wantDir = input.dir;
      const d = this.DIRS[s.wantDir];
      const n = { x: s.pac.x + d.x, y: s.pac.y + d.y };
      if (n.x >= 0 && n.y >= 0 && n.x < W && n.y < H) move = n;
      s.dir = s.wantDir;
    } else {
      // Pac-Man: a por un fantasma asustado si está cerca; si no, a la comida más cercana lejos de los fantasmas
      if (s.ghosts.some(isScared)) {
        const hunt = this.bfsStep(s.pac, (x, y) => s.ghosts.some(g => isScared(g) && g.x === x && g.y === y), onGhost, s.dir);
        if (hunt && hunt.dist <= 6) move = hunt.step;
      }
      if (!move) move = (this.bfsStep(s.pac, (x, y) => s.food[x][y] > 0, danger, s.dir) || this.bfsStep(s.pac, (x, y) => s.food[x][y] > 0, onGhost, s.dir) || {}).step;
    }
    if (move) {
      const d = this.DIRS.findIndex(v => v.x === move.x - s.pac.x && v.y === move.y - s.pac.y);
      if (d >= 0) s.dir = d;
      s.pac = { x: move.x, y: move.y };
    }

    const here = s.food[s.pac.x][s.pac.y];
    if (here > 0) {
      const key = `${s.pac.x}_${s.pac.y}`;
      s.score += 10 * here;
      s.food[s.pac.x][s.pac.y] = 0;
      s.remaining--;
      (s.cellChanges[key] = s.cellChanges[key] || []).push([tick, 0]);
      s.progress.push([tick, (s.total - s.remaining) / s.total]);
      if (s.power.has(key)) {
        s.ghosts.forEach((g, i) => {
          g.scaredUntil = tick + 24;
          s.scared[i].push([tick, tick + 24]);
        });
      }
    }

    // Fantasmas: persiguen con BFS (el segundo apunta 3 casillas por delante de Pac-Man) a 2/3 de su ritmo;
    // asustados se alejan a la mitad. Nunca comparten casilla.
    s.ghosts.forEach((g, i) => {
      if (isScared(g) ? tick % 2 : tick % 3 === 0) return;
      const others = (x, y) => s.ghosts.some((o, j) => j !== i && o.x === x && o.y === y);
      let step = null;
      if (isScared(g)) {
        let best = -1;
        for (const d of this.DIRS) {
          const n = { x: g.x + d.x, y: g.y + d.y };
          if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H || others(n.x, n.y)) continue;
          const far = Math.abs(n.x - s.pac.x) + Math.abs(n.y - s.pac.y);
          if (far > best) { best = far; step = n; }
        }
      } else {
        const ahead = this.DIRS[s.dir];
        const target = i === 0 ? s.pac : {
          x: Math.max(0, Math.min(W - 1, s.pac.x + ahead.x * 3)),
          y: Math.max(0, Math.min(H - 1, s.pac.y + ahead.y * 3))
        };
        const found = this.bfsStep(g, (x, y) => (x === target.x && y === target.y) || (x === s.pac.x && y === s.pac.y), others, g.dir);
        step = found && found.step;
      }
      if (step) {
        g.dir = Math.max(0, this.DIRS.findIndex(v => v.x === step.x - g.x && v.y === step.y - g.y));
        g.x = step.x;
        g.y = step.y;
      }
    });

    // Choques (también cuando se cruzan en el mismo paso)
    const before = s.pacPath[s.pacPath.length - 1];
    let caught = false;
    s.ghosts.forEach((g, i) => {
      const prevG = s.ghostPaths[i][s.ghostPaths[i].length - 1];
      const hit = same(g, s.pac) || (same(g, before) && same(prevG, s.pac));
      if (!hit) return;
      if (isScared(g)) {
        s.score += 200;
        g.x = s.ghostStarts[i].x;
        g.y = s.ghostStarts[i].y;
        g.scaredUntil = -1;
        const last = s.scared[i][s.scared[i].length - 1];
        if (last) last[1] = tick;
      } else {
        caught = true;
      }
    });
    if (caught) {
      s.lives--;
      s.lifeLost.push(tick);
      s.pac = { ...s.pacStart };
      s.dir = 0;
      s.wantDir = 0;
      s.ghosts = s.ghostStarts.map(p => ({ ...p, scaredUntil: -1, dir: 2 }));
      s.scared.forEach(list => { const last = list[list.length - 1]; if (last && last[1] > tick) last[1] = tick; });
    }

    s.pacPath.push({ ...s.pac, dir: s.dir });
    s.ghosts.forEach((g, i) => s.ghostPaths[i].push({ x: g.x, y: g.y }));
    s.scores.push(s.score);
  },

  pacmanView(s) {
    return {
      levels: s.food,
      actors: [
        { kind: 'pac', x: s.pac.x, y: s.pac.y, dir: s.dir },
        ...s.ghosts.map(g => ({ kind: 'ghost', x: g.x, y: g.y, scared: g.scaredUntil >= s.tick }))
      ],
      score: s.score, lives: s.lives, progress: (s.total - s.remaining) / Math.max(1, s.total)
    };
  },

  simulatePacman(grid, options) {
    const s = this.run('pacman', grid, options);
    return {
      steps: Math.max(1, s.tick), ticks: s.tick, cellChanges: s.cellChanges, progress: s.progress,
      pacPath: s.pacPath, ghostPaths: s.ghostPaths, scared: s.scared, lifeLost: s.lifeLost,
      score: s.score, scores: s.scores, lives: s.lives, eaten: s.total - s.remaining, total: s.total, power: [...s.power],
      end: s.remaining === 0 ? 'cleared' : s.lives === 0 ? 'caught' : 'time'
    };
  },

  buildPacmanSvg(grid, options = {}) {
    const tokens = ThemeTokens.get(options.theme);
    const lang = options.lang === 'es' ? 'es' : 'en';
    const T = this.TEXT[lang];
    const sim = this.simulatePacman(grid);
    const L = this.layout();
    const user = options.user ? String(options.user) : '';
    // En los temas neutros el cuerpo y la cabeza casi no se distinguen: los fantasmas usan la rampa de celdas
    const neutral = ['ink', 'paper'].includes(options.theme || 'ink');
    const ghostColors = neutral ? [tokens.l3, tokens.l3] : [tokens.head, tokens.head];
    const scaredColor = neutral ? tokens.l1 : tokens.muted;

    const css = (t) => {
      // Pac-Man: posición, orientación (rotar hacia donde va) y boca que se abre y cierra
      let out = `.pm{animation:pm ${t.total}s infinite linear}@keyframes pm{${this.pathFrames(sim.pacPath, t, L.toPx)}}`;
      let angle = sim.pacPath[0].dir * 90;
      let rot = `0%{rotate:${angle}deg}`;
      sim.pacPath.forEach((p, s) => {
        if (s > 0 && p.dir * 90 !== angle) {
          angle = p.dir * 90;
          rot += `${t.pct(s - 1)}%{rotate:${angle}deg}`;
        }
      });
      out += `.pr{transform-box:view-box;transform-origin:5.5px 5.5px;animation:pr ${t.total}s infinite steps(1,end)}@keyframes pr{${rot}}`;
      out += '.ju,.jd{transform-box:view-box;transform-origin:5.5px 5.5px;animation:ju .28s infinite alternate ease-in-out}.jd{animation-name:jd}'
        + '@keyframes ju{from{rotate:-38deg}to{rotate:0deg}}@keyframes jd{from{rotate:38deg}to{rotate:0deg}}';
      // Fantasmas: posición y color cuando están asustados
      sim.ghostPaths.forEach((path, i) => {
        out += `.g${i}{animation:g${i} ${t.total}s infinite linear}@keyframes g${i}{${this.pathFrames(path, t, L.toPx)}}`;
        if (sim.scared[i].length) {
          let frames = '';
          for (const [from, to] of sim.scared[i]) frames += `${t.pct(from)}%{fill:${scaredColor}}${t.pct(to)}%{fill:${ghostColors[i]}}`;
          out += `.gb${i}{animation:gb${i} ${t.total}s infinite steps(1,end)}@keyframes gb${i}{${frames}}`;
        }
      });
      // Vidas: se apagan al perderlas y vuelven en la pausa
      sim.lifeLost.forEach((tick, i) => {
        out += `.lv${i}{animation:lv${i} ${t.total}s infinite steps(1,end)}@keyframes lv${i}{${t.pct(tick)}%{opacity:.15}${t.active}%,100%{opacity:1}}`;
      });
      // En la pausa final los actores se desvanecen y vuelven a la salida
      out += `.ac{animation:ac ${t.total}s infinite linear}@keyframes ac{0%,${t.active}%{opacity:1}${t.at(t.play + 0.3)}%,99.9%{opacity:0}100%{opacity:1}}`;
      out += '@media (prefers-reduced-motion:reduce){.ju,.jd{animation:none}}';
      return out;
    };

    const ghost = (i) => `<g class="g${i}"><path class="gb${i}" d="M0 11V5.5a5.5 5.5 0 0 1 11 0V11l-1.85-1.6-1.85 1.6-1.8-1.6-1.8 1.6-1.85-1.6z" fill="${ghostColors[i]}"/>`
      + `<circle cx="3.7" cy="5" r="1.7" fill="#fff"/><circle cx="7.3" cy="5" r="1.7" fill="#fff"/><circle cx="4.1" cy="5.2" r=".8" fill="#111"/><circle cx="7.7" cy="5.2" r=".8" fill="#111"/></g>`;
    const pacman = `<g class="pm"><g class="pr"><path class="ju" d="M5.5 5.5H12A6.5 6.5 0 0 0 -1 5.5z" fill="${tokens.body}"/><path class="jd" d="M5.5 5.5H12A6.5 6.5 0 0 1 -1 5.5z" fill="${tokens.body}"/></g></g>`;
    // Vidas junto a la barra de progreso
    const barX = L.width - L.pad - 150;
    let lives = '';
    for (let i = 0; i < 3; i++) lives += `<circle class="lv${2 - i}" cx="${barX - 14 - i * 12}" cy="${L.pad + 6}" r="4" fill="${tokens.body}"/>`;

    return this.frame({
      grid, tokens,
      title: [user ? `@${user}` : '', T.pacman, `${this.fmt(sim.score, lang)} ${T.pts}`].filter(Boolean).join(' · '),
      credit: `pac-man eating ${user ? `@${user}` : 'a GitHub'} contributions by Perfila`,
      steps: sim.steps, stepDuration: 0.1, pauseDuration: 2,
      cellChanges: sim.cellChanges, restoreWave: true, progress: sim.progress,
      css,
      body: `${lives}<g class="ac">${ghost(0)}${ghost(1)}${pacman}</g>`
    });
  },

  // ---------- Invasores ----------

  /**
   * Space Invaders: tus contribuciones son la formación enemiga y una nave recorre el borde inferior
   * disparando a la celda viva más baja de cada columna. Cada impacto quita dos niveles, así que las
   * celdas intensas aguantan dos disparos. La IA va a la columna viva más cercana descontando las balas en vuelo.
   */
  invadersCreate(grid, { maxTicks = 700, player = false } = {}) {
    const hp = this.levelsOf(grid);
    let total = 0;
    hp.forEach(col => col.forEach(v => { total += v; }));
    const start = Math.floor(this.COLS / 2);
    return {
      mode: 'invaders', done: false, tick: 0, maxTicks, player,
      hp, total, left: total, hits: 0, ship: start, cooldown: 0, bullets: [],
      shipPath: [{ x: start, y: 0 }], shots: [], cellChanges: {}, progress: []
    };
  },

  /** Un paso. Con player, input.move (-1 / 1) mueve la nave e input.fire dispara; si no, juega la IA */
  invadersStep(s, input) {
    if (s.left <= 0 || s.tick >= s.maxTicks) {
      for (const b of s.bullets) { b.shot.end = s.tick; b.shot.endY = -1; }
      s.bullets = [];
      s.done = true;
      return;
    }
    const W = this.COLS;
    const tick = ++s.tick;

    // Balas: suben tres filas por paso y golpean la celda viva más baja de su columna
    for (const b of s.bullets) {
      const col = s.hp[b.x];
      let row = -1;
      for (let y = this.ROWS - 1; y >= 0; y--) if (col[y] > 0) { row = y; break; }
      const ny = b.y - 3;
      if (row >= 0 && ny <= row) {
        const dmg = Math.min(2, col[row]);
        col[row] -= dmg;
        s.left -= dmg;
        s.hits++;
        const key = `${b.x}_${row}`;
        (s.cellChanges[key] = s.cellChanges[key] || []).push([tick, col[row]]);
        s.progress.push([tick, (s.total - s.left) / s.total]);
        Object.assign(b.shot, { end: tick, endY: row, hit: true });
        b.dead = true;
      } else if (ny < -1) {
        Object.assign(b.shot, { end: tick, endY: -1 });
        b.dead = true;
      } else {
        b.y = ny;
      }
    }
    s.bullets = s.bullets.filter(b => !b.dead);

    let move = 0;
    let fire = false;
    if (s.player) {
      move = (input && input.move) || 0;
      fire = Boolean(input && input.fire);
    } else {
      let target = -1;
      let best = Infinity;
      for (let x = 0; x < W; x++) {
        const pending = s.bullets.filter(b => b.x === x).length * 2;
        const life = s.hp[x].reduce((sum, v) => sum + v, 0);
        if (life - pending > 0 && Math.abs(x - s.ship) < best) {
          best = Math.abs(x - s.ship);
          target = x;
        }
      }
      if (target >= 0) {
        if (target !== s.ship) move = Math.sign(target - s.ship);
        else fire = true;
      }
    }
    s.ship = Math.max(0, Math.min(W - 1, s.ship + move));
    if (fire && s.cooldown <= 0) {
      const shot = { x: s.ship, fire: tick, end: null, endY: null, hit: false };
      s.shots.push(shot);
      s.bullets.push({ x: s.ship, y: this.ROWS + 0.5, shot });
      s.cooldown = 1;
    }
    s.cooldown--;
    s.shipPath.push({ x: s.ship, y: 0 });
  },

  invadersView(s) {
    return {
      levels: s.hp,
      actors: [{ kind: 'ship', x: s.ship, y: this.ROWS }, ...s.bullets.map(b => ({ kind: 'bullet', x: b.x, y: b.y }))],
      score: s.hits, progress: (s.total - s.left) / Math.max(1, s.total)
    };
  },

  simulateInvaders(grid, options) {
    const s = this.run('invaders', grid, options);
    return {
      steps: Math.max(1, s.tick), ticks: s.tick, cellChanges: s.cellChanges, progress: s.progress,
      shipPath: s.shipPath, shots: s.shots, hits: s.hits, cleared: s.left <= 0
    };
  },

  buildInvadersSvg(grid, options = {}) {
    const tokens = ThemeTokens.get(options.theme);
    const lang = options.lang === 'es' ? 'es' : 'en';
    const T = this.TEXT[lang];
    const sim = this.simulateInvaders(grid);
    const L = this.layout();
    const user = options.user ? String(options.user) : '';
    const shipY = L.gridTop + this.ROWS * L.step - 2;
    const shipPx = (p) => `${+(L.pad + p.x * L.step).toFixed(2)}px,${shipY}px`;

    // Balas: un grupo pequeño de elementos que se reutilizan por turnos (como las ondas de la serpiente)
    const pool = [];
    for (const shot of sim.shots) {
      const end = shot.end == null ? sim.ticks : shot.end;
      let slot = pool.findIndex(list => list[list.length - 1].endTick < shot.fire);
      if (slot < 0) { pool.push([]); slot = pool.length - 1; }
      pool[slot].push({ ...shot, endTick: end });
    }
    const css = (t) => {
      let out = `.sh{animation:sh ${t.total}s infinite linear}@keyframes sh{${this.pathFrames(sim.shipPath, t, shipPx)}}`;
      pool.forEach((shots, i) => {
        let frames = '0%{opacity:0}';
        for (const shot of shots) {
          const bx = +(L.pad + shot.x * L.step + 4.5).toFixed(2);
          const by = shot.endY >= 0 ? L.gridTop + shot.endY * L.step + 6 : L.gridTop - 12;
          const from = t.pct(shot.fire - 1);
          frames += `${Math.max(0, +(from - 0.001).toFixed(3))}%{transform:translate(${bx}px,${shipY - 4}px);opacity:0}${from}%{opacity:1}`
            + `${t.pct(shot.endTick)}%{transform:translate(${bx}px,${by}px);opacity:1}${+(t.pct(shot.endTick) + 0.001).toFixed(3)}%{opacity:0}`;
        }
        out += `.b${i}{animation:b${i} ${t.total}s infinite linear}@keyframes b${i}{${frames}}`;
      });
      // La formación marcha de lado a lado, a saltos
      out += '.sw{animation:sw 1.4s infinite steps(1,end)}@keyframes sw{0%{transform:translateX(-2px)}50%{transform:translateX(2px)}}';
      out += `.ac{animation:ac ${t.total}s infinite linear}@keyframes ac{0%,${t.active}%{opacity:1}${t.at(t.play + 0.3)}%,99.9%{opacity:0}100%{opacity:1}}`;
      out += '@media (prefers-reduced-motion:reduce){.sw{animation:none}}';
      return out;
    };
    const ship = `<path class="sh" d="M0 8V5h2V3.5h3V0h1v3.5h3V5h2v3z" fill="${tokens.body}"/>`;
    const bullets = pool.map((_, i) => `<rect class="b${i}" width="2" height="5" rx="1" fill="${tokens.head}" opacity="0"/>`).join('');

    return this.frame({
      grid, tokens,
      title: [user ? `@${user}` : '', T.invaders, T.hits(this.fmt(sim.hits, lang))].filter(Boolean).join(' · '),
      credit: `invaders on ${user ? `@${user}` : 'a GitHub'} contributions by Perfila`,
      steps: sim.steps, stepDuration: 0.08, pauseDuration: 2,
      cellChanges: sim.cellChanges, restoreWave: true, progress: sim.progress,
      gridClass: 'sw', css, body: `<g class="ac">${ship}${bullets}</g>`
    });
  },

  // ---------- Tetris ----------

  // Piezas en coordenadas (x, y); en el tablero la gravedad tira hacia la izquierda, hacia el pasado
  TETROMINOES: {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  },
  PIECE_LEVEL: { I: 4, O: 3, T: 4, S: 3, Z: 3, J: 2, L: 2 },
  COMPACT_TICK: 3,

  /** Rotaciones distintas de una pieza, normalizadas a su esquina */
  rotations(cells) {
    const out = [];
    let cur = cells;
    for (let r = 0; r < 4; r++) {
      const minX = Math.min(...cur.map(c => c[0]));
      const minY = Math.min(...cur.map(c => c[1]));
      const norm = cur.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const key = norm.join(';');
      if (!out.some(o => o.key === key)) {
        out.push({ cells: norm, key, w: 1 + Math.max(...norm.map(c => c[0])), h: 1 + Math.max(...norm.map(c => c[1])) });
      }
      cur = cur.map(([x, y]) => [-y, x]);
    }
    return out;
  },

  /** Generador pseudoaleatorio determinista (mulberry32) */
  rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  tetrisFits(board, rot, x, y) {
    return rot.cells.every(([dx, dy]) => {
      const cx = x + dx;
      const cy = y + dy;
      return cx >= 0 && cy >= 0 && cx < this.COLS && cy < this.ROWS && board[cx][cy] === 0;
    });
  },

  /**
   * La IA elige rotación y fila: la pieza entra por la derecha (hoy) y se desliza hasta chocar.
   * Gana la que llega más lejos hacia el pasado dejando menos huecos detrás.
   */
  tetrisBest(board, rots) {
    const rowEnd = [];
    for (let y = 0; y < this.ROWS; y++) {
      let end = 0;
      for (let x = 0; x < this.COLS; x++) if (board[x][y]) end = x + 1;
      rowEnd.push(end);
    }
    let best = null;
    rots.forEach((rot, r) => {
      for (let y = 0; y + rot.h <= this.ROWS; y++) {
        let x = this.COLS - rot.w;
        if (!this.tetrisFits(board, rot, x, y)) continue;
        while (this.tetrisFits(board, rot, x - 1, y)) x--;
        let holes = 0;
        for (let dy = 0; dy < rot.h; dy++) {
          const row = rot.cells.filter(c => c[1] === dy);
          if (row.length) holes += Math.max(0, x + Math.min(...row.map(c => c[0])) - rowEnd[y + dy]);
        }
        const score = x * 4 + holes * 3;
        if (!best || score < best.score) best = { r, y, x, score };
      }
    });
    return best;
  },

  /**
   * Tetris de lado: primero la gravedad junta tus contribuciones hacia el pasado (cada día de la semana
   * se convierte en una barra) y luego caen piezas desde hoy hacia la izquierda. Cada semana que se llena
   * de arriba abajo parpadea. Acaba cuando una pieza ya no cabe o tras maxPieces piezas.
   */
  tetrisCreate(grid, { maxPieces = 60, player = false } = {}) {
    const orig = this.levelsOf(grid);
    let seed = 7;
    for (const col of orig) for (const v of col) seed = (Math.imul(seed, 31) + v) >>> 0;
    return {
      mode: 'tetris', done: false, tick: 0, maxPieces, player,
      orig, board: orig.map(col => col.slice()), rnd: this.rng(seed), bag: [],
      active: null, spawnWait: 0, doneAt: 0, placed: 0, lines: 0, end: 'pieces',
      pieces: [], cellChanges: {}, progress: []
    };
  },

  /** Semanas completas: columnas con los siete días llenos (las que ya junta la gravedad y las que completan las piezas) */
  fullWeeks(board) {
    return board.filter(col => col.every(v => v > 0)).length;
  },

  tetrisLock(s, tick) {
    const a = s.active;
    const rot = a.rots[a.r];
    const change = (x, y, at, level) => {
      const key = `${x}_${y}`;
      (s.cellChanges[key] = s.cellChanges[key] || []).push([at, level]);
    };
    for (const [dx, dy] of rot.cells) {
      s.board[a.x + dx][a.y + dy] = a.level;
      change(a.x + dx, a.y + dy, tick, a.level);
    }
    s.pieces.push({ kind: a.kind, cells: rot.cells, level: a.level, y: a.y, spawnX: a.spawnX, spawn: a.spawn, landX: a.x, land: tick });
    // Semana que esta pieza completa: la columna parpadea dos veces
    const cols = [...new Set(rot.cells.map(c => a.x + c[0]))];
    for (const x of cols) {
      if (s.board[x].every(v => v > 0)) {
        for (let y = 0; y < this.ROWS; y++) {
          change(x, y, tick + 1, 0);
          change(x, y, tick + 2, s.board[x][y]);
          change(x, y, tick + 3, 0);
          change(x, y, tick + 4, s.board[x][y]);
        }
      }
    }
    let filled = 0;
    s.board.forEach(col => col.forEach(v => { if (v) filled++; }));
    s.progress.push([tick, filled / (this.COLS * this.ROWS)]);
    s.lines = this.fullWeeks(s.board);
    s.active = null;
    s.spawnWait = 1;
    s.placed++;
    if (s.placed >= s.maxPieces) s.doneAt = tick + 5;
  },

  /** Un paso. Con player: input.dy (-1 / 1) cambia de fila, input.rotate gira e input.drop la deja caer */
  tetrisStep(s, input) {
    const tick = ++s.tick;
    if (s.doneAt && tick >= s.doneAt) { s.done = true; return; }
    if (tick < this.COMPACT_TICK) return;
    if (tick === this.COMPACT_TICK) {
      // Gravedad hacia el pasado: en cada fila las contribuciones se juntan a la izquierda
      for (let y = 0; y < this.ROWS; y++) {
        const row = [];
        for (let x = 0; x < this.COLS; x++) if (s.orig[x][y] > 0) row.push(s.orig[x][y]);
        for (let x = 0; x < this.COLS; x++) {
          const level = row[x] || 0;
          if (level !== s.board[x][y]) {
            s.board[x][y] = level;
            (s.cellChanges[`${x}_${y}`] = s.cellChanges[`${x}_${y}`] || []).push([tick, level]);
          }
        }
      }
      s.lines = this.fullWeeks(s.board);
      s.spawnWait = 3;
      return;
    }

    if (!s.active) {
      if (s.doneAt) return;
      if (s.spawnWait > 0) { s.spawnWait--; return; }
      if (!s.bag.length) {
        s.bag = Object.keys(this.TETROMINOES);
        for (let i = s.bag.length - 1; i > 0; i--) {
          const j = Math.floor(s.rnd() * (i + 1));
          [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]];
        }
      }
      const kind = s.bag.shift();
      const rots = this.rotations(this.TETROMINOES[kind]);
      let choice = null;
      if (s.player) {
        // Entra centrada; si no cabe, prueba el resto de filas y rotaciones
        for (let r = 0; r < rots.length && !choice; r++) {
          const mid = Math.floor((this.ROWS - rots[r].h) / 2);
          const ys = [...Array(this.ROWS - rots[r].h + 1).keys()].sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid));
          for (const y of ys) if (this.tetrisFits(s.board, rots[r], this.COLS - rots[r].w, y)) { choice = { r, y }; break; }
        }
      } else {
        choice = this.tetrisBest(s.board, rots);
      }
      if (!choice) {
        s.end = 'topout';
        s.doneAt = tick + 5;
        return;
      }
      const x = this.COLS - rots[choice.r].w;
      s.active = { kind, rots, r: choice.r, y: choice.y, x, spawnX: x, spawn: tick, level: this.PIECE_LEVEL[kind] };
      return;
    }

    const a = s.active;
    const fits = (r, x, y) => this.tetrisFits(s.board, a.rots[r], x, y);
    if (s.player && input) {
      if (input.dy && fits(a.r, a.x, a.y + input.dy)) a.y += input.dy;
      if (input.rotate) {
        const r = (a.r + 1) % a.rots.length;
        for (const dy of [0, -1, 1, -2]) if (fits(r, a.x, a.y + dy)) { a.r = r; a.y += dy; break; }
      }
      if (input.drop) {
        while (fits(a.r, a.x - 1, a.y)) a.x--;
        this.tetrisLock(s, tick);
        return;
      }
    }
    // IA: dos columnas por paso. Jugador: una cada tres pasos (la gravedad del juego)
    const moves = s.player ? (tick % 3 === 0 ? 1 : 0) : 2;
    for (let k = 0; k < moves; k++) {
      if (fits(a.r, a.x - 1, a.y)) a.x--;
      else { this.tetrisLock(s, tick); return; }
    }
  },

  tetrisView(s) {
    const levels = s.board.map(col => col.slice());
    if (s.active) {
      for (const [dx, dy] of s.active.rots[s.active.r].cells) levels[s.active.x + dx][s.active.y + dy] = s.active.level;
    }
    let filled = 0;
    s.board.forEach(col => col.forEach(v => { if (v) filled++; }));
    return { levels, actors: [], score: s.lines, pieces: s.placed, progress: filled / (this.COLS * this.ROWS) };
  },

  simulateTetris(grid, options) {
    const s = this.run('tetris', grid, options);
    return {
      steps: Math.max(1, s.tick), ticks: s.tick, cellChanges: s.cellChanges, progress: s.progress,
      pieces: s.pieces, lines: s.lines, placed: s.placed, end: s.end
    };
  },

  buildTetrisSvg(grid, options = {}) {
    const tokens = ThemeTokens.get(options.theme);
    const lang = options.lang === 'es' ? 'es' : 'en';
    const T = this.TEXT[lang];
    const sim = this.simulateTetris(grid);
    const L = this.layout();
    const user = options.user ? String(options.user) : '';
    const colors = [tokens.empty, tokens.l1, tokens.l2, tokens.l3, tokens.l4];

    // Cada pieza es un grupo de cuatro celdas que solo se ve mientras se desliza; al encajar la sustituyen sus celdas
    const css = (t) => {
      let out = '';
      sim.pieces.forEach((p, i) => {
        const from = t.pct(p.spawn - 1);
        const to = t.pct(p.land);
        const at = (x) => `translate(${+(x * L.step).toFixed(2)}px,0)`;
        out += `.q${i}{animation:q${i} ${t.total}s infinite linear}@keyframes q${i}{0%,${Math.max(0, +(from - 0.001).toFixed(3))}%{transform:${at(p.spawnX)};opacity:0}`
          + `${from}%{opacity:1}${to}%{transform:${at(p.landX)};opacity:1}${+(to + 0.001).toFixed(3)}%,100%{opacity:0}}`;
      });
      return out;
    };
    const body = sim.pieces.map((p, i) => `<g class="q${i}" opacity="0">${p.cells.map(([dx, dy]) => `<rect x="${L.cellX(dx)}" y="${L.cellY(p.y + dy)}" width="${L.cell}" height="${L.cell}" rx="2.5" fill="${colors[p.level]}"/>`).join('')}</g>`).join('');

    return this.frame({
      grid, tokens,
      title: [user ? `@${user}` : '', T.tetris, T.weeks(sim.lines), T.pieces(sim.placed)].filter(Boolean).join(' · '),
      credit: `tetris on ${user ? `@${user}` : 'a GitHub'} contributions by Perfila`,
      steps: sim.steps, stepDuration: 0.06, pauseDuration: 2.5,
      cellChanges: sim.cellChanges, restoreWave: true, progress: sim.progress,
      css, body
    });
  },

  /** SVG de un modo para el README */
  buildSvg(mode, grid, options) {
    return {
      life: () => this.buildLifeSvg(grid, options),
      pacman: () => this.buildPacmanSvg(grid, options),
      invaders: () => this.buildInvadersSvg(grid, options),
      tetris: () => this.buildTetrisSvg(grid, options)
    }[mode]();
  }
};

window.GameModes = GameModes;
