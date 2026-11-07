#!/usr/bin/env node
/**
 * CLI de Compañeros (MySkin × Portafil)
 * Genera SVGs animados autónomos de cualquiera de las 53 skins o imprime sus bloques para README / Web Component.
 *
 * Ejemplos:
 *   npm run companion -- --list
 *   npm run companion -- --list --originals
 *   npm run companion -- --user luisrodriguez-rgb --skin capybara --variant card --theme ink --lang es --out dist/capybara.svg
 *   npm run companion -- --user luisrodriguez-rgb --skin ghost-dev --variant divider --theme dark --say "Vigilando los commits" --out dist/divider.svg
 */

const fs = require('fs');
const path = require('path');
const { renderCard } = require('../server/cards');
const { T } = require('../server/cards/frame');
const BUNDLE = require('../shared/companions-bundle.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function buildSyntheticWeeks(streakDays = 14, commitsToday = 3) {
  const days = [];
  const total = 35;
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(2026, 10, 7 - (total - 1 - i)));
    const isToday = i === total - 1;
    const inStreak = i >= total - streakDays;
    days.push({
      date: d.toISOString().slice(0, 10),
      weekday: d.getUTCDay(),
      contributionCount: isToday ? commitsToday : (inStreak ? 2 : 0)
    });
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ contributionDays: days.slice(i, i + 7) });
  }
  return weeks;
}

function printCatalog(args) {
  const skins = Object.values(BUNDLE.skins);
  const categoryFilter = typeof args.category === 'string' ? args.category.toLowerCase() : '';
  const onlyOriginals = Boolean(args.originals);
  const filtered = skins.filter(s => {
    if (onlyOriginals && !s.isOriginal) return false;
    if (categoryFilter && s.category !== categoryFilter) return false;
    return true;
  });

  console.log(`\nMySkin × Portafil — ${filtered.length} de ${skins.length} compañeros disponibles:\n`);
  for (const skin of filtered) {
    const tag = skin.isOriginal ? '★ ORIGINAL' : '  TRIBUTO ';
    console.log(`  [${tag}] ${skin.id.padEnd(24)} ${skin.name.padEnd(18)} (${skin.category}) — ${skin.fullName}`);
  }
  console.log('\nFormatos (--variant): card (797×160), divider (797×96), badge (390×96)');
  console.log('Estados  (--state):   auto, FOCUS, VICTORY_GITHUB, WALK, IDLE, ALERT_SEMESTRE, SLEEP');
  console.log('Temas    (--theme):   ink, paper, dark, light, sand, cyberpunk, neon_cyan, amber_terminal, ruby\n');
}

function generateCompanionSvg(opts = {}) {
  const user = opts.user || 'luisrodriguez-rgb';
  const skin = opts.skin || 'capybara';
  const variant = opts.variant || 'card';
  const state = opts.state || 'auto';
  const theme = opts.theme || 'ink';
  const lang = opts.lang === 'en' ? 'en' : 'es';
  const say = opts.say || '';
  const streakDays = opts.streak !== undefined ? Number(opts.streak) : 14;
  const commitsToday = opts['commits-today'] !== undefined ? Number(opts['commits-today']) : 3;

  const weeks = opts.weeks || buildSyntheticWeeks(streakDays, commitsToday);
  return renderCard('companion', {
    weeks,
    tokens: T.get(theme),
    lang,
    login: user,
    options: { skin, variant, state, theme, lang, ...(say ? { say } : {}) }
  });
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printCatalog(args);
    process.exit(0);
  }
  if (args.list) {
    printCatalog(args);
    process.exit(0);
  }
  const svg = generateCompanionSvg(args);
  if (args.out) {
    const outPath = path.resolve(process.cwd(), String(args.out));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, svg, 'utf8');
    console.log(`✔ SVG generado en ${args.out} (${(svg.length / 1024).toFixed(1)} KB)`);
  } else {
    process.stdout.write(svg);
  }
}

module.exports = { parseArgs, buildSyntheticWeeks, generateCompanionSvg };

