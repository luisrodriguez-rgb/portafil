const test = require('node:test');
const assert = require('node:assert');
const { parsePair, runDuel, renderPairSvg, renderDuelPageResponse, handler, resultLine } = require('../server/duel');
const { calendarCache } = require('../server/common');
const { profileCache } = require('../server/profile');
const { loadEngine } = require('../action/lib');
const { fixtureWeeks } = require('./visual.helpers');
const { fakePairGitHub } = require('./duel.helpers');

function clearCaches() {
  calendarCache.clear();
  profileCache.clear();
}

test('la pareja se lee de /a-vs-b o de ?a=&b=, y los casos ambiguos se rechazan', () => {
  assert.deepStrictEqual(parsePair('octocat-vs-hubot').users, ['octocat', 'hubot']);
  assert.deepStrictEqual(parsePair('Octocat-VS-hubot').users, ['Octocat', 'hubot']);
  assert.deepStrictEqual(parsePair('x', new URLSearchParams('a=my-vs-name&b=hubot')).users, ['my-vs-name', 'hubot']);
  assert.match(parsePair('my-vs-name-vs-hubot').error, /\?a=/);
  assert.match(parsePair('octocat-vs-OCTOCAT').error, /distintos/);
  assert.match(parsePair('"><x-vs-hubot').error, /no válido/);
  assert.ok(parsePair('octocat').error);
});

test('el duelo del SVG es el mismo que el de la web: DuelSimulator con las mismas matrices', () => {
  const engine = loadEngine();
  const weeks = [fixtureWeeks(0), fixtureWeeks(1)];
  const duel = runDuel(['octocat', 'hubot'], weeks);
  const direct = engine.DuelSimulator.run(weeks.map(w => engine.SnakeCore.weeksToGrid(w)));
  assert.strictEqual(duel.winner, direct.winner);
  assert.deepStrictEqual(duel.players.map(p => p.score), direct.players.map(p => p.score));
  assert.strictEqual(duel.ticks, 480);
  // La simulación que recibe el exportador cuadra con los mordiscos del duelo
  for (const p of duel.players) {
    const bites = Object.values(p.simulation.cellBites).flat().length;
    assert.strictEqual(bites, p.simulation.eatenLevels);
    assert.strictEqual(p.simulation.history.length, duel.ticks + 1);
  }
});

test('el SVG del duelo: dos tableros con prefijo, marcador y nada que choque entre ellos', async () => {
  clearCaches();
  const { fetchImpl, calls } = fakePairGitHub();
  const res = await renderPairSvg({ kind: 'duel', pair: 'octocat-vs-hubot', query: 'pair=octocat-vs-hubot&format=svg&theme=cyberpunk&lang=es', token: 't', fetchImpl });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['Content-Type'], /^image\/svg\+xml/);
  assert.match(res.body, /viewBox="0 0 797 442"/);
  assert.strictEqual((res.body.match(/<svg x="0" y="\d+"/g) || []).length, 2);
  assert.match(res.body, /class="asb/);
  assert.match(res.body, /class="bsb/);
  assert.ok(!/class="(sb|hr|sn|pb|dn|c\d+_\d+)[" ]/.test(res.body), 'ninguna clase sin prefijo');
  assert.ok(!/id="g"/.test(res.body));
  assert.match(res.body, /duelo/);
  assert.match(res.body, /#090614/);
  assert.ok(!/<script|on[a-z]+=/i.test(res.body));
  assert.ok(res.body.length < 200 * 1024, `${res.body.length} bytes`);
  assert.deepStrictEqual(calls, { calendar: 2, profile: 0 });

  // Determinista: la misma URL da el mismo SVG
  const again = await renderPairSvg({ kind: 'duel', pair: 'octocat-vs-hubot', query: 'theme=cyberpunk&lang=es', token: 't', fetchImpl });
  assert.strictEqual(again.body, res.body);
});

test('versus: gráfica de comparación con el marcador de filas ganadas', async () => {
  clearCaches();
  const { fetchImpl, calls } = fakePairGitHub();
  const res = await renderPairSvg({ kind: 'versus', pair: 'octocat-vs-hubot', query: 'theme=light', token: 't', fetchImpl });
  assert.strictEqual(res.status, 200);
  assert.match(res.body, /versus · \d–\d/);
  assert.match(res.body, /@octocat/);
  assert.match(res.body, /@hubot/);
  assert.ok(res.body.length < 12 * 1024);
  assert.deepStrictEqual(calls, { calendar: 2, profile: 2 });
});

test('errores del duelo como SVG legible', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  assert.strictEqual((await renderPairSvg({ kind: 'duel', pair: 'octocat', token: 't', fetchImpl })).status, 400);
  assert.strictEqual((await renderPairSvg({ kind: 'duel', pair: 'octocat-vs-hubot', query: 'speed=fast', token: 't', fetchImpl })).status, 400);
  assert.strictEqual((await renderPairSvg({ kind: 'duel', pair: 'octocat-vs-hubot', token: '', fetchImpl })).status, 500);
  const missing = await renderPairSvg({ kind: 'duel', pair: 'octocat-vs-nadie', token: 't', fetchImpl });
  assert.strictEqual(missing.status, 404);
  assert.match(missing.body, /nadie/);
});

