/**
 * Web de Perfila: un solo campo (el usuario) y, con eso, la galería de todas las piezas.
 * Cada pieza se puede copiar sola o añadir al bloque README. El estado vive en la URL (?u=&t=&r=...)
 * para que cualquier configuración se pueda compartir o recuperar.
 */
(() => {
  const USER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
  const LIGHT = new Set(['paper', 'light']);
  // Tema que acompaña a cada uno en el modo contrario de GitHub
  const PARTNER = { ink: 'paper', paper: 'ink', dark: 'light', light: 'dark', cyberpunk: 'paper', neon_cyan: 'paper', amber_terminal: 'paper' };
  const THEMES = Object.keys(PARTNER);

  const TEXT = {
    es: {
      skip: 'Ir al contenido',
      'nav.play': 'Estudio',
      'hero.title': 'Tu perfil de GitHub, con un solo estilo.',
      'hero.lead': 'Cabecera, estadísticas, racha, lenguajes, actividad, la serpiente que se come tus commits y duelos contra otros perfiles. Escribe tu usuario y elige lo que quieras: sin YAML y sin configurar nada.',
      'form.label': 'Tu usuario de GitHub',
      'form.placeholder': 'tu-usuario',
      'form.cta': 'Ver mis piezas',
      'form.try': '¿Sin ideas? Prueba con',
      'how.title': 'Cómo funciona',
      'how.1t': 'Escribe tu usuario', 'how.1': 'Es lo único que te pedimos. Leemos tus datos públicos de GitHub.',
      'how.2t': 'Elige estilo y piezas', 'how.2': 'Siete estilos. Todas las piezas cambian juntas para que tu perfil parezca un solo diseño.',
      'how.3t': 'Copia y pega', 'how.3': 'Una pieza o todas. Se actualizan solas y cambian con el modo claro u oscuro de GitHub.',
      'res.for': 'Piezas de', 'res.change': 'Cambiar usuario', 'res.style': 'Estilo',
      'res.adaptive': 'Cambiar con el modo claro u oscuro de GitHub',
      'res.inLight': 'En modo claro:', 'res.inDark': 'En modo oscuro:',
      'dock.see': 'Ver código',
      'readme.title': 'Tu README', 'readme.copy': 'Copiar todo', 'readme.open': 'Abrir mi repositorio de perfil',
      'readme.help': (u) => `Pégalo en el README.md del repositorio ${u}/${u}. Si no existe, créalo con ese nombre: GitHub lo muestra en tu perfil.`,
      'readme.count': (n) => (n === 1 ? '1 pieza' : `${n} piezas`),
      'readme.empty': '<!-- Marca "Añadir al README" en las piezas que quieras -->',
      'foot.note': 'Todo es SVG con CSS: tu perfil no ejecuta JavaScript.',
      'msg.checking': (u) => `Buscando a @${u}…`,
      'msg.invalid': 'Ese no parece un usuario de GitHub: letras, números y guiones, hasta 39.',
      'msg.notFound': (u) => `No encontramos a @${u} en GitHub.`,
      'msg.down': 'GitHub no responde ahora mismo. Inténtalo en un momento.',
      'piece.add': 'Añadir al README', 'piece.copy': 'Copiar código', 'piece.copied': 'Copiado', 'piece.open': 'Abrir SVG',
      'g.profile': 'Tu perfil', 'g.profileP': 'Las piezas básicas. La cabecera va a lo ancho y el resto de dos en dos.',
      'g.games': 'Juegos', 'g.gamesP': 'Tu gráfico de contribuciones convertido en partida, animada en un SVG. La serpiente duerme si llevas una semana sin contribuir y presume de tu racha si pasa de 7 días.',
      'g.pair': 'Frente a otro perfil', 'g.pairP': 'Compárate con alguien o rétalo a un duelo. El duelo enlaza a una página para compartir.',
      'rival.label': 'Usuario rival', 'rival.cta': 'Comparar', 'rival.placeholder': 'rival',
      'rival.needed': 'Escribe un rival arriba para ver esta pieza.',
      'snake.morph': 'Forma', 'snake.speed': 'Velocidad',
      morph: { matrix_viper: 'Víbora', capsule: 'Cápsula', retro: 'Retro' },
      speed: { normal: 'Normal', fast: 'Rápida', relaxed: 'Tranquila' },
      themes: { ink: 'Tinta', paper: 'Papel', dark: 'Fósforo', light: 'GitHub claro', cyberpunk: 'Cyberpunk', neon_cyan: 'Cian', amber_terminal: 'Ámbar' },
      pieces: {
        header: ['Cabecera', 'Avatar, nombre, bio y cifras'],
        stats: ['Estadísticas', 'Contribuciones, commits, PRs, issues, reviews'],
        streak: ['Racha', 'Actual, más larga y últimos 30 días'],
        langs: ['Lenguajes', 'Por tamaño de código'],
        activity: ['Actividad', 'Contribuciones por semana'],
        kit: ['Todo en una imagen', 'Las cinco piezas en un solo SVG'],
        snake: ['Serpiente', 'Se come tu año de commits'],
        life: ['Juego de la vida', 'Tus contribuciones evolucionan con las reglas de Conway'],
        pacman: ['Pac-Man', 'Se come tu gráfico mientras dos fantasmas lo persiguen'],
        versus: ['Versus', 'Tus cifras frente a las de otro perfil'],
        duel: ['Duelo', 'La misma IA en los dos gráficos, 60 segundos']
      }
    },
    en: {
      skip: 'Skip to content',
      'nav.play': 'Studio',
      'hero.title': 'One style for your whole GitHub profile.',
      'hero.lead': 'Header, stats, streak, languages, activity, the snake that eats your commits and duels against other profiles. Type your username and pick what you like: no YAML, nothing to configure.',
      'form.label': 'Your GitHub username',
      'form.placeholder': 'your-user',
      'form.cta': 'See my pieces',
      'form.try': 'No ideas? Try',
      'how.title': 'How it works',
      'how.1t': 'Type your username', 'how.1': 'That is all we ask. We read your public GitHub data.',
      'how.2t': 'Pick a style and pieces', 'how.2': 'Seven styles. Every piece changes together so your profile looks like one design.',
      'how.3t': 'Copy and paste', 'how.3': 'One piece or all of them. They update themselves and follow GitHub light or dark mode.',
      'res.for': 'Pieces for', 'res.change': 'Change user', 'res.style': 'Style',
      'res.adaptive': 'Follow GitHub light or dark mode',
      'res.inLight': 'In light mode:', 'res.inDark': 'In dark mode:',
      'dock.see': 'See code',
      'readme.title': 'Your README', 'readme.copy': 'Copy all', 'readme.open': 'Open my profile repository',
      'readme.help': (u) => `Paste it into README.md in the ${u}/${u} repository. If it does not exist, create it with that name: GitHub shows it on your profile.`,
      'readme.count': (n) => (n === 1 ? '1 piece' : `${n} pieces`),
      'readme.empty': '<!-- Tick "Add to README" on the pieces you want -->',
      'foot.note': 'Everything is SVG with CSS: your profile runs no JavaScript.',
      'msg.checking': (u) => `Looking for @${u}…`,
      'msg.invalid': 'That does not look like a GitHub username: letters, numbers and dashes, up to 39.',
      'msg.notFound': (u) => `We could not find @${u} on GitHub.`,
      'msg.down': 'GitHub is not answering right now. Try again in a moment.',
      'piece.add': 'Add to README', 'piece.copy': 'Copy code', 'piece.copied': 'Copied', 'piece.open': 'Open SVG',
      'g.profile': 'Your profile', 'g.profileP': 'The basics. The header goes full width and the rest two by two.',
      'g.games': 'Games', 'g.gamesP': 'Your contribution graph turned into a game, animated in an SVG. The snake sleeps after a week without contributions and shows off your streak once it passes 7 days.',
      'g.pair': 'Against another profile', 'g.pairP': 'Compare yourself with someone or challenge them to a duel. The duel links to a page to share.',
      'rival.label': 'Rival username', 'rival.cta': 'Compare', 'rival.placeholder': 'rival',
      'rival.needed': 'Type a rival above to see this piece.',
      'snake.morph': 'Shape', 'snake.speed': 'Speed',
      morph: { matrix_viper: 'Viper', capsule: 'Capsule', retro: 'Retro' },
      speed: { normal: 'Normal', fast: 'Fast', relaxed: 'Relaxed' },
      themes: { ink: 'Ink', paper: 'Paper', dark: 'Phosphor', light: 'GitHub light', cyberpunk: 'Cyberpunk', neon_cyan: 'Cyan', amber_terminal: 'Amber' },
      pieces: {
        header: ['Header', 'Avatar, name, bio and numbers'],
        stats: ['Stats', 'Contributions, commits, PRs, issues, reviews'],
        streak: ['Streak', 'Current, longest and last 30 days'],
        langs: ['Languages', 'By code size'],
        activity: ['Activity', 'Contributions per week'],
        kit: ['All in one image', 'The five pieces in a single SVG'],
        snake: ['Snake', 'Eats your year of commits'],
        life: ['Game of Life', 'Your contributions evolve with Conway\'s rules'],
        pacman: ['Pac-Man', 'Eats your graph while two ghosts chase it'],
        versus: ['Versus', 'Your numbers next to another profile'],
        duel: ['Duel', 'Same AI on both graphs, 60 seconds']
      }
    }
  };

  const GROUPS = [
    { id: 'profile', pieces: ['header', 'stats', 'streak', 'langs', 'activity', 'kit'] },
    { id: 'games', pieces: ['snake', 'life', 'pacman'] },
    { id: 'pair', pieces: ['versus', 'duel'] }
  ];

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const storedLang = (() => { try { return localStorage.getItem('perfila.lang'); } catch (e) { return null; } })();

  const state = {
    ui: params.get('lang') || storedLang || (/^es\b/i.test(navigator.language) ? 'es' : 'en'),
    user: '',
    theme: THEMES.includes(params.get('t')) ? params.get('t') : 'ink',
    other: THEMES.includes(params.get('o')) ? params.get('o') : '',
    adaptive: params.get('a') !== '0',
    rival: '',
    morph: params.get('m') || 'matrix_viper',
    speed: params.get('s') || 'normal',
    picked: new Set((params.get('p') || KitSnippet.DEFAULT_SELECTION.join(',')).split(',').filter(k => KitSnippet.PIECES[k]))
  };
  if (!['es', 'en'].includes(state.ui)) state.ui = 'en';
  const T = (key, ...args) => {
    const value = TEXT[state.ui][key];
    return typeof value === 'function' ? value(...args) : value;
  };

  // Las vistas previas salen de la API de este mismo despliegue; el código para pegar apunta al dominio
  // público (en local, el de la marca: un README no puede apuntar a localhost)
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const previewBase = location.protocol.startsWith('http') ? location.origin : Brand.site;
  const publicBase = isLocal || !location.protocol.startsWith('http') ? Brand.site : location.origin;

  const otherTheme = () => state.other || PARTNER[state.theme];
  const snippetOptions = (base) => {
    const light = LIGHT.has(state.theme);
    return {
      apiBase: base,
      dark: state.adaptive ? (light ? otherTheme() : state.theme) : state.theme,
      light: light ? state.theme : otherTheme(),
      adaptive: state.adaptive,
      lang: state.ui,
      rival: state.rival,
      snake: { morph: state.morph, speed: state.speed }
    };
  };

  // --- Textos estáticos ---
  function applyStaticText() {
    document.documentElement.lang = state.ui;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = T(el.dataset.i18n);
      if (typeof value === 'string') el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = T(el.dataset.i18nPlaceholder); });
    $('langBtn').textContent = state.ui === 'es' ? 'EN' : 'ES';
    $('langBtn').setAttribute('aria-label', state.ui === 'es' ? 'English' : 'Español');
  }

  // --- Celdas decorativas de la portada (patrón fijo, en la rampa neutra) ---
  function drawHeroCells() {
    let html = '';
    for (let i = 0; i < 17 * 7; i++) {
      const w = Math.floor(i / 7);
      const v = (w * 7 + (i % 7) * 3) % 11;
      const level = v < 3 || w % 9 === 4 ? 0 : Math.min(4, 1 + Math.floor((v * (1 + (w % 4))) / 10));
      html += `<i data-l="${level}"></i>`;
    }
    // Columnas por filas: el grid se llena por filas, así que se transpone a 7 filas × 17 columnas
    const cells = html.match(/<i[^>]*><\/i>/g);
    const rows = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 17; c++) rows.push(cells[c * 7 + r]);
    $('heroCells').innerHTML = rows.join('');
  }

  // --- URL ---
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.user) p.set('u', state.user);
    if (state.theme !== 'ink') p.set('t', state.theme);
    if (state.other) p.set('o', state.other);
    if (!state.adaptive) p.set('a', '0');
    if (state.rival) p.set('r', state.rival);
    if (state.morph !== 'matrix_viper') p.set('m', state.morph);
    if (state.speed !== 'normal') p.set('s', state.speed);
    const picked = [...state.picked].join(',');
    if (picked !== KitSnippet.DEFAULT_SELECTION.join(',')) p.set('p', picked);
    const q = p.toString();
    try { history.replaceState(null, '', q ? `?${q}` : location.pathname); } catch (e) {}
  }

  // --- Galería ---
  function pieceUrl(kind, base = previewBase) {
    const opts = snippetOptions(base);
    const ctx = KitSnippet.context(state.user, { ...opts, adaptive: false });
    return KitSnippet.url(kind, state.theme, ctx);
  }

  function buildGallery() {
    const gallery = $('gallery');
    gallery.innerHTML = '';
    for (const group of GROUPS) {
      const section = document.createElement('section');
      section.className = 'group';
      section.innerHTML = `<h3>${T(`g.${group.id}`)}</h3><p>${T(`g.${group.id}P`)}</p>`;
      if (group.id === 'pair') {
        section.insertAdjacentHTML('beforeend', `<form class="rival-form" id="rivalForm" novalidate>
          <label for="rival" class="sr-only">${T('rival.label')}</label>
          <div class="field"><span class="prefix" aria-hidden="true">github.com/</span><input id="rival" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${T('rival.placeholder')}" value="${state.rival}"></div>
          <button type="submit" class="btn">${T('rival.cta')}</button></form>`);
      }
      const grid = document.createElement('div');
      grid.className = 'grid';
      for (const kind of group.pieces) grid.appendChild(pieceCard(kind));
      section.appendChild(grid);
      gallery.appendChild(section);
    }
    $('rivalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const value = $('rival').value.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//i, '').replace(/\/.*$/, '');
      if (value && (!USER_RE.test(value) || value.toLowerCase() === state.user.toLowerCase())) {
        $('rival').setAttribute('aria-invalid', 'true');
        return;
      }
      $('rival').removeAttribute('aria-invalid');
      state.rival = value;
      refresh();
    });
  }

  function pieceCard(kind) {
    const [title, desc] = T('pieces')[kind];
    const meta = KitSnippet.PIECES[kind];
    const card = document.createElement('article');
    card.className = `piece ${meta.width === 'half' ? 'half' : 'full'}`;
    card.dataset.kind = kind;
    let opts = '';
    if (kind === 'snake') {
      const select = (id, label, values, current) => `<label class="inline">${label} <select data-opt="${id}">${Object.entries(values).map(([v, name]) => `<option value="${v}"${v === current ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`;
      opts = `<div class="piece-opts">${select('morph', T('snake.morph'), T('morph'), state.morph)}${select('speed', T('snake.speed'), T('speed'), state.speed)}</div>`;
    }
    card.innerHTML = `<div class="piece-head"><h4>${title}</h4><span>${desc}</span></div>
      ${opts}
      <div class="preview"></div>
      <div class="piece-foot">
        <label class="check"><input type="checkbox" data-pick${state.picked.has(kind) ? ' checked' : ''}> ${T('piece.add')}</label>
        <div class="piece-actions"><a target="_blank" rel="noopener noreferrer" data-open>${T('piece.open')}</a><button type="button" class="btn small" data-copy>${T('piece.copy')}</button></div>
      </div>`;
    card.querySelector('[data-pick]').addEventListener('change', (e) => {
      if (e.target.checked) state.picked.add(kind); else state.picked.delete(kind);
      updateReadme();
    });
    card.querySelector('[data-copy]').addEventListener('click', (e) => {
      const code = KitSnippet.piece(kind, state.user, snippetOptions(publicBase));
      if (code) copy(e.currentTarget, code);
    });
    card.querySelectorAll('[data-opt]').forEach(sel => sel.addEventListener('change', () => {
      state[sel.dataset.opt] = sel.value;
      refresh();
    }));
    return card;
  }

  function updatePreviews() {
    document.querySelectorAll('.piece').forEach(card => {
      const kind = card.dataset.kind;
      const box = card.querySelector('.preview');
      const ready = !KitSnippet.PIECES[kind].pair || state.rival;
      card.querySelector('[data-copy]').disabled = !ready;
      const open = card.querySelector('[data-open]');
      if (!ready) {
        box.innerHTML = `<p class="placeholder">${T('rival.needed')}</p>`;
        open.hidden = true;
        return;
      }
      const src = pieceUrl(kind);
      open.hidden = false;
      open.href = src;
      let img = box.querySelector('img');
      if (!img) {
        box.innerHTML = '';
        img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('load', () => box.classList.remove('loading'));
        img.addEventListener('error', () => box.classList.remove('loading'));
        box.appendChild(img);
      }
      img.alt = KitSnippet.alt(kind, KitSnippet.context(state.user, { rival: state.rival }));
      if (img.getAttribute('src') !== src) {
        box.classList.add('loading');
        img.src = src;
      }
    });
  }

  function updateReadme() {
    document.querySelectorAll('.piece').forEach(card => card.classList.toggle('picked', state.picked.has(card.dataset.kind)));
    const code = KitSnippet.build(state.user, { ...snippetOptions(publicBase), pieces: [...state.picked] });
    const included = [...state.picked].filter(k => KitSnippet.piece(k, state.user, snippetOptions(publicBase)));
    $('readmeCode').textContent = code || T('readme.empty');
    $('count').textContent = T('readme.count', included.length);
    $('dockCount').textContent = T('readme.count', included.length);
    $('copyAll').disabled = !code;
    $('dockCopy').disabled = !code;
    $('readmeHelp').textContent = T('readme.help', state.user);
    $('openProfile').href = `https://github.com/${state.user}/${state.user}`;
    syncUrl();
  }

  // --- Estilo ---
  function buildThemes() {
    const box = $('themes');
    box.innerHTML = '';
    for (const theme of THEMES) {
      const t = ThemeTokens.get(theme);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(theme === state.theme));
      btn.innerHTML = `<span class="swatch" style="--a:${t.bg};--b:${t.l4}"></span>${T('themes')[theme]}`;
      btn.addEventListener('click', () => {
        state.theme = theme;
        state.other = '';
        refresh();
      });
      box.appendChild(btn);
    }
    const other = $('otherTheme');
    other.innerHTML = THEMES.filter(t => LIGHT.has(t) !== LIGHT.has(state.theme)).map(t => `<option value="${t}"${t === otherTheme() ? ' selected' : ''}>${T('themes')[t]}</option>`).join('');
    $('otherLabel').textContent = LIGHT.has(state.theme) ? T('res.inDark') : T('res.inLight');
    $('otherWrap').hidden = !state.adaptive;
    $('adaptive').checked = state.adaptive;
  }

  function refresh() {
    buildThemes();
    updatePreviews();
    updateReadme();
  }

  // --- Usuario ---
  function cleanUser(raw) {
    return String(raw || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/[/?#].*$/, '');
  }

  async function loadUser(raw) {
    const user = cleanUser(raw);
    const msg = $('formMsg');
    msg.classList.remove('error');
    $('user').value = user;
    if (!USER_RE.test(user)) {
      msg.textContent = T('msg.invalid');
      msg.classList.add('error');
      $('user').focus();
      return;
    }
    msg.textContent = T('msg.checking', user);
    $('userBtn').disabled = true;
    let status = 0;
    try {
      // La cabecera necesita perfil y calendario: si responde, todas las piezas tienen sus datos en caché
      const res = await fetch(`${previewBase}/api/header/${user}.svg`, { method: 'HEAD' });
      status = res.status;
    } catch (e) {
      status = 0;
    }
    $('userBtn').disabled = false;
    if (status === 404) {
      msg.textContent = T('msg.notFound', user);
      msg.classList.add('error');
      return;
    }
    if (status !== 200) {
      msg.textContent = status === 400 ? T('msg.invalid') : T('msg.down');
      msg.classList.add('error');
      return;
    }
    msg.textContent = '';
    if (state.user.toLowerCase() !== user.toLowerCase() && state.rival.toLowerCase() === user.toLowerCase()) state.rival = '';
    state.user = user;
    $('who').textContent = `@${user}`;
    $('results').hidden = false;
    $('how').hidden = true;
    buildGallery();
    refresh();
    $('results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  // --- Copiar ---
  async function copy(button, text) {
    const label = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = T('piece.copied');
    } catch (e) {
      // Sin permiso de portapapeles: se selecciona el bloque para copiarlo a mano
      const range = document.createRange();
      range.selectNodeContents($('readmeCode'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => { button.textContent = label; }, 1500);
  }

  // --- Eventos ---
  $('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadUser($('user').value);
  });
  document.querySelectorAll('[data-try]').forEach(b => b.addEventListener('click', () => loadUser(b.dataset.try)));
  $('changeUser').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('user').focus();
    $('user').select();
  });
  $('adaptive').addEventListener('change', (e) => {
    state.adaptive = e.target.checked;
    refresh();
  });
  $('otherTheme').addEventListener('change', (e) => {
    state.other = e.target.value;
    refresh();
  });
  $('copyAll').addEventListener('click', (e) => copy(e.currentTarget, $('readmeCode').textContent));
  $('dockCopy').addEventListener('click', (e) => copy(e.currentTarget, $('readmeCode').textContent));
  $('langBtn').addEventListener('click', () => {
    state.ui = state.ui === 'es' ? 'en' : 'es';
    try { localStorage.setItem('perfila.lang', state.ui); } catch (e) {}
    applyStaticText();
    if (state.user) {
      buildGallery();
      refresh();
    }
  });

  applyStaticText();
  drawHeroCells();
  const rivalParam = cleanUser(params.get('r'));
  if (USER_RE.test(rivalParam)) state.rival = rivalParam;
  if (params.get('u')) loadUser(params.get('u'));
})();
