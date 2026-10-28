/**
 * Bloque de README del kit completo: cabecera, estadísticas, racha, lenguajes, actividad y serpiente,
 * cada pieza con <picture> para el modo claro y el oscuro de GitHub. Lo usan la documentación, el script
 * de capturas y (Fase 4) el constructor de la web. Script plano (sin import/export), como el resto del motor.
 */

const KitSnippet = {
  DEFAULT_API: 'https://github-snake-ebon.vercel.app',

  /**
   * options: { apiBase, dark, light, lang, layout: 'pieces' | 'single', adaptive, snake: { morph, speed, pause } }
   * adaptive=false usa solo el tema oscuro; layout='single' usa el dashboard /api/kit en una sola imagen.
   */
  build(username, options = {}) {
    const user = String(username).replace(/[^A-Za-z0-9-]/g, '') || 'user';
    const api = (options.apiBase || this.DEFAULT_API).replace(/\/$/, '');
    const dark = options.dark || 'dark';
    const light = options.light || 'light';
    const adaptive = options.adaptive !== false;

    const query = (theme, extra = {}) => {
      const params = new URLSearchParams({ theme });
      if (options.lang && options.lang !== 'en') params.set('lang', options.lang);
      for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
      return params.toString();
    };
    const urlFor = (kind, theme, extra) => (kind === 'snake'
      ? `${api}/api/${user}.svg?${query(theme, extra)}`
      : `${api}/api/${kind}/${user}.svg?${query(theme, extra)}`);

    const picture = (kind, alt, width, extra) => {
      const img = `<img alt="${alt}" src="${urlFor(kind, adaptive ? light : dark, extra)}" width="${width}">`;
      if (!adaptive) return img;
      return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${urlFor(kind, dark, extra)}">
  <source media="(prefers-color-scheme: light)" srcset="${urlFor(kind, light, extra)}">
  ${img}
</picture>`;
    };

    const snakeOpts = options.snake || {};
    const snake = picture('snake', `snake eating @${user} contributions by GITHUB_SNAKE.EXE`, '100%', {
      morph: snakeOpts.morph && snakeOpts.morph !== 'matrix_viper' ? snakeOpts.morph : '',
      speed: snakeOpts.speed && snakeOpts.speed !== 'normal' ? snakeOpts.speed : '',
      pause: snakeOpts.pause && snakeOpts.pause !== 'fast' ? snakeOpts.pause : ''
    });

    if (options.layout === 'single') {
      return [picture('kit', `@${user} GitHub profile by GITHUB_SNAKE.EXE`, '100%'), snake].join('\n\n');
    }
    // Dos medias de 49% por fila: en GitHub quedan lado a lado y en móvil se apilan
    const row = (a, b) => `<p align="center">\n${picture(a[0], a[1], '49%')}\n${picture(b[0], b[1], '49%')}\n</p>`;
    return [
      picture('header', `@${user} by GITHUB_SNAKE.EXE`, '100%'),
      row(['stats', `@${user} stats`], ['streak', `@${user} streak`]),
      row(['langs', `@${user} languages`], ['activity', `@${user} weekly activity`]),
      snake
    ].join('\n\n');
  }
};

window.KitSnippet = KitSnippet;
