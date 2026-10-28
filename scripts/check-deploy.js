#!/usr/bin/env node
/**
 * Comprueba un despliegue de punta a punta: la web, cada ruta pública de vercel.json con un usuario real,
 * los tipos de contenido y las cabeceras de seguridad. Para ejecutarlo después de cada despliegue.
 *
 *   npm run check:deploy                                  contra Brand.site (shared/brand.js)
 *   npm run check:deploy -- https://otro.vercel.app       contra otra URL
 *   npm run check:deploy -- https://otro.vercel.app torvalds
 */

const { loadEngine } = require('../action/lib');

const { Brand } = loadEngine();
const base = (process.argv[2] || Brand.site).replace(/\/$/, '');
const user = process.argv[3] || Brand.demoUser;
const rival = user.toLowerCase() === 'torvalds' ? 'gaearon' : 'torvalds';

const sample = { user, pair: `${user}-vs-${rival}` };
const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

async function check(path, { type, csp } = {}) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  } catch (err) {
    return { path, ok: false, why: `sin respuesta (${err.message})` };
  }
  const ms = Date.now() - started;
  const problems = [];
  if (res.status !== 200) {
    const body = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    problems.push(`HTTP ${res.status}: ${body}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (type && !contentType.startsWith(type)) problems.push(`tipo ${contentType}, esperaba ${type}`);
  if (csp && !res.headers.get('content-security-policy')) problems.push('sin Content-Security-Policy');
  const source = res.headers.get('x-portafil-data');
  if (source) problems.push(`datos de "${source}", no de la API oficial`);
  return { path, ok: !problems.length, why: problems.join('; '), ms };
}

async function main() {
  console.log(`Comprobando ${base} con @${user}\n`);
  const routes = [
    ['/', { type: 'text/html', csp: true }],
    ['/play.html', { type: 'text/html', csp: true }]
  ];
  for (const { source } of require('../vercel.json').rewrites) {
    const path = source
      .replace(/:(\w+)\(([^)|]+)[^)]*\)/g, (_, k, first) => first)
      .replace(/:(\w+)/g, (_, k) => sample[k]);
    const ext = (path.match(/\.\w+$/) || [''])[0];
    routes.push([path, { type: TYPES[ext] || 'text/html', csp: ext !== '.png' && ext !== '.json' }]);
  }
  // Los juegos y un tema que no es el de por defecto
  routes.push([`/api/${user}.svg?game=pacman&theme=paper`, { type: 'image/svg+xml', csp: true }]);
  routes.push([`/api/stats/${user}.svg?theme=cyberpunk&lang=es`, { type: 'image/svg+xml', csp: true }]);

  let failed = 0;
  for (const [path, expect] of routes) {
    const r = await check(path, expect);
    if (!r.ok) failed++;
    console.log(`${r.ok ? '✔' : '✖'} ${path}${r.ms ? `  ${r.ms} ms` : ''}${r.ok ? '' : `\n    ${r.why}`}`);
  }
  console.log(failed ? `\n${failed} de ${routes.length} fallan` : `\nTodo bien: ${routes.length} rutas`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
