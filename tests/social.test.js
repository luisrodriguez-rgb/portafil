const test = require('node:test');
const assert = require('node:assert');
const { renderSocialCard, renderSharePage } = require('../server/og');
const { renderDuelPageResponse } = require('../server/duel');
const { calendarCache } = require('../server/common');
const { profileCache } = require('../server/profile');
const { loadEngine } = require('../action/lib');
const { fakePairGitHub } = require('./duel.helpers');

function clearCaches() {
  calendarCache.clear();
  profileCache.clear();
}

/** Ancho y alto de un PNG (cabecera IHDR) */
function pngSize(buf) {
  assert.strictEqual(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'firma PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test('tarjeta de perfil: PNG de 1200×630 con el tema pedido', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  const png = await renderSocialCard({ kind: 'profile', slug: 'octocat', query: 'theme=cyberpunk&lang=es', token: 't', fetchImpl });
  assert.strictEqual(png.status, 200);
  assert.strictEqual(png.headers['Content-Type'], 'image/png');
  assert.deepStrictEqual(pngSize(png.body), [1200, 630]);

  const svg = await renderSocialCard({ kind: 'profile', slug: 'octocat', query: 'theme=cyberpunk&lang=es', format: 'svg', token: 't', fetchImpl });
  assert.match(svg.body, /#090614/);
  assert.match(svg.body, /@octocat/);
  assert.match(svg.body, /contribuciones/);
  assert.match(svg.body, />perfila</);
});

test('tarjeta de duelo: los dos usuarios, el marcador y el enlace al duelo', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  const png = await renderSocialCard({ kind: 'duel', slug: 'octocat-vs-hubot', token: 't', fetchImpl });
  assert.deepStrictEqual(pngSize(png.body), [1200, 630]);
  const svg = await renderSocialCard({ kind: 'duel', slug: 'octocat-vs-hubot', format: 'svg', token: 't', fetchImpl, origin: 'https://example.app' });
  assert.match(svg.body, /@octocat/);
  assert.match(svg.body, /@hubot/);
  assert.match(svg.body, /WINS|tie/);
  assert.match(svg.body, /example\.app\/duel\/octocat-vs-hubot/);
});

test('errores de las tarjetas con el código HTTP correcto', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  assert.strictEqual((await renderSocialCard({ kind: 'profile', slug: '"><x', token: 't', fetchImpl })).status, 400);
  assert.strictEqual((await renderSocialCard({ kind: 'profile', slug: 'octocat', query: 'theme=pink', token: 't', fetchImpl })).status, 400);
  // Una opción inventada no genera otro PNG (ni se salta la caché del CDN); las claves de la reescritura sí valen
  assert.strictEqual((await renderSocialCard({ kind: 'profile', slug: 'octocat', query: 'cb=123', token: 't', fetchImpl })).status, 400);
  assert.strictEqual((await renderSocialCard({ kind: 'profile', slug: 'octocat', query: 'kind=profile&slug=octocat&format=svg&theme=dark', format: 'svg', token: 't', fetchImpl })).status, 200);
  assert.strictEqual((await renderSocialCard({ kind: 'profile', slug: 'nadie', token: 't', fetchImpl })).status, 404);
  assert.strictEqual((await renderSocialCard({ kind: 'duel', slug: 'octocat-vs-octocat', token: 't', fetchImpl })).status, 400);
  const noToken = await renderSocialCard({ kind: 'profile', slug: 'octocat', token: '', fetchImpl });
  assert.strictEqual(noToken.status, 500);
  assert.strictEqual(noToken.headers['Cache-Control'], 'no-store');
});

test('página para compartir: la imagen para redes y la redirección a las piezas', () => {
  const page = renderSharePage({ user: 'octocat', query: 't=cyberpunk&lang=es', origin: 'https://example.app' });
  assert.strictEqual(page.status, 200);
  assert.match(page.body, /<meta property="og:image" content="https:\/\/example\.app\/api\/og\/octocat\.png\?theme=cyberpunk&amp;lang=es">/);
  assert.match(page.body, /<meta property="og:image:width" content="1200">/);
  assert.match(page.body, /url=https:\/\/example\.app\/\?u=octocat&amp;t=cyberpunk/);
  assert.match(page.body, /<html lang="es">/);
  // Un tema que no existe vuelve a ink; un usuario no válido va a la portada
  assert.match(renderSharePage({ user: 'octocat', query: 't=pink', origin: 'https://example.app' }).body, /theme=ink/);
  const bad = renderSharePage({ user: '"><script>', origin: 'https://example.app' });
  assert.strictEqual(bad.status, 302);
  assert.strictEqual(bad.headers.Location, 'https://example.app/');
});