test('resultado: ganador con cifras completas y empate', () => {
  const duel = { winner: 1, players: [{ login: 'a', score: 17850 }, { login: 'b', score: 17500 + 1125 }] };
  assert.strictEqual(resultLine(duel, 'es'), '@b gana 18.625 – 17.850');
  assert.strictEqual(resultLine({ winner: -1, players: [{ login: 'a', score: 1200 }, { login: 'b', score: 1200 }] }, 'en'), 'tie · 1,200 pts');
});

test('página del duelo: resultado en la vista previa para redes, idioma y reto al ganador', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  const res = await renderDuelPageResponse({ pair: 'octocat-vs-hubot', token: 't', fetchImpl, origin: 'https://example.app', acceptLanguage: 'es-CO,es;q=0.9' });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['Content-Type'], /^text\/html/);
  assert.match(res.body, /<html lang="es">/);
  const duel = runDuel(['octocat', 'hubot'], [fixtureWeeks(0), fixtureWeeks(1)]);
  const winner = duel.players[duel.winner].login;
  assert.match(res.body, new RegExp(`<meta property="og:description" content="@${winner} gana`));
  assert.match(res.body, /<meta property="og:url" content="https:\/\/example.app\/duel\/octocat-vs-hubot">/);
  assert.match(res.body, new RegExp(`const target = "${winner}"`));
  assert.match(res.body, /&lt;a href=&quot;https:\/\/example.app\/duel\/octocat-vs-hubot&quot;&gt;/, 'código para el README escapado');

  const bad = await renderDuelPageResponse({ pair: 'octocat-vs-octocat', token: 't', fetchImpl, origin: 'https://example.app' });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.body, /<html lang="en">/);
});

test('el adaptador HTTP elige formato y no confía en un Host raro', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  const realFetch = global.fetch;
  const realToken = process.env.GITHUB_TOKEN;
  global.fetch = fetchImpl;
  process.env.GITHUB_TOKEN = 'tkn';
  const make = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } });
  const page = make();
  const svg = make();
  try {
    await handler({ url: '/api/duel?pair=octocat-vs-hubot&format=page', method: 'GET', headers: { host: '"></script><script>alert(1)//' } }, page);
    await handler({ url: '/api/duel?pair=octocat-vs-hubot&format=versus&theme=amber_terminal', method: 'GET', headers: {} }, svg);
  } finally {
    global.fetch = realFetch;
    if (realToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = realToken;
  }
  assert.strictEqual(page.statusCode, 200);
  const html = page.body.toString();
  assert.ok(!html.includes('alert(1)'));
  assert.match(html, /https:\/\/perfila-lr.vercel.app\/duel\/octocat-vs-hubot/);
  assert.strictEqual(svg.statusCode, 200);
  assert.match(svg.body.toString(), /#0f0a02/);
});
