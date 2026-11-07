/**
 * Tu compañero (MySkin × Portafil): mascota pixel-art animada en SVG puro (sin JS, con @keyframes steps() y
 * image-rendering: pixelated) que reacciona a la actividad real del perfil en GitHub igual que la serpiente:
 *   - VICTORY_GITHUB si hubo contribuciones hoy
 *   - SLEEP si lleva 7 o más días sin contribuir
 *   - FOCUS si mantiene una racha de 3 o más días
 *   - WALK si tiene racha reciente (1-2 días) o en el formato separador (divider)
 *   - IDLE como estado base de guardia
 *
 * Tres formatos:
 *   - card (797×160): tarjeta de perfil completa del ancho del kit
 *   - divider (797×96): separador donde el compañero patrulla de lado a lado con giro automático
 *   - badge (390×96): insignia de media anchura para emparejar con otras tarjetas o cabeceras de repositorios
 */

const { T, LABELS, escapeXml, fmtNumber, truncate, wrap, text, framed } = require('./frame');
const { daysOf, streaks } = require('./data');
const BUNDLE = require('../../shared/companions-bundle.json');

const WIDTH = T.size.full;
const HEIGHT = 160;

const STATE_DEFAULTS = {
  FOCUS: { row: 4, frames: 4, fps: 6 },
  VICTORY_GITHUB: { row: 3, frames: 6, fps: 10 },
  WALK: { row: 1, frames: 6, fps: 10 },
  IDLE: { row: 0, frames: 4, fps: 6 },
  ALERT_SEMESTRE: { row: 2, frames: 4, fps: 8 },
  SLEEP: { row: 5, frames: 4, fps: 4 }
};

const COMPANION_TEXT = {
  es: {
    title: 'tu compañero',
    patrolSub: (u) => `patrullando @${u}`,
    categories: {
      mascotas: 'mascota',
      heroes: 'héroe',
      cine: 'cine y fantasía',
      anime: 'anime',
      gaming: 'gaming',
      cartoons: 'cartoon',
      deportes: 'deportes'
    },
    states: {
      FOCUS: 'MODO FOCO',
      VICTORY_GITHUB: 'COMMIT MERGED',
      WALK: 'EN PATRULLA',
      IDLE: 'EN GUARDIA',
      ALERT_SEMESTRE: 'ENTREGA PRÓXIMA',
      SLEEP: 'MODO SIESTA'
    },
    verbs: {
      FOCUS: 'Concentrado en el código.',
      VICTORY_GITHUB: 'Celebrando entrega en GitHub.',
      WALK: 'Patrullando el repositorio.',
      IDLE: 'En guardia junto a tu perfil.',
      ALERT_SEMESTRE: 'Alerta de entrega activa.',
      SLEEP: 'Descansando hasta el próximo commit.'
    }
  },
  en: {
    title: 'your companion',
    patrolSub: (u) => `patrolling @${u}`,
    categories: {
      mascotas: 'pet',
      heroes: 'hero',
      cine: 'cinema & fantasy',
      anime: 'anime',
      gaming: 'gaming',
      cartoons: 'cartoon',
      deportes: 'sports'
    },
    states: {
      FOCUS: 'FOCUS MODE',
      VICTORY_GITHUB: 'COMMIT MERGED',
      WALK: 'ON PATROL',
      IDLE: 'ON GUARD',
      ALERT_SEMESTRE: 'DEADLINE ALERT',
      SLEEP: 'SLEEP MODE'
    },
    verbs: {
      FOCUS: 'Focused on shipping clean code.',
      VICTORY_GITHUB: 'Celebrating today’s GitHub contributions.',
      WALK: 'Patrolling the repository.',
      IDLE: 'Standing guard on your profile.',
      ALERT_SEMESTRE: 'Priority deadline alert active.',
      SLEEP: 'Resting until the next commit.'
    }
  }
};

/**
 * Regla reactiva pura a partir de señales de GitHub (misma firma que MySkin src/portafilSvg.ts).
 */
function resolveGitHubCompanionState(signals = {}) {
  if (signals.urgentDeadlines && signals.urgentDeadlines > 0) return 'ALERT_SEMESTRE';
  if (signals.mergedRecently || (signals.commitsToday !== undefined && signals.commitsToday > 0)) return 'VICTORY_GITHUB';
  if (signals.daysSinceLastCommit !== undefined && signals.daysSinceLastCommit >= 7) return 'SLEEP';
  if (signals.streakDays !== undefined && signals.streakDays >= 3) return 'FOCUS';
  if (signals.streakDays !== undefined && signals.streakDays >= 1) return 'WALK';
  return 'IDLE';
}

/**
 * Determina el estado a partir de los días del calendario de GitHub o del estado forzado en la URL.
 */
