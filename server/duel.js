/**
 * Duelo embebible y comparación de dos perfiles:
 *   GET /api/duel/<a>-vs-<b>.svg    repetición animada del duelo con el marcador (para el README)
 *   GET /api/versus/<a>-vs-<b>.svg  comparación sin juego (gráfica de mariposa)
 *   GET /duel/<a>-vs-<b>            página para compartir: resultado, vista previa para redes y "Retar a alguien"
 *
 * El duelo usa DuelSimulator, el mismo de la web y del video: el resultado depende solo de los ticks,
 * así que el mismo enlace da el mismo ganador en el README, en la web y en el clip.
 */

const { engine, USER_RE, getCalendarWeeks, sendCompressed } = require('./common');
const { getProfile } = require('./profile');
const { T, LABELS, escapeXml, fmtNumber, text, framed, toSvg, messageCard } = require('./cards/frame');
const versus = require('./cards/versus');
const { logRender } = require('./metrics');

const WEB_URL = 'https://luisrodriguez-rgb.github.io/GITHUB_SNAKE.EXE/';
const PREVIEW_IMAGE = 'https://raw.githubusercontent.com/luisrodriguez-rgb/GITHUB_SNAKE.EXE/main/assets/duel_mode.png';
const CACHE_OK = 'public, max-age=14400, s-maxage=21600, stale-while-revalidate=86400';
const CACHE_ERROR = 'public, max-age=300, s-maxage=300';

// Ritmo del SVG: rápido para que un duelo de 480 ticks dure ~34 s, y pausa media para leer el resultado
const STEP_SECONDS = 0.07;
const PAUSE_SECONDS = 2.5;
const BOARD_H = 160;
const SCOREBOARD_H = 88;

/**
 * 'octocat-vs-torvalds' -> ['octocat', 'torvalds']. Un usuario de GitHub puede contener '-vs-':
 * si el corte es ambiguo se pide la forma ?a=&b=.
 */
function parsePair(pair, params = new URLSearchParams()) {
  const a = params.get('a');
  const b = params.get('b');
  const parts = a && b ? [a, b] : String(pair || '').split(/-vs-/i);
  if (parts.length !== 2) {
    return { error: "usa /<a>-vs-<b> o ?a=<usuario>&b=<usuario>" };
  }
  if (!parts.every(u => USER_RE.test(u))) return { error: 'usuario de GitHub no válido' };
  if (parts[0].toLowerCase() === parts[1].toLowerCase()) return { error: 'un duelo necesita dos usuarios distintos' };
  return { users: parts };
}

// Memoria del último resultado por pareja: el calendario está en caché 30 min, así que mientras sea
// el mismo objeto el duelo no se vuelve a simular (svg, página y temas distintos lo comparten)
const duelMemo = new Map();

function runDuel(users, weeks) {
  const key = users.map(u => u.toLowerCase()).join('|');
  const hit = duelMemo.get(key);
  if (hit && hit.weeks[0] === weeks[0] && hit.weeks[1] === weeks[1]) return hit.result;

  const grids = weeks.map(w => engine.SnakeCore.weeksToGrid(w));
  const raw = engine.DuelSimulator.run(grids);
  const result = {
    ticks: raw.ticks,
    winner: raw.winner,
    players: raw.players.map((p, i) => {
      const cellBites = {};
      for (const bite of p.biteLog) (cellBites[`${bite.x}_${bite.y}`] = cellBites[`${bite.x}_${bite.y}`] || []).push(bite.tick);
      return {
        login: users[i],
        grid: grids[i],
        score: p.score,
        percent: p.percent,
        scores: p.scores,
        // Lo que el exportador espera de su propia simulación
        simulation: { simGrid: p.grid, history: p.history, cellBites, totalLevels: p.totalLevels, eatenLevels: p.bites }
      };
    })
  };
  duelMemo.set(key, { weeks, result });
  if (duelMemo.size > 50) duelMemo.delete(duelMemo.keys().next().value);
  return result;
}

/** Frase del resultado: '@b gana 20.625 – 17.850' / 'empate a 1.200 pts' */
function resultLine(duel, lang) {
  const L = LABELS[lang];
  const [a, b] = duel.players;
  if (duel.winner === -1) return `${L.tie} · ${fmtNumber(a.score, lang, false)} ${L.pts}`;
  const w = duel.players[duel.winner];
  const l = duel.players[1 - duel.winner];
  return `@${w.login} ${L.wins} ${fmtNumber(w.score, lang, false)} – ${fmtNumber(l.score, lang, false)}`;
}

