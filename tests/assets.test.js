const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'play.html'];

/** CSS y JS locales que carga una página */
function localRefs(page) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  return [...html.matchAll(/(?:href|src)="((?:(?:js|shared|css)\/[\w-]+\.(?:js|css)|style\.css)[^"]*)"/g)].map(m => m[1]);
}

test('cada página carga su CSS/JS local con una sola versión anti-caché, y existe', () => {
  for (const page of PAGES) {
    const refs = localRefs(page);
    assert.ok(refs.length >= 4, page);
    const versions = new Set(refs.map(ref => {
      const match = ref.match(/\?v=([\w.-]+)$/);
      assert.ok(match, `${page}: ${ref} no lleva ?v=`);
      return match[1];
    }));
    assert.strictEqual(versions.size, 1, `${page}: versiones distintas: ${[...versions].join(', ')}`);
    for (const ref of refs) assert.ok(fs.existsSync(path.join(ROOT, ref.split('?')[0])), `${page}: no existe ${ref}`);
  }
});

test('cada script de js/ lo carga alguna página (un archivo nuevo sin cargar rompe la web en silencio)', () => {
  const refs = PAGES.flatMap(localRefs);
  const scripts = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  for (const file of scripts) {
    assert.ok(refs.some(ref => ref.startsWith(`js/${file}?`)), `js/${file} no está en ninguna página`);
  }
});

test('examples/ está al día con las plantillas y los estilos', () => {
  const { files } = require('../scripts/build-examples');
  for (const [name, content] of Object.entries(files())) {
    const file = path.join(ROOT, 'examples', name);
    assert.ok(fs.existsSync(file), `falta examples/${name}`);
    assert.strictEqual(fs.readFileSync(file, 'utf8'), content, `examples/${name} desactualizado: node scripts/build-examples.js`);
  }
});

test('las redes ven la imagen: og:image y twitter:image con URL completa del dominio publicado', () => {
  const { Brand } = require('../action/lib').loadEngine();
  for (const page of ['index.html', 'play.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    for (const meta of [/property="og:image" content="([^"]+)"/, /name="twitter:image" content="([^"]+)"/, /property="og:url" content="([^"]+)"/]) {
      const value = (html.match(meta) || [])[1];
      assert.ok(value && value.startsWith(`${Brand.site}/`), `${page}: ${meta.source} = ${value}`);
    }
  }
});
