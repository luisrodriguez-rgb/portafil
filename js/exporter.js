/**
 * Exporter Engine Pro: Generador de SVG Animado Ultra Optimizado y Workflows
 * Máxima compresión de keyframes, eliminación de redundancias, sin saltos en bordes y peso reducido al mínimo.
 */

// Ondas de las celdas intensas cuando el SVG no cabe en el presupuesto de peso (120 KB)
const MAX_BURSTS = 60;
// Por encima de este peso la serpiente reparte menos ondas y, si aún no cabe, se vuelve a simular con
// mordiscos de varios niveles (1 -> 2 -> 4): menos pasos, giros y fotogramas. Queda bajo los 120 KB del presupuesto con cualquier nombre de usuario.
const SNAKE_BUDGET = 118 * 1024;

class ExporterEngine {
  constructor() {
    // Colores de shared/theme-tokens.js: los mismos que usan las tarjetas del kit
    this.themePalettes = ThemeTokens.snakePalettes();
  }

  /**
   * Genera y descarga un SVG animado ultra optimizado
   */
  exportAnimatedSvg(grid, username = 'developer', options = {}) {
    const svgFinal = this.buildAnimatedSvg(grid, options);
    if (!svgFinal) return;

    const blob = new Blob([svgFinal], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perfila-snake-${username}-${options.theme || 'ink'}-${options.speed || 'normal'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Punto de entrada: la serpiente o el modo de juego pedido con ?game= (shared/games.js) */
  buildSvg(grid, options = {}) {
    const game = options.game || 'snake';
    if (game !== 'snake' && typeof GameModes !== 'undefined' && GameModes.MODES.includes(game)) {
      return GameModes.buildSvg(game, grid, options);
    }
    return this.buildAnimatedSvg(grid, options);
  }

  /**
   * Estado según la actividad reciente (mood=auto): días seguidos sin contribuir antes de hoy y racha actual.
   * Hoy no cuenta si aún está a cero: el día no ha terminado. null si la matriz no tiene fechas (aleatoria, Commit Art).
   */
  activityOf(grid) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const days = [];
    for (const col of grid) for (const c of col) if (c && c.date && c.date <= today) days.push(c);
    if (days.length < 14) return null;
    days.sort((a, b) => (a.date < b.date ? -1 : 1));
    let i = days.length - 1;
    if (!days[i].count) i--;
    let idle = 0;
    while (i - idle >= 0 && !days[i - idle].count) idle++;
    let streak = 0;
    while (i - streak >= 0 && days[i - streak].count > 0) streak++;
    return { idle, streak, sleeping: idle >= 7 };
  }

  /** La serpiente duerme: tablero quieto, serpiente enroscada con los ojos cerrados y unas zetas que suben */
  buildSleepingSvg(grid, options, activity) {
    const palette = this.themePalettes[options.theme] || this.themePalettes.ink;
    const lang = options.lang === 'es' ? 'es' : 'en';
    const username = options.user ? String(options.user) : '';
    const cols = 53;
    const rows = 7;
    const cellSize = 11;
    const step = cellSize + 3.5;
    const padding = 16;
    const gridTop = padding + 30;
    const width = cols * step + padding * 2 - 3.5;
    const height = rows * step + padding * 2 - 3.5 + 30;
    const colors = [palette.empty, palette.l1, palette.l2, palette.l3, palette.l4];
    const at = (x, y) => [Math.round(padding + x * step), Math.round(gridTop + y * step)];

    let cells = '';
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const c = grid[x] && grid[x][y];
        const [cx, cy] = at(x, y);
        cells += `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${colors[c ? c.originalLevel || 0 : 0]}"/>`;
      }
    }
    // Enroscada al final del gráfico, donde se detuvieron los commits, con la cabeza mirando hacia el año
    const coil = [[49, 5], [49, 6], [50, 6], [51, 6], [51, 5]];
    let outline = '';
    let snake = '';
    coil.forEach(([x, y], k) => {
      const [sx, sy] = at(x, y);
      outline += `<rect x="${sx - 1.7}" y="${sy - 1.7}" width="14.4" height="14.4" rx="4" fill="#000" opacity=".55"/>`;
      snake += `<rect x="${sx - 0.5}" y="${sy - 0.5}" width="12" height="12" rx="3" fill="${palette.body}" opacity="${+(0.6 + 0.08 * k).toFixed(2)}"/>`;
    });
    const [hx, hy] = at(50, 5);
    snake = outline + `<rect x="${hx - 2.7}" y="${hy - 2.7}" width="16.4" height="16.4" rx="4.5" fill="#000" opacity=".55"/>` + snake
      + `<rect x="${hx - 1.5}" y="${hy - 1.5}" width="14" height="14" rx="3.5" fill="${palette.head}"/>`
      + `<path d="M${hx + 1.9} ${hy + 3.6}h3.6M${hx + 1.9} ${hy + 7.6}h3.6" stroke="${palette.bg}" stroke-width="1.3" stroke-linecap="round"/>`;
    const font = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    let zs = '';
    [0, 1, 2].forEach(k => {
      zs += `<text class="z z${k}" x="${hx - 12 - k * 8}" y="${hy - 4 - k * 6}" font-family="${font}" font-size="${9 + k * 2}" font-weight="700" fill="${palette.text}">z</text>`;
    });
    const zCss = '.z{animation:z 3.6s infinite ease-in-out;opacity:0}.z1{animation-delay:1.2s}.z2{animation-delay:2.4s}'
      + '@keyframes z{0%{opacity:0;transform:translateY(4px)}30%{opacity:.85}100%{opacity:0;transform:translateY(-10px)}}'
      + '@media (prefers-reduced-motion:reduce){.z{animation:none;opacity:.7}}';

    const n = activity.idle;
    const label = lang === 'es'
      ? `durmiendo · ${n} ${n === 1 ? 'día' : 'días'} sin contribuciones`
      : `asleep · ${n} ${n === 1 ? 'day' : 'days'} without contributions`;
    const title = [username ? `@${username}` : '', label].filter(Boolean).join(' · ');
    const credit = `sleeping snake on ${username ? `@${this.escapeXml(username)}` : 'a GitHub'} contribution graph by Perfila`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title>${credit}</title>`
      + `<style>svg{background:${palette.bg};border-radius:12px;border:1px solid ${palette.border}}${zCss}</style>`
      + `<text x="${padding}" y="${padding + 10}" font-family="${font}" font-size="12" font-weight="700" fill="${palette.text}">${this.escapeXml(title)}</text>`
      // Luces apagadas: el tablero se atenúa y la serpiente queda en primer plano
      + `<g opacity=".4">${cells}</g><g>${snake}</g>${zs}</svg>`;
  }

  /**
   * Construye el SVG animado como texto. Sin dependencias del DOM: lo usa también la GitHub Action.
   */
  buildAnimatedSvg(grid, options = {}) {
    if (!grid || grid.length === 0) return null;

    // Estados según la actividad: el duelo trae su propia simulación y no los usa
    const activity = options.mood === 'off' || options.simulation ? null : this.activityOf(grid);
    if (activity && activity.sleeping) return this.buildSleepingSvg(grid, options, activity);

    const themeKey = options.theme || 'ink';
    const palette = this.themePalettes[themeKey] || this.themePalettes.ink;
    const speedMode = options.speed || 'normal';
    const morphMode = options.morph || 'matrix_viper';
    const pauseMode = options.pause || 'fast';
    const lang = options.lang === 'es' ? 'es' : 'en';
    const username = options.user ? String(options.user) : '';

    const cols = 53;
    const rows = 7;
    const cellSize = 11;
    const cellGap = 3.5;
    const padding = 16;
    const headerHeight = 30;
    const stepSize = cellSize + cellGap;

    const width = (cols * stepSize) + (padding * 2) - cellGap;
    const height = (rows * stepSize) + (padding * 2) - cellGap + headerHeight;
    const gridTop = padding + headerHeight;
    const cellX = (x) => Math.round(padding + x * stepSize);
    const cellY = (y) => Math.round(gridTop + y * stepSize);

    // Prefijo de clases, keyframes e id del filtro: permite meter varios tableros en un mismo SVG (duelo)
    // sin que sus animaciones choquen. Vacío por defecto: el SVG de siempre.
    const n = options.ns || '';

    // 1-2. Simulación (solo depende de la matriz: se reutiliza entre temas, velocidades y formas).
    // El duelo pasa su propia simulación (options.simulation) para que el SVG dé el mismo ganador que la web.
    const biteSize = options.biteSize || 1;
    const { simGrid, history, cellBites, totalLevels, eatenLevels } = options.simulation || this.simulate(grid, cols, rows, biteSize);
    const totalSteps = history.length;

    // Duración según velocidad seleccionada
    let stepDuration = 0.11;
    if (speedMode === 'fast') stepDuration = 0.07;
    else if (speedMode === 'relaxed') stepDuration = 0.16;

    // La pausa final aloja la celebración y la ola que vuelve a llenar la matriz
    let pauseDuration = 1.5;
    if (pauseMode === 'medium') pauseDuration = 2.5;
    else if (pauseMode === 'none') pauseDuration = 0.0;

    const playDuration = totalSteps * stepDuration;
    const totalDuration = (playDuration + pauseDuration).toFixed(2);
    const activePercent = (playDuration / totalDuration) * 100;
    // Con miles de pasos, un decimal no basta para separar fotogramas consecutivos
    const pctOf = (step) => +((step / totalSteps) * activePercent).toFixed(3);
    const pctAt = (seconds) => +((seconds / totalDuration) * 100).toFixed(3);
    const active = +activePercent.toFixed(3);
    const waveSeconds = Math.min(1, pauseDuration * 0.6);
    const cleared = totalLevels > 0 && eatenLevels === totalLevels;

    // 3. Celdas: bajan de nivel con cada mordisco y al final reaparecen en ola de izquierda a derecha
    let gridSvg = '';
    let cellKeyframes = '';
    const colorVars = [palette.empty, palette.l1, palette.l2, palette.l3, palette.l4];

    for (let x = 0; x < cols; x++) {
      const restorePct = pctAt(playDuration + (waveSeconds * x) / (cols - 1));
      for (let y = 0; y < rows; y++) {
        const cell = simGrid[x][y];
        const origLevel = cell.originalLevel || 0;
        const bites = cellBites[`${x}_${y}`];

        if (origLevel > 0 && bites) {
          const animClass = `${n}c${x}_${y}`;
          // Sin fotograma 0%: la animación parte del atributo fill de la celda
          let frames = '';
          bites.forEach((biteStep, i) => {
            frames += `${pctOf(biteStep)}%{fill:${colorVars[Math.max(0, origLevel - (i + 1) * biteSize)]}}`;
          });
          frames += `${Math.max(restorePct, pctOf(bites[bites.length - 1] + 1))}%,100%{fill:${colorVars[origLevel]}}`;

          gridSvg += `<rect class="${animClass}" x="${cellX(x)}" y="${cellY(y)}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${colorVars[origLevel]}"/>`;
          cellKeyframes += `.${animClass}{animation-name:${animClass}}@keyframes ${animClass}{${frames}}`;
        } else {
          gridSvg += `<rect x="${cellX(x)}" y="${cellY(y)}" width="${cellSize}" height="${cellSize}" rx="2.5" fill="${colorVars[origLevel] || colorVars[0]}"/>`;
        }
      }
    }

    // 4. Trayectoria: una sola (la de la cabeza) y el cuerpo la sigue con retraso.
    // Solo se emiten los giros: la animación lineal interpola los tramos rectos.
    const snakeLen = history.reduce((max, h) => Math.max(max, h.length), 0);
    const toPx = (pos) => `${+(padding + pos.x * stepSize).toFixed(2)}px,${+(gridTop + pos.y * stepSize).toFixed(2)}px`;
    const positions = history.map(h => h[0]);
    const dirAt = (s) => {
      const from = positions[Math.max(0, s - 1)];
      const to = positions[Math.max(1, s)] || from;
      return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
    };
    const isTurn = (s) => {
      const prev = positions[s - 1];
      const next = positions[s + 1];
      const curr = positions[s];
      return (curr.x - prev.x) !== (next.x - curr.x) || (curr.y - prev.y) !== (next.y - curr.y);
    };

    let bodyFrames = '';
    for (let s = 0; s < totalSteps; s++) {
      if (s === 0 || s === totalSteps - 1 || isTurn(s)) {
        bodyFrames += `${pctOf(s)}%{transform:translate(${toPx(positions[s])})}`;
      }
    }
    bodyFrames += `${active}%{transform:translate(${toPx(positions[totalSteps - 1])})}`;
    // Salto instantáneo al inicio para que no cruce el tablero durante la pausa
    bodyFrames += `${+(activePercent + 0.001).toFixed(3)}%,100%{transform:translate(${toPx(positions[0])})}`;

    // Cabeza: se mueve con la animación del cuerpo (sin retraso) y gira aparte: al pasar cada curva rota
    // hacia la nueva dirección durante el primer tercio del paso. Solo giros: pocos bytes.
    const angleOf = (d) => (d.x === 1 ? 0 : d.x === -1 ? 180 : d.y === 1 ? 90 : -90);
    let angle = angleOf(dirAt(1));
    const firstAngle = angle;
    const nearest = (target) => {
      let a = target;
      while (a - angle > 180) a -= 360;
      while (angle - a > 180) a += 360;
      return a;
    };
    let headFrames = `0%{rotate:${angle}deg}`;
    for (let s = 1; s < totalSteps - 1; s++) {
      if (!isTurn(s)) continue;
      const out = { x: positions[s + 1].x - positions[s].x, y: positions[s + 1].y - positions[s].y };
      const next = nearest(angleOf(out));
      if (next === angle) continue;
      headFrames += `${pctOf(s)}%{rotate:${angle}deg}${pctOf(s + 1 / 3)}%{rotate:${next}deg}`;
      angle = next;
    }
    headFrames += `${active}%{rotate:${angle}deg}${+(activePercent + 0.001).toFixed(3)}%,100%{rotate:${firstAngle}deg}`;

    // Cuerpo continuo: un segmento cada medio paso, solapados, estrechándose y desvaneciéndose hacia la cola
    const bodyCount = morphMode === 'retro' ? snakeLen - 1 : (snakeLen - 1) * 2;
    const spacing = morphMode === 'retro' ? 1 : 0.5;
    let snakeKeyframes = `.${n}sb{animation:${n}s ${totalDuration}s infinite linear}@keyframes ${n}s{${bodyFrames}}`;
    snakeKeyframes += `.${n}hr{transform-box:view-box;transform-origin:${cellSize / 2}px ${cellSize / 2}px;animation:${n}h ${totalDuration}s infinite linear}@keyframes ${n}h{${headFrames}}`;
    // Dos pasadas: primero todos los contornos y luego todos los cuerpos. Con un contorno por segmento,
    // cada uno tapaba al anterior y el cuerpo parecía un collar de cuentas.
    let outlineElements = '';
    let bodyElements = '';
    for (let k = bodyCount; k >= 1; k--) {
      const t = k / bodyCount;
      snakeKeyframes += `.${n}k${k}{animation-delay:-${(totalDuration - k * spacing * stepDuration).toFixed(3)}s}`;
      const size = morphMode === 'retro' ? cellSize * 0.9 : +(12.5 - 5.5 * t).toFixed(2);
      const off = +((cellSize - size) / 2).toFixed(2);
      const rx = morphMode === 'retro' ? 0 : (morphMode === 'capsule' ? size / 2 : 3);
      const opacity = +(1 - 0.45 * t).toFixed(2);
      const core = morphMode === 'matrix_viper'
        ? `<rect x="${+(off + size * 0.32).toFixed(2)}" y="${+(off + size * 0.32).toFixed(2)}" width="${+(size * 0.36).toFixed(2)}" height="${+(size * 0.36).toFixed(2)}" rx="1" fill="${palette.spine}"/>`
        : '';
      outlineElements += `<rect class="${n}sb ${n}k${k}" x="${off - 1.2}" y="${off - 1.2}" width="${+(size + 2.4).toFixed(2)}" height="${+(size + 2.4).toFixed(2)}" rx="${rx}" fill="#000" opacity=".6"/>`;
      bodyElements += `<g class="${n}sb ${n}k${k}" opacity="${opacity}"><rect x="${off}" y="${off}" width="${size}" height="${size}" rx="${rx}" fill="${palette.body}"/>${core}</g>`;
    }
    let snakeElements = outlineElements + bodyElements;
    // Cabeza mirando hacia +x (el giro la orienta): dos ojos hacia el frente
    const headRx = morphMode === 'retro' ? 0 : (morphMode === 'capsule' ? 6 : 3.5);
    snakeElements += `<g class="${n}sb"><g class="${n}hr"><rect x="-1.5" y="-1.5" width="14" height="14" rx="${headRx}" fill="${palette.head}"/>`
      + `<circle cx="7.6" cy="3.2" r="2" fill="#fff"/><circle cx="7.6" cy="7.8" r="2" fill="#fff"/>`
      + `<circle cx="8.3" cy="3.2" r="1" fill="#000"/><circle cx="8.3" cy="7.8" r="1" fill="#000"/></g></g>`;

    // Ondas expansivas al terminar de comer una celda intensa (nivel 3-4). Van por encima de la serpiente
    // (un destello en la celda quedaba tapado por la cabeza) y un grupo de 4 anillos se reutiliza por turnos.
    const bursts = [];
    for (const [key, bites] of Object.entries(cellBites)) {
      const [bx, by] = key.split('_').map(Number);
      if (simGrid[bx][by].originalLevel >= 3) bursts.push({ step: bites[bites.length - 1], x: bx, y: by });
    }
    bursts.sort((p, q) => p.step - q.step);
    // En gráficos muy intensos casi todas las celdas tienen onda: si el SVG no cabe en el presupuesto,
    // se reparten como mucho MAX_BURSTS a lo largo de la partida (cada onda son ~100 bytes)
    if (options.trimmed && bursts.length > MAX_BURSTS) {
      const stride = bursts.length / MAX_BURSTS;
      bursts.splice(0, bursts.length, ...Array.from({ length: MAX_BURSTS }, (_, k) => bursts[Math.floor(k * stride)]));
    }
    // options.rings=false las quita (el duelo tiene dos tableros y no las necesita)
    const ringCount = options.rings === false ? 0 : Math.min(4, bursts.length);
    let ringElements = '';
    for (let r = 0; r < ringCount; r++) {
      let frames = '0%{opacity:0}';
      for (let i = r; i < bursts.length; i += ringCount) {
        const { step, x, y } = bursts[i];
        const at = `translate:${+(cellX(x) + cellSize / 2).toFixed(1)}px ${+(cellY(y) + cellSize / 2).toFixed(1)}px`;
        // Colocarlo invisible justo antes, para que no se deslice a la vista desde la onda anterior
        frames += `${pctOf(step - 0.05)}%{${at};scale:.3;opacity:0}${pctOf(step)}%{scale:.3;opacity:1}${pctOf(step + 3)}%{scale:1.9;opacity:0}`;
      }
      snakeKeyframes += `.${n}r${r}{animation:${n}r${r} ${totalDuration}s infinite linear}@keyframes ${n}r${r}{${frames}}`;
      ringElements += `<circle class="${n}r${r}" r="8" fill="none" stroke="${palette.head}" stroke-width="2" opacity="0"/>`;
    }

    // Durante la pausa final la serpiente se desvanece: la cabeza vuelve al inicio y el cuerpo, que la sigue
    // con retraso, todavía estaría al final del recorrido
    if (pauseDuration > 0) {
      snakeKeyframes += `.${n}sn{animation:${n}v ${totalDuration}s infinite linear}@keyframes ${n}v{0%,${active}%{opacity:1}${pctAt(playDuration + 0.25)}%,99.9%{opacity:0}100%{opacity:1}}`;
    }

    // 5. Cabecera: usuario, contribuciones del año y barra de progreso sincronizada con los mordiscos
    let totalContributions = 0;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const c = grid[x] && grid[x][y];
        if (c && c.originalLevel > 0) totalContributions += c.count || 0;
      }
    }
    const sep = lang === 'es' ? '.' : ',';
    const formatted = String(totalContributions).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const streak = activity && activity.streak >= 7 ? activity.streak : 0;
    const texts = lang === 'es'
      ? { contributions: streak ? `${formatted} contribuciones · racha de ${streak} días` : `${formatted} contribuciones en el último año`, cleared: '100% DEVORADO' }
      : { contributions: streak ? `${formatted} contributions · ${streak}-day streak` : `${formatted} contributions in the last year`, cleared: '100% DEVOURED' };
    // options.headline sustituye el total del año (el duelo pone ahí la puntuación)
    const title = [username ? `@${username}` : '', options.headline || texts.contributions].filter(Boolean).join(' · ');

    const barWidth = 150;
    const barX = width - padding - barWidth;
    // Cada mordisco quita biteSize niveles (o los que queden en la celda)
    const allBites = [];
    for (const [key, bites] of Object.entries(cellBites)) {
      const [bx, by] = key.split('_').map(Number);
      const level = simGrid[bx][by].originalLevel;
      bites.forEach((step, i) => allBites.push({ step, amount: Math.min(biteSize, level - i * biteSize) }));
    }
    allBites.sort((p, q) => p.step - q.step);
    let eatenSoFar = 0;
    let progressFrames = '0%{transform:scaleX(0)}';
    let lastEmitted = 0;
    allBites.forEach(({ step: biteStep, amount }, i) => {
      eatenSoFar += amount;
      const fraction = eatenSoFar / Math.max(1, totalLevels);
      if (fraction - lastEmitted >= 0.02 || i === allBites.length - 1) {
        progressFrames += `${pctOf(biteStep)}%{transform:scaleX(${+fraction.toFixed(3)})}`;
        lastEmitted = fraction;
      }
    });
    progressFrames += `${active}%,100%{transform:scaleX(${+(eatenLevels / Math.max(1, totalLevels)).toFixed(3)})}`;

    const font = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    let headerSvg = `<text x="${padding}" y="${padding + 10}" font-family="${font}" font-size="12" font-weight="700" fill="${palette.text}">${this.escapeXml(title)}</text>`
      + `<rect x="${barX}" y="${padding + 2}" width="${barWidth}" height="8" rx="4" fill="${palette.empty}"/>`
      + `<rect class="${n}pb" x="${barX}" y="${padding + 2}" width="${barWidth}" height="8" rx="4" fill="${palette.body}"/>`;
    let headerCss = `.${n}pb{transform-box:fill-box;transform-origin:left;animation:${n}p ${totalDuration}s infinite linear}@keyframes ${n}p{${progressFrames}}`;
    if (cleared && pauseDuration > 0) {
      // Celebración durante la pausa: el texto aparece mientras la matriz vuelve a llenarse
      headerSvg += `<text class="${n}dn" x="${barX - 10}" y="${padding + 10}" text-anchor="end" font-family="${font}" font-size="12" font-weight="800" fill="${palette.head}">${texts.cleared}</text>`;
      headerCss += `.${n}dn{opacity:0;animation:${n}d ${totalDuration}s infinite steps(1,end)}@keyframes ${n}d{0%{opacity:0}${active}%{opacity:1}${pctAt(playDuration + pauseDuration * 0.92)}%,100%{opacity:0}}`;
    }

    // 6. SVG Minificado Final
    const credit = username
      ? `snake eating @${this.escapeXml(username)} contributions by Perfila`
      : 'snake eating a GitHub contribution graph by Perfila';
    // Con prefijo (tablero dentro de otro SVG) el fondo es un rect: el fondo CSS solo se pinta en el <svg> raíz
    const frameCss = n ? '' : `svg{background:${palette.bg};border-radius:12px;border:1px solid ${palette.border}}`;
    const frameRect = n ? `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="11.5" fill="${palette.bg}" stroke="${palette.border}"/>` : '';
    // Con movimiento reducido queda el gráfico completo, sin serpiente ni barra de progreso a medias
    // Todas las celdas animadas comparten duración y ritmo; cada una solo nombra sus fotogramas
    const cellCss = cellKeyframes ? `.${n}gc>[class]{animation-duration:${totalDuration}s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}` : '';
    const reducedCss = `@media (prefers-reduced-motion:reduce){*{animation:none!important}.${n}sn,.${n}pb,.${n}dn{display:none}}`;
    const svgFinal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title>${credit}</title><defs><filter id="${n}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><style>${frameCss}${headerCss}${cellCss}${cellKeyframes}${snakeKeyframes}${reducedCss}</style>${frameRect}${headerSvg}<g class="${n}gc">${gridSvg}</g><g class="${n}sn" filter="url(#${n}g)">${snakeElements}</g><g filter="url(#${n}g)">${ringElements}</g></svg>`;

    // Fuera del presupuesto: primero menos ondas y después mordiscos de 2 y de 4 niveles
    if (!options.simulation && svgFinal.length > SNAKE_BUDGET) {
      if (!options.trimmed) return this.buildAnimatedSvg(grid, { ...options, trimmed: true });
      if (biteSize < 4) return this.buildAnimatedSvg(grid, { ...options, biteSize: biteSize * 2 });
    }
    return svgFinal;
  }