/** Marcador + los dos tableros, cada uno con su serpiente; todo con el mismo reloj */
function renderDuel(duel, tokens, lang, theme) {
  const L = LABELS[lang];
  const width = T.size.full;
  const gap = T.space.gap;
  const height = SCOREBOARD_H + gap + BOARD_H + gap + BOARD_H;
  const p = T.space.padding;

  // Mismos tiempos que el exportador con speed=fast y pause=medium, para que las barras vayan con los tableros
  const totalSteps = duel.players[0].simulation.history.length;
  const play = totalSteps * STEP_SECONDS;
  const total = (play + PAUSE_SECONDS).toFixed(2);
  const active = (play / total) * 100;
  const pctOf = (step) => +((step / totalSteps) * active).toFixed(3);

  const maxScore = Math.max(1, ...duel.players.map(pl => pl.score));
  const halfW = T.size.half;
  let css = '';
  let body = '';
  duel.players.forEach((pl, i) => {
    const x0 = i === 0 ? p : halfW + gap + p;
    const x1 = i === 0 ? halfW - p : width - p;
    const isWinner = duel.winner === i;
    const barW = Math.max(2, ((x1 - x0) * pl.score) / maxScore);
    // Barra de carrera: fotogramas cada 8 ticks, relativos a su propia puntuación final (el estilo base es el final)
    let frames = '0%{transform:scaleX(0)}';
    for (let t = 8; t < pl.scores.length; t += 8) {
      frames += `${pctOf(t)}%{transform:scaleX(${pl.score ? +(pl.scores[t] / pl.score).toFixed(3) : 0})}`;
    }
    frames += `${+active.toFixed(3)}%,100%{transform:scaleX(1)}`;
    css += `.q${i}{transform-box:fill-box;transform-origin:left;animation:q${i} ${total}s infinite linear}@keyframes q${i}{${frames}}`;
    body += text(x0, 56, escapeXml(`@${pl.login}`), { size: T.font.size.value, weight: T.font.weight.bold, fill: isWinner ? tokens.body : tokens.text })
      + text(x1, 56, `${fmtNumber(pl.score, lang, false)} ${L.pts} · ${pl.percent}%`, { fill: tokens.muted, anchor: 'end' })
      + `<rect x="${x0}" y="66" width="${x1 - x0}" height="8" rx="${T.radius.bar}" fill="${tokens.empty}"/>`
      + `<rect class="q${i}" x="${x0}" y="66" width="${+barW.toFixed(1)}" height="8" rx="${T.radius.bar}" fill="${isWinner ? tokens.body : tokens.muted}"/>`;
  });
  const scoreboard = framed({
    width, height: SCOREBOARD_H, tokens, title: L.duel, subtitle: L.sameRules, right: resultLine(duel, lang), body
  });

  // Tableros: el exportador de la serpiente con la simulación del duelo y un prefijo por jugador
  const exporter = new engine.ExporterEngine();
  const boards = duel.players.map((pl, i) => {
    const svg = exporter.buildAnimatedSvg(pl.grid, {
      theme, lang, user: pl.login, speed: 'fast', pause: 'medium', ns: i === 0 ? 'a' : 'b', rings: false,
      simulation: pl.simulation,
      headline: `${fmtNumber(pl.score, lang, false)} ${L.pts} · ${pl.percent}% ${L.devoured}`
    });
    const y = SCOREBOARD_H + gap + i * (BOARD_H + gap);
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg x="0" y="${y}"`);
  });

  const [a, b] = duel.players;
  return toSvg({ width, height, title: `@${a.login} vs @${b.login} duel by GITHUB_SNAKE.EXE`, content: `<style>${css}</style>${scoreboard}${boards.join('')}` });
}

function svgResponse(status, body, cacheControl) {
  return {
    status,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': cacheControl, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' },
    body
  };
}

/** Error de GitHub -> [status, mensaje, caché] */
function githubError(err, users) {
  if (err.code === 'NOT_FOUND') return [404, `no existe uno de los usuarios (${users.join(', ')})`, CACHE_ERROR];
  if (err.status === 401) return [500, 'GITHUB_TOKEN del servidor no válido o caducado', 'no-store'];
  return [502, 'GitHub no respondió, inténtalo más tarde', 'no-store'];
}

/** Opciones comunes (theme, lang) con el contrato de las tarjetas */
function readOptions(query) {
  const params = new URLSearchParams(query);
  for (const k of ['pair', 'format', 'a', 'b']) params.delete(k);
  return { ...engine.SnakeCore.parseOptions(params.toString(), '', engine.SnakeCore.CARD_OPTION_VALUES) };
}

/**
 * Lógica pura de los dos SVG (testeable sin servidor). kind: 'duel' | 'versus'
 * @returns {Promise<{status:number, headers:object, body:string}>}
 */
async function renderPairSvg({ kind, pair, query = '', token, fetchImpl = fetch }) {
  let options;
  try {
    options = readOptions(query);
  } catch (err) {
    return svgResponse(400, messageCard(err.message, T.get('dark'), T.size.full), CACHE_ERROR);
  }
  const tokens = T.get(options.theme);
  const lang = options.lang === 'es' ? 'es' : 'en';
  const { users, error } = parsePair(pair, new URLSearchParams(query));
  if (error) return svgResponse(400, messageCard(error, tokens, T.size.full), CACHE_ERROR);
  if (!token) return svgResponse(500, messageCard('falta GITHUB_TOKEN en el servidor', tokens, T.size.full), 'no-store');

  try {
    const weeks = await Promise.all(users.map(u => getCalendarWeeks(u, token, fetchImpl)));
    if (kind === 'duel') {
      return svgResponse(200, renderDuel(runDuel(users, weeks), tokens, lang, options.theme || 'dark'), CACHE_OK);
    }
    const profiles = await Promise.all(users.map(u => getProfile(u, token, fetchImpl)));
    const piece = versus.render({ pair: profiles.map((profile, i) => ({ profile, weeks: weeks[i] })), tokens, lang });
    return svgResponse(200, toSvg(piece), CACHE_OK);
  } catch (err) {
    const [status, message, cache] = githubError(err, users);
    return svgResponse(status, messageCard(message, tokens, T.size.full), cache);
  }
}

const PAGE_TEXT = {
  en: {
    title: (a, b) => `@${a} vs @${b} · GitHub duel`,
    description: 'Same AI, same ticks: a snake eats each GitHub contribution graph. Can your GitHub beat it?',
    replay: 'Replay it on the web', copy: 'Copy link', copied: 'Copied', challenge: 'Challenge',
    challengeLabel: (w) => `Can you beat @${w}? Your GitHub user`, you: 'your-user',
    embed: 'Put it in your README', copyCode: 'Copy code', kit: 'Make your whole profile match',
    error: 'This duel could not be loaded'
  },
  es: {
    title: (a, b) => `@${a} vs @${b} · duelo de GitHub`,
    description: 'Misma IA, mismos ticks: una serpiente se come cada gráfico de contribuciones. ¿Tu GitHub le gana?',
    replay: 'Verlo en la web', copy: 'Copiar enlace', copied: 'Copiado', challenge: 'Retar',
    challengeLabel: (w) => `¿Le ganas a @${w}? Tu usuario de GitHub`, you: 'tu-usuario',
    embed: 'Ponlo en tu README', copyCode: 'Copiar código', kit: 'Haz que todo tu perfil combine',
    error: 'No se pudo cargar este duelo'
  }
};

/** Página HTML del duelo: metadatos para redes con el resultado y acciones para compartir y retar */
function renderDuelPage({ users, duel, lang, origin }) {
  const P = PAGE_TEXT[lang];
  const tk = T.get('dark');
  const [a, b] = users || ['?', '?'];
  const pageUrl = `${origin}/duel/${a}-vs-${b}`;
  const svgUrl = `${origin}/api/duel/${a}-vs-${b}.svg${lang === 'es' ? '?lang=es' : ''}`;
  const webUrl = `${WEB_URL}?u=${encodeURIComponent(a)}&vs=${encodeURIComponent(b)}#duelSection`;
  const result = duel ? resultLine(duel, lang) : P.error;
  const title = users ? P.title(a, b) : 'GITHUB_SNAKE.EXE';
  const description = duel ? `${result}. ${P.description}` : P.description;
  // El rival del reto es quien ganó (o @b si empataron): así el enlace siempre apunta a alguien a quien batir
  const target = duel && duel.winner !== -1 ? duel.players[duel.winner].login : b;
  const embed = `<a href="${pageUrl}"><img src="${svgUrl}" alt="@${a} vs @${b} GitHub duel" width="100%"></a>`;
  const e = escapeXml;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(pageUrl)}">
<meta property="og:image" content="${PREVIEW_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${PREVIEW_IMAGE}">
<style>
:root{color-scheme:dark;--bg:${tk.bg};--text:${tk.text};--muted:${tk.muted};--accent:${tk.body};--surface:${tk.empty};--border:${tk.border}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:${T.font.family};line-height:1.5}
main{max-width:829px;margin:0 auto;padding:32px 16px 48px}
h1{font-size:clamp(20px,5vw,28px);margin:0 0 4px;overflow-wrap:anywhere}
h1 span{color:var(--muted);font-weight:400}
.result{color:var(--accent);font-weight:700;margin:0 0 24px}
img.duel{display:block;width:100%;height:auto;border-radius:12px}
.row{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;align-items:center}
.btn{font:inherit;font-size:14px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;text-decoration:none}
.btn.primary{background:var(--accent);color:var(--bg);border-color:var(--accent);font-weight:700}
.btn:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:28px}
label{width:100%;color:var(--muted);font-size:13px}
input{font:inherit;font-size:14px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);min-width:0;flex:1 1 180px}
h2{font-size:14px;margin:32px 0 8px}
pre{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;overflow-x:auto;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}
a{color:var(--accent)}
</style>
</head>
<body>
<main>
<h1>@${e(a)} <span>vs</span> @${e(b)}</h1>
<p class="result">${e(result)}</p>
${duel ? `<img class="duel" src="${e(svgUrl)}" alt="${e(`@${a} vs @${b}: ${result}`)}">` : ''}
<div class="row">
<a class="btn primary" href="${e(webUrl)}">${e(P.replay)}</a>
<button class="btn" type="button" data-copy="${e(pageUrl)}">${e(P.copy)}</button>
</div>
<form id="challenge">
<label for="you">${e(P.challengeLabel(target))}</label>
<input id="you" name="you" placeholder="${e(P.you)}" autocomplete="off" spellcheck="false" required pattern="[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})">
<button class="btn primary" type="submit">${e(P.challenge)}</button>
</form>
<h2>${e(P.embed)}</h2>
<pre id="embed">${e(embed)}</pre>
<div class="row"><button class="btn" type="button" data-copy-from="embed">${e(P.copyCode)}</button>
<a href="${WEB_URL}">${e(P.kit)}</a></div>
</main>
<script>
const target = ${JSON.stringify(target)};
const origin = ${JSON.stringify(origin)};
async function copy(btn, value) {
  const label = btn.textContent;
  try { await navigator.clipboard.writeText(value); btn.textContent = ${JSON.stringify(P.copied)}; } catch (e) {}
  setTimeout(() => { btn.textContent = label; }, 1500);
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b, b.dataset.copy)));
document.querySelectorAll('[data-copy-from]').forEach(b => b.addEventListener('click', () => copy(b, document.getElementById(b.dataset.copyFrom).textContent)));
document.getElementById('challenge').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const you = document.getElementById('you').value.trim().replace(/^@/, '');
  if (!you || you.toLowerCase() === target.toLowerCase()) return;
  const url = origin + '/duel/' + encodeURIComponent(you) + '-vs-' + encodeURIComponent(target);
  try { await navigator.clipboard.writeText(url); } catch (e) {}
  location.href = url;
});
</script>
</body>
</html>`;
}

/** Lógica pura de la página (testeable sin servidor) */
async function renderDuelPageResponse({ pair, query = '', token, fetchImpl = fetch, origin, acceptLanguage = '' }) {
  const params = new URLSearchParams(query);
  const lang = params.get('lang') === 'es' || (!params.get('lang') && /^es\b/i.test(acceptLanguage)) ? 'es' : 'en';
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  const { users, error } = parsePair(pair, params);
  if (error || !token) {
    return { status: error ? 400 : 500, headers: { ...headers, 'Cache-Control': error ? CACHE_ERROR : 'no-store' }, body: renderDuelPage({ users, lang, origin }) };
  }
  try {
    const weeks = await Promise.all(users.map(u => getCalendarWeeks(u, token, fetchImpl)));
    const duel = runDuel(users, weeks);
    return { status: 200, headers: { ...headers, 'Cache-Control': CACHE_OK }, body: renderDuelPage({ users, duel, lang, origin }) };
  } catch (err) {
    const [status, , cache] = githubError(err, users);
    return { status, headers: { ...headers, 'Cache-Control': cache }, body: renderDuelPage({ users, lang, origin }) };
  }
}

/** Adaptador para Vercel: /api/duel?pair=<a>-vs-<b>&format=svg|versus|page (ver vercel.json) */
async function handler(req, res) {
  const start = Date.now();
  const url = new URL(req.url, 'http://localhost');
  const format = url.searchParams.get('format') || 'svg';
  const pair = url.searchParams.get('pair') || '';
  const token = process.env.GITHUB_TOKEN;
  // El host va a la página (enlaces y script): solo se acepta si parece un nombre de host
  const rawHost = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim();
  const host = /^[a-z0-9.-]+(:\d+)?$/i.test(rawHost) ? rawHost : 'github-snake-ebon.vercel.app';
  const result = format === 'page'
    ? await renderDuelPageResponse({ pair, query: url.search, token, origin: `https://${host}`, acceptLanguage: (req.headers && req.headers['accept-language']) || '' })
    : await renderPairSvg({ kind: format === 'versus' ? 'versus' : 'duel', pair, query: url.search, token });
  sendCompressed(req, res, result);
  logRender({ endpoint: format === 'page' ? 'duel-page' : (format === 'versus' ? 'versus' : 'duel'), user: pair, theme: url.searchParams.get('theme'), status: result.status, start });
}

module.exports = { parsePair, runDuel, renderPairSvg, renderDuelPageResponse, handler, resultLine };
