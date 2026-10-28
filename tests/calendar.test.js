const test = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const { renderCalendarJson, handler } = require('../server/calendar');
const { calendarCache } = require('../server/common');
const { loadEngine } = require('../action/lib');

const LEVEL_NAMES = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

function graphqlWeeks() {
  const weeks = [];
  const start = Date.UTC(2025, 9, 26); // domingo
  for (let w = 0; w < 53; w++) {
    weeks.push({
      contributionDays: Array.from({ length: 7 }, (_, d) => {
        const date = new Date(start + (w * 7 + d) * 86400000).toISOString().slice(0, 10);
        return { date, weekday: d, contributionCount: (w + d) % 5, contributionLevel: LEVEL_NAMES[(w + d) % 5] };
      })
    });
  }
  return weeks;
}

const okFetch = async () => ({
  ok: true,
  json: async () => ({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: graphqlWeeks() } } } } })
});

test('devuelve el calendario en el formato que la web ya sabe leer', async () => {
  calendarCache.clear();
  const res = await renderCalendarJson({ user: 'octocat', token: 't', fetchImpl: okFetch });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['Content-Type'], /^application\/json/);
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], '*');
  const data = JSON.parse(res.body);
  assert.strictEqual(data.contributions.length, 53 * 7);
  assert.deepStrictEqual(data.contributions[1], { date: '2025-10-27', count: 1, level: 1 });

  // El parser de la web (el mismo que usa con la API de terceros) acepta la respuesta
  const engine = loadEngine();
  const grid = new engine.GitHubFetcher().parseApiContributions(data.contributions);
  assert.strictEqual(grid.length, 53);
});

test('errores como JSON con el código HTTP correcto', async () => {
  calendarCache.clear();
  assert.strictEqual((await renderCalendarJson({ user: '../x', token: 't', fetchImpl: okFetch })).status, 400);
  assert.strictEqual((await renderCalendarJson({ user: 'octocat', token: '', fetchImpl: okFetch })).status, 500);
  calendarCache.clear();
  const missing = await renderCalendarJson({
    user: 'nadie', token: 't',
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }) })
  });
  assert.strictEqual(missing.status, 404);
  assert.match(JSON.parse(missing.body).error, /nadie/);
});

test('el adaptador HTTP lee /api/calendar/<usuario>.json y comprime', async () => {
  calendarCache.clear();
  const realFetch = global.fetch;
  const realToken = process.env.GITHUB_TOKEN;
  global.fetch = okFetch;
  process.env.GITHUB_TOKEN = 'tkn';
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } };
  try {
    await handler({ url: '/api/calendar/octocat.json', method: 'GET', headers: { 'accept-encoding': 'gzip' } }, res);
  } finally {
    global.fetch = realFetch;
    if (realToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = realToken;
  }
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['Content-Encoding'], 'gzip');
  assert.strictEqual(JSON.parse(zlib.gunzipSync(res.body)).user, 'octocat');
});

test('la web ubica los días como el servidor: «hoy» es el último día de la API, no el reloj local', () => {
  const { GitHubFetcher, SnakeCore } = require('../action/lib').loadEngine();
  // 371 días que terminan en domingo 2026-11-01: el servidor abre una semana nueva con un solo día
  const end = Date.UTC(2026, 10, 1);
  const contributions = Array.from({ length: 371 }, (_, i) => {
    const date = new Date(end - (370 - i) * 86400000).toISOString().slice(0, 10);
    return { date, count: i % 5, level: i % 5 };
  });
  const web = new GitHubFetcher().parseApiContributions(contributions);
  assert.strictEqual(web[52][0].date, '2026-11-01');

  // Las mismas fechas como semanas de GraphQL, en la cuadrícula del servidor: misma celda para cada día
  const weeks = [];
  for (const c of contributions) {
    const weekday = new Date(`${c.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || !weeks.length) weeks.push({ contributionDays: [] });
    weeks[weeks.length - 1].contributionDays.push({ date: c.date, weekday, contributionCount: c.count, contributionLevel: ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'][c.level] });
  }
  const server = SnakeCore.weeksToGrid(weeks);
  for (let x = 0; x < 53; x++) {
    for (let y = 0; y < 7; y++) {
      if (server[x][y].date) assert.strictEqual(web[x][y].originalLevel, server[x][y].originalLevel, `celda ${x},${y} (${server[x][y].date})`);
    }
  }
});