test('la página del duelo usa la tarjeta del duelo como vista previa', async () => {
  clearCaches();
  const { fetchImpl } = fakePairGitHub();
  const page = await renderDuelPageResponse({ pair: 'octocat-vs-hubot', query: 'lang=es', token: 't', fetchImpl, origin: 'https://example.app' });
  assert.match(page.body, /<meta property="og:image" content="https:\/\/example\.app\/api\/og\/duel\/octocat-vs-hubot\.png\?lang=es">/);
});

test('plantillas: piezas propias, presentación tras la cabecera y cierre al final', () => {
  const { KitSnippet } = loadEngine();
  for (const name of Object.keys(KitSnippet.TEMPLATES)) {
    const md = KitSnippet.build('octocat', { template: name, lang: 'es', adaptive: false });
    assert.ok(md.length > 0, name);
  }
  const md = KitSnippet.build('octocat', { template: 'maintainer', lang: 'en', adaptive: false });
  const blocks = md.split('\n\n');
  assert.match(blocks[0], /\/api\/header\/octocat\.svg/);
  assert.match(blocks[1], /^### Hi, I'm \[your name\]/);
  // El cierre va después de la última pieza
  assert.ok(md.indexOf('### How to help') > md.indexOf('game=pacman'));
  assert.match(blocks[blocks.length - 1], /sponsors/);
  assert.ok(md.includes('game=pacman'));
  assert.deepStrictEqual([...KitSnippet.templatePieces('student')], ['header', 'streak', 'activity', 'life']);
  assert.strictEqual(KitSnippet.templatePieces('pieces'), null);
  // Las piezas elegidas a mano mandan sobre las de la plantilla
  const custom = KitSnippet.build('octocat', { template: 'student', pieces: ['snake'], adaptive: false, lang: 'es' });
  assert.ok(!custom.includes('/api/header/'));
  assert.match(custom, /### Hola, soy/);
});

test('vista previa del README: Markdown justo, HTML de las piezas y texto escapado', () => {
  const { KitSnippet } = loadEngine();
  const html = KitSnippet.previewHtml('### Hola **mundo**\n\nTexto con `code` y [enlace](https://example.app) <script>x</script>\n\n- uno\n- dos\n\n<img src="a.svg">');
  assert.match(html, /<h3>Hola <strong>mundo<\/strong><\/h3>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<a href="https:\/\/example\.app" target="_blank" rel="noopener noreferrer">enlace<\/a>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<ul><li>uno<\/li><li>dos<\/li><\/ul>/);
  assert.match(html, /<img src="a.svg">/);
  // Los enlaces que no son http(s) no se convierten
  assert.ok(!KitSnippet.previewHtml('[x](javascript:alert(1))').includes('<a '));
});

test('eventos de la web: solo nombres y valores conocidos, nada personal', () => {
  const { parseEvent } = require('../server/event');
  assert.deepStrictEqual({ ...parseEvent('{"event":"copy","ms":74213.6,"pieces":6,"theme":"cyberpunk","template":"developer","lang":"es"}') },
    { event: 'copy', ms: 74214, pieces: 6, theme: 'cyberpunk', template: 'developer', lang: 'es' });
  // Campos desconocidos o con valores fuera de lista se descartan
  assert.deepStrictEqual({ ...parseEvent({ event: 'copy-piece', kind: 'tetris', user: 'octocat', theme: 'pink', ms: -5 }) }, { event: 'copy-piece', kind: 'tetris' });
  assert.strictEqual(parseEvent('{"event":"hack"}'), null);
  assert.strictEqual(parseEvent('no json'), null);
  assert.strictEqual(parseEvent('{"event":"copy","x":"' + 'a'.repeat(2000) + '"}'), null);
});

test('eventos de la web: límite por IP y minuto', () => {
  const { overLimit, RATE_LIMIT } = require('../server/event');
  const sent = Array.from({ length: RATE_LIMIT + 2 }, () => overLimit('10.0.0.1', 1000));
  assert.strictEqual(sent.filter(Boolean).length, 2);
  assert.strictEqual(overLimit('10.0.0.2', 1000), false, 'otra IP tiene su propio contador');
  assert.strictEqual(overLimit('10.0.0.1', 1000 + 61000), false, 'al pasar el minuto se reinicia');
});
