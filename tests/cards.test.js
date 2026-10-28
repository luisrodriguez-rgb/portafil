const test = require('node:test');
const assert = require('node:assert');
const { renderCardSvg, handler } = require('../server/card-svg');
const { calendarCache } = require('../server/common');
const { profileCache, normalizeProfile } = require('../server/profile');
const { KINDS } = require('../server/cards');
const { daysOf, streaks, weeklyTotals } = require('../server/cards/data');
const { wrap, fmtNumber } = require('../server/cards/frame');
const { topLanguages } = require('../server/cards/langs');
const { loadEngine } = require('../action/lib');
const { fixtureWeeks, fixtureProfile } = require('./visual.helpers');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4bb0000000049454e44ae426082', 'hex');

function graphqlProfile(overrides = {}) {
  const p = { ...fixtureProfile(), ...overrides };
  return {
    login: p.login, name: p.name, bio: p.bio, location: p.location, avatarUrl: p.avatarUrl === undefined ? 'https://avatars.example/u/1' : p.avatarUrl,
    followers: { totalCount: p.followers }, following: { totalCount: p.following },
    contributionsCollection: {
      totalCommitContributions: p.totals.commits, totalPullRequestContributions: p.totals.pullRequests,
      totalIssueContributions: p.totals.issues, totalPullRequestReviewContributions: p.totals.reviews,
      restrictedContributionsCount: 0
    },
    repositories: {
      totalCount: p.publicRepos,
      nodes: [
        { stargazerCount: 3000, languages: { edges: p.languages.slice(0, 3).map(l => ({ size: l.size, node: { name: l.name } })) } },
        { stargazerCount: 412, languages: { edges: p.languages.slice(3).map(l => ({ size: l.size, node: { name: l.name } })) } }
      ]
    }
  };
}

/** GitHub simulado: GraphQL (perfil o calendario) y descarga del avatar. Cuenta las llamadas. */
function fakeGitHub(profileOverrides = {}, avatar = { type: 'image/png', body: PNG }) {
  const calls = { calendar: 0, profile: 0, avatar: 0 };
  const fetchImpl = async (url, init = {}) => {
    if (!String(url).includes('graphql')) {
      calls.avatar++;
      return { ok: true, headers: { get: () => avatar.type }, arrayBuffer: async () => avatar.body };
    }
    const query = JSON.parse(init.body).query;
    const isCalendar = query.includes('contributionCalendar');
    calls[isCalendar ? 'calendar' : 'profile']++;
    const user = isCalendar
      ? { contributionsCollection: { contributionCalendar: { weeks: fixtureWeeks() } } }
      : graphqlProfile(profileOverrides);
    return { ok: true, json: async () => ({ data: { user } }) };
  };
  return { fetchImpl, calls };
}

function clearCaches() {
  calendarCache.clear();
  profileCache.clear();
}

