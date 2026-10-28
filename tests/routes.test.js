const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

/** Cada ruta pública de vercel.json con valores de ejemplo, contra el servidor local con datos de prueba */
test('todas las rutas de vercel.json responden como en Vercel (con los parámetros de la ruta en la query)', async () => {
  const port = 3500 + Math.floor(Math.random() * 400);
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'dev-server.js'), '--fixture', '--port', String(port)], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://localhost:${port}/`)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    const sample = { user: 'octocat', pair: 'octocat-vs-hubot' };
    for (const { source } of require('../vercel.json').rewrites) {
      const url = source
        .replace(/:(\w+)\(([^)|]+)[^)]*\)/g, (_, k, first) => first)
        .replace(/:(\w+)/g, (_, k) => sample[k]);
      const res = await fetch(`http://localhost:${port}${url}`);
      assert.strictEqual(res.status, 200, `${source} -> ${url} respondió ${res.status}: ${(await res.text()).slice(0, 120)}`);
    }
  } finally {
    server.kill();
  }
});