function resolveCompanionState(days, requestedState = 'auto', variant = 'card') {
  if (requestedState && requestedState !== 'auto' && STATE_DEFAULTS[requestedState]) {
    return requestedState;
  }
  const { current, today } = streaks(days);
  let silentDays = 0;
  for (let i = days.length - 1; i >= 0 && days[i].count === 0; i--) silentDays++;
  const state = resolveGitHubCompanionState({
    commitsToday: today ? today.count : 0,
    streakDays: current.length,
    daysSinceLastCommit: days.length > 0 ? silentDays : 0
  });
  if (variant === 'divider' && state !== 'SLEEP') return 'WALK';
  return state;
}

function getSkin(skinId) {
  return BUNDLE.skins[skinId] || BUNDLE.skins.capybara;
}

function getDialogue(skin, state, lang, customSay) {
  const trimmed = String(customSay || '').trim();
  if (trimmed) return trimmed.slice(0, 110);
  const d = skin.dialogues || {};
  const fromManifest = state === 'FOCUS' ? d.focus
    : state === 'VICTORY_GITHUB' ? d.victory
    : state === 'ALERT_SEMESTRE' ? d.alert
    : state === 'SLEEP' ? d.sleep
    : d.break;
  if (fromManifest) return fromManifest;
  const C = COMPANION_TEXT[lang] || COMPANION_TEXT.en;
  return `${skin.detail || ''} ${C.verbs[state] || ''}`.trim();
}

