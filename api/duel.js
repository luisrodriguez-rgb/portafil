// Función serverless de Vercel: /api/duel/<a>-vs-<b>.svg, /api/versus/<a>-vs-<b>.svg y /duel/<a>-vs-<b> (ver vercel.json y server/duel.js)
module.exports = require('../server/duel').handler;
