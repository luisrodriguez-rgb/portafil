const test = require('node:test');
const assert = require('node:assert');
const { cached, pickToken, saving, remaining, FRESH_MS } = require('../server/cache');

/** Respuesta mínima con la cabecera del límite de GitHub */
function response(left) {
  return { ok: true, headers: { get: (name) => (name === 'x-ratelimit-remaining' ? String(left) : null) }, json: async () => ({}) };
}

test('caché: una consulta para peticiones simultáneas y dato viejo si GitHub falla después', async () => {
  const memory = new Map();
  let calls = 0;
  const load = async () => { calls++; return { weeks: calls }; };
  const [a, b] = await Promise.all([cached(memory, 't', 'Octocat', 'x', fetch, load), cached(memory, 't', 'octocat', 'x', fetch, load)]);
  assert.deepStrictEqual([a, b, calls], [{ weeks: 1 }, { weeks: 1 }, 1]);

  // Pasada la media hora, GitHub da 502: se sirve lo que había y no se borra
  memory.get('octocat').time -= FRESH_MS + 1;
  const failing = async () => { const err = new Error('502'); err.status = 502; throw err; };
  assert.deepStrictEqual(await cached(memory, 't', 'octocat', 'x', fetch, failing), { weeks: 1 });
  assert.deepStrictEqual(await cached(memory, 't', 'octocat', 'x', fetch, failing), { weeks: 1 }, 'no reintenta en cada petición');

  // Un usuario que ya no existe sí da error aunque haya dato viejo
  memory.get('octocat').time -= FRESH_MS + 1;
  const gone = async () => { const err = new Error('no existe'); err.code = 'NOT_FOUND'; throw err; };
  await assert.rejects(cached(memory, 't', 'octocat', 'x', fetch, gone), /no existe/);
  assert.strictEqual(memory.has('octocat'), false);
});

test('caché: varios tokens, el que más consultas tiene, y modo ahorro cuando a todos les quedan pocas', async () => {
  remaining.clear();
  assert.strictEqual(pickToken('solo'), 'solo');
  assert.strictEqual(pickToken('a, b'), 'a', 'sin datos, el primero');
  const memory = new Map();
  let used = [];
  const load = (left) => async (token, f) => { used.push(token); await f('https://api.github.com/graphql'); return token; };
  const fakeFetch = (left) => async () => response(left);
  await cached(memory, 't', 'u1', 'a,b', fakeFetch(100), load());
  assert.strictEqual(remaining.get('a'), 100);
  await cached(memory, 't', 'u2', 'a,b', fakeFetch(4000), load());
  assert.deepStrictEqual(used, ['a', 'b'], 'a "a" le quedan 100: pasa a "b", que no se ha usado');
  assert.strictEqual(saving('a,b'), false);
  remaining.set('b', 300);
  assert.strictEqual(saving('a,b'), true);

  // En modo ahorro un dato de hace una hora sigue valiendo
  memory.get('u1').time -= 60 * 60 * 1000;
  used = [];
  await cached(memory, 't', 'u1', 'a,b', fakeFetch(100), load());
  assert.deepStrictEqual(used, []);
  remaining.clear();
});

test('caché: con almacén compartido, una instancia nueva usa lo que guardó otra', async () => {
  const store = new Map();
  const kvFetch = async (url, init) => {
    if (url !== 'https://kv.test') throw new Error(`fetch inesperado a ${url}`);
    const [cmd, key, value] = JSON.parse(init.body);
    assert.strictEqual(init.headers.Authorization, 'Bearer kv-token');
    if (cmd === 'SET') store.set(key, value);
    return { ok: true, json: async () => ({ result: cmd === 'GET' ? store.get(key) ?? null : 'OK' }) };
  };
  Object.assign(process.env, { KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token' });
  try {
    let calls = 0;
    const load = async () => { calls++; return { login: 'octocat' }; };
    assert.deepStrictEqual(await cached(new Map(), 'profile', 'octocat', 'x', kvFetch, load), { login: 'octocat' });
    await new Promise(r => setImmediate(r));
    assert.ok(store.has('portafil:profile:octocat'));
    // Otra instancia (memoria vacía): no consulta a GitHub
    assert.deepStrictEqual(await cached(new Map(), 'profile', 'octocat', 'x', kvFetch, load), { login: 'octocat' });
    assert.strictEqual(calls, 1);
  } finally {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  }
});

test('caché HTTP: 30 min para camo y navegadores, 2 h solo para la CDN de Vercel', () => {
  const { CACHE_OK, CDN_CACHE, withCdnCache } = require('../server/common');
  assert.match(CACHE_OK, /max-age=1800/);
  const piece = withCdnCache({ 'Cache-Control': CACHE_OK, 'Content-Type': 'image/svg+xml' });
  assert.strictEqual(piece['Vercel-CDN-Cache-Control'], CDN_CACHE);
  assert.match(CDN_CACHE, /max-age=7200/);
  // Los errores no se guardan 2 h en la CDN
  assert.strictEqual(withCdnCache({ 'Cache-Control': 'no-store' })['Vercel-CDN-Cache-Control'], undefined);
});
