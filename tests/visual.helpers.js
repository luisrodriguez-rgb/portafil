/**
 * Regresión visual por huella: el SHA-256 de cada SVG generado con datos fijos se guarda en tests/__snapshots__.
 * Si un cambio altera un píxel del resultado, la huella cambia y la prueba lo señala.
 * Para aceptar un cambio visual intencionado: UPDATE_SNAPSHOTS=1 node --test tests/visual.test.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LEVEL_NAMES = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

/** Calendario GraphQL determinista de 53 semanas que termina el 2026-10-28 (miércoles); variant da otro perfil */
function fixtureWeeks(variant = 0) {
  const weeks = [];
  const start = Date.UTC(2025, 9, 26); // domingo
  const end = Date.UTC(2026, 9, 28);
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const time = start + (w * 7 + d) * 86400000;
      if (time > end) break;
      // Patrón con huecos, rachas y semanas intensas, sin aleatoriedad
      const wave = (w * 7 + d * 3 + variant * 5) % 11;
      const count = (w + variant) % 9 === 4 ? 0 : wave < 3 ? 0 : wave * (1 + ((w + variant) % 4));
      const level = count === 0 ? 0 : Math.min(4, 1 + Math.floor(count / 10));
      days.push({ date: new Date(time).toISOString().slice(0, 10), weekday: d, contributionCount: count, contributionLevel: LEVEL_NAMES[level] });
    }
    weeks.push({ contributionDays: days });
  }
  return weeks;
}

/** Perfil normalizado fijo (mismo formato que devuelve server/profile.js) */
function fixtureProfile() {
  return {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'Building tools that make GitHub profiles look like one design instead of a collage of widgets.',
    location: 'San Francisco',
    avatar: null,
    followers: 12840,
    following: 9,
    publicRepos: 48,
    stars: 3412,
    totals: { commits: 1873, pullRequests: 214, issues: 96, reviews: 331, restricted: 0 },
    languages: [
      { name: 'TypeScript', size: 912000 },
      { name: 'JavaScript', size: 504000 },
      { name: 'Go', size: 230000 },
      { name: 'Rust', size: 120000 },
      { name: 'CSS', size: 64000 },
      { name: 'Shell', size: 21000 },
      { name: 'Dockerfile', size: 4000 }
    ]
  };
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

/** Compara { nombre: svg } contra el archivo de huellas; lo crea o reescribe con UPDATE_SNAPSHOTS=1 */
function checkSnapshots(name, outputs) {
  const file = path.join(__dirname, '__snapshots__', `${name}.json`);
  const actual = Object.fromEntries(Object.entries(outputs).map(([key, svg]) => [key, sha(svg)]));
  if (process.env.UPDATE_SNAPSHOTS || !fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(actual, null, 2) + '\n');
    return { written: true, diff: [] };
  }
  const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const diff = [...keys].filter(k => expected[k] !== actual[k]);
  return { written: false, diff };
}

module.exports = { fixtureWeeks, fixtureProfile, checkSnapshots, LEVEL_NAMES };
