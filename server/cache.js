/**
 * Caché de los datos de GitHub (calendario y perfil) en dos niveles, y reparto del límite de la API:
 *
 *   1. Memoria de la instancia: 30 min, y la promesa compartida entre peticiones simultáneas.
 *   2. Almacén compartido opcional (Redis de Upstash o Vercel KV por su API REST, sin dependencias): con tráfico
 *      viral cada instancia nueva lee lo que ya consultó otra en vez de volver a preguntar a GitHub.
 *      Se activa con KV_REST_API_URL + KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 *
 * Si GitHub falla (límite agotado, 5xx, red) se sirve el último dato bueno de hasta 24 h en vez de un error.
 * GITHUB_TOKEN admite varios tokens separados por comas: se usa el que más consultas le quedan, y cuando a
 * todos les quedan pocas los datos se dan por buenos durante 6 h para gastar menos.
 */

const FRESH_MS = 30 * 60 * 1000;
const FRESH_SAVING_MS = 6 * 60 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const MEMORY_MAX = 500;
const LOW_REMAINING = 500;
const STORE_TIMEOUT_MS = 400;
// Tras servir un dato viejo porque GitHub falló, se vuelve a intentar pasados 5 min
const RETRY_MS = 5 * 60 * 1000;

// Consultas que le quedan a cada token en la hora en curso (cabecera X-RateLimit-Remaining de GitHub)
const remaining = new Map();

function tokensOf(raw) {
  return String(raw || '').split(',').map(t => t.trim()).filter(Boolean);
}

/** El token con más consultas disponibles; los que aún no se han usado cuentan como llenos */
function pickToken(raw) {
  const tokens = tokensOf(raw);
  if (tokens.length < 2) return tokens[0] || '';
  return tokens.reduce((best, t) => ((remaining.get(t) ?? Infinity) > (remaining.get(best) ?? Infinity) ? t : best));
}

/** Modo ahorro: a todos los tokens conocidos les quedan menos de LOW_REMAINING consultas */
function saving(raw) {
  const known = tokensOf(raw).map(t => remaining.get(t)).filter(n => n !== undefined);
  return known.length > 0 && known.every(n => n < LOW_REMAINING);
}

/** fetch que anota lo que le queda al token después de cada consulta */
function trackingFetch(token, fetchImpl) {
  return async (url, init) => {
    const res = await fetchImpl(url, init);
    const left = Number(res.headers && res.headers.get && res.headers.get('x-ratelimit-remaining'));
    if (Number.isFinite(left)) {
      const wasLow = remaining.has(token) && remaining.get(token) < LOW_REMAINING;
      remaining.set(token, left);
      if (left < LOW_REMAINING && !wasLow && process.env.VERCEL) {
        console.log(JSON.stringify({ evt: 'perfila.ratelimit', remaining: left, reset: res.headers.get('x-ratelimit-reset') }));
      }
    }
    return res;
  };
}

// --- Almacén compartido (REST de Upstash: POST con el comando en un array JSON) ---

function storeConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function storeCommand(command, fetchImpl) {
  const config = storeConfig();
  if (!config) return null;
  try {
    const res = await fetchImpl(config.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(STORE_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return (await res.json()).result ?? null;
  } catch {
    // El almacén es una ayuda: si no responde a tiempo se sigue sin él
    return null;
  }
}

async function storeGet(key, fetchImpl) {
  const raw = await storeCommand(['GET', key], fetchImpl);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSet(key, entry, fetchImpl) {
  return storeCommand(['SET', key, JSON.stringify(entry), 'EX', String(Math.round(STALE_MS / 1000))], fetchImpl);
}

/** Errores en los que vale más un dato de hace unas horas: no los de un usuario que no existe o un token inválido */
function transient(err) {
  return err.code !== 'NOT_FOUND' && err.status !== 401;
}

/**
 * cached(memory, 'calendar', 'octocat', rawToken, fetchImpl, (token, fetch) => ...) -> Promise del valor.
 * memory es el Map de la instancia (las pruebas lo vacían entre casos).
 */
function cached(memory, name, user, rawToken, fetchImpl, load) {
  const key = user.toLowerCase();
  const fresh = saving(rawToken) ? FRESH_SAVING_MS : FRESH_MS;
  const hit = memory.get(key);
  if (hit && Date.now() - hit.time < fresh) return hit.promise;

  const storeKey = `perfila:${name}:${key}`;
  const promise = (async () => {
    const stored = await storeGet(storeKey, fetchImpl);
    if (stored && Date.now() - stored.time < fresh) {
      memory.set(key, { time: stored.time, valueTime: stored.time, promise: Promise.resolve(stored.value), value: stored.value });
      return stored.value;
    }
    const token = pickToken(rawToken);
    try {
      const value = await load(token, trackingFetch(token, fetchImpl));
      const time = Date.now();
      memory.set(key, { time, valueTime: time, promise: Promise.resolve(value), value });
      storeSet(storeKey, { time, value }, fetchImpl);
      return value;
    } catch (err) {
      const stale = [hit, stored].find(e => e && e.value !== undefined && Date.now() - (e.valueTime || e.time) < STALE_MS);
      if (!stale || !transient(err)) throw err;
      memory.set(key, { time: Date.now() - fresh + RETRY_MS, valueTime: stale.valueTime || stale.time, promise: Promise.resolve(stale.value), value: stale.value });
      return stale.value;
    }
  })();

  memory.set(key, { time: Date.now(), promise, value: hit && hit.value, valueTime: hit && (hit.valueTime || hit.time) });
  promise.catch(() => {
    if (memory.get(key) && memory.get(key).promise === promise) memory.delete(key);
  });
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value);
  return promise;
}

module.exports = { cached, pickToken, saving, tokensOf, remaining, FRESH_MS, STALE_MS };
