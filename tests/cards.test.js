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
const { fixtureWeeks, fixtureProfile, fixtureYearUser } = require('./visual.helpers');

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
  const calls = { calendar: 0, profile: 0, avatar: 0, year: 0 };
  const fetchImpl = async (url, init = {}) => {
    if (!String(url).includes('graphql')) {
      calls.avatar++;
      return { ok: true, headers: { get: () => avatar.type }, arrayBuffer: async () => avatar.body };
    }
    const query = JSON.parse(init.body).query;
    if (query.includes('thisYear')) {
      calls.year++;
      return { ok: true, json: async () => ({ data: { user: fixtureYearUser() } }) };
    }
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
  require('../server/year').yearCache.clear();
}

test('cada pieza responde 200 con el tema pedido, sin JavaScript ni recursos externos', async () => {
  clearCaches();
  const { fetchImpl, calls } = fakeGitHub();
  for (const kind of Object.keys(KINDS)) {
    const res = await renderCardSvg({ kind, user: 'octocat', query: '?kind=x&user=octocat&theme=cyberpunk', token: 't', fetchImpl });
    assert.strictEqual(res.status, 200, kind);
    assert.match(res.headers['Content-Type'], /^image\/svg\+xml/);
    assert.match(res.headers['Cache-Control'], /max-age=1800, s-maxage=1800/);
    assert.ok(res.body.startsWith('<svg'), kind);
    assert.ok(res.body.includes('#090614'), `${kind} usa el fondo cyberpunk`);
    // Solo lo que sobrevive al proxy de imágenes de GitHub
    assert.ok(!/<script|on[a-z]+=|javascript:/i.test(res.body), `${kind} sin JavaScript`);
    assert.ok(!/href="(?!data:|#)/.test(res.body), `${kind} sin enlaces externos`);
  }
  // Todas las piezas: una consulta de perfil, una de calendario, una del año y un avatar
  assert.deepStrictEqual(calls, { calendar: 1, profile: 1, avatar: 1, year: 1 });
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
  assert.strictEqual(one, '<img alt="@octocat streak" src="https://perfila-lr.vercel.app/api/streak/octocat.svg?theme=ink" width="390">');

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
  const games = KitSnippet.build('octocat', { pieces: ['life', 'pacman', 'invaders', 'tetris'], adaptive: false, snake: { morph: 'retro' } });
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=life'));
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=pacman'));
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=invaders'));
  assert.ok(games.includes('/api/octocat.svg?theme=ink&game=tetris'));
  assert.ok(!games.includes('morph='));

  const single = KitSnippet.build('octocat', { layout: 'single', adaptive: false });
  assert.ok(single.includes('/api/kit/octocat.svg?theme=ink'));
  assert.ok(!single.includes('<picture>'));
});

test('lenguajes: los que no llegan al 0,5 % van a «otros» y los repos llevan separador de miles', () => {
  const { topLanguages, render } = require('../server/cards/langs');
  const { T } = require('../server/cards/frame');
  const { fixtureProfile } = require('./visual.helpers');
  assert.deepStrictEqual(topLanguages([{ name: 'Go', size: 9970 }, { name: 'Shell', size: 20 }, { name: 'Make', size: 10 }], 'otros'),
    [{ name: 'Go', share: 99.7 }, { name: 'otros', share: 0.3, other: true }]);
  const profile = { ...fixtureProfile(), publicRepos: 9999, languages: [{ name: 'Go', size: 9970 }, { name: 'Shell', size: 30 }] };
  const { content } = render({ profile, tokens: T.get('ink'), lang: 'es' });
  assert.ok(content.includes('9.999 repos'), 'separador de miles');
  assert.ok(content.includes('&lt;0,5%') && !content.includes('0,0%'), 'nunca «0,0 %»');
});

test('README: los temas de color no cambian con el modo y cada pieza puede llevar su propio estilo', () => {
  const { KitSnippet } = loadEngine();
  const ctx = { pieces: ['header', 'stats', 'streak', 'snake'], dark: 'ink', light: 'paper', adaptive: true, themes: { stats: 'dark', streak: 'cyberpunk', snake: 'paper' } };
  const md = KitSnippet.build('octocat', ctx);
  // Sin estilo propio: el general, con su pareja para el modo claro
  assert.match(md, /api\/header\/octocat\.svg\?theme=ink/);
  assert.match(md, /api\/header\/octocat\.svg\?theme=paper/);
  // Fósforo cambia a GitHub claro en el modo claro: es la pareja verde
  assert.match(md, /api\/stats\/octocat\.svg\?theme=dark/);
  assert.match(md, /api\/stats\/octocat\.svg\?theme=light/);
  // Cyberpunk es un tema de color: una sola imagen, sin <picture>
  assert.match(md, /<img alt="@octocat streak" src="[^"]*api\/streak\/octocat\.svg\?theme=cyberpunk" width="390">/);
  assert.ok(!/api\/streak\/octocat\.svg\?theme=paper/.test(md));
  // Papel es claro: en oscuro pasa a Tinta
  assert.match(md, /api\/octocat\.svg\?theme=ink/);
  assert.match(md, /api\/octocat\.svg\?theme=paper/);
});

test('tu huella: 53 semanas × 7 días en círculo, día y mes favoritos, y sin datos no se rompe', () => {
  const { renderCard } = require('../server/cards');
  const { T } = require('../server/cards/frame');
  const { fixtureWeeks } = require('./visual.helpers');
  const weeks = fixtureWeeks();
  const svg = renderCard('fingerprint', { weeks, tokens: T.get('ruby'), lang: 'es', login: 'octocat' });
  assert.match(svg, /viewBox="0 0 797 300"/);
  assert.strictEqual((svg.match(/<path d="M[^"]+A[^"]+" stroke=/g) || []).length, 53 * 7, 'una celda por día');
  for (const label of ['tu huella', 'día favorito', 'mes más activo', 'racha más larga', 'constancia', 'ritmo semanal']) assert.ok(svg.includes(label), label);
  // El día favorito es el de la semana con más contribuciones
  const byWeekday = Array(7).fill(0);
  for (const w of weeks.slice(-53)) for (const d of w.contributionDays) byWeekday[d.weekday] += d.contributionCount;
  const names = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  assert.ok(svg.includes(`>${names[byWeekday.indexOf(Math.max(...byWeekday))]}<`), 'día favorito');
  // Perfil sin contribuciones: círculo vacío y guiones, sin errores
  const empty = renderCard('fingerprint', { weeks: [], tokens: T.get('ink'), lang: 'en', login: 'nobody' });
  assert.ok(empty.includes('—') && empty.includes('no streak yet'));
  assert.ok(svg.length < 60 * 1024, `${svg.length} bytes`);
});

test('tu año: periodo natural, comparación con el mismo periodo, estilo y sin datos no se rompe', () => {
  const { periodOf, normalizeYear } = require('../server/year');
  const { renderCard } = require('../server/cards');
  const { styleOf } = require('../server/cards/year');
  const { T } = require('../server/cards/frame');
  const { FIXTURE_PERIOD } = require('./visual.helpers');

  // Del 1 de enero a hoy frente al mismo periodo del año anterior; en enero, el año anterior completo
  assert.deepStrictEqual(periodOf(new Date(Date.UTC(2026, 10, 4))), { year: 2026, partial: true, from: '2026-01-01', to: '2026-11-04', prevFrom: '2025-01-01', prevTo: '2025-11-04' });
  assert.deepStrictEqual(periodOf(new Date(Date.UTC(2027, 0, 15))), { year: 2026, partial: false, from: '2026-01-01', to: '2026-12-31', prevFrom: '2025-01-01', prevTo: '2025-12-31' });
  assert.strictEqual(periodOf(new Date(Date.UTC(2028, 1, 29))).prevTo, '2027-02-28', 'el 29 de febrero se compara con el 28');

  const year = normalizeYear(fixtureYearUser(), FIXTURE_PERIOD);
  assert.ok(year.days.every(d => d.date >= '2026-01-01' && d.date <= '2026-10-28'));
  assert.strictEqual(year.topRepo.name, 'portafil');
  const svg = renderCard('year', { year, tokens: T.get('ruby'), lang: 'es', login: 'octocat' });
  assert.match(svg, /viewBox="0 0 797 340"/);
  for (const label of ['tu año 2026', 'hasta el 28 oct', '+25 % vs 2025', 'tu estilo', 'proyecto del año', 'portafil', 'tu año, mes a mes']) assert.ok(svg.includes(label), label);

  // Estilos: de lo más llamativo a lo más general
  const base = { total: 100, prevTotal: 100, days: Array.from({ length: 100 }, (_, i) => ({ count: i % 2 })), longest: 3, byWeekday: [10, 20, 20, 20, 20, 0, 10], bestMonthShare: 0.1 };
  assert.strictEqual(styleOf({ ...base, prevTotal: 50 }).key, 'rise');
  assert.strictEqual(styleOf({ ...base, days: base.days.map(() => ({ count: 1 })) }).key, 'clockwork');
  assert.strictEqual(styleOf({ ...base, longest: 40 }).key, 'unstoppable');
  assert.strictEqual(styleOf({ ...base, byWeekday: [20, 10, 10, 10, 10, 10, 30] }).key, 'weekend');
  assert.strictEqual(styleOf({ ...base, bestMonthShare: 0.4 }).key, 'sprinter');
  assert.strictEqual(styleOf(base).key, 'steady');
  assert.strictEqual(styleOf({ ...base, total: 0 }).key, 'quiet');

  // Sin año anterior: «desde 0»; sin datos: la tarjeta sale igual
  const first = renderCard('year', { year: { ...year, prevTotal: 0 }, tokens: T.get('ink'), lang: 'en', login: 'octocat' });
  assert.ok(first.includes('up from 0 in 2025'));
  const empty = renderCard('year', { year: { year: 2026, partial: true, until: '2026-11-04', days: [], total: 0, prevTotal: 0, commits: 0, topRepo: null }, tokens: T.get('ink'), lang: 'es', login: 'nadie' });
  assert.ok(empty.includes('Año en calma') && empty.includes('—'));
});

test('tu compañero (MySkin × Portafil): 53 skins, 3 formatos, reacción automática a GitHub y escape de say', async () => {
  clearCaches();
  const { fetchImpl } = fakeGitHub();
  const { resolveGitHubCompanionState, resolveCompanionState } = require('../server/cards/companion');
  const bundle = require('../shared/companions-bundle.json');
  const { KitSnippet, SnakeCore } = loadEngine();

  // Las 53 skins del bundle coinciden con el catálogo del cliente y del contrato (15 originales + 38 tributos)
  assert.strictEqual(Object.keys(bundle.skins).length, 53);
  assert.strictEqual(KitSnippet.COMPANIONS.length, 53);
  assert.strictEqual(KitSnippet.COMPANIONS.filter(c => c.isOriginal).length, 15);
  assert.deepStrictEqual([...SnakeCore.COMPANION_SKINS], [...KitSnippet.COMPANIONS.map(c => c.id)]);

  // Regla reactiva de actividad en GitHub
  assert.strictEqual(resolveGitHubCompanionState({ urgentDeadlines: 1, commitsToday: 5 }), 'ALERT_SEMESTRE');
  assert.strictEqual(resolveGitHubCompanionState({ commitsToday: 2, streakDays: 4 }), 'VICTORY_GITHUB');
  assert.strictEqual(resolveGitHubCompanionState({ commitsToday: 0, daysSinceLastCommit: 7 }), 'SLEEP');
  assert.strictEqual(resolveGitHubCompanionState({ commitsToday: 0, daysSinceLastCommit: 1, streakDays: 5 }), 'FOCUS');
  assert.strictEqual(resolveGitHubCompanionState({ commitsToday: 0, daysSinceLastCommit: 1, streakDays: 1 }), 'WALK');
  assert.strictEqual(resolveGitHubCompanionState({ commitsToday: 0, daysSinceLastCommit: 3, streakDays: 0 }), 'IDLE');

  const day = (date, count) => ({ date, count, level: count ? 1 : 0 });
  const sleepingDays = Array.from({ length: 8 }, (_, i) => day(`2026-10-2${i}`, 0));
  assert.strictEqual(resolveCompanionState(sleepingDays, 'auto', 'card'), 'SLEEP');

  // Los 3 formatos (card 797×160, divider 797×96, badge 390×96) y el escape de say contra inyección
  const card = await renderCardSvg({
    kind: 'companion', user: 'octocat',
    query: 'skin=capybara&variant=card&state=FOCUS&theme=ink&lang=es&say=<script>alert(1)</script>Hola+equipo',
    token: 't', fetchImpl
  });
  assert.strictEqual(card.status, 200);
  assert.match(card.body, /viewBox="0 0 797 160"/);
  assert.match(card.body, /Capibara/);
  assert.match(card.body, /MODO FOCO/);
  assert.match(card.body, /image-rendering:pixelated/);
  assert.ok(!card.body.includes('<script>'));
  assert.match(card.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;Hola equipo/);

  const divider = await renderCardSvg({
    kind: 'companion', user: 'octocat',
    query: 'skin=ghost-dev&variant=divider&theme=dark&lang=es',
    token: 't', fetchImpl
  });
  assert.strictEqual(divider.status, 200);
  assert.match(divider.body, /viewBox="0 0 797 96"/);
  assert.match(divider.body, /@keyframes zcp/);

  const badge = await renderCardSvg({
    kind: 'companion', user: 'octocat',
    query: 'skin=cyber-ninja&variant=badge&state=SLEEP&theme=ruby&lang=en',
    token: 't', fetchImpl
  });
  assert.strictEqual(badge.status, 200);
  assert.match(badge.body, /viewBox="0 0 390 96"/);
  assert.match(badge.body, /SLEEP MODE/);

  // Opciones no válidas responden 400 con mensaje legible
  const badSkin = await renderCardSvg({ kind: 'companion', user: 'octocat', query: 'skin=no-existe', token: 't', fetchImpl });
  assert.strictEqual(badSkin.status, 400);

  // El generador de fragmentos README incluye skin, variant, state y say en ambos modos (claro/oscuro)
  const snippet = KitSnippet.piece('companion', 'octocat', {
    dark: 'ink', light: 'paper', lang: 'es',
    companion: { skin: 'ghost-dev', variant: 'divider', state: 'WALK', say: 'Listo para producción' }
  });
  assert.match(snippet, /\/api\/companion\/octocat\.svg\?theme=ink&lang=es&skin=ghost-dev&variant=divider&state=WALK&say=Listo\+para\+producci%C3%B3n/);
  assert.match(snippet, /\/api\/companion\/octocat\.svg\?theme=paper&lang=es&skin=ghost-dev&variant=divider&state=WALK&say=Listo\+para\+producci%C3%B3n/);

  // Módulo PortafilCompanion (shared/companion-widget.js) y CLI (scripts/companion-cli.js)
  const PortafilCompanion = require('../shared/companion-widget');
  const { generateCompanionSvg } = require('../scripts/companion-cli');
  assert.strictEqual(PortafilCompanion.SKINS.length, 53);
  assert.strictEqual(PortafilCompanion.filterSkins({ category: 'originals' }).length, 15);
  assert.ok(PortafilCompanion.filterSkins({ query: 'capibara' }).some(s => s.id === 'capybara'));
  assert.match(PortafilCompanion.generateEmbedCode({ user: 'octocat', skin: 'capybara', theme: 'cyberpunk' }), /<portafil-companion user="octocat" skin="capybara" theme="cyberpunk"/);
  assert.match(PortafilCompanion.generateActionYaml({ user: 'octocat', skin: 'spartan', variant: 'badge' }), /dist\/portafil-companion\.svg\?kind=companion&skin=spartan&variant=badge/);
  assert.match(generateCompanionSvg({ user: 'octocat', skin: 'spartan', variant: 'badge', theme: 'ruby' }), /viewBox="0 0 390 96"/);
});
