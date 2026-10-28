#!/usr/bin/env node
/**
 * Prueba de humo de la web con un navegador de verdad: levanta el servidor local con datos de prueba
 * (--fixture, sin red ni token) y abre la portada y el estudio en Chrome sin ventana, a tamaño de móvil.
 * Comprueba en el DOM ya pintado lo que las pruebas de Node no ven: que las piezas, las pestañas y el
 * estudio aparecen con el usuario pedido.
 *
 *   npm run smoke                     usa Chrome en su ruta habitual
 *   CHROME=/ruta/a/chrome npm run smoke
 */

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3000 + Math.floor(Math.random() * 900) + 50;
const CHROME = process.env.CHROME || {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: 'google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
}[process.platform];

/** DOM de la página después de 15 s de tiempo virtual (cargas, fetch y temporizadores incluidos) */
function dumpDom(url, profileDir) {
  return new Promise((resolve, reject) => {
    execFile(CHROME, [
      '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profileDir}`,
      '--virtual-time-budget=15000', '--window-size=375,812', '--dump-dom', url
    ], { timeout: 60000, maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => (err && !stdout ? reject(err) : resolve(stdout)));
  });
}

const CHECKS = [
  {
    name: 'portada con un usuario: resultados, piezas y pestañas',
    url: '/?u=octocat',
    expect: (dom) => [
      [/id="who">@octocat</.test(dom), 'el usuario cargado aparece en la barra'],
      [!/id="results"[^>]*\shidden/.test(dom), 'los resultados están visibles'],
      [(dom.match(/class="piece[ "]/g) || []).length >= 13, 'están las 13 piezas'],
      [/class="group-tabs"/.test(dom), 'hay pestañas de grupos'],
      [/<pre[^>]*id="readmeCode"[^>]*>[^<]*octocat/.test(dom), 'el código del README lleva el usuario']
    ]
  },
  {
    name: 'portada con un usuario que no existe: mensaje y sin resultados',
    url: '/?u=ghost-perfila-smoke',
    expect: (dom) => [
      [/id="formMsg"[^>]*class="[^"]*error|class="[^"]*error[^"]*"[^>]*id="formMsg"/.test(dom) || /ghost-perfila-smoke/.test(dom.match(/id="formMsg"[^>]*>([^<]*)</)?.[1] || ''), 'se avisa del error'],
      [/id="results"[^>]*\shidden/.test(dom), 'los resultados siguen ocultos']
    ]
  },
  {
    name: 'estudio con un usuario',
    url: '/play.html?u=octocat',
    expect: (dom) => [
      [/id="activeDevUsername">@octocat</.test(dom), 'carga el perfil pedido'],
      [/id="mobileDpad"/.test(dom), 'tiene la cruceta táctil']
    ]
  }
];

async function main() {
  if (!CHROME || (path.isAbsolute(CHROME) && !fs.existsSync(CHROME))) {
    console.error(`No encuentro Chrome (${CHROME}). Indica su ruta con CHROME=...`);
    process.exit(2);
  }
  const server = spawn(process.execPath, [path.join(__dirname, 'dev-server.js'), '--fixture', '--port', String(PORT)], { stdio: 'ignore' });
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perfila-smoke-'));
  let failed = 0;
  try {
    // Espera a que el servidor responda
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    for (const check of CHECKS) {
      const dom = await dumpDom(`http://localhost:${PORT}${check.url}`, profileDir);
      const results = check.expect(dom);
      const bad = results.filter(([ok]) => !ok);
      failed += bad.length;
      console.log(`${bad.length ? '✖' : '✔'} ${check.name}`);
      for (const [, label] of bad) console.log(`    falla: ${label}`);
    }
  } finally {
    server.kill();
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
