/**
 * Modos de juego en el estudio: juego de la vida, Pac-Man, invasores y Tetris sobre tu gráfico, en vivo.
 * Usa la misma interfaz que los SVG del README (GameModes.create / step / view, en shared/games.js):
 * con "Juegas tú" desactivado juega la IA, la misma partida que verías en tu perfil; activado, la juegas tú.
 * Dibuja en un canvas con las medidas y colores de las piezas (797×160, tema del selector "Estilo").
 */
// Se leen antes de que arranque el estudio: al cargar el perfil, app.js reescribe la URL sin estos parámetros
const arcadeLinkParams = new URLSearchParams(location.search);

document.addEventListener('DOMContentLoaded', () => {
  const studio = window.PortafilStudio;
  if (!studio || typeof GameModes === 'undefined') return;

  const $ = (id) => document.getElementById(id);
  const canvas = $('arcadeCanvas');
  const snakeCanvas = $('snakeCanvas');
  const select = $('gameSelect');
  const playerBox = $('arcadePlayer');
  const playerWrap = $('arcadePlayerWrap');
  const hint = $('arcadeHint');
  const ctx = canvas.getContext('2d');
  const L = GameModes.layout();

  const TEXT = {
    es: {
      names: { life: 'juego de la vida', pacman: 'pac-man', invaders: 'invasores', tetris: 'tetris' },
      hintAi: 'Juega la IA: es la misma partida que se ve en tu perfil. Activa «Juegas tú» para tomar el control.',
      hint: {
        life: 'Haz clic en una celda para darle vida o quitársela. <kbd>Espacio</kbd> pausa.',
        pacman: 'Muévete con <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> o <kbd>WASD</kbd>. Las celdas más intensas asustan a los fantasmas.',
        invaders: 'Muévete con <kbd>←</kbd><kbd>→</kbd> y dispara con <kbd>Espacio</kbd>. Las celdas intensas aguantan dos disparos.',
        tetris: 'Las piezas caen hacia el pasado. <kbd>↑</kbd><kbd>↓</kbd> cambian de fila, <kbd>Espacio</kbd> gira y <kbd>←</kbd> la deja caer.'
      },
      restart: '<kbd>R</kbd> reinicia.',
      status: {
        life: (v) => `Generación ${v.score}`,
        pacman: (v) => `${v.score} pts · ${v.lives} ${v.lives === 1 ? 'vida' : 'vidas'}`,
        invaders: (v) => `${v.score} impactos`,
        tetris: (v) => `${v.score} semanas completas · ${v.pieces} ${v.pieces === 1 ? 'pieza' : 'piezas'}`
      },
      lifeEnd: { stable: 'estable', extinct: 'extinguido', cycle: 'oscila', limit: 'en pausa' },
      over: 'Fin de la partida',
      again: 'Pulsa R para jugar otra vez',
      left: 'restante',
      pts: 'Puntos'
    },
    en: {
      names: { life: 'game of life', pacman: 'pac-man', invaders: 'invaders', tetris: 'tetris' },
      hintAi: 'The AI is playing: the same game shown on your profile. Turn on “You play” to take control.',
      hint: {
        life: 'Click a cell to bring it to life or kill it. <kbd>Space</kbd> pauses.',
        pacman: 'Move with <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> or <kbd>WASD</kbd>. The brightest cells scare the ghosts.',
        invaders: 'Move with <kbd>←</kbd><kbd>→</kbd> and shoot with <kbd>Space</kbd>. Bright cells take two shots.',
        tetris: 'Pieces fall toward the past. <kbd>↑</kbd><kbd>↓</kbd> change row, <kbd>Space</kbd> rotates and <kbd>←</kbd> drops.'
      },
      restart: '<kbd>R</kbd> restarts.',
      status: {
        life: (v) => `Generation ${v.score}`,
        pacman: (v) => `${v.score} pts · ${v.lives} ${v.lives === 1 ? 'life' : 'lives'}`,
        invaders: (v) => `${v.score} hits`,
        tetris: (v) => `${v.score} full weeks · ${v.pieces} ${v.pieces === 1 ? 'piece' : 'pieces'}`
      },
      lifeEnd: { stable: 'stable', extinct: 'extinct', cycle: 'oscillating', limit: 'paused' },
      over: 'Game over',
      again: 'Press R to play again',
      left: 'left',
      pts: 'Points'
    }
  };
  const lang = () => (typeof I18n !== 'undefined' && I18n.lang === 'en' ? 'en' : 'es');
  const T = () => TEXT[lang()];

  // Pasos por segundo de cada modo (la IA y el jugador)
  const TICK_MS = {
    life: { ai: 350, player: 350 },
    pacman: { ai: 120, player: 160 },
    invaders: { ai: 80, player: 70 },
    tetris: { ai: 60, player: 55 }
  };

  let mode = 'snake';
  let state = null;
  let grid = null;
  let paused = false;
  let last = 0;
  let restartAt = 0;
  let pending = {};
  const held = new Set();

  const player = () => mode !== 'life' && playerBox.checked;
  const tokens = () => ThemeTokens.get(document.body.getAttribute('data-theme'));

  // --- Canvas a la resolución de la pantalla, dibujando en coordenadas del SVG ---
  function resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(L.width * dpr);
    canvas.height = Math.round(L.height * dpr);
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${L.width}px`;
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start() {
    grid = studio.grid();
    state = GameModes.create(mode, grid, {
      player: player(),
      // En vivo no hay límite de peso: el juego de la vida sigue mientras cambie
      ...(mode === 'life' ? { maxGens: Infinity, minGens: Infinity, budget: Infinity } : {}),
      ...(mode === 'pacman' && player() ? { maxTicks: Infinity } : {}),
      ...(mode === 'invaders' && player() ? { maxTicks: Infinity } : {})
    });
    restartAt = 0;
    pending = {};
    paused = false;
    updateHint();
  }

  // Textos del marcador del estudio que el modo sobrescribe; se devuelven al volver a la serpiente
  const saved = {};
  for (const id of ['statState', 'statP1Score', 'labelP1', 'statRemaining']) saved[id] = $(id).textContent;

  function activate(next) {
    const was = mode;
    mode = next;
    const on = mode !== 'snake';
    if (was === 'snake' && on) for (const id of Object.keys(saved)) saved[id] = $(id).textContent;
    if (!on) for (const [id, text] of Object.entries(saved)) $(id).textContent = text;
    studio.setArcade(on);
    canvas.hidden = !on;
    snakeCanvas.hidden = on;
    // Lo que solo tiene sentido para la serpiente: su barra de progreso y la longitud
    document.querySelector('.board .progress').hidden = on;
    $('cardP2').hidden = on;
    hint.hidden = !on;
    playerWrap.hidden = !on || mode === 'life';
    canvas.classList.toggle('clickable', mode === 'life');
    if (on) {
      resize();
      start();
    }
  }

  function updateHint() {
    if (mode === 'snake') return;
    const t = T();
    hint.innerHTML = `${player() || mode === 'life' ? t.hint[mode] : t.hintAi} ${t.restart}`;
  }

  // --- Entrada ---
  function inputFor() {
    if (!player() && mode !== 'life') return null;
    let input = null;
    if (mode === 'pacman' && pending.dir !== undefined) input = { dir: pending.dir };
    if (mode === 'invaders') {
      const move = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      input = { move, fire: held.has('fire') || pending.fire };
    }
    if (mode === 'tetris') input = { dy: pending.dy || 0, rotate: pending.rotate, drop: pending.drop };
    if (mode === 'life' && pending.toggle) input = { toggle: pending.toggle };
    pending = {};
    return input;
  }

  const KEYS = {
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'fire'
  };

  function press(key) {
    if (key === 'restart') { start(); return; }
    if (mode === 'life' && key === 'fire') { paused = !paused; return; }
    if (!player()) return;
    if (mode === 'pacman') {
      const dir = { right: 0, down: 1, left: 2, up: 3 }[key];
      if (dir !== undefined) pending.dir = dir;
    }
    if (mode === 'invaders' && key === 'fire') pending.fire = true;
    if (mode === 'tetris') {
      if (key === 'up') pending.dy = -1;
      if (key === 'down') pending.dy = 1;
      if (key === 'fire') pending.rotate = true;
      if (key === 'left') pending.drop = true;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (mode === 'snake') return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    if (e.key === 'r' || e.key === 'R') { press('restart'); return; }
    const key = KEYS[e.key];
    if (!key) return;
    e.preventDefault();
    held.add(key);
    if (!e.repeat) press(key);
  });
  window.addEventListener('keyup', (e) => { const key = KEYS[e.key]; if (key) held.delete(key); });

  document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => btn.addEventListener('click', () => {
    if (mode !== 'snake') press(btn.getAttribute('data-dir'));
  }));
  $('dpadActionBtn').addEventListener('click', () => { if (mode !== 'snake') press('fire'); });

  // En el juego de la vida, clic en una celda la enciende o la apaga
  canvas.addEventListener('click', (e) => {
    if (mode !== 'life') return;
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * L.width;
    const py = ((e.clientY - r.top) / r.height) * L.height;
    const x = Math.floor((px - L.pad) / L.step);
    const y = Math.floor((py - L.gridTop) / L.step);
    if (x >= 0 && y >= 0 && x < GameModes.COLS && y < GameModes.ROWS) {
      pending.toggle = [x, y];
      if (paused || (state && state.done)) {
        state.done = false;
        GameModes.step(state, inputFor());
        draw(performance.now());
      }
    }
  });

  // Los controles del tablero del estudio también sirven aquí
  $('playPauseBtn').addEventListener('click', () => { if (mode !== 'snake') paused = !paused; });
  $('resetBtn').addEventListener('click', () => { if (mode !== 'snake') start(); });
  $('stepBtn').addEventListener('click', () => {
    if (mode === 'snake' || !state) return;
    paused = true;
    GameModes.step(state, inputFor());
  });
  select.addEventListener('change', () => {
    activate(select.value);
    syncTabs();
  });

  // Pestañas de modo, a partir de las opciones del select (sus textos los traduce i18n)
  const tabs = $('gameTabs');
  function buildTabs() {
    tabs.innerHTML = '';
    for (const opt of select.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.mode = opt.value;
      b.textContent = opt.textContent;
      b.addEventListener('click', () => {
        if (select.value === opt.value) return;
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));
      });
      tabs.appendChild(b);
    }
    syncTabs();
  }
  function syncTabs() {
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === select.value)));
    $('morphWrap').hidden = select.value !== 'snake';
  }
  buildTabs();
  window.addEventListener('languagechange-app', () => setTimeout(buildTabs, 0));

  // Enlaces desde la web: ?game= abre ese modo y ?t= ese estilo
  const params = arcadeLinkParams;
  const theme = params.get('t');
  const themeSelect = $('themeSelect');
  if (theme && [...themeSelect.options].some(o => o.value === theme)) {
    themeSelect.value = theme;
    themeSelect.dispatchEvent(new Event('change'));
  }
  if (GameModes.MODES.includes(params.get('game'))) {
    select.value = params.get('game');
    select.dispatchEvent(new Event('change'));
  }
  playerBox.addEventListener('change', () => { if (mode !== 'snake') start(); });
  window.addEventListener('languagechange-app', updateHint);
  window.addEventListener('resize', () => { if (mode !== 'snake') resize(); });

  // --- Dibujo ---
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  const GHOST = new Path2D('M0 11V5.5a5.5 5.5 0 0 1 11 0V11l-1.85-1.6-1.85 1.6-1.8-1.6-1.8 1.6-1.85-1.6z');
  const SHIP = new Path2D('M0 8V5h2V3.5h3V0h1v3.5h3V5h2v3z');

  function draw(now) {
    const tk = tokens();
    const v = GameModes.view(state);
    const colors = [tk.empty, tk.l1, tk.l2, tk.l3, tk.l4];
    ctx.clearRect(0, 0, L.width, L.height);
    ctx.fillStyle = tk.bg;
    roundRect(0, 0, L.width, L.height, 12);
    ctx.fill();

    // Cabecera como en las piezas: modo y marcador a la izquierda, progreso a la derecha
    const t = T();
    ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.fillStyle = tk.text;
    ctx.textBaseline = 'alphabetic';
    const title = `${t.names[mode]} · ${t.status[mode](v)}`;
    // El juego de la vida no se pierde: se estabiliza, se extingue u oscila (y se puede revivir con un clic)
    const ending = mode === 'life' ? t.lifeEnd[state.end] : t.over;
    ctx.fillText(state.done ? `${title} · ${ending}` : title, L.pad, L.pad + 10);
    const barX = L.width - L.pad - 150;
    ctx.fillStyle = tk.empty;
    roundRect(barX, L.pad + 2, 150, 8, 4);
    ctx.fill();
    ctx.fillStyle = tk.body;
    roundRect(barX, L.pad + 2, Math.max(0, 150 * Math.min(1, v.progress || 0)), 8, 4);
    ctx.fill();

    for (let x = 0; x < GameModes.COLS; x++) {
      for (let y = 0; y < GameModes.ROWS; y++) {
        ctx.fillStyle = colors[v.levels[x][y]] || colors[0];
        roundRect(L.cellX(x), L.cellY(y), L.cell, L.cell, 2.5);
        ctx.fill();
      }
    }

    const neutral = ['ink', 'paper'].includes(document.body.getAttribute('data-theme'));
    for (const a of v.actors) {
      const x = L.pad + a.x * L.step;
      const y = L.gridTop + a.y * L.step;
      ctx.save();
      if (a.kind === 'pac') {
        const open = 0.15 + 0.5 * Math.abs(Math.sin(now / 90));
        ctx.translate(x + 5.5, y + 5.5);
        ctx.rotate((a.dir * Math.PI) / 2);
        ctx.fillStyle = tk.body;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 6.5, open, Math.PI * 2 - open);
        ctx.closePath();
        ctx.fill();
      } else if (a.kind === 'ghost') {
        ctx.translate(x, y);
        ctx.fillStyle = a.scared ? (neutral ? tk.l1 : tk.muted) : (neutral ? tk.l3 : tk.head);
        ctx.fill(GHOST);
        ctx.fillStyle = '#fff';
        for (const ex of [3.7, 7.3]) { ctx.beginPath(); ctx.arc(ex, 5, 1.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#111';
        for (const ex of [4.1, 7.7]) { ctx.beginPath(); ctx.arc(ex, 5.2, 0.8, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.kind === 'ship') {
        ctx.translate(x, L.gridTop + GameModes.ROWS * L.step - 2);
        ctx.fillStyle = tk.body;
        ctx.fill(SHIP);
      } else if (a.kind === 'bullet') {
        ctx.fillStyle = tk.head;
        roundRect(x + 4.5, L.gridTop + a.y * L.step, 2, 5, 1);
        ctx.fill();
      }
      ctx.restore();
    }

    if (state.done && player()) {
      ctx.fillStyle = tk.bg;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(0, L.gridTop - 4, L.width, GameModes.ROWS * L.step + 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = tk.text;
      ctx.font = '700 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${t.over} · ${t.again}`, L.width / 2, L.gridTop + 54);
      ctx.textAlign = 'start';
    }

    // Cifras del estudio: estado y puntuación del modo
    $('statState').textContent = state.done ? (mode === 'life' ? t.lifeEnd[state.end] : t.over) : t.status[mode](v);
    $('statP1Score').textContent = String(v.score);
    $('labelP1').textContent = t.pts;
    $('statRemaining').textContent = `${Math.round((1 - (v.progress || 0)) * 100)}% ${t.left}`;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (mode === 'snake' || !state) return;
    // Si se carga otro perfil en el estudio, la partida empieza de nuevo con su gráfico
    if (studio.grid() !== grid) start();
    const tick = TICK_MS[mode][player() ? 'player' : 'ai'];
    if (!paused && !state.done && now - last >= tick) {
      last = now;
      GameModes.step(state, inputFor());
    }
    // La IA vuelve a empezar sola; el jugador decide cuándo con R
    if (state.done && !player() && mode !== 'life') {
      if (!restartAt) restartAt = now + 2500;
      else if (now >= restartAt) start();
    }
    draw(now);
  }
  requestAnimationFrame(loop);
});
