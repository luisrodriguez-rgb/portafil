/**
 * Instrumentación mínima: una línea JSON por petición en los logs de la función.
 * Vercel las guarda en Runtime Logs (o en un Log Drain); con ellas se cuentan perfiles únicos por semana,
 * piezas del kit por perfil y temas más usados (docs/metrics.md). Sin cookies ni IPs: solo el usuario de GitHub,
 * que ya es público en la URL.
 */

function logRender({ endpoint, user, theme, status, start }) {
  // Solo en el servidor desplegado: las pruebas y la Action no ensucian la salida
  if (!process.env.VERCEL) return;
  console.log(JSON.stringify({
    evt: 'portafil.render',
    endpoint,
    user: user ? String(user).toLowerCase() : null,
    theme: theme || 'ink',
    status,
    ms: Date.now() - start
  }));
}

module.exports = { logRender };
