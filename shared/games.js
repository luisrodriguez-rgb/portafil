/**
 * Modos de juego sobre el gráfico de contribuciones (?game=life | pacman).
 *
 * Interfaz común: cada modo es una simulación determinista que devuelve una línea de tiempo
 *   { steps, cellChanges: { 'x_y': [[paso, nivel], ...] }, actors, progress: [[paso, fracción]], ... }
 * y el marco común la convierte en un SVG animado solo con CSS: misma cabecera, rejilla, barra de progreso
 * y medidas que la serpiente, así que todos los modos se ven como parte del mismo perfil.
 * Sin JavaScript en el SVG: GitHub lo eliminaría. Script plano (sin import/export), como el resto del motor.
 */

const GameModes = {
  COLS: 53,
  ROWS: 7,
  // Presupuesto de cambios de celda por SVG: mantiene cada modo en el rango de peso de la serpiente (45-120 KB)
  MAX_CELL_CHANGES: 3600,

  TEXT: {
    en: {
      life: 'game of life', generations: (n) => `${n} generations`,
      pacman: 'pac-man', pts: 'pts', lives: 'lives'
    },
    es: {
      life: 'juego de la vida', generations: (n) => `${n} generaciones`,
      pacman: 'pac-man', pts: 'pts', lives: 'vidas'
    }
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
  frame({ grid, tokens, title, credit, steps, stepDuration, pauseDuration, cellChanges, restoreWave, progress, body = '', css = '' }) {
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
      + `${header}<g>${cells}</g>${typeof body === 'function' ? body(t) : body}</svg>`;
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
   * colorean por edad (recién nacidas tenues, veteranas intensas). Para al extinguirse, al repetir un
   * estado (estable u oscilante), a las maxGens generaciones o al agotar el presupuesto de peso.
   */
  simulateLife(grid, { maxGens = 60, minGens = 30, budget = this.MAX_CELL_CHANGES } = {}) {
    const W = this.COLS;
    const H = this.ROWS;
    let alive = this.levelsOf(grid).map(col => col.map(level => level > 0));
    let age = alive.map(col => col.map(() => 0));
    const shown = this.levelsOf(grid);
    const cellChanges = {};
    const population = [alive.flat().filter(Boolean).length];
    const seen = new Map([[alive.flat().map(Number).join(''), 0]]);
    let used = 0;
    let gens = 0;
    let end = 'limit';

    for (let g = 1; g <= maxGens; g++) {
      const next = [];
      const nextAge = [];
      for (let x = 0; x < W; x++) {
        next.push([]);
        nextAge.push([]);
        for (let y = 0; y < H; y++) {
          let n = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if ((dx || dy) && alive[(x + dx + W) % W][(y + dy + H) % H]) n++;
            }
          }
          const lives = alive[x][y] ? n === 2 || n === 3 : n === 3;
          next[x].push(lives);
          nextAge[x].push(lives ? (alive[x][y] ? age[x][y] + 1 : 0) : 0);
        }
      }

      // Cambios visibles de esta generación; si no caben en el presupuesto, se para antes
      const genChanges = [];
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          const level = next[x][y] ? Math.min(4, 2 + nextAge[x][y]) : 0;
          if (level !== shown[x][y]) genChanges.push([x, y, level]);
        }
      }
      if (used + genChanges.length > budget) break;
      for (const [x, y, level] of genChanges) {
        (cellChanges[`${x}_${y}`] = cellChanges[`${x}_${y}`] || []).push([g, level]);
        shown[x][y] = level;
      }
      used += genChanges.length;
      alive = next;
      age = nextAge;
      gens = g;
      const count = alive.flat().filter(Boolean).length;
      population.push(count);
      if (count === 0) { end = 'extinct'; break; }
      const sig = alive.flat().map(Number).join('');
      // Estable: ya no cambia nada. Oscilante: se deja latir hasta minGens, que es lo vistoso
      if (seen.has(sig)) {
        end = seen.get(sig) === g - 1 ? 'stable' : 'cycle';
        if (end === 'stable' || g >= minGens) break;
      }
      seen.set(sig, g);
    }

    return { steps: Math.max(1, gens), generations: gens, cellChanges, population, end, changes: used };
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
  simulatePacman(grid, { maxTicks = 480, lives = 3 } = {}) {
    const W = this.COLS;
    const H = this.ROWS;
    const levels = this.levelsOf(grid);
    const food = levels.map(col => col.slice());
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
    const total = remaining;

    const pacStart = { x: 0, y: 3 };
    const ghostStarts = [{ x: W - 1, y: 0 }, { x: W - 1, y: H - 1 }];
    let pac = { ...pacStart };
    let dir = 0;
    let ghosts = ghostStarts.map(p => ({ ...p, scaredUntil: -1, dir: 2 }));
    let score = 0;

    const pacPath = [{ ...pac, dir }];
    const ghostPaths = ghosts.map(g => [{ x: g.x, y: g.y }]);
    const scared = ghosts.map(() => []); // [inicio, fin] de cada susto por fantasma
    const cellChanges = {};
    const progress = [];
    const lifeLost = [];
    const scores = [0];
    let tick = 0;

    const same = (a, b) => a.x === b.x && a.y === b.y;
    const isScared = (g) => g.scaredUntil >= tick;

    while (tick < maxTicks && remaining > 0 && lives > 0) {
      tick++;
      const danger = (x, y) => ghosts.some(g => !isScared(g) && Math.abs(g.x - x) + Math.abs(g.y - y) <= 1);
      const onGhost = (x, y) => ghosts.some(g => !isScared(g) && g.x === x && g.y === y);

      // Pac-Man: a por un fantasma asustado si está cerca; si no, a la comida más cercana lejos de los fantasmas
      let move = null;
      if (ghosts.some(isScared)) {
        const hunt = this.bfsStep(pac, (x, y) => ghosts.some(g => isScared(g) && g.x === x && g.y === y), onGhost, dir);
        if (hunt && hunt.dist <= 6) move = hunt.step;
      }
      if (!move) move = (this.bfsStep(pac, (x, y) => food[x][y] > 0, danger, dir) || this.bfsStep(pac, (x, y) => food[x][y] > 0, onGhost, dir) || {}).step;
      if (move) {
        const d = this.DIRS.findIndex(v => v.x === move.x - pac.x && v.y === move.y - pac.y);
        if (d >= 0) dir = d;
        pac = { x: move.x, y: move.y };
      }

      const here = food[pac.x][pac.y];
      if (here > 0) {
        const key = `${pac.x}_${pac.y}`;
        score += 10 * here;
        food[pac.x][pac.y] = 0;
        remaining--;
        (cellChanges[key] = cellChanges[key] || []).push([tick, 0]);
        progress.push([tick, (total - remaining) / total]);
        if (power.has(key)) {
          ghosts.forEach((g, i) => {
            g.scaredUntil = tick + 24;
            scared[i].push([tick, tick + 24]);
          });
        }
      }

      // Fantasmas: persiguen con BFS (el segundo apunta 3 casillas por delante de Pac-Man) a 2/3 de su ritmo;
      // asustados se alejan a la mitad. Nunca comparten casilla.
      ghosts.forEach((g, i) => {
        if (isScared(g) ? tick % 2 : tick % 3 === 0) return;
        const others = (x, y) => ghosts.some((o, j) => j !== i && o.x === x && o.y === y);
        let step = null;
        if (isScared(g)) {
          let best = -1;
          for (const d of this.DIRS) {
            const n = { x: g.x + d.x, y: g.y + d.y };
            if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H || others(n.x, n.y)) continue;
            const far = Math.abs(n.x - pac.x) + Math.abs(n.y - pac.y);
            if (far > best) { best = far; step = n; }
          }
        } else {
          const ahead = this.DIRS[dir];
          const target = i === 0 ? pac : {
            x: Math.max(0, Math.min(W - 1, pac.x + ahead.x * 3)),
            y: Math.max(0, Math.min(H - 1, pac.y + ahead.y * 3))
          };
          const found = this.bfsStep(g, (x, y) => (x === target.x && y === target.y) || (x === pac.x && y === pac.y), others, g.dir);
          step = found && found.step;
        }
        if (step) {
          g.dir = Math.max(0, this.DIRS.findIndex(v => v.x === step.x - g.x && v.y === step.y - g.y));
          g.x = step.x;
          g.y = step.y;
        }
      });

      // Choques (también cuando se cruzan en el mismo paso)
      const before = pacPath[pacPath.length - 1];
      let caught = false;
      ghosts.forEach((g, i) => {
        const prevG = ghostPaths[i][ghostPaths[i].length - 1];
        const hit = same(g, pac) || (same(g, before) && same(prevG, pac));
        if (!hit) return;
        if (isScared(g)) {
          score += 200;
          g.x = ghostStarts[i].x;
          g.y = ghostStarts[i].y;
          g.scaredUntil = -1;
          const last = scared[i][scared[i].length - 1];
          if (last) last[1] = tick;
        } else {
          caught = true;
        }
      });
      if (caught) {
        lives--;
        lifeLost.push(tick);
        pac = { ...pacStart };
        dir = 0;
        ghosts = ghostStarts.map(p => ({ ...p, scaredUntil: -1, dir: 2 }));
        scared.forEach(list => { const last = list[list.length - 1]; if (last && last[1] > tick) last[1] = tick; });
      }

      pacPath.push({ ...pac, dir });
      ghosts.forEach((g, i) => ghostPaths[i].push({ x: g.x, y: g.y }));
      scores.push(score);
    }

    return {
      steps: Math.max(1, tick), ticks: tick, cellChanges, progress, pacPath, ghostPaths, scared, lifeLost,
      score, scores, lives, eaten: total - remaining, total, power: [...power],
      end: remaining === 0 ? 'cleared' : lives === 0 ? 'caught' : 'time'
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
  }
};

window.GameModes = GameModes;
