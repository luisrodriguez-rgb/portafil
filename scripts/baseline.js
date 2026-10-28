#!/usr/bin/env node
/**
 * Línea base de la Fase 0: estrellas, forks, visitas y clones del repositorio, y cuántos perfiles usan
 * el endpoint o la Action según la búsqueda de código de GitHub. Guarda un JSON fechado en docs/metrics/.
 *   GITHUB_TOKEN=... node scripts/baseline.js <owner/repo>
 * Visitas y clones exigen un token con acceso de escritura al repo; el resto vale con cualquier token.
 * Las llamadas al endpoint no salen de aquí: se cuentan en los logs de Vercel (docs/metrics.md).
 */

const fs = require('fs');
const path = require('path');
const { loadEngine } = require('../action/lib');

const { Brand } = loadEngine();
const REPO = process.argv[2] || Brand.repo;
const SITE_HOST = new URL(Brand.site).host;
const TOKEN = process.env.GITHUB_TOKEN;

async function gh(endpoint) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': `${Brand.userAgent}-baseline` }
  });
  if (!res.ok) return { error: `${res.status} ${res.statusText}` };
  return res.json();
}

/** Número de archivos que mencionan el texto (búsqueda de código: 10 peticiones/minuto) */
async function codeCount(query) {
  const data = await gh(`/search/code?q=${encodeURIComponent(query)}&per_page=1`);
  return data.error ? data : data.total_count;
}

async function main() {
  if (!TOKEN) throw new Error('Falta GITHUB_TOKEN');
  if (!REPO) throw new Error('Falta el repositorio: node scripts/baseline.js <owner/repo> (o Brand.repo en shared/brand.js)');
  const repo = await gh(`/repos/${REPO}`);
  if (repo.error) throw new Error(`No se pudo leer ${REPO}: ${repo.error}`);
  const [views, clones, referrers] = await Promise.all([
    gh(`/repos/${REPO}/traffic/views`),
    gh(`/repos/${REPO}/traffic/clones`),
    gh(`/repos/${REPO}/traffic/popular/referrers`)
  ]);

  const baseline = {
    date: new Date().toISOString().slice(0, 10),
    repo: REPO,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.subscribers_count,
    views14d: views.error ? views : { count: views.count, uniques: views.uniques },
    clones14d: clones.error ? clones : { count: clones.count, uniques: clones.uniques },
    referrers: referrers.error ? referrers : referrers.slice(0, 10).map(r => ({ referrer: r.referrer, uniques: r.uniques })),
    // Aproximación de adopción: archivos públicos que enlazan el endpoint o usan la Action
    readmesUsingEndpoint: await codeCount(`${SITE_HOST}/api`),
    workflowsUsingAction: await codeCount(`${REPO}@ path:.github/workflows`)
  };

  const dir = path.join(__dirname, '..', 'docs', 'metrics');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `baseline-${baseline.date}.json`);
  fs.writeFileSync(file, JSON.stringify(baseline, null, 2) + '\n');
  console.log(JSON.stringify(baseline, null, 2));
  console.log(`Guardado en ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
