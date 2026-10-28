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
    invaders: { width: 'full', game: 'invaders' },
    tetris: { width: 'full', game: 'tetris' },
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
      invaders: `invaders on ${u} contributions by Perfila`,
      tetris: `tetris on ${u} contributions by Perfila`,
      versus: `${u} vs @${ctx.rival}`,
      duel: `${u} vs @${ctx.rival} duel`
    }[kind];
  },

  /** Código de una pieza; null si es de dos perfiles y falta el rival */
  pieceWithContext(kind, ctx) {
    const meta = this.PIECES[kind];
    if (!meta || (meta.pair && (!ctx.rival || ctx.rival.toLowerCase() === ctx.user.toLowerCase()))) return null;
    // Las de media anchura llevan su tamaño real: en escritorio caben dos por fila y en el móvil GitHub las
    // limita al ancho (max-width: 100%) y se apilan, legibles. Con 49% quedaban dos de ~170 px en el móvil.
    const width = meta.width === 'half' ? '390' : '100%';
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
   * Plantillas de perfil: qué piezas lleva cada tipo de perfil y el texto que las acompaña.
   * El texto es Markdown con huecos [entre corchetes] para que cada uno lo cambie por lo suyo.
   */
  TEMPLATES: {
    pieces: { pieces: null },
    developer: {
      pieces: ['header', 'stats', 'langs', 'streak', 'activity', 'snake'],
      intro: {
        es: '### Hola, soy [tu nombre] 👋\n\nDesarrollo [qué haces: webs, APIs, apps...] con [tus tecnologías principales]. Ahora mismo estoy trabajando en [tu proyecto actual].',
        en: '### Hi, I\'m [your name] 👋\n\nI build [what you do: websites, APIs, apps...] with [your main technologies]. Right now I\'m working on [your current project].'
      },
      outro: {
        es: '### Contacto\n\n- [LinkedIn](https://linkedin.com/in/[tu-usuario])\n- [Tu web](https://[tu-web])\n- [tu@correo]',
        en: '### Get in touch\n\n- [LinkedIn](https://linkedin.com/in/[your-user])\n- [Your website](https://[your-site])\n- [you@email]'
      }
    },
    student: {
      pieces: ['header', 'streak', 'activity', 'life'],
      intro: {
        es: '### Hola, soy [tu nombre] 👋\n\nEstudio [tu carrera o curso] en [tu centro]. Este año estoy aprendiendo [lo que aprendes].',
        en: '### Hi, I\'m [your name] 👋\n\nI study [your degree or course] at [your school]. This year I\'m learning [what you are learning].'
      },
      outro: {
        es: '### Proyectos\n\n- [Proyecto 1](https://github.com/[tu-usuario]/[repo]): [una frase sobre él]\n- [Proyecto 2](https://github.com/[tu-usuario]/[repo]): [una frase sobre él]',
        en: '### Projects\n\n- [Project 1](https://github.com/[your-user]/[repo]): [one line about it]\n- [Project 2](https://github.com/[your-user]/[repo]): [one line about it]'
      }
    },
    maintainer: {
      pieces: ['header', 'stats', 'streak', 'langs', 'activity', 'pacman'],
      intro: {
        es: '### Hola, soy [tu nombre] 👋\n\nMantengo [tus proyectos de código abierto]. Me interesan [los temas que te importan].',
        en: '### Hi, I\'m [your name] 👋\n\nI maintain [your open source projects]. I care about [the topics you care about].'
      },
      outro: {
        es: '### Cómo ayudar\n\n- Revisa las issues marcadas como [good first issue](https://github.com/[tu-usuario]/[repo]/issues)\n- [Patrocina el proyecto](https://github.com/sponsors/[tu-usuario])',
        en: '### How to help\n\n- Look at the issues labeled [good first issue](https://github.com/[your-user]/[repo]/issues)\n- [Sponsor the project](https://github.com/sponsors/[your-user])'
      }
    },
    minimal: {
      pieces: ['header', 'snake']
    }
  },

  /** Piezas de una plantilla (null = las que elija cada uno) */
  templatePieces(name) {
    const tpl = this.TEMPLATES[name];
    return tpl && tpl.pieces ? tpl.pieces.slice() : null;
  },

  /**
   * Bloque con las piezas elegidas, en el orden del catálogo. Las medias se agrupan de dos en dos
   * (en GitHub quedan lado a lado y en móvil se apilan). options.pieces: lista de piezas; por defecto el kit suelto.
   * options.template: añade el texto de la plantilla (presentación tras la cabecera y cierre al final).
   */
  build(username, options = {}) {
    const ctx = this.context(username, options);
    const tpl = this.TEMPLATES[options.template] || null;
    const chosen = new Set(options.pieces || (tpl && tpl.pieces) || (options.layout === 'single' ? ['kit', 'snake'] : this.DEFAULT_SELECTION));
    const lang = options.lang === 'es' ? 'es' : 'en';
    const blocks = [];
    let halves = [];
    let introDone = false;
    const intro = () => {
      if (!introDone && tpl && tpl.intro) blocks.push(tpl.intro[lang]);
      introDone = true;
    };
    const flush = () => {
      if (halves.length) blocks.push(`<p align="center">\n${halves.join('\n')}\n</p>`);
      halves = [];
    };
    for (const kind of Object.keys(this.PIECES)) {
      if (!chosen.has(kind)) continue;
      const html = this.pieceWithContext(kind, ctx);
      if (!html) continue;
      // La presentación va justo después de la cabecera (o al principio si no hay cabecera)
      if (kind !== 'header') intro();
      if (this.PIECES[kind].width === 'half') {
        halves.push(html);
        if (halves.length === 2) flush();
      } else {
        flush();
        blocks.push(html);
      }
    }
    flush();
    intro();
    if (tpl && tpl.outro) blocks.push(tpl.outro[lang]);
    return blocks.join('\n\n');
  },

  /**
   * Vista previa del README: el Markdown justo que usan las plantillas (títulos, párrafos, listas,
   * negrita, código y enlaces) y el HTML de las piezas tal cual. Escapa todo lo que no es marcado.
   */
  previewHtml(markdown) {
    const esc = (t) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return markdown.split(/\n{2,}/).map(block => {
      if (/^\s*</.test(block)) return block;
      const lines = block.split('\n');
      if (lines.every(l => /^- /.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      const h = block.match(/^(#{1,4}) (.*)$/);
      if (h && lines.length === 1) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('\n');
  }
};

window.KitSnippet = KitSnippet;
