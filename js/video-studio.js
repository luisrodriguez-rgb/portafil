/**
 * Video Studio: genera un MP4 listo para redes (X, LinkedIn, Reels, TikTok, Shorts) a partir de la misma
 * simulación del SVG. No graba la pantalla: dibuja cada fotograma en un canvas y lo codifica con WebCodecs (H.264),
 * así la animación sale perfecta a 30 fps y tarda menos que verla. Si el navegador no tiene WebCodecs,
 * reproduce la escena en tiempo real y la graba con MediaRecorder.
 *
 * Guion (~10 s): la serpiente ya está comiendo en el primer frame, con el usuario visible todo el clip,
 * celebración corta y llamada a la acción. Cabe en un post mudo.
 */

const VIDEO_FORMATS = {
  landscape: { width: 1280, height: 720 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 }
};

const VIDEO_TEXT = {
  en: {
    contributions: 'contributions in the last year',
    devoured: 'devoured',
    cleared: '100% DEVOURED',
    activeDays: 'active days',
    bestDay: 'best day',
    streak: 'longest streak',
    days: 'days',
    cta: 'Can your GitHub beat mine?',
    ctaSub: 'Put the snake on your profile with one line',
    wins: 'WINS',
    tie: "IT'S A TIE",
    duelCta: 'Can your GitHub beat ours?',
    duelSub: 'Challenge any profile: same AI, 60 seconds',
    games: { life: 'GAME OF LIFE', pacman: 'PAC-MAN', invaders: 'INVADERS', tetris: 'TETRIS' },
    units: { life: 'generations', pacman: 'pts', invaders: 'hits', tetris: 'full weeks' },
    ctaGame: (name) => `Put ${name} on your profile with one line`,
    year: {
      title: (y) => `Your ${y}`, contributions: (y) => `contributions in ${y}`, vs: (pct, y) => `${pct} vs ${y}`,
      upFromZero: (y) => `▲ up from 0 in ${y}`, samePeriod: 'same period last year',
      bestMonth: 'best month', bestDay: 'best day', streak: 'longest streak', project: 'project of the year', favDay: 'favorite day',
      style: 'your style', cta: 'What did your year look like?', ctaSub: 'Make yours in one minute', days: 'days', contributionsShort: 'contributions', commits: 'commits',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }
  },
  es: {
    contributions: 'contribuciones en el último año',
    devoured: 'devorado',
    cleared: '100% DEVORADO',
    activeDays: 'días activos',
    bestDay: 'mejor día',
    streak: 'racha más larga',
    days: 'días',
    cta: '¿Tu GitHub le gana al mío?',
    ctaSub: 'Pon la serpiente en tu perfil con una línea',
    wins: 'GANA',
    tie: 'EMPATE',
    duelCta: '¿Tu GitHub nos gana?',
    duelSub: 'Reta a cualquier perfil: misma IA, 60 segundos',
    games: { life: 'JUEGO DE LA VIDA', pacman: 'PAC-MAN', invaders: 'INVASORES', tetris: 'TETRIS' },
    units: { life: 'generaciones', pacman: 'pts', invaders: 'impactos', tetris: 'semanas completas' },
    ctaGame: (name) => `Pon ${name} en tu perfil con una línea`,
    year: {
      title: (y) => `Tu ${y}`, contributions: (y) => `contribuciones en ${y}`, vs: (pct, y) => `${pct} vs ${y}`,
      upFromZero: (y) => `▲ desde 0 en ${y}`, samePeriod: 'mismo periodo del año pasado',
      bestMonth: 'mejor mes', bestDay: 'mejor día', streak: 'racha más larga', project: 'proyecto del año', favDay: 'día favorito',
      style: 'tu estilo', cta: '¿Cómo fue tu año?', ctaSub: 'Haz el tuyo en un minuto', days: 'días', contributionsShort: 'contribuciones', commits: 'commits',
      months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
      weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    }
  }
};

const H264_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'];

class VideoStudio {
  constructor(exporter) {
    this.exporter = exporter;
  }

