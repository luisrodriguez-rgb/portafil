#!/usr/bin/env node
/**
 * Servidor local: la web estática y la API con las mismas reescrituras que vercel.json.
 *   node scripts/dev-server.js --fixture      datos de prueba, sin token ni red (npm run dev)
 *   GITHUB_TOKEN=... node scripts/dev-server.js   datos reales de GitHub
 * Opción --port <n> (por defecto 3000).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 3000;

if (args.includes('--fixture')) {
  const { fixtureFetch } = require('./fixture-github');
  global.fetch = fixtureFetch(global.fetch);
  process.env.GITHUB_TOKEN = 'fixture';
} else if (!process.env.GITHUB_TOKEN) {
  console.error('Falta GITHUB_TOKEN. Para probar sin token: node scripts/dev-server.js --fixture');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

/** "/api/:kind(a|b)/:user.svg" -> RegExp con grupos con nombre */
function toRegExp(source) {
  const pattern = source
    .replace(/[.]/g, '\\.')
    .replace(/:(\w+)\(([^)]+)\)/g, '(?<$1>$2)')
    .replace(/:(\w+)/g, '(?<$1>[^/]+?)');
  return new RegExp(`^${pattern}$`);
}

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rewrites = vercel.rewrites.map(r => ({ re: toRegExp(r.source), destination: r.destination }));

/** Aplica la primera reescritura que encaje; como en Vercel, la query original se conserva */
function rewrite(url) {
  for (const { re, destination } of rewrites) {
    const m = url.pathname.match(re);
    if (!m) continue;
    const target = new URL(destination.replace(/:(\w+)/g, (_, k) => encodeURIComponent(m.groups[k])), 'http://localhost');
    for (const [k, v] of url.searchParams) if (!target.searchParams.has(k)) target.searchParams.set(k, v);
    return target;
  }
  return url;
}

const handlers = {};
function apiHandler(name) {
  if (!/^\w+$/.test(name)) return null;
  const file = path.join(ROOT, 'api', `${name}.js`);
  if (!fs.existsSync(file)) return null;
  return (handlers[name] = handlers[name] || require(file));
}

function serveStatic(pathname, res) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.join(ROOT, rel);
  // Nada fuera del proyecto ni archivos ocultos (.git, .claude)
  if (!file.startsWith(ROOT + path.sep) || rel.split('/').some(part => part.startsWith('.'))) {
    res.statusCode = 403;
    return res.end('403');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('404');
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = rewrite(new URL(req.url, 'http://localhost'));
  const api = url.pathname.match(/^\/api\/(\w+)$/);
  if (api) {
    const handler = apiHandler(api[1]);
    if (!handler) {
      res.statusCode = 404;
      return res.end('404');
    }
    req.url = url.pathname + url.search;
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('500');
    }
    return;
  }
  serveStatic(url.pathname, res);
}).listen(port, () => {
  console.log(`Perfila en http://localhost:${port}${args.includes('--fixture') ? ' (datos de prueba)' : ''}`);
});
