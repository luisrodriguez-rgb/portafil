#!/usr/bin/env node
/**
 * Genera examples/: un perfil completo por estilo (plantilla "desarrollador"), con el perfil de demostración
 * de shared/brand.js renderizado tal cual se ve en GitHub y el código listo para copiar con tu usuario.
 *   node scripts/build-examples.js           escribe los archivos
 *   node scripts/build-examples.js --check   falla si están desactualizados (lo usan las pruebas)
 */

const fs = require('fs');
const path = require('path');
const { loadEngine } = require('../action/lib');

const { KitSnippet, Brand, SnakeCore, ThemeTokens } = loadEngine();
const DIR = path.join(__dirname, '..', 'examples');
const LIGHT = ThemeTokens.light;
// Tema del modo contrario: el mismo que en la web (shared/theme-tokens.js)
const PARTNER = ThemeTokens.partner;
const NAMES = { ink: 'Tinta', paper: 'Papel', dark: 'Fósforo', light: 'GitHub claro', cyberpunk: 'Cyberpunk', neon_cyan: 'Cian', amber_terminal: 'Ámbar' };
const THEMES = [...SnakeCore.CARD_OPTION_VALUES.theme];

function pairFor(theme) {
  return LIGHT.includes(theme) ? { light: theme, dark: PARTNER[theme] } : { dark: theme, light: PARTNER[theme] };
}

function files() {
  const out = {};
  for (const theme of THEMES) {
    const opts = { ...pairFor(theme), lang: 'es', template: 'developer' };
    const demo = KitSnippet.build(Brand.demoUser, opts);
    const code = KitSnippet.build('tu-usuario', opts);
    out[`${theme}.md`] = `# Perfil de ejemplo · ${NAMES[theme]}

Plantilla «desarrollador» con el estilo **${NAMES[theme]}** (\`theme=${opts.dark}\` en modo oscuro y \`theme=${opts.light}\` en claro). Así se ve con el perfil de @${Brand.demoUser}:

---

${demo}

---

## Cópialo

Pégalo en el \`README.md\` de tu repositorio \`tu-usuario/tu-usuario\`, cambia \`tu-usuario\` por tu usuario y los textos [entre corchetes] por los tuyos. En la web puedes elegir otras piezas y verlo antes de copiar: ${Brand.site}

\`\`\`html
${code}
\`\`\`
`;
  }
  out['README.md'] = `# Perfiles de ejemplo

Un perfil completo por estilo, generado con \`node scripts/build-examples.js\`. Cada archivo muestra cómo queda y trae el código para copiar.

| Estilo | Modo oscuro | Modo claro |
| --- | --- | --- |
${THEMES.map(t => `| [${NAMES[t]}](${t}.md) | \`${pairFor(t).dark}\` | \`${pairFor(t).light}\` |`).join('\n')}

Para cambiar el perfil de demostración, edita \`demoUser\` en \`shared/brand.js\` y vuelve a generar.
`;
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const stale = [];
  if (!check) fs.mkdirSync(DIR, { recursive: true });
  for (const [name, content] of Object.entries(files())) {
    const file = path.join(DIR, name);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) stale.push(name);
    } else {
      fs.writeFileSync(file, content);
    }
  }
  if (check && stale.length) {
    console.error(`examples/ desactualizado: ${stale.join(', ')}. Ejecuta node scripts/build-examples.js`);
    process.exit(1);
  }
  if (!check) console.log(`examples/: ${Object.keys(files()).length} archivos`);
}

if (require.main === module) main();
module.exports = { files };