test('cada pieza responde 200 con el tema pedido, sin JavaScript ni recursos externos', async () => {
  clearCaches();
  const { fetchImpl, calls } = fakeGitHub();
  for (const kind of Object.keys(KINDS)) {
    const res = await renderCardSvg({ kind, user: 'octocat', query: '?kind=x&user=octocat&theme=cyberpunk', token: 't', fetchImpl });
    assert.strictEqual(res.status, 200, kind);
    assert.match(res.headers['Content-Type'], /^image\/svg\+xml/);
    assert.match(res.headers['Cache-Control'], /s-maxage=21600/);
    assert.ok(res.body.startsWith('<svg'), kind);
    assert.ok(res.body.includes('#090614'), `${kind} usa el fondo cyberpunk`);
    // Solo lo que sobrevive al proxy de imágenes de GitHub
    assert.ok(!/<script|on[a-z]+=|javascript:/i.test(res.body), `${kind} sin JavaScript`);
    assert.ok(!/href="(?!data:|#)/.test(res.body), `${kind} sin enlaces externos`);
  }
  // Seis piezas: una consulta de perfil, una de calendario y un avatar
  assert.deepStrictEqual(calls, { calendar: 1, profile: 1, avatar: 1 });
});

test('el dashboard completo cabe en el presupuesto de peso y contiene las cinco piezas', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub();
  const res = await renderCardSvg({ kind: 'kit', user: 'octocat', query: '', token: 't', fetchImpl });
  assert.ok(res.body.length < 40 * 1024, `kit pesa ${res.body.length} bytes`);
  assert.match(res.body, /viewBox="0 0 797 474"/);
  assert.strictEqual((res.body.match(/<g transform="translate/g) || []).length, 5);
  assert.match(res.body, /data:image\/png;base64,/);
});

test('etiquetas en español y números con formato local', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub();
  const res = await renderCardSvg({ kind: 'stats', user: 'octocat', query: 'lang=es', token: 't', fetchImpl });
  assert.match(res.body, /contribuciones/);
  assert.match(res.body, /1\.873/);
  assert.strictEqual(fmtNumber(12840, 'es'), '12,8k');
  assert.strictEqual(fmtNumber(12840, 'en'), '12.8k');
  assert.strictEqual(fmtNumber(10000, 'en'), '10k');
});

test('la bio y el nombre se escapan: no se puede inyectar marcado', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub({ name: '<img src=x onerror=alert(1)>', bio: '"><script>alert(1)</script>' });
  const res = await renderCardSvg({ kind: 'header', user: 'octocat', token: 't', fetchImpl });
  assert.strictEqual(res.status, 200);
  assert.ok(!res.body.includes('<script>'));
  assert.ok(!res.body.includes('<img'));
});

test('sin avatar descargable, la cabecera dibuja las iniciales', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub({ avatarUrl: 'https://avatars.example/u/1' }, { type: 'text/html', body: Buffer.from('<html>') });
  const res = await renderCardSvg({ kind: 'header', user: 'octocat', token: 't', fetchImpl });
  assert.ok(!res.body.includes('data:text/html'));
  assert.match(res.body, />TO</);
});

test('errores legibles como SVG con el código HTTP correcto', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub();
  assert.strictEqual((await renderCardSvg({ kind: 'nope', user: 'octocat', token: 't', fetchImpl })).status, 404);
  const option = await renderCardSvg({ kind: 'stats', user: 'octocat', query: 'morph=retro', token: 't', fetchImpl });
  assert.strictEqual(option.status, 400);
  assert.match(option.body, /morph/);
  assert.strictEqual((await renderCardSvg({ kind: 'stats', user: '"><x', token: 't', fetchImpl })).status, 400);
  const noToken = await renderCardSvg({ kind: 'stats', user: 'octocat', token: '', fetchImpl });
  assert.strictEqual(noToken.status, 500);
  assert.strictEqual(noToken.headers['Cache-Control'], 'no-store');

  clearCaches();
  const missing = await renderCardSvg({
    kind: 'langs', user: 'nadie', token: 't',
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }) })
  });
  assert.strictEqual(missing.status, 404);

  clearCaches();
  const down = await renderCardSvg({ kind: 'streak', user: 'octocat', token: 't', fetchImpl: async () => ({ ok: false, status: 503, statusText: 'x' }) });
  assert.strictEqual(down.status, 502);
});

test('el adaptador HTTP lee la pieza y el usuario de /api/<pieza>/<usuario>.svg', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub();
  const realFetch = global.fetch;
  const realToken = process.env.GITHUB_TOKEN;
  global.fetch = fetchImpl;
  process.env.GITHUB_TOKEN = 'tkn';
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } };
  try {
    await handler({ url: '/api/activity/octocat.svg?theme=light', method: 'GET', headers: {} }, res);
  } finally {
    global.fetch = realFetch;
    if (realToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = realToken;
  }
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.body.toString(), /weekly activity/);
});

test('rachas: hoy sin contribuciones no rompe la racha actual', () => {
  const day = (date, count) => ({ date, count, level: count ? 1 : 0 });
  const days = [day('2026-10-20', 1), day('2026-10-21', 0), day('2026-10-22', 2), day('2026-10-23', 1), day('2026-10-24', 0)];
  const s = streaks(days);
  assert.deepStrictEqual(s.current, { length: 2, start: '2026-10-22', end: '2026-10-23' });
  assert.strictEqual(s.todayPending, true);
  assert.strictEqual(s.longest.length, 2);

  const broken = streaks([day('2026-10-22', 2), day('2026-10-23', 0), day('2026-10-24', 0)]);
  assert.strictEqual(broken.current.length, 0);

  const all = daysOf(fixtureWeeks());
  assert.strictEqual(all[all.length - 1].date, '2026-10-28');
  assert.strictEqual(weeklyTotals(fixtureWeeks()).length, 53);
});

