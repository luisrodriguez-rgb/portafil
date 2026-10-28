// Función serverless de Vercel: /api/og/<usuario>.png, /api/og/duel/<a>-vs-<b>.png y /u/<usuario> (ver vercel.json y server/og.js)
module.exports = require('../server/og').handler;
