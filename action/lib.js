/**
 * Portafil · GitHub Action
 * Ejecuta el mismo motor del navegador (pathfinding, serpiente y exportador SVG) en Node.js,
 * sin dependencias, y escribe los SVG animados en las rutas pedidas.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ENGINE_FILES = ['shared/brand.js', 'shared/theme-tokens.js', 'js/calendar.js', 'js/github.js', 'js/pathfinding.js', 'js/snake.js', 'js/exporter.js', 'shared/snake-core.js', 'shared/kit-snippet.js', 'js/duel.js', 'shared/games.js'];

/** Carga los scripts del navegador en un contexto aislado y devuelve sus clases */
function loadEngine() {
  const sandbox = { console, Math, Date, Map, Set, URLSearchParams };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ENGINE_FILES) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  return sandbox;
}

const core = loadEngine().SnakeCore;
const OPTION_VALUES = core.OPTION_VALUES;

function weeksToGrid(weeks, cols, rows) {
  return core.weeksToGrid(weeks, cols, rows);
}

/** Respaldo sin token: API pública de terceros, procesada por el mismo parser que la web */
async function fetchGridFromPublicApi(engine, username) {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`);
  if (!res.ok) {
    throw new Error(`github-contributions-api respondió ${res.status}`);
  }
  const data = await res.json();
  if (!data.contributions || data.contributions.length === 0) {
    throw new Error(`Sin contribuciones para '${username}'`);
  }
  return new engine.GitHubFetcher().parseApiContributions(data.contributions);
}

/**
 * Interpreta líneas tipo "dist/snake.svg?theme=dark&speed=fast".
 * Devuelve [{ file, options }] o lanza un error con la opción no válida.
 */
function parseOutputs(text) {
  const lines = String(text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("El input 'outputs' está vacío");
  }

  return lines.map(line => {
    const [file, query = ''] = line.split('?');
    if (!file.endsWith('.svg')) {
      throw new Error(`La salida '${file}' debe terminar en .svg`);
    }
    const params = new URLSearchParams(query);
    let options;
    if (params.get('kind') === 'companion' || params.has('skin') || params.has('variant') || params.has('state')) {
      const say = params.get('say');
      params.delete('say');
      params.delete('kind');
      options = { ...core.parseOptions(params.toString(), line, core.COMPANION_OPTION_VALUES), kind: 'companion' };
      if (say !== null && String(say).trim() !== '') options.say = String(say).trim().slice(0, 110);
    } else {
      options = { ...core.parseOptions(query, line) };
    }
    // Objeto del contexto principal: el del sandbox tiene otro prototipo y falla en deepStrictEqual
    return { file, options };
  });
}

function gridToWeeks(grid) {
  return (grid || []).map(col => ({
    contributionDays: col.filter(c => c && c.date).map(c => ({
      date: c.date,
      weekday: c.y,
      contributionCount: c.count || 0
    }))
  })).filter(w => w.contributionDays.length > 0);
}

async function run({ username, outputs, token, cwd = process.cwd(), log = console.log }) {
  if (!username) {
    throw new Error("Falta el input 'github_user_name'");
  }
  const targets = parseOutputs(outputs);
  const engine = loadEngine();

  let grid;
  if (token) {
    grid = engine.SnakeCore.weeksToGrid(await engine.SnakeCore.fetchCalendarWeeks(username, token, fetch));
    log(`Contribuciones de @${username} leídas desde la API GraphQL de GitHub`);
  } else {
    grid = await fetchGridFromPublicApi(engine, username);
    log(`Contribuciones de @${username} leídas desde github-contributions-api (sin token)`);
  }

  const exporter = new engine.ExporterEngine();
  const weeks = gridToWeeks(grid);
  for (const { file, options } of targets) {
    let svg;
    if (options.kind === 'companion') {
      const { renderCard } = require('../server/cards');
      const { T } = require('../server/cards/frame');
      svg = renderCard('companion', {
        weeks,
        tokens: T.get(options.theme),
        lang: options.lang === 'es' ? 'es' : 'en',
        login: username,
        options
      });
    } else {
      svg = exporter.buildSvg(grid, { ...options, user: username });
    }
    const fullPath = path.resolve(cwd, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, svg);
    log(`Generado ${file} (${(svg.length / 1024).toFixed(1)} KB)`);
  }
}

module.exports = { loadEngine, weeksToGrid, gridToWeeks, parseOutputs, run, OPTION_VALUES, ENGINE_FILES };
