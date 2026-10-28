#!/usr/bin/env node
/**
 * Servidor local: la web estática y la API con las mismas reescrituras que vercel.json.
 *   GITHUB_TOKEN=... node scripts/dev-server.js   datos reales con la API oficial, como en producción
 *   node scripts/dev-server.js                    sin token: datos reales públicos (algunas cifras aproximadas)
 *   node scripts/dev-server.js --fixture          datos de prueba inventados, sin red (para las pruebas visuales)
 * Aplica las reescrituras y las cabeceras de seguridad de vercel.json. Opción --port <n> (por defecto 3000, o el siguiente libre). Cada respuesta de la API lleva X-Portafil-Data con el origen de los datos,
 * y la web avisa cuando no son los oficiales.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const askedPort = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 0;
const MAX_TRIES = 10;

let dataSource = 'github';
if (args.includes('--fixture')) {
  const { fixtureFetch } = require('./fixture-github');
  global.fetch = fixtureFetch(global.fetch);
  process.env.GITHUB_TOKEN = 'fixture';
  dataSource = 'fixture';
} else if (!process.env.GITHUB_TOKEN) {
  const { publicFetch } = require('./public-github');
  global.fetch = publicFetch(global.fetch);
  process.env.GITHUB_TOKEN = 'public';
  dataSource = 'public';
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
// Cabeceras de seguridad de vercel.json: en local también, para que un recurso bloqueado se vea antes de desplegar
const headerRules = (vercel.headers || []).map(r => ({ re: toRegExp(r.source), headers: r.headers }));

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

const server = http.createServer(async (req, res) => {
  const original = new URL(req.url, 'http://localhost');
  for (const rule of headerRules) {
    if (rule.re.test(original.pathname)) for (const { key, value } of rule.headers) res.setHeader(key, value);
  }
  const url = rewrite(original);
  const api = url.pathname.match(/^\/api\/(\w+)$/);
  if (api) {
    const handler = apiHandler(api[1]);
    if (!handler) {
      res.statusCode = 404;
      return res.end('404');
    }
    req.url = url.pathname + url.search;
    if (dataSource !== 'github') res.setHeader('X-Portafil-Data', dataSource);
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
});

// Sin puerto pedido se usa el 3000 o, si está ocupado (otro servidor de Portafil, por ejemplo), el siguiente libre.
// Con --port o PORT se usa ese o se avisa: las pruebas y la vista previa necesitan saber dónde escucha.
let port = askedPort || 3000;
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  if (askedPort || port >= 3000 + MAX_TRIES) {
    console.error(`El puerto ${port} ya está en uso. Cierra el otro servidor o elige otro: node scripts/dev-server.js --port 3001`);
    process.exit(1);
  }
  console.log(`El puerto ${port} está ocupado, pruebo con el ${port + 1}`);
  server.listen(++port);
});
server.listen(port, () => {
  const notes = { github: 'datos reales (API oficial)', public: 'datos reales públicos sin token: commits, PRs y lenguajes aproximados', fixture: 'DATOS DE PRUEBA inventados' };
  console.log(`Portafil en http://localhost:${port} · ${notes[dataSource]}`);
});