test('lenguajes: se suman entre repos y lo que no cabe va a "otros"', () => {
  const profile = normalizeProfile(graphqlProfile());
  assert.strictEqual(profile.stars, 3412);
  assert.strictEqual(profile.languages[0].name, 'TypeScript');
  const top = topLanguages(profile.languages, 'other');
  assert.strictEqual(top.length, 6);
  assert.strictEqual(top[5].name, 'other');
  assert.ok(Math.abs(top.reduce((s, l) => s + l.share, 0) - 100) < 1e-9);
  assert.deepStrictEqual(topLanguages([], 'other'), []);
});

test('la bio larga se parte en dos líneas y la segunda termina en …', () => {
  const lines = wrap('uno dos tres cuatro cinco seis siete ocho nueve diez once doce', 15, 2);
  assert.strictEqual(lines.length, 2);
  assert.ok(lines.every(l => [...l].length <= 15));
  assert.ok(lines[1].endsWith('…'));
});

test('el bloque README: cada pieza en claro y oscuro, solo las elegidas y las de dos perfiles con rival', () => {
  const { KitSnippet } = loadEngine();
  const md = KitSnippet.build('octocat', { dark: 'cyberpunk', lang: 'es', snake: { morph: 'capsule' } });
  for (const kind of ['header', 'stats', 'streak', 'langs', 'activity']) {
    assert.ok(md.includes(`/api/${kind}/octocat.svg?theme=cyberpunk&lang=es`), kind);
    assert.ok(md.includes(`/api/${kind}/octocat.svg?theme=paper&lang=es`), `${kind} en claro usa paper por defecto`);
  }
  assert.ok(md.includes('/api/octocat.svg?theme=cyberpunk&lang=es&morph=capsule'));
  assert.ok(!md.includes('/api/kit/'), 'el bloque por defecto no repite el dashboard');

  // Una sola pieza, sin modo adaptativo
  const one = KitSnippet.piece('streak', 'octocat', { adaptive: false });
  assert.strictEqual(one, '<img alt="@octocat streak" src="https://perfila.vercel.app/api/streak/octocat.svg?theme=ink" width="49%">');

  // Dos medias seguidas comparten fila; una media sola va en su propia fila
  const pair = KitSnippet.build('octocat', { pieces: ['langs', 'stats'], adaptive: false });
  assert.strictEqual((pair.match(/<p align="center">/g) || []).length, 1);
  const lone = KitSnippet.build('octocat', { pieces: ['activity', 'header'], adaptive: false });
  assert.ok(lone.indexOf('/api/header/') < lone.indexOf('/api/activity/'), 'orden del catálogo');

  // Versus y duelo necesitan rival; el duelo enlaza a su página
  assert.strictEqual(KitSnippet.piece('duel', 'octocat', {}), null);
  assert.strictEqual(KitSnippet.piece('versus', 'octocat', { rival: 'OCTOCAT' }), null);
  const duel = KitSnippet.piece('duel', 'octocat', { rival: 'hubot', adaptive: false, apiBase: 'https://x.dev/' });
  assert.match(duel, /^<a href="https:\/\/x.dev\/duel\/octocat-vs-hubot">/);
  assert.match(duel, /\/api\/duel\/octocat-vs-hubot.svg\?theme=ink/);

  // Los modos de juego van a la URL de la serpiente con ?game=; las opciones de la serpiente no se les aplican
  const games = KitSnippet.build('octocat', { pieces: ['life', 'pacman'], adaptive: false, snake: { morph: 'retro' } });
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=life'));
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=pacman'));
  assert.ok(!games.includes('morph='));

  const single = KitSnippet.build('octocat', { layout: 'single', adaptive: false });
  assert.ok(single.includes('/api/kit/octocat.svg?theme=ink'));
  assert.ok(!single.includes('<picture>'));
});
