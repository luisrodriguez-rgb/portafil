/**
 * Código de README para cualquier selección de piezas: una sola, varias o todas. Cada pieza va con <picture>
 * para el modo claro y el oscuro de GitHub. Lo usan la web (galería y bloque README), la documentación y las pruebas.
 * Script plano (sin import/export), como el resto del motor.
 */

const KitSnippet = {
  DEFAULT_API: Brand.site,

  // Catálogo: ancho en el README y si necesita un rival. El orden es el del bloque completo.
  PIECES: {
    header: { width: 'full' },
    stats: { width: 'half' },
    streak: { width: 'half' },
    langs: { width: 'half' },
    activity: { width: 'half' },
    kit: { width: 'full' },
    snake: { width: 'full', game: 'snake' },
    life: { width: 'full', game: 'life' },
    pacman: { width: 'full', game: 'pacman' },
    versus: { width: 'full', pair: true },
    duel: { width: 'full', pair: true }
  },

  // Selección por defecto del bloque completo (kit repetiría las piezas sueltas)
  DEFAULT_SELECTION: ['header', 'stats', 'streak', 'langs', 'activity', 'snake'],

  clean(username) {
    return String(username || '').replace(/[^A-Za-z0-9-]/g, '');
  },

  /**
   * options: { apiBase, dark, light, lang, adaptive, rival, snake: { morph, speed, pause } }
   * adaptive=false usa solo el tema oscuro.
   */
  context(username, options = {}) {
    return {
      user: this.clean(username) || 'user',
      rival: this.clean(options.rival),
      api: (options.apiBase || this.DEFAULT_API).replace(/\/$/, ''),
      dark: options.dark || 'ink',
      light: options.light || 'paper',
      adaptive: options.adaptive !== false,
      lang: options.lang && options.lang !== 'en' ? options.lang : '',
      snake: options.snake || {}
    };
  },

  /** URL de una pieza con un tema */
  url(kind, theme, ctx) {
    const params = new URLSearchParams({ theme });
    if (ctx.lang) params.set('lang', ctx.lang);
    const game = this.PIECES[kind].game;
    if (game === 'snake') {
      const s = ctx.snake;
      if (s.morph && s.morph !== 'matrix_viper') params.set('morph', s.morph);
      if (s.speed && s.speed !== 'normal') params.set('speed', s.speed);
      if (s.pause && s.pause !== 'fast') params.set('pause', s.pause);
    }
    if (game) {
      if (game !== 'snake') params.set('game', game);
      return `${ctx.api}/api/${ctx.user}.svg?${params}`;
    }
    if (this.PIECES[kind].pair) return `${ctx.api}/api/${kind}/${ctx.user}-vs-${ctx.rival}.svg?${params}`;
    return `${ctx.api}/api/${kind}/${ctx.user}.svg?${params}`;
  },

  alt(kind, ctx) {
    const u = `@${ctx.user}`;
    return {
      header: `${u} by Perfila`,
      stats: `${u} stats`,
      streak: `${u} streak`,
      langs: `${u} languages`,
      activity: `${u} weekly activity`,
      kit: `${u} GitHub profile by Perfila`,
      snake: `snake eating ${u} contributions by Perfila`,
      life: `game of life from ${u} contributions by Perfila`,
      pacman: `pac-man eating ${u} contributions by Perfila`,
      versus: `${u} vs @${ctx.rival}`,
      duel: `${u} vs @${ctx.rival} duel`
    }[kind];
  },

  /** Código de una pieza; null si es de dos perfiles y falta el rival */
  pieceWithContext(kind, ctx) {
    const meta = this.PIECES[kind];
    if (!meta || (meta.pair && (!ctx.rival || ctx.rival.toLowerCase() === ctx.user.toLowerCase()))) return null;
    const width = meta.width === 'half' ? '49%' : '100%';
    const img = `<img alt="${this.alt(kind, ctx)}" src="${this.url(kind, ctx.adaptive ? ctx.light : ctx.dark, ctx)}" width="${width}">`;
    let html = ctx.adaptive
      ? `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${this.url(kind, ctx.dark, ctx)}">
  <source media="(prefers-color-scheme: light)" srcset="${this.url(kind, ctx.light, ctx)}">
  ${img}
</picture>`
      : img;
    // El duelo enlaza a su página: quien lo vea en el perfil puede verlo en grande y retar
    if (kind === 'duel') html = `<a href="${ctx.api}/duel/${ctx.user}-vs-${ctx.rival}">\n${html}\n</a>`;
    return html;
  },

  piece(kind, username, options = {}) {
    return this.pieceWithContext(kind, this.context(username, options));
  },

  /**
   * Bloque con las piezas elegidas, en el orden del catálogo. Las medias se agrupan de dos en dos
   * (en GitHub quedan lado a lado y en móvil se apilan). options.pieces: lista de piezas; por defecto el kit suelto.
   */
  build(username, options = {}) {
    const ctx = this.context(username, options);
    const chosen = new Set(options.pieces || (options.layout === 'single' ? ['kit', 'snake'] : this.DEFAULT_SELECTION));
    const blocks = [];
    let halves = [];
    const flush = () => {
      if (halves.length) blocks.push(`<p align="center">\n${halves.join('\n')}\n</p>`);
      halves = [];
    };
    for (const kind of Object.keys(this.PIECES)) {
      if (!chosen.has(kind)) continue;
      const html = this.pieceWithContext(kind, ctx);
      if (!html) continue;
      if (this.PIECES[kind].width === 'half') {
        halves.push(html);
        if (halves.length === 2) flush();
      } else {
        flush();
        blocks.push(html);
      }
    }
    flush();
    return blocks.join('\n\n');
  }
};

window.KitSnippet = KitSnippet;