function render({ weeks = [], tokens, lang = 'en', login = 'octocat', options = {} }) {
  const L = LABELS[lang] || LABELS.en;
  const C = COMPANION_TEXT[lang] || COMPANION_TEXT.en;
  const p = T.space.padding;
  const fs = T.font.size;

  const skin = getSkin(options.skin || 'capybara');
  const variant = ['card', 'divider', 'badge'].includes(options.variant) ? options.variant : 'card';
  const days = daysOf(weeks);
  const { current, todayPending, today } = streaks(days);
  const state = resolveCompanionState(days, options.state || 'auto', variant);

  const fallbackAnim = STATE_DEFAULTS[state] || STATE_DEFAULTS.IDLE;
  const stateCfg = (skin.states && skin.states[state]) || fallbackAnim;
  const row = stateCfg.row ?? fallbackAnim.row;
  const frames = Math.max(1, stateCfg.frames ?? fallbackAnim.frames);
  const fps = Math.max(1, stateCfg.fps ?? fallbackAnim.fps);
  const duration = +(frames / fps).toFixed(2);

  const dialogue = getDialogue(skin, state, lang, options.say);
  const categoryLabel = C.categories[skin.category] || C.title;
  const stateBadge = `● ${C.states[state]}`;
  const dataUrl = skin.spritesheetDataUrl;

  if (variant === 'divider') {
    const width = WIDTH;
    const height = 96;
    const size = 56;
    const sheetW = size * 6;
    const sheetH = size * 6;
    const rowY = -(row * size);
    const endX = -(frames * size);
    const css = `.zcs{image-rendering:-moz-crisp-edges;image-rendering:pixelated;animation:zcs ${duration}s steps(${frames}) infinite}`
      + `.zcp{animation:zcp 14s linear infinite}`
      + `@keyframes zcs{from{transform:translateX(0)}to{transform:translateX(${endX}px)}}`
      + `@keyframes zcp{0%{transform:translateX(28px) scaleX(1)}48%{transform:translateX(${width - 84}px) scaleX(1)}50%{transform:translateX(${width - 84}px) scaleX(-1)}98%{transform:translateX(28px) scaleX(-1)}100%{transform:translateX(28px) scaleX(1)}}`
      + `@media (prefers-reduced-motion:reduce){.zcs,.zcp{animation:none}}`;

    const subText = options.say ? truncate(options.say, 52) : C.patrolSub(login);
    const body = `<defs><clipPath id="zcd"><rect x="-28" y="0" width="${size}" height="${size}"/></clipPath></defs>`
      + `<line x1="24" y1="82" x2="${width - 24}" y2="82" stroke="${tokens.l2}" stroke-width="1.5" stroke-dasharray="6 6"/>`
      + `<circle cx="24" cy="82" r="3" fill="${tokens.body}"/><circle cx="${width - 24}" cy="82" r="3" fill="${tokens.body}"/>`
      + `<g transform="translate(0 28)"><g class="zcp"><g clip-path="url(#zcd)"><g transform="translate(-28 ${rowY})">`
      + `<image class="zcs" href="${dataUrl}" width="${sheetW}" height="${sheetH}"/>`
      + `</g></g></g></g>`;

    return {
      width,
      height,
      title: `@${login} companion (${skin.name}) by Portafil`,
      css,
      content: framed({ width, height, tokens, title: skin.name, subtitle: subText, right: stateBadge, body })
    };
  }

  if (variant === 'badge') {
    const width = T.size.half;
    const height = 96;
    const size = 48;
    const sheetW = size * 6;
    const sheetH = size * 6;
    const rowY = -(row * size);
    const endX = -(frames * size);
    const css = `.zcs{image-rendering:-moz-crisp-edges;image-rendering:pixelated;animation:zcs ${duration}s steps(${frames}) infinite}`
      + `@keyframes zcs{from{transform:translateX(0)}to{transform:translateX(${endX}px)}}`
      + `@media (prefers-reduced-motion:reduce){.zcs{animation:none}}`;

    const lines = wrap(`“${dialogue}”`, 36, 2);
    let quoteXml = '';
    lines.forEach((line, i) => {
      quoteXml += text(80, 56 + i * 16, escapeXml(line), { size: fs.body, fill: tokens.text });
    });

    const body = `<defs><clipPath id="zcb"><rect x="0" y="0" width="${size}" height="${size}" rx="6"/></clipPath></defs>`
      + `<rect x="${p}" y="36" width="52" height="48" rx="8" fill="${tokens.empty}" stroke="${tokens.border}"/>`
      + `<g transform="translate(${p + 2} 36)" clip-path="url(#zcb)"><g transform="translate(0 ${rowY})">`
      + `<image class="zcs" href="${dataUrl}" width="${sheetW}" height="${sheetH}"/>`
      + `</g></g>`
      + quoteXml;

    return {
      width,
      height,
      title: `@${login} companion (${skin.name}) by Portafil`,
      css,
      content: framed({ width, height, tokens, title: skin.name, subtitle: categoryLabel, right: stateBadge, body })
    };
  }

  // Variant por defecto: card (797×160)
  const size = 96;
  const sheetW = size * 6;
  const sheetH = size * 6;
  const rowY = -(row * size);
  const endX = -(frames * size);
  const css = `.zcs{image-rendering:-moz-crisp-edges;image-rendering:pixelated;animation:zcs ${duration}s steps(${frames}) infinite}`
    + `@keyframes zcs{from{transform:translateX(0)}to{transform:translateX(${endX}px)}}`
    + `@media (prefers-reduced-motion:reduce){.zcs{animation:none}}`;

  const textX = 138;
  const bubbleW = WIDTH - p - textX;
  const lines = wrap(`“${dialogue}”`, Math.floor((bubbleW - 24) / (fs.body * T.font.charWidth)), 2);
  const quoteY0 = lines.length === 1 ? 96 : 88;
  let quoteXml = '';
  lines.forEach((line, i) => {
    quoteXml += text(textX + 12, quoteY0 + i * 16, escapeXml(line), { size: fs.body, fill: tokens.text });
  });

  const unit = current.length === 1 ? L.day : L.days;
  const streakPart = current.length > 0 ? `${L.currentStreak}: ${fmtNumber(current.length, lang)} ${unit}` : L.noStreak;
  const todayPart = todayPending ? `${L.today}: ${L.pending}` : `${L.today}: +${today ? fmtNumber(today.count, lang) : 0}`;
  const sleepBadge = state === 'SLEEP'
    ? text(114, 54, 'zZ', { size: fs.label, weight: T.font.weight.bold, fill: tokens.body, anchor: 'end' })
    : '';

  const body = `<defs><clipPath id="zcc"><rect x="0" y="0" width="${size}" height="${size}" rx="8"/></clipPath></defs>`
    + `<rect x="${p}" y="38" width="106" height="106" rx="10" fill="${tokens.empty}" stroke="${tokens.border}"/>`
    + `<ellipse cx="${p + 53}" cy="132" rx="32" ry="6" fill="${tokens.l1}"/>`
    + `<g transform="translate(${p + 5} 40)" clip-path="url(#zcc)"><g transform="translate(0 ${rowY})">`
    + `<image class="zcs" href="${dataUrl}" width="${sheetW}" height="${sheetH}"/>`
    + `</g></g>`
    + sleepBadge
    + text(textX, 54, escapeXml(truncate(skin.fullName || skin.name, 48)), { size: fs.value, weight: T.font.weight.bold, fill: tokens.text })
    + text(WIDTH - p, 54, `@${escapeXml(login)}`, { size: fs.body, fill: tokens.muted, anchor: 'end' })
    + `<rect x="${textX}" y="66" width="${bubbleW}" height="52" rx="8" fill="${tokens.empty}" stroke="${tokens.border}"/>`
    + quoteXml
    + text(textX, 138, escapeXml(`${streakPart} · ${todayPart}`), { size: fs.label + 1, fill: tokens.muted })
    + text(WIDTH - p, 138, 'MySkin × Portafil', { size: fs.label + 1, weight: T.font.weight.bold, fill: tokens.body, anchor: 'end' });

  return {
    width: WIDTH,
    height: HEIGHT,
    title: `@${login} companion (${skin.name}) by Portafil`,
    css,
    content: framed({ width: WIDTH, height: HEIGHT, tokens, title: C.title, subtitle: `${skin.name} · ${categoryLabel}`, right: stateBadge, body })
  };
}

module.exports = { render, resolveGitHubCompanionState, resolveCompanionState, needs: ['calendar'], WIDTH, HEIGHT };

