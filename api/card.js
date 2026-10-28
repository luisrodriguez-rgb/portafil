// Función serverless de Vercel: /api/<pieza>/<usuario>.svg (ver vercel.json y server/card-svg.js)
module.exports = require('../server/card-svg').handler;