  /** Datos para la celebración: total, días activos, mejor día y racha más larga (en orden cronológico) */
  computeStats(grid) {
    let total = 0;
    let activeDays = 0;
    let best = { count: 0, date: null };
    let streak = 0;
    let longest = 0;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const c = grid[x][y];
        const count = c.originalLevel > 0 ? (c.count || c.originalLevel) : 0;
        total += c.originalLevel > 0 ? (c.count || 0) : 0;
        if (count > 0) {
          activeDays++;
          streak++;
          longest = Math.max(longest, streak);
          if (count > best.count) best = { count, date: c.date };
        } else if (c.date) {
          streak = 0;
        }
      }
    }
    return { total, activeDays, best, longest };
  }

  formatNumber(n, lang) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'es' ? '.' : ',');
  }

  formatDate(iso, lang) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
  }

  /** Prepara todo lo que no cambia entre fotogramas */
  /**
   * Partida de un modo de juego (shared/games.js) jugada por la IA, la misma que la del SVG del perfil:
   * una vista por tick con los niveles de las celdas, los actores, la puntuación y el progreso.
   */
  simulateGame(game, grid) {
    const state = GameModes.create(game, grid, {});
    const frames = [];
    const snap = () => {
      const v = GameModes.view(state);
      frames.push({ levels: v.levels.map(col => col.slice()), actors: v.actors.map(a => ({ ...a })), score: v.score, progress: v.progress || 0 });
    };
    snap();
    while (!state.done && frames.length < 4000) {
      GameModes.step(state, null);
      snap();
    }
    return frames;
  }

  buildScene({ grid, user, lang, theme, format, shareUrl, avatar, game = 'snake' }) {
    const size = VIDEO_FORMATS[format] || VIDEO_FORMATS.landscape;
    const palette = this.exporter.themePalettes[theme] || this.exporter.themePalettes.ink;
    // Con un modo de juego el clip es esa partida; si no, la serpiente
    const frames = game !== 'snake' && typeof GameModes !== 'undefined' && GameModes.MODES.includes(game) ? this.simulateGame(game, grid) : null;
    const sim = frames ? { simGrid: grid, history: [], cellBites: {}, totalLevels: 1, eatenLevels: 0 } : this.exporter.simulate(grid);
    const totalSteps = frames ? frames.length : sim.history.length;

    // Sin cartela: el primer frame ya es la comida. El recorrido dura 6-8 s.
    const timing = { intro: 0, play: Math.min(8, Math.max(6, totalSteps * 0.02)), finale: 1.6, outro: 1.6 };
    timing.total = timing.intro + timing.play + timing.finale + timing.outro;

    // Pasos en los que cada celda pierde un nivel y ondas de las celdas intensas
    const bitesByCell = sim.cellBites;
    const bursts = [];
    const allBites = [];
    for (const [key, bites] of Object.entries(bitesByCell)) {
      const [x, y] = key.split('_').map(Number);
      allBites.push(...bites);
      if (sim.simGrid[x][y].originalLevel >= 3) bursts.push({ step: bites[bites.length - 1], x, y });
    }
    allBites.sort((a, b) => a - b);

    // Rejilla: en horizontal, una banda de 53 semanas; en cuadrado y vertical el año se parte en dos bandas
    // de 27 y 26 semanas, con celdas casi el doble de grandes (una sola banda quedaba como una tira finísima)
    // En vertical el texto se ve en un móvil: escala mayor que en los formatos de escritorio
    const unit = format === 'vertical' ? size.width / 560 : Math.min(size.width, size.height) / 720;
    const margin = Math.round(size.width * 0.05);
    const bands = format === 'landscape' ? 1 : 2;
    const perBand = Math.ceil(53 / bands);
    // Altura máxima de la rejilla para que debajo quepan la celebración y las tarjetas
    const maxBoardHeight = format === 'square' ? size.height * 0.4 : format === 'vertical' ? size.height * 0.4 : Infinity;
    const step = Math.min((size.width - margin * 2) / perBand, maxBoardHeight / (7 * bands + 0.9 * (bands - 1)));
    const cell = step * 0.8;
    const bandGap = step * 0.9;
    const boardWidth = step * perBand;
    const boardHeight = step * 7 * bands + bandGap * (bands - 1);
    const boardLeft = (size.width - boardWidth) / 2;
    const boardX = boardLeft + (step - cell) / 2;
    const boardY = Math.round(format === 'vertical' ? size.height * 0.31 : format === 'square' ? size.height * 0.27 : size.height * 0.4);

    return {
      ...size, format, palette, user, lang, avatar, shareUrl, theme, game: frames ? game : 'snake', frames,
      text: VIDEO_TEXT[lang] || VIDEO_TEXT.en,
      stats: this.computeStats(grid),
      sim, totalSteps, timing, bursts, allBites, bitesByCell,
      layout: { unit, margin, boardLeft, step, cell, bands, perBand, bandGap, boardWidth, boardHeight, boardX, boardY }
    };
  }

  /** Colores de la serpiente del rival: cian, o fucsia si el tema ya es cian; azul en el tema claro */
  rivalColors(theme) {
    if (theme === 'light') return { body: '#0969da', head: '#0550ae', glow: 'rgba(9, 105, 218, 0.35)' };
    if (theme === 'neon_cyan') return { body: '#ff007f', head: '#ffffff', glow: 'rgba(255, 0, 127, 0.85)' };
    return { body: '#00f2fe', head: '#ffffff', glow: 'rgba(0, 242, 254, 0.85)' };
  }

  /**
   * Escena del duelo: misma simulación que el duelo de la web (DuelSimulator), así el video y el enlace dan
   * el mismo ganador. players: [{ grid, user, avatar }, { ... }]
   */
  buildDuelScene({ players, lang, theme, format, shareUrl }) {
    const size = VIDEO_FORMATS[format] || VIDEO_FORMATS.landscape;
    const palette = this.exporter.themePalettes[theme] || this.exporter.themePalettes.ink;
    const result = DuelSimulator.run(players.map(p => p.grid));
    const timing = { intro: 0, play: Math.min(8, Math.max(6, result.ticks * 0.018)), finale: 1.8, outro: 1.4 };
    timing.total = timing.intro + timing.play + timing.finale + timing.outro;

    const unit = format === 'vertical' ? size.width / 560 : Math.min(size.width, size.height) / 720;
    const margin = Math.round(size.width * 0.05);
    const bands = format === 'vertical' ? 2 : 1;
    const perBand = Math.ceil(53 / bands);
    const step = (size.width - margin * 2) / perBand;
    const cell = step * 0.8;
    const bandGap = step * 0.9;
    const boardWidth = step * perBand;
    const boardHeight = step * 7 * bands + bandGap * (bands - 1);
    const boardLeft = (size.width - boardWidth) / 2;
    const labelHeight = 42 * unit;

    // Cabecera, y por jugador: etiqueta (avatar, usuario, puntos) y su rejilla
    let y = format === 'vertical' ? size.height * 0.13 : size.height * 0.15;
    const layouts = [0, 1].map(() => {
      const labelY = y + 12 * unit;
      const boardY = labelY + labelHeight;
      y = boardY + boardHeight + 18 * unit;
      return { unit, margin, boardLeft, step, cell, bands, perBand, bandGap, boardWidth, boardHeight, boardX: boardLeft + (step - cell) / 2, boardY, labelY };
    });

    const sides = result.players.map((r, i) => {
      // Pasos en que cada celda pierde un nivel, y la última mordida de las celdas intensas (ondas)
      const bitesByCell = {};
      for (const bite of r.biteLog) (bitesByCell[`${bite.x}_${bite.y}`] = bitesByCell[`${bite.x}_${bite.y}`] || []).push(bite.tick);
      const bursts = Object.entries(bitesByCell)
        .map(([key, ticks]) => { const [bx, by] = key.split('_').map(Number); return { x: bx, y: by, step: ticks[ticks.length - 1], level: r.grid[bx][by].originalLevel }; })
        .filter(b => b.level >= 3);
      return {
        ...r, bitesByCell, bursts, user: players[i].user, avatar: players[i].avatar,
        colors: i === 0 ? { body: palette.body, head: palette.head, glow: palette.glow } : this.rivalColors(theme),
        layout: layouts[i]
      };
    });

    return {
      kind: 'duel', ...size, format, palette, lang, shareUrl, timing, unit, margin,
      text: VIDEO_TEXT[lang] || VIDEO_TEXT.en,
      ticks: result.ticks, winner: result.winner, sides, resultY: y
    };
  }

  /** Posición interpolada de la cabeza en el paso fraccionario s */
  headAt(scene, s) {
    return this.headAtHistory(scene.sim.history, s);
  }

  headAtHistory(positions, s) {
    const clamped = Math.max(0, Math.min(positions.length - 1, s));
    const i = Math.floor(clamped);
    const a = positions[i][0];
    const b = (positions[i + 1] || positions[i])[0];
    const f = clamped - i;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  /** Esquina superior izquierda de la celda (x, y); x puede ser fraccionario (serpiente en movimiento) */
  cellOrigin(L, x, y) {
    const band = Math.min(L.bands - 1, Math.max(0, Math.floor((x + 0.5) / L.perBand)));
    const localX = x - band * L.perBand;
    return { x: L.boardX + localX * L.step, y: L.boardY + band * (7 * L.step + L.bandGap) + y * L.step };
  }

  /** Nivel de una celda tras los mordiscos hasta el paso s */
  levelAt(scene, x, y, s) {
    const cell = scene.sim.simGrid[x][y];
    const bites = scene.bitesByCell[`${x}_${y}`];
    if (!bites) return cell.originalLevel;
    let eaten = 0;
    for (const b of bites) if (b <= s) eaten++;
    return Math.max(0, cell.originalLevel - eaten);
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Tamaño de letra que no supera `size` y cabe en `maxWidth` */
  fitFont(ctx, text, weight, size, maxWidth, family) {
    ctx.font = `${weight} ${size}px ${family}`;
    const width = ctx.measureText(text).width;
    const fitted = width > maxWidth ? size * (maxWidth / width) : size;
    ctx.font = `${weight} ${fitted}px ${family}`;
    return fitted;
  }

  ease(t) {
    const c = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - c, 3);
  }

  /** 1 desde el primer frame si no hay intro; si la hay, entra suave */
  shown(t, intro) {
    return intro > 0 ? this.ease(t / intro) : 1;
  }

  /** Dibuja el fotograma del segundo t */
  drawFrame(ctx, scene, t) {
    const { width: W, height: H, palette: P, layout: L, timing: T, text } = scene;
    const font = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const unit = L.unit;
    const playStart = T.intro;
    const playEnd = T.intro + T.play;
    const finaleEnd = playEnd + T.finale;
    const step = t < playStart ? 0 : t > playEnd ? scene.totalSteps - 1 : ((t - playStart) / T.play) * (scene.totalSteps - 1);
    const colors = [P.empty, P.l1, P.l2, P.l3, P.l4];

    // Fondo con un halo suave del color de la serpiente
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    const halo = ctx.createRadialGradient(W / 2, L.boardY + L.boardHeight / 2, 0, W / 2, L.boardY + L.boardHeight / 2, W * 0.7);
    halo.addColorStop(0, P.glow.replace(/[\d.]+\)$/, '0.16)'));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // --- Cabecera: avatar, usuario y contador que sube durante la intro ---
    const introP = this.shown(t, T.intro);
    const titleY = scene.format === 'vertical' ? H * 0.17 : scene.format === 'square' ? H * 0.12 : H * 0.16;
    ctx.globalAlpha = introP;
    const avatarSize = 70 * unit;
    let textX = L.margin;
    if (scene.avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(L.margin + avatarSize / 2, titleY, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(scene.avatar, L.margin, titleY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();
      ctx.strokeStyle = P.body;
      ctx.lineWidth = 3 * unit;
      ctx.beginPath();
      ctx.arc(L.margin + avatarSize / 2, titleY, avatarSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      textX += avatarSize + 22 * unit;
    }
    const bigFont = 40 * unit;
    ctx.fillStyle = P.text;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const title = scene.user ? `@${scene.user}` : 'portafil';
    this.fitFont(ctx, title, 800, bigFont, W - textX - L.margin, font);
    ctx.fillText(title, textX, titleY - bigFont * 0.1);
    const counter = Math.round(scene.stats.total * this.ease((t - 0.2) / (T.intro + 0.8)));
    const subtitle = `${this.formatNumber(scene.stats.total, scene.lang)} ${text.contributions}`;
    this.fitFont(ctx, subtitle, 700, bigFont * 0.55, W - textX - L.margin, font);
    ctx.fillStyle = P.l4;
    ctx.fillText(subtitle.replace(this.formatNumber(scene.stats.total, scene.lang), this.formatNumber(counter, scene.lang)), textX, titleY + bigFont * 0.75);
    ctx.globalAlpha = 1;

    // --- Barra de progreso sobre la rejilla ---
    const frame = scene.frames ? scene.frames[Math.min(scene.frames.length - 1, Math.floor(step))] : null;
    const lastFrame = scene.frames ? scene.frames[scene.frames.length - 1] : null;
    const eatenNow = scene.allBites.filter(b => b <= step).length;
    const totalLevels = Math.max(1, scene.sim.totalLevels);
    const progress = frame
      ? (t >= playEnd ? lastFrame.progress : frame.progress)
      : (t >= playEnd ? scene.sim.eatenLevels / totalLevels : eatenNow / totalLevels);
    const barY = L.boardY - 34 * unit;
    const barW = L.boardWidth;
    ctx.fillStyle = P.empty;
    this.roundRect(ctx, L.boardLeft, barY, barW, 10 * unit, 5 * unit);
    ctx.fill();
    ctx.fillStyle = P.body;
    ctx.shadowColor = P.glow;
    ctx.shadowBlur = 14 * unit;
    this.roundRect(ctx, L.boardLeft, barY, Math.max(10 * unit, barW * progress), 10 * unit, 5 * unit);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `700 ${20 * unit}px ${font}`;
    ctx.fillStyle = P.text;
    ctx.textAlign = 'right';
    ctx.fillText(frame ? `${Math.round(progress * 100)}%` : `${Math.round(progress * 100)}% ${text.devoured}`, L.boardLeft + barW, barY - 10 * unit);
    ctx.textAlign = 'left';

    // --- Rejilla: aparece en ola en la intro, baja de nivel con los mordiscos y se rellena en ola al final ---
    for (let x = 0; x < 53; x++) {
      const appear = 1;
      const refillAt = playEnd + 0.9 + (x / 52) * 0.9;
      for (let y = 0; y < 7; y++) {
        const original = scene.sim.simGrid[x][y].originalLevel;
        let level = t >= refillAt ? original : frame ? frame.levels[x][y] : this.levelAt(scene, x, y, step);
        const { x: px, y: py } = this.cellOrigin(L, x, y);
        ctx.globalAlpha = appear;
        ctx.fillStyle = colors[level] || P.empty;
        this.roundRect(ctx, px, py, L.cell, L.cell, L.cell * 0.2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // --- Ondas al vaciar una celda intensa ---
    for (const burst of scene.bursts) {
      const age = step - burst.step;
      if (age < 0 || age > 4 || t > playEnd) continue;
      const p = age / 4;
      ctx.strokeStyle = P.head;
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 3 * unit;
      ctx.shadowColor = P.head;
      ctx.shadowBlur = 12 * unit;
      ctx.beginPath();
      const origin = this.cellOrigin(L, burst.x, burst.y);
      ctx.arc(origin.x + L.cell / 2, origin.y + L.cell / 2, L.cell * (0.4 + p * 1.8), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // --- Serpiente: cuerpo continuo (un círculo cada medio paso) y cabeza con ojos ---
    const snakeAlpha = t < playStart ? this.ease((t - T.intro * 0.6) / (T.intro * 0.4)) : 1 - this.ease((t - playEnd) / 0.4);
    if (snakeAlpha > 0) {
      if (frame) this.drawActors(ctx, L, scene, step, snakeAlpha);
      else this.drawSnake(ctx, L, scene.sim.history, step, P, snakeAlpha);
    }

    // --- Celebración: texto grande y tarjetas con datos ---
    if (t >= playEnd && t < finaleEnd + T.outro) {
      const p = this.ease((t - playEnd) / 0.5);
      const fade = t > finaleEnd ? 1 - this.ease((t - finaleEnd) / 0.4) : 1;
      ctx.globalAlpha = p * fade;
      const celebrateY = L.boardY + L.boardHeight + (scene.format === 'vertical' ? 80 : scene.format === 'square' ? 72 : 82) * unit;
      ctx.textAlign = 'center';
      const headline = frame
        ? `${text.games[scene.game]} · ${this.formatNumber(lastFrame.score, scene.lang)} ${text.units[scene.game]}`
        : scene.sim.eatenLevels === scene.sim.totalLevels ? text.cleared : `${Math.round(progress * 100)}%`;
      this.fitFont(ctx, headline, 900, 52 * unit * (0.8 + 0.2 * p), W - L.margin * 2, font);
      ctx.fillStyle = P.head;
      ctx.shadowColor = P.head;
      ctx.shadowBlur = 24 * unit;
      ctx.fillText(headline, W / 2, celebrateY);
      ctx.shadowBlur = 0;

      const cards = [
        [this.formatNumber(scene.stats.activeDays, scene.lang), text.activeDays],
        [`${scene.stats.best.count}`, `${text.bestDay}${scene.stats.best.date ? ` · ${this.formatDate(scene.stats.best.date, scene.lang)}` : ''}`],
        [`${scene.stats.longest} ${text.days}`, text.streak]
      ];
      const cardGap = 14 * unit;
      const cardW = (W - L.margin * 2 - cardGap * 2) / 3;
      const cardH = 92 * unit;
      cards.forEach(([value, label], i) => {
        const appear = this.ease((t - playEnd - 0.35 - i * 0.18) / 0.4);
        const cx = L.margin + i * (cardW + cardGap);
        const cy = celebrateY + 40 * unit + (1 - appear) * 30 * unit;
        ctx.globalAlpha = appear * fade;
        ctx.fillStyle = P.empty;
        ctx.strokeStyle = P.border;
        ctx.lineWidth = 2 * unit;
        this.roundRect(ctx, cx, cy, cardW, cardH, 14 * unit);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = P.l4;
        this.fitFont(ctx, value, 800, cardH * 0.36, cardW * 0.9, font);
        ctx.fillText(value, cx + cardW / 2, cy + cardH * 0.5);
        ctx.fillStyle = P.text;
        this.fitFont(ctx, label, 500, cardH * 0.18, cardW * 0.9, font);
        ctx.fillText(label, cx + cardW / 2, cy + cardH * 0.8);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // --- Llamada a la acción ---
    if (t >= finaleEnd) {
      const p = this.ease((t - finaleEnd) / 0.45);
      ctx.globalAlpha = p;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = P.text;
      this.fitFont(ctx, text.cta, 900, 50 * unit, W - L.margin * 2, font);
      ctx.fillText(text.cta, W / 2, H * 0.46);
      ctx.fillStyle = P.l4;
      const ctaSub = frame ? text.ctaGame(text.games[scene.game].toLowerCase()) : text.ctaSub;
      this.fitFont(ctx, ctaSub, 600, 24 * unit, W - L.margin * 2, font);
      ctx.fillText(ctaSub, W / 2, H * 0.46 + 62 * unit);
      ctx.fillStyle = P.head;
      this.fitFont(ctx, scene.shareUrl, 700, 22 * unit, W - L.margin * 2, font);
      ctx.fillText(scene.shareUrl, W / 2, H * 0.46 + 120 * unit);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // Marca discreta para que quien vea el clip sepa de dónde sale
    ctx.font = `700 ${14 * unit}px ${font}`;
    ctx.fillStyle = P.text;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'right';
    ctx.fillText('portafil', W - L.margin, L.margin * 0.7);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  /**
   * Actores de un modo de juego en el paso fraccionario `step`: Pac-Man y fantasmas, nave y balas. Se dibujan
   * como en el estudio (js/arcade.js), escalados a la celda del clip, y se mueven suave entre ticks.
   */
  drawActors(ctx, L, scene, step, alpha) {
    const P = scene.palette;
    const i = Math.min(scene.frames.length - 1, Math.floor(step));
    const now = scene.frames[i].actors;
    const next = (scene.frames[i + 1] || scene.frames[i]).actors;
    const f = step - i;
    const s = L.cell / 11;
    const neutral = ['ink', 'paper'].includes(scene.theme);
    const shape = (key, d) => (typeof Path2D === 'undefined' ? null : (this[key] = this[key] || new Path2D(d)));
    const ghost = shape('ghostPath', 'M0 11V5.5a5.5 5.5 0 0 1 11 0V11l-1.85-1.6-1.85 1.6-1.8-1.6-1.8 1.6-1.85-1.6z');
    const ship = shape('shipPath', 'M0 8V5h2V3.5h3V0h1v3.5h3V5h2v3z');
    ctx.save();
    ctx.globalAlpha = alpha;
    now.forEach((a, k) => {
      // Solo se interpola un paso de una celda: los saltos (túneles, balas nuevas) van directos
      const b = next[k] && next[k].kind === a.kind && Math.abs(next[k].x - a.x) <= 1 && Math.abs(next[k].y - a.y) <= 1 ? next[k] : a;
      const o = this.cellOrigin(L, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(s, s);
      if (a.kind === 'pac') {
        const open = 0.15 + 0.5 * Math.abs(Math.sin(step * 2.2));
        ctx.translate(5.5, 5.5);
        ctx.rotate((a.dir * Math.PI) / 2);
        ctx.fillStyle = P.body;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 6.5, open, Math.PI * 2 - open);
        ctx.closePath();
        ctx.fill();
      } else if (a.kind === 'ghost') {
        ctx.fillStyle = a.scared ? P.l1 : (neutral ? P.l3 : P.head);
        if (ghost) ctx.fill(ghost); else ctx.fillRect(0, 0, 11, 11);
        ctx.fillStyle = '#fff';
        for (const ex of [3.7, 7.3]) { ctx.beginPath(); ctx.arc(ex, 5, 1.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#111';
        for (const ex of [4.1, 7.7]) { ctx.beginPath(); ctx.arc(ex, 5.2, 0.8, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.kind === 'ship') {
        ctx.translate(0, -2);
        ctx.fillStyle = P.body;
        if (ship) ctx.fill(ship); else ctx.fillRect(0, 0, 11, 8);
      } else if (a.kind === 'bullet') {
        ctx.fillStyle = P.head;
        this.roundRect(ctx, 4.5, 0, 2, 5, 1);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  /**
   * Serpiente en el paso fraccionario `step` de su historial: cuerpo continuo (un círculo cada medio paso,
   * primero todos los contornos y luego todos los cuerpos) y cabeza con ojos orientada hacia donde avanza.
   * colors: { body, head, glow }
   */
  drawSnake(ctx, L, history, step, colors, alpha) {
    const unit = L.unit;
    const snakeLen = history.reduce((m, h) => Math.max(m, h.length), 0);
    const bodyCount = (snakeLen - 1) * 2;
    const center = (pos) => {
      const origin = this.cellOrigin(L, pos.x, pos.y);
      return { x: origin.x + L.cell / 2, y: origin.y + L.cell / 2 };
    };
    const points = [];
    for (let k = bodyCount; k >= 1; k--) points.push({ k, ...center(this.headAtHistory(history, step - k * 0.5)) });

    for (const pass of ['outline', 'body']) {
      for (const p of points) {
        const tt = p.k / bodyCount;
        const r = (L.cell * 0.62 - L.cell * 0.28 * tt) * (pass === 'outline' ? 1.18 : 1);
        ctx.fillStyle = pass === 'outline' ? 'rgba(0,0,0,0.55)' : colors.body;
        ctx.globalAlpha = alpha * (pass === 'outline' ? 1 : 1 - 0.45 * tt);
        if (pass === 'body' && p.k === 1) {
          ctx.shadowColor = colors.glow;
          ctx.shadowBlur = 18 * unit;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const head = center(this.headAtHistory(history, step));
    const ahead = center(this.headAtHistory(history, step + 0.35));
    const behind = center(this.headAtHistory(history, step - 0.35));
    const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) || 0;
    const hs = L.cell * 1.3;
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    ctx.shadowColor = colors.head;
    ctx.shadowBlur = 22 * unit;
    ctx.fillStyle = colors.head;
    this.roundRect(ctx, -hs / 2, -hs / 2, hs, hs, hs * 0.32);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hs * 0.14, side * hs * 0.22, hs * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(hs * 0.2, side * hs * 0.22, hs * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * Escena de «Tu año»: data es la respuesta de /api/year/<usuario>.json (los mismos datos y resumen que la
   * tarjeta). Calendario del año natural de enero a diciembre, con los días que aún no han llegado en hueco.
   */
  buildYearScene({ data, user, lang, theme, format, shareUrl, avatar }) {
    const size = VIDEO_FORMATS[format] || VIDEO_FORMATS.landscape;
    const palette = this.exporter.themePalettes[theme] || this.exporter.themePalettes.ink;
    const muted = (typeof ThemeTokens !== 'undefined' ? ThemeTokens.get(theme).muted : null) || palette.l3;
    const text = (VIDEO_TEXT[lang] || VIDEO_TEXT.en);

    // Celdas del año: columna = semana desde el domingo de la semana del 1 de enero, fila = día de la semana
    const jan1 = Date.UTC(data.year, 0, 1);
    const offset = new Date(jan1).getUTCDay();
    const daysInYear = (Date.UTC(data.year + 1, 0, 1) - jan1) / 86400000;
    const levels = new Map(data.days.map(d => [d.date, d.level]));
    const cells = [];
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(jan1 + i * 86400000).toISOString().slice(0, 10);
      cells.push({ x: Math.floor((i + offset) / 7), y: (i + offset) % 7, level: levels.get(date) || 0, future: data.partial && date > data.until });
    }
    const cols = cells[cells.length - 1].x + 1;

    // Distribución: en horizontal una banda de semanas; en cuadrado y vertical, dos bandas con celdas mayores
    const wide = format === 'landscape';
    const unit = format === 'vertical' ? size.width / 560 : Math.min(size.width, size.height) / 720;
    const margin = Math.round(size.width * 0.06);
    const bands = wide ? 1 : 2;
    const perBand = Math.ceil(cols / bands);
    const maxBoardHeight = size.height * (wide ? 0.27 : format === 'square' ? 0.21 : 0.25);
    const step = Math.min((size.width - margin * 2) / perBand, maxBoardHeight / (7 * bands + 0.9 * (bands - 1)));
    const cell = step * 0.8;
    const bandGap = step * 0.9;
    const boardWidth = step * perBand;
    const boardHeight = step * 7 * bands + bandGap * (bands - 1);
    const boardLeft = (size.width - boardWidth) / 2;
    const boardY = Math.round(size.height * (wide ? 0.36 : format === 'square' ? 0.33 : 0.3));
    const cardsY = boardY + boardHeight + size.height * (wide ? 0.07 : 0.05);

    // Ritmo del clip (s): intro con el contador, calendario, momentos, estilo y llamada a la acción
    const timing = { intro: 2.2, grid: 2.8, cards: 4.5, style: 2.1, cta: 1.8 };
    timing.total = timing.intro + timing.grid + timing.cards + timing.style + timing.cta;

    return {
      kind: 'year', ...size, format, palette, muted, user, lang, avatar, shareUrl, text, data, cells, cols, timing,
      layout: { unit, margin, wide, bands, perBand, step, cell, bandGap, boardWidth, boardHeight, boardLeft, boardX: boardLeft + (step - cell) / 2, boardY, cardsY }
    };
  }

  /** Fotograma del segundo t del clip «Tu año» */
  drawYearFrame(ctx, scene, t) {
    const { width: W, height: H, palette: P, layout: L, timing: T, data, muted } = scene;
    const tx = scene.text.year;
    const s = data.summary;
    const font = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const u = L.unit;
    const gridStart = T.intro;
    const cardsStart = gridStart + T.grid;
    const styleStart = cardsStart + T.cards;
    const ctaStart = styleStart + T.style;
    const fmt = (n) => this.formatNumber(n, scene.lang);
    const colors = [P.empty, P.l1, P.l2, P.l3, P.l4];

    // Fondo con un halo suave del color del tema
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    const halo = ctx.createRadialGradient(W / 2, L.boardY + L.boardHeight / 2, 0, W / 2, L.boardY + L.boardHeight / 2, W * 0.75);
    halo.addColorStop(0, P.glow.replace(/[\d.]+\)$/, '0.14)'));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // Mientras se revela el estilo, todo lo demás se atenúa
    const dim = t >= styleStart ? 1 - 0.7 * this.ease((t - styleStart) / 0.5) : 1;
    ctx.textBaseline = 'alphabetic';

    // --- Cabecera: avatar, usuario y «Tu 2026» ---
    ctx.globalAlpha = this.ease(t / 0.5) * dim;
    const headerY = H * (L.wide ? 0.11 : 0.085);
    const avatarSize = 64 * u;
    let textX = L.margin;
    if (scene.avatar) {
      this.drawAvatar(ctx, scene.avatar, L.margin, headerY - avatarSize / 2, avatarSize, P.body);
      textX += avatarSize + 20 * u;
    }
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    this.fitFont(ctx, scene.user ? `@${scene.user}` : 'portafil', 600, 24 * u, W - textX - L.margin, font);
    ctx.fillText(scene.user ? `@${scene.user}` : 'portafil', textX, headerY - 10 * u);
    ctx.fillStyle = P.text;
    this.fitFont(ctx, tx.title(data.year), 900, 44 * u, W - textX - L.margin, font);
    ctx.fillText(tx.title(data.year), textX, headerY + 30 * u);

    // --- Contador del total y comparación ---
    const counterY = H * (L.wide ? 0.27 : 0.19);
    const counter = Math.round(data.total * this.ease((t - 0.3) / 1.6));
    ctx.globalAlpha = this.ease((t - 0.2) / 0.5) * dim;
    ctx.fillStyle = P.body;
    ctx.shadowColor = P.glow;
    ctx.shadowBlur = 18 * u;
    this.fitFont(ctx, fmt(counter), 900, 92 * u, W * 0.6, font);
    ctx.fillText(fmt(counter), L.margin, counterY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = muted;
    this.fitFont(ctx, tx.contributions(data.year), 500, 22 * u, W * 0.6, font);
    ctx.fillText(tx.contributions(data.year), L.margin, counterY + 34 * u);
    // Comparación a la derecha del contador (debajo en vertical)
    const vsAlpha = this.ease((t - gridStart - 0.8) / 0.5) * dim;
    if (vsAlpha > 0 && data.total > 0) {
      ctx.globalAlpha = vsAlpha;
      const up = data.total >= data.prevTotal;
      const label = data.prevTotal > 0
        ? tx.vs(`${up ? '▲ +' : '▼ '}${fmt(Math.round(((data.total - data.prevTotal) / data.prevTotal) * 100))} %`, data.year - 1)
        : tx.upFromZero(data.year - 1);
      const vsX = L.wide ? W - L.margin : L.margin;
      const vsY = L.wide ? counterY - 6 * u : counterY + 74 * u;
      ctx.textAlign = L.wide ? 'right' : 'left';
      ctx.fillStyle = up ? P.l4 : muted;
      this.fitFont(ctx, label, 800, 30 * u, L.wide ? W * 0.45 : W - L.margin * 2, font);
      ctx.fillText(label, vsX, vsY);
      if (data.prevTotal > 0 && data.partial) {
        ctx.fillStyle = muted;
        this.fitFont(ctx, tx.samePeriod, 500, 18 * u, L.wide ? W * 0.45 : W - L.margin * 2, font);
        ctx.fillText(tx.samePeriod, vsX, vsY + 26 * u);
      }
      ctx.textAlign = 'left';
    }

    // --- Calendario del año: se dibuja en barrido de enero a diciembre ---
    const sweep = Math.max(0, Math.min(1, (t - gridStart) / (T.grid * 0.85)));
    for (const c of scene.cells) {
      const appear = this.ease((sweep * (scene.cols + 6) - c.x) / 6);
      if (appear <= 0) continue;
      const band = Math.min(L.bands - 1, Math.floor(c.x / L.perBand));
      const px = L.boardX + (c.x - band * L.perBand) * L.step;
      const py = L.boardY + band * (7 * L.step + L.bandGap) + c.y * L.step;
      ctx.globalAlpha = appear * dim * (c.future ? 0.35 : 1);
      ctx.fillStyle = colors[c.level] || P.empty;
      this.roundRect(ctx, px, py, L.cell, L.cell, L.cell * 0.2);
      ctx.fill();
    }

    // --- Momentos del año: aparecen uno tras otro ---
    const cards = [
      [tx.bestMonth, s.bestMonth >= 0 ? tx.months[s.bestMonth] : '—', s.bestMonth >= 0 ? `${fmt(s.byMonth[s.bestMonth])} ${tx.contributionsShort}` : ''],
      [tx.bestDay, s.bestDay ? `${Number(s.bestDay.date.slice(8, 10))} ${tx.monthsShort[Number(s.bestDay.date.slice(5, 7)) - 1]}` : '—', s.bestDay ? `${fmt(s.bestDay.count)} ${tx.contributionsShort}` : ''],
      [tx.streak, `${s.longest.length} ${tx.days}`, ''],
      [tx.project, data.topRepo ? data.topRepo.name : '—', data.topRepo ? `${fmt(data.topRepo.commits)} ${tx.commits}` : ''],
      [tx.favDay, s.favDay >= 0 ? tx.weekdays[s.favDay] : '—', '']
    ];
    const format = scene.format;
    const cols = L.wide ? 5 : 2;
    const gap = 16 * u;
    const cardW = (W - L.margin * 2 - gap * (cols - 1)) / cols;
    const cardH = (L.wide ? 0.2 : format === 'square' ? 0.1 : 0.088) * H;
    cards.forEach(([label, value, sub], i) => {
      const start = cardsStart + i * 0.75;
      const appear = this.ease((t - start) / 0.45);
      if (appear <= 0) return;
      // En dos columnas, la quinta tarjeta ocupa el ancho entero
      const full = !L.wide && i === cards.length - 1 && cards.length % 2;
      const cx = L.margin + (full ? 0 : (i % cols) * (cardW + gap));
      const cy = L.cardsY + Math.floor(i / cols) * (cardH + gap) + (1 - appear) * 24 * u;
      const w = full ? W - L.margin * 2 : cardW;
      ctx.globalAlpha = appear * dim;
      ctx.fillStyle = P.empty;
      ctx.strokeStyle = P.border;
      ctx.lineWidth = 2 * u;
      this.roundRect(ctx, cx, cy, w, cardH, 16 * u);
      ctx.fill();
      ctx.stroke();
      // Etiqueta arriba, valor en medio y detalle abajo, repartidos en el alto de la tarjeta
      const pad = Math.min(18 * u, cardH * 0.14);
      const labelSize = Math.min(20 * u, cardH * 0.16);
      const valueSize = Math.min(36 * u, cardH * 0.32);
      const labelY = cy + pad + labelSize * 0.8;
      ctx.fillStyle = muted;
      this.fitFont(ctx, label, 500, labelSize, w - pad * 2, font);
      ctx.fillText(label, cx + pad, labelY);
      ctx.fillStyle = i === 0 ? P.body : P.text;
      const shown = [...value].length > 18 ? `${[...value].slice(0, 17).join('')}…` : value;
      this.fitFont(ctx, shown, 800, valueSize, w - pad * 2, font);
      ctx.fillText(shown, cx + pad, labelY + valueSize * 1.15);
      if (sub) {
        ctx.fillStyle = muted;
        this.fitFont(ctx, sub, 500, labelSize * 0.9, w - pad * 2, font);
        ctx.fillText(sub, cx + pad, cy + cardH - pad * 0.8);
      }
    });
    ctx.globalAlpha = 1;

    // --- Tu estilo, a lo grande ---
    if (t >= styleStart && t < ctaStart + 0.5) {
      const p = this.ease((t - styleStart - 0.2) / 0.6);
      const fade = t > ctaStart ? 1 - this.ease((t - ctaStart) / 0.4) : 1;
      ctx.globalAlpha = p * fade;
      ctx.textAlign = 'center';
      const cy = H * 0.5;
      ctx.fillStyle = muted;
      this.fitFont(ctx, tx.style, 600, 26 * u, W - L.margin * 2, font);
      ctx.fillText(tx.style, W / 2, cy - 70 * u);
      const name = s.style.name;
      const nameSize = this.fitFont(ctx, name, 900, 54 * u * (0.85 + 0.15 * p), W - L.margin * 2 - 60 * u, font);
      const pillW = Math.min(W - L.margin * 2, ctx.measureText(name).width + 70 * u);
      const pillH = nameSize * 1.7;
      ctx.fillStyle = P.empty;
      ctx.strokeStyle = P.body;
      ctx.lineWidth = 3 * u;
      ctx.shadowColor = P.glow;
      ctx.shadowBlur = 30 * u;
      this.roundRect(ctx, W / 2 - pillW / 2, cy - pillH / 2 - nameSize * 0.32, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = P.text;
      this.fitFont(ctx, name, 900, nameSize, W - L.margin * 2 - 60 * u, font);
      ctx.fillText(name, W / 2, cy);
      ctx.fillStyle = muted;
      this.fitFont(ctx, s.style.line, 500, 24 * u, W - L.margin * 2, font);
      ctx.fillText(s.style.line, W / 2, cy + pillH * 0.75);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // --- Llamada a la acción ---
    if (t >= ctaStart) {
      const p = this.ease((t - ctaStart) / 0.45);
      ctx.globalAlpha = p;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      this.fitFont(ctx, tx.cta, 900, 52 * u, W - L.margin * 2, font);
      ctx.fillText(tx.cta, W / 2, H * 0.45);
      ctx.fillStyle = P.l4;
      this.fitFont(ctx, tx.ctaSub, 600, 26 * u, W - L.margin * 2, font);
      ctx.fillText(tx.ctaSub, W / 2, H * 0.45 + 60 * u);
      ctx.fillStyle = P.head;
      this.fitFont(ctx, scene.shareUrl, 700, 24 * u, W - L.margin * 2, font);
      ctx.fillText(scene.shareUrl, W / 2, H * 0.45 + 116 * u);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Marca discreta
    ctx.font = `700 ${14 * u}px ${font}`;
    ctx.fillStyle = P.text;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'right';
    ctx.fillText('portafil', W - L.margin, L.margin * 0.6);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  drawScene(ctx, scene, t) {
    if (scene.kind === 'duel') this.drawDuelFrame(ctx, scene, t);
    else if (scene.kind === 'year') this.drawYearFrame(ctx, scene, t);
    else this.drawFrame(ctx, scene, t);
  }

  drawAvatar(ctx, image, x, y, size, ring) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
    ctx.strokeStyle = ring;
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawDuelFrame(ctx, scene, t) {
    const { width: W, height: H, palette: P, timing: T, text, unit } = scene;
    const font = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const playStart = T.intro;
    const playEnd = T.intro + T.play;
    const finaleEnd = playEnd + T.finale;
    const tick = t < playStart ? 0 : t > playEnd ? scene.ticks : ((t - playStart) / T.play) * scene.ticks;
    const colors = [P.empty, P.l1, P.l2, P.l3, P.l4];
    const introP = this.shown(t, T.intro);

    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);

    // Título: @a VS @b
    ctx.globalAlpha = introP;
    ctx.textAlign = 'center';
    const [a, b] = scene.sides;
    const title = `@${a.user}  VS  @${b.user}`;
    const titleSize = this.fitFont(ctx, title, 900, 38 * unit, W - scene.margin * 2, font);
    const titleY = (scene.format === 'vertical' ? H * 0.08 : H * 0.09) + titleSize * 0.35;
    const widthA = ctx.measureText(`@${a.user}  `).width;
    const widthVs = ctx.measureText('VS').width;
    const left = W / 2 - ctx.measureText(title).width / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = a.colors.body;
    ctx.fillText(`@${a.user}`, left, titleY);
    ctx.fillStyle = P.text;
    ctx.fillText('VS', left + widthA, titleY);
    ctx.fillStyle = b.colors.body;
    ctx.fillText(`@${b.user}`, left + widthA + widthVs + ctx.measureText('  ').width, titleY);
    ctx.globalAlpha = 1;

    scene.sides.forEach((side, i) => {
      const L = side.layout;
      const isWinner = scene.winner === i;
      const decided = t >= playEnd;
      const dim = decided && scene.winner !== -1 && !isWinner ? 0.45 : 1;
      const tickIndex = Math.min(side.scores.length - 1, Math.floor(tick));
      const eaten = side.biteLog.filter(bite => bite.tick <= tick).length;
      const percent = side.totalLevels ? Math.round((eaten / side.totalLevels) * 100) : 100;

      // Etiqueta: avatar, usuario y marcador
      ctx.globalAlpha = introP * dim;
      const avatarSize = L.boardHeight > 300 * unit ? 40 * unit : 34 * unit;
      let textX = L.boardLeft;
      if (side.avatar) {
        this.drawAvatar(ctx, side.avatar, L.boardLeft, L.labelY, avatarSize, side.colors.body);
        textX += avatarSize + 12 * unit;
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = side.colors.body;
      this.fitFont(ctx, `@${side.user}`, 800, 22 * unit, L.boardWidth * 0.5, font);
      ctx.fillText(`@${side.user}`, textX, L.labelY + avatarSize * 0.68);
      ctx.textAlign = 'right';
      ctx.fillStyle = P.text;
      ctx.font = `800 ${24 * unit}px ${font}`;
      ctx.fillText(`${this.formatNumber(side.scores[tickIndex], scene.lang)} pts · ${percent}%`, L.boardLeft + L.boardWidth, L.labelY + avatarSize * 0.68);
      ctx.textAlign = 'left';

      // Marco del ganador
      if (decided && isWinner) {
        const glow = this.ease((t - playEnd) / 0.5);
        ctx.globalAlpha = glow;
        ctx.strokeStyle = side.colors.body;
        ctx.lineWidth = 4 * unit;
        ctx.shadowColor = side.colors.glow;
        ctx.shadowBlur = 24 * unit;
        this.roundRect(ctx, L.boardLeft - 10 * unit, L.labelY - 8 * unit, L.boardWidth + 20 * unit, L.boardY - L.labelY + L.boardHeight + 18 * unit, 14 * unit);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Rejilla
      for (let x = 0; x < 53; x++) {
        const appear = 1;
        for (let y = 0; y < 7; y++) {
          const bites = side.bitesByCell[`${x}_${y}`];
          let level = side.grid[x][y].originalLevel;
          if (bites) for (const bt of bites) if (bt <= tick) level--;
          const origin = this.cellOrigin(L, x, y);
          ctx.globalAlpha = appear * dim;
          ctx.fillStyle = colors[Math.max(0, level)] || P.empty;
          this.roundRect(ctx, origin.x, origin.y, L.cell, L.cell, L.cell * 0.2);
          ctx.fill();
        }
      }

      // Ondas
      for (const burst of side.bursts) {
        const age = tick - burst.step;
        if (age < 0 || age > 4 || t > playEnd) continue;
        const p = age / 4;
        const origin = this.cellOrigin(L, burst.x, burst.y);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = side.colors.head;
        ctx.lineWidth = 3 * unit;
        ctx.beginPath();
        ctx.arc(origin.x + L.cell / 2, origin.y + L.cell / 2, L.cell * (0.4 + p * 1.8), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Serpiente
      const snakeAlpha = (t < playStart ? this.ease((t - T.intro * 0.6) / (T.intro * 0.4)) : 1 - this.ease((t - playEnd) / 0.4)) * dim;
      if (snakeAlpha > 0) this.drawSnake(ctx, L, side.history, tick, side.colors, snakeAlpha);
      ctx.globalAlpha = 1;
    });

    // Resultado
    if (t >= playEnd) {
      const p = this.ease((t - playEnd) / 0.5);
      const fade = t > finaleEnd ? 1 - this.ease((t - finaleEnd) / 0.4) : 1;
      ctx.globalAlpha = p * fade;
      ctx.textAlign = 'center';
      const winnerSide = scene.sides[scene.winner];
      const headline = winnerSide ? `${text.wins} @${winnerSide.user}` : text.tie;
      ctx.fillStyle = winnerSide ? winnerSide.colors.body : P.head;
      ctx.shadowColor = winnerSide ? winnerSide.colors.glow : P.glow;
      ctx.shadowBlur = 24 * unit;
      this.fitFont(ctx, headline, 900, 50 * unit * (0.8 + 0.2 * p), W - scene.margin * 2, font);
      const resultY = Math.min(H - 90 * unit, scene.resultY + 60 * unit);
      ctx.fillText(headline, W / 2, resultY);
      ctx.shadowBlur = 0;
      ctx.fillStyle = P.text;
      ctx.font = `700 ${22 * unit}px ${font}`;
      ctx.fillText(`${this.formatNumber(a.score, scene.lang)} pts  vs  ${this.formatNumber(b.score, scene.lang)} pts`, W / 2, resultY + 42 * unit);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // Llamada a la acción
    if (t >= finaleEnd) {
      const p = this.ease((t - finaleEnd) / 0.45);
      ctx.globalAlpha = p;
      // Más opaco que en el video individual: el marco brillante del ganador se transparentaba sobre el texto
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = P.text;
      this.fitFont(ctx, text.duelCta, 900, 50 * unit, W - scene.margin * 2, font);
      ctx.fillText(text.duelCta, W / 2, H * 0.46);
      ctx.fillStyle = P.l4;
      this.fitFont(ctx, text.duelSub, 600, 24 * unit, W - scene.margin * 2, font);
      ctx.fillText(text.duelSub, W / 2, H * 0.46 + 62 * unit);
      ctx.fillStyle = P.head;
      this.fitFont(ctx, scene.shareUrl, 700, 22 * unit, W - scene.margin * 2, font);
      ctx.fillText(scene.shareUrl, W / 2, H * 0.46 + 120 * unit);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    ctx.font = `700 ${14 * unit}px ${font}`;
    ctx.fillStyle = P.text;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'right';
    ctx.fillText('portafil', W - scene.margin, scene.margin * 0.7);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  async pickCodec(width, height) {
    if (typeof VideoEncoder === 'undefined') return null;
    for (const codec of H264_CODECS) {
      try {
        const { supported } = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 6e6, framerate: 30 });
        if (supported) return codec;
      } catch (e) {}
    }
    return null;
  }

  /**
   * Genera el video. onProgress(0..1). Devuelve { blob, mimeType, extension, method }.
   */
  async render({ grid, user = '', lang = 'en', theme = 'ink', format = 'landscape', shareUrl = '', avatar = null, duel = null, game = 'snake', year = null, fps = 30, onProgress = () => {} }) {
    // duel: [{ grid, user, avatar }, { grid, user, avatar }] genera el video del duelo
    // year: respuesta de /api/year/<usuario>.json para el clip «Tu año»
    const scene = duel
      ? this.buildDuelScene({ players: duel, lang, theme, format, shareUrl })
      : year
        ? this.buildYearScene({ data: year, user, lang, theme, format, shareUrl, avatar })
        : this.buildScene({ grid, user, lang, theme, format, shareUrl, avatar, game });
    const canvas = document.createElement('canvas');
    canvas.width = scene.width;
    canvas.height = scene.height;
    const ctx = canvas.getContext('2d');
    const frameCount = Math.round(scene.timing.total * fps);

    const codec = await this.pickCodec(scene.width, scene.height);
    if (codec && typeof Mp4Muxer !== 'undefined') {
      return this.renderWithWebCodecs({ scene, canvas, ctx, codec, fps, frameCount, onProgress });
    }
    return this.renderRealtime({ scene, canvas, ctx, fps, onProgress });
  }

  async renderWithWebCodecs({ scene, canvas, ctx, codec, fps, frameCount, onProgress }) {
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: scene.width, height: scene.height },
      fastStart: 'in-memory'
    });
    let failure = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { failure = e; }
    });
    encoder.configure({ codec, width: scene.width, height: scene.height, bitrate: scene.width * scene.height * 4, framerate: fps });

    const frameDuration = 1e6 / fps;
    for (let i = 0; i < frameCount; i++) {
      if (failure) throw failure;
      this.drawScene(ctx, scene, i / fps);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDuration), duration: Math.round(frameDuration) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) {
        await new Promise(resolve => encoder.addEventListener('dequeue', resolve, { once: true }));
      }
      if (i % 10 === 0) {
        onProgress(i / frameCount);
        // Deja respirar a la interfaz (barra de progreso)
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    await encoder.flush();
    if (failure) throw failure;
    encoder.close();
    muxer.finalize();
    onProgress(1);
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), mimeType: 'video/mp4', extension: 'mp4', method: 'webcodecs' };
  }

  /** Alternativa sin WebCodecs: reproduce la escena en tiempo real y la graba (MP4 si el navegador puede, si no WebM) */
  renderRealtime({ scene, canvas, ctx, fps, onProgress }) {
    const candidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const mimeType = candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
    if (!mimeType) return Promise.reject(new Error('Este navegador no puede generar video'));

    return new Promise((resolve, reject) => {
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6e6 });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = (e) => reject(e.error || new Error('Error al grabar'));
      recorder.onstop = () => {
        const isMp4 = mimeType.startsWith('video/mp4');
        resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, extension: isMp4 ? 'mp4' : 'webm', method: 'realtime' });
      };
      const start = performance.now();
      recorder.start(250);
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        this.drawScene(ctx, scene, Math.min(t, scene.timing.total));
        onProgress(Math.min(1, t / scene.timing.total));
        if (t < scene.timing.total) requestAnimationFrame(tick);
        else recorder.stop();
      };
      requestAnimationFrame(tick);
    });
  }
}

window.VideoStudio = VideoStudio;
window.VIDEO_FORMATS = VIDEO_FORMATS;
