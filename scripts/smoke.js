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
    name: 'portada con un usuario: resultados, piezas, selector de 53 compañeros y pestañas',
    url: '/?u=octocat&cs=cyber-ninja&cv=divider&cm=WALK&cy=Hola',
    expect: (dom) => [
      [/id="who">@octocat</.test(dom), 'el usuario cargado aparece en la barra'],
      [!/id="results"[^>]*\shidden/.test(dom), 'los resultados están visibles'],
      [(dom.match(/class="piece[ "]/g) || []).length >= 14, 'están las 14 piezas (incluida Tu compañero)'],
      [/data-kind="companion"/.test(dom), 'está la tarjeta de Tu compañero en la galería'],
      [(dom.match(/<select data-opt="companionSkin">([\s\S]*?)<\/select>/)?.[1].match(/<option /g) || []).length === 53, 'el selector de personaje tiene las 53 skins'],
      [(dom.match(/data-pick-skin="/g) || []).length === 53 && (dom.match(/data-comp-cat="/g) || []).length === 9, 'tiene el selector visual rápido con las 53 skins y 9 filtros de categoría'],
      [/data-opt="companionVariant"/.test(dom) && /data-opt="companionState"/.test(dom) && /data-opt-say/.test(dom), 'tiene selectores de formato, estado y frase'],
      [/data-companion-lab/.test(dom), 'tiene enlace directo al Laboratorio de 53 skins'],
      [/class="group-tabs"/.test(dom), 'hay pestañas de grupos'],
      [/<pre[^>]*id="readmeCode"[^>]*>[^<]*octocat/.test(dom), 'el código del README lleva el usuario']
    ]
  },
  {
    name: 'portada con un usuario que no existe: mensaje y sin resultados',
    url: '/?u=ghost-portafil-smoke',
    expect: (dom) => [
      [/id="formMsg"[^>]*class="[^"]*error|class="[^"]*error[^"]*"[^>]*id="formMsg"/.test(dom) || /ghost-portafil-smoke/.test(dom.match(/id="formMsg"[^>]*>([^<]*)</)?.[1] || ''), 'se avisa del error'],
      [/id="results"[^>]*\shidden/.test(dom), 'los resultados siguen ocultos']
    ]
  },
  {
    name: 'estudio con un usuario y laboratorio de 53 compañeros',
    url: '/play.html?u=octocat',
    expect: (dom) => [
      [/id="activeDevUsername">@octocat</.test(dom), 'carga el perfil pedido'],
      [/id="mobileDpad"/.test(dom), 'tiene la cruceta táctil'],
      [/id="boardCompanionBar"/.test(dom), 'muestra el compañero en vivo en el tablero'],
      [(dom.match(/<select id="boardCompSelect"[^>]*>([\s\S]*?)<\/select>/)?.[1].match(/<option /g) || []).length === 53, 'el selector rápido del tablero tiene las 53 skins'],
      [/id="companionSection"/.test(dom) && (dom.match(/data-skin-id="/g) || []).length === 53, 'renderiza el laboratorio con las 53 skins'],
      [/id="compVariantSelect"/.test(dom) && /id="compStateSelect"/.test(dom) && /id="compThemeSelect"/.test(dom) && /id="compSayInput"/.test(dom), 'tiene todos los selectores del laboratorio'],
      [/id="compCodeOutput"/.test(dom) && /api\/companion\/octocat\.svg/.test(dom), 'genera el código del compañero para el usuario activo']
    ]
  }
];

async function main() {
  if (!CHROME || (path.isAbsolute(CHROME) && !fs.existsSync(CHROME))) {
    console.error(`No encuentro Chrome (${CHROME}). Indica su ruta con CHROME=...`);
    process.exit(2);
  }
  const server = spawn(process.execPath, [path.join(__dirname, 'dev-server.js'), '--fixture', '--port', String(PORT)], { stdio: 'ignore' });
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portafil-smoke-'));
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