  escapeXml(text) {
    return String(text).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
  }

  /**
   * Rutas de salida de la Action según el estilo elegido.
   * style: { adaptive, darkTheme, lightTheme, morph, speed, pause }
   * adaptive=false usa solo darkTheme (el estilo único).
   */
  workflowOutputs(style = {}) {
    const query = (theme) => {
      const params = new URLSearchParams({ theme });
      // Solo se escriben las opciones distintas de las de la Action, para que el YAML quede corto
      if (style.morph && style.morph !== 'matrix_viper') params.set('morph', style.morph);
      if (style.speed && style.speed !== 'normal') params.set('speed', style.speed);
      if (style.pause && style.pause !== 'fast') params.set('pause', style.pause);
      if (style.lang && style.lang !== 'en') params.set('lang', style.lang);
      return params.toString();
    };
    const darkTheme = style.darkTheme || 'ink';

    if (style.adaptive === false) {
      return [{ file: 'perfila-snake.svg', query: query(darkTheme) }];
    }
    return [
      { file: 'perfila-snake.svg', query: query(style.lightTheme || 'paper') },
      { file: 'perfila-snake-dark.svg', query: query(darkTheme) }
    ];
  }

  /**
   * Recorrido completo de la serpiente sobre la matriz original. El resultado no depende de las opciones del SVG,
   * así que se memoriza por contenido de la matriz: la versión clara y la oscura de un perfil simulan una sola vez.
   * Quien lo use solo debe leerlo.
   */
  simulate(grid, cols = 53, rows = 7, biteSize = 1) {
    let signature = `${biteSize}:`;
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const c = grid[x] && grid[x][y];
        signature += c ? c.originalLevel : 0;
      }
    }
    this.simulationCache = this.simulationCache || new Map();
    const cached = this.simulationCache.get(signature);
    if (cached) return cached;

    // Se parte de la matriz original: en la web la partida en curso ya se ha comido celdas
    const simGrid = [];
    let remainingLevels = 0;
    for (let x = 0; x < cols; x++) {
      const col = [];
      for (let y = 0; y < rows; y++) {
        const c = grid[x] && grid[x][y];
        const level = c ? c.originalLevel : 0;
        remainingLevels += level;
        col.push({ x, y, level, originalLevel: level });
      }
      simGrid.push(col);
    }

    // Empieza junto a la primera columna con actividad: en perfiles nuevos no cruza medio tablero vacío
    let start = { x: 0, y: 0 };
    findStart:
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (simGrid[x][y].level > 0) {
          start = { x: Math.max(0, x - 1), y };
          break findStart;
        }
      }
    }
    const totalLevels = remainingLevels;
    const simSnake = new Snake(4, start);
    simSnake.effects = false;
    const simPathfinder = new SnakePathfinder(cols, rows);
    const history = [];
    const cellBites = {}; // key -> pasos en los que la serpiente quitó un nivel
    // Margen amplio: cada nivel exige volver a pisar la celda
    const maxSteps = Math.min(8000, 400 + remainingLevels * 30);

    let step = 0;
    history.push(simSnake.body.map(seg => ({ x: seg.x, y: seg.y })));
    while (remainingLevels > 0 && step < maxSteps) {
      const next = simPathfinder.findNextStep(simSnake, simGrid);
      if (!next) break;

      step++;
      const target = simGrid[next.x][next.y];
      if (target.level > 0) {
        const key = `${next.x}_${next.y}`;
        (cellBites[key] = cellBites[key] || []).push(step);
        // moveTo quita un nivel; con mordiscos mayores se quitan aquí los demás
        const amount = Math.min(biteSize, target.level);
        target.level -= amount - 1;
        remainingLevels -= amount;
      }

      simSnake.moveTo(next, simGrid);
      history.push(simSnake.body.map(seg => ({ x: seg.x, y: seg.y })));
    }

    const result = { simGrid, history, cellBites, totalLevels, eatenLevels: totalLevels - remainingLevels };
    this.simulationCache.set(signature, result);
    // Pocas entradas: el endpoint y la web solo alternan entre unas pocas matrices
    if (this.simulationCache.size > 20) {
      this.simulationCache.delete(this.simulationCache.keys().next().value);
    }
    return result;
  }

  generateWorkflowYaml(username = 'USUARIO', style = {}) {
    const outputs = this.workflowOutputs(style)
      .map(o => `            dist/${o.file}?${o.query}`)
      .join('\n');

    return `name: Perfila snake

on:
  # Se regenera cada dia a medianoche (UTC)
  schedule:
    - cron: "0 0 * * *"
  # Permite ejecutarlo a mano desde la pestana Actions
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Generate Snake SVG
        uses: ${Brand.actionRef}
        with:
          github_user_name: ${username}
          outputs: |
${outputs}

      - name: Deploy to Output Branch
        uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;
  }

  /**
   * Bloque para el README. Con apiBase apunta al endpoint SVG (sin workflow);
   * sin él, a la rama output que publica la Action.
   */
  generateReadmeSnippet(username = 'USUARIO', style = {}, apiBase = '') {
    const safeUser = String(username).replace(/[^A-Za-z0-9-]/g, '') || 'user';
    const base = `https://raw.githubusercontent.com/${safeUser}/${safeUser}/output`;
    const alt = `snake eating @${safeUser} contributions by Perfila`;
    const urlFor = (output) => (apiBase ? `${apiBase}/api/${safeUser}.svg?${output.query}` : `${base}/${output.file}`);
    const [light, dark] = this.workflowOutputs(style);

    if (style.adaptive === false) {
      return `<img alt="${alt}" src="${urlFor(light)}" width="100%">`;
    }
    return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${urlFor(dark)}">
  <source media="(prefers-color-scheme: light)" srcset="${urlFor(light)}">
  <img alt="${alt}" src="${urlFor(light)}" width="100%">
</picture>`;
  }
}

window.ExporterEngine = ExporterEngine;
