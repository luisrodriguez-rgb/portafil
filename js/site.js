/**
 * Web de Portafil: un solo campo (el usuario) y, con eso, la galería de todas las piezas.
 * Cada pieza se puede copiar sola o añadir al bloque README. El estado vive en la URL (?u=&t=&r=...)
 * para que cualquier configuración se pueda compartir o recuperar.
 */
(() => {
  const USER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
  const LIGHT = new Set(ThemeTokens.light);
  // Tema que acompaña a cada uno en el modo contrario de GitHub
  const PARTNER = ThemeTokens.partner;
  const THEMES = Object.keys(PARTNER);

  const TEXT = {
    es: {
      skip: 'Ir al contenido',
      'nav.play': 'Jugar', 'nav.examples': 'Ejemplos', 'nav.star': 'Estrella',
      'foot.code': 'Código en GitHub', 'foot.feedback': 'Ideas y errores',
      'fb.ask': '¿Te resultó fácil?', 'fb.yes': 'Sí', 'fb.no': 'No del todo',
      'fb.thanks': '¡Gracias! Si algo faltó o tienes una idea, cuéntalo:', 'fb.tell': 'abrir una issue en GitHub',
      'hero.eyebrow': 'Para el README de tu perfil de GitHub',
      'hero.caption': (u, t) => `@${u} · ${t}`,
      'play.eyebrow': 'Estudio', 'play.title': 'Y además, se juega.', 'play.cta': 'Abrir el estudio',
      'play.lead': 'Tu gráfico de contribuciones es el tablero: la serpiente, Pac-Man, invasores, Tetris y el juego de la vida. Míralos jugar solos o toma el control, reta a otro perfil en un duelo en vivo y graba un clip para redes.',
      'play.m1': 'Serpiente', 'play.m3': 'Invasores', 'play.m5': 'Juego de la vida', 'play.m6': 'Duelo en vivo',
      'res.copy': 'Copiar README', 'piece.play': 'Jugar',
      'data.fixture': (u) => `<strong>Datos de prueba.</strong> El servidor local se inició con --fixture: lo que ves no son los datos de @${u}. Inícialo con npm run dev para ver los reales.`,
      'data.public': '<strong>Datos reales de GitHub, leídos sin token.</strong> Perfil, contribuciones, rachas, seguidores y estrellas son exactos; commits, PRs y lenguajes son aproximados. En la web publicada todo sale de la API oficial.',
      'hero.title': 'Tu perfil de GitHub, con un solo estilo.',
      'hero.lead': 'Cabecera, estadísticas, racha, lenguajes, actividad, juegos sobre tu gráfico de contribuciones y duelos contra otros perfiles. Escribe tu usuario y elige lo que quieras: sin YAML y sin configurar nada.',
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
      'gh.create': 'Crear mi repositorio de perfil',
      'gh.createHelp': (u) => `Aún no tienes el repositorio ${u}/${u}. Créalo público con ese nombre y vuelve: este botón te llevará a crear el README con el código ya escrito.`,
      'gh.newReadme': 'Crear mi README en GitHub',
      'gh.newReadmeHelp': 'Abre GitHub con el README ya escrito: solo falta pulsar «Commit changes».',
      'gh.edit': 'Abrir mi README en GitHub',
      'gh.editHelp': 'Al pulsarlo se copia el código y se abre tu README en el editor de GitHub: pégalo donde quieras que aparezca y pulsa «Commit changes».',
      'readme.title': 'Tu README', 'readme.copy': 'Copiar todo', 'readme.open': 'Abrir mi repositorio de perfil',
      'readme.help': (u) => `Pégalo en el README.md del repositorio ${u}/${u}. Si no existe, créalo con ese nombre: GitHub lo muestra en tu perfil.`,
      'readme.count': (n) => (n === 1 ? '1 pieza' : `${n} piezas`),
      'readme.empty': '<!-- Marca "Añadir al README" en las piezas que quieras -->',
      'foot.note': 'Todo es SVG con CSS: tu perfil no ejecuta JavaScript.',
      'ex.title': 'Así se ve un perfil completo', 'ex.lead': 'El mismo perfil en los siete estilos. Elige uno y escribe tu usuario.',
      'ex.use': 'Usar este estilo', 'ex.chosen': (n) => `Estilo ${n} elegido. Ahora escribe tu usuario.`,
      'msg.checking': (u) => `Buscando a @${u}…`,
      'msg.invalid': 'Ese no parece un usuario de GitHub: letras, números y guiones, hasta 39.',
      'msg.notFound': (u) => `No encontramos a @${u} en GitHub.`,
      'msg.org': (u) => `@${u} es una organización: Portafil funciona con cuentas personales.`,
      'msg.down': 'GitHub no responde ahora mismo. Inténtalo en un momento.',
      'piece.add': 'Añadir al README', 'piece.copy': 'Copiar código', 'piece.copied': 'Copiado', 'piece.open': 'Abrir SVG',
      'tab.profile': 'Perfil', 'tab.games': 'Juegos', 'tab.pair': 'Frente a otro', 'tab.share': 'Compartir', 'tabs.label': 'Grupos de piezas',
      'g.profile': 'Tu perfil', 'g.profileP': 'Las piezas básicas. La cabecera va a lo ancho y el resto de dos en dos. Los datos se actualizan cada hora y los días se cuentan en UTC, como en la API de GitHub.',
      'g.games': 'Juegos', 'g.gamesP': 'Tu gráfico de contribuciones convertido en partida, animada en un SVG. La serpiente duerme si llevas una semana sin contribuir y presume de tu racha si pasa de 7 días. Todos se pueden jugar en el estudio.',
      'g.pair': 'Frente a otro perfil', 'g.pairP': 'Compárate con alguien o rétalo a un duelo. El duelo enlaza a una página para compartir.',
      'g.share': 'Para compartir fuera de GitHub', 'g.shareP': 'Tu tarjeta de 1200×630 para LinkedIn, X o WhatsApp, con el estilo que elegiste. El enlace muestra la tarjeta al compartirlo y lleva a tus piezas.',
      'share.download': 'Descargar PNG', 'share.copy': 'Copiar enlace', 'share.x': 'Compartir en X', 'share.in': 'Compartir en LinkedIn',
      'share.text': (u) => `Mi perfil de GitHub con un solo estilo, hecho con Portafil: @${u}`,
      'readme.template': 'Plantilla', 'readme.preview': 'Vista previa',
      tpl: { pieces: 'Solo las piezas que elijo', developer: 'Desarrollador', student: 'Estudiante', maintainer: 'Mantenedor open source', minimal: 'Mínima' },
      'preview.title': 'Así se verá en GitHub', 'preview.light': 'Claro', 'preview.dark': 'Oscuro', 'preview.close': 'Cerrar',
      'preview.note': 'Cambia los textos [entre corchetes] por los tuyos después de pegarlo.',
      'rival.label': 'Usuario rival', 'rival.cta': 'Comparar', 'rival.placeholder': 'rival',
      'rival.needed': 'Escribe un rival arriba para ver esta pieza.',
      'snake.morph': 'Forma', 'snake.speed': 'Velocidad',
      'piece.theme': 'Estilo', 'piece.themeAll': 'Igual que el resto',
      'res.fixed': (name) => `${name} es un tema de color: se ve igual en el modo claro y en el oscuro. La casilla afecta a las piezas con Tinta, Papel, Fósforo o GitHub claro.`,
      morph: { matrix_viper: 'Víbora', capsule: 'Cápsula', retro: 'Retro' },
      speed: { normal: 'Normal', fast: 'Rápida', relaxed: 'Tranquila' },
      themes: { ink: 'Tinta', paper: 'Papel', dark: 'Fósforo', light: 'GitHub claro', cyberpunk: 'Cyberpunk', neon_cyan: 'Cian', amber_terminal: 'Ámbar' },
      pieces: {
        header: ['Cabecera', 'Avatar, nombre, bio y cifras (repos propios, sin forks)'],
        stats: ['Estadísticas', 'Contribuciones, commits, PRs, issues, reviews'],
        streak: ['Racha', 'Actual, más larga y últimos 30 días'],
        langs: ['Lenguajes', 'Por tamaño de código, sin forks'],
        activity: ['Actividad', 'Contribuciones por semana'],
        kit: ['Todo en una imagen', 'Las cinco piezas en un solo SVG'],
        snake: ['Serpiente', 'Se come tu año de commits'],
        life: ['Juego de la vida', 'Tus contribuciones evolucionan con las reglas de Conway'],
        pacman: ['Pac-Man', 'Se come tu gráfico mientras dos fantasmas lo persiguen'],
        invaders: ['Invasores', 'Una nave dispara a tus contribuciones, columna a columna'],
        tetris: ['Tetris', 'Tu año cae hacia el pasado y las piezas completan semanas'],
        versus: ['Versus', 'Tus cifras frente a las de otro perfil'],
        duel: ['Duelo', 'La misma IA en los dos gráficos, 60 segundos']
      }
    },
    en: {
      skip: 'Skip to content',
      'nav.play': 'Play', 'nav.examples': 'Examples', 'nav.star': 'Star',
      'foot.code': 'Code on GitHub', 'foot.feedback': 'Ideas and bugs',
      'fb.ask': 'Was it easy?', 'fb.yes': 'Yes', 'fb.no': 'Not quite',
      'fb.thanks': 'Thanks! If something was missing or you have an idea, tell us:', 'fb.tell': 'open an issue on GitHub',
      'hero.eyebrow': 'For your GitHub profile README',
      'hero.caption': (u, t) => `@${u} · ${t}`,
      'play.eyebrow': 'Studio', 'play.title': 'And you can play it.', 'play.cta': 'Open the studio',
      'play.lead': 'Your contribution graph is the board: the snake, Pac-Man, invaders, Tetris and the Game of Life. Watch them play on their own or take control, challenge another profile to a live duel and record a clip for social media.',
      'play.m1': 'Snake', 'play.m3': 'Invaders', 'play.m5': 'Game of Life', 'play.m6': 'Live duel',
      'res.copy': 'Copy README', 'piece.play': 'Play',
      'data.fixture': (u) => `<strong>Test data.</strong> The local server was started with --fixture: this is not @${u}'s data. Start it with npm run dev to see the real one.`,
      'data.public': '<strong>Real GitHub data, read without a token.</strong> Profile, contributions, streaks, followers and stars are exact; commits, PRs and languages are approximate. The published site uses the official API for everything.',
      'hero.title': 'One style for your whole GitHub profile.',
      'hero.lead': 'Header, stats, streak, languages, activity, games on your contribution graph and duels against other profiles. Type your username and pick what you like: no YAML, nothing to configure.',
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
      'gh.create': 'Create my profile repository',
      'gh.createHelp': (u) => `You don't have the ${u}/${u} repository yet. Create it as public with that name and come back: this button will take you to create the README with the code already in it.`,
      'gh.newReadme': 'Create my README on GitHub',
      'gh.newReadmeHelp': 'Opens GitHub with the README already written: just press «Commit changes».',
      'gh.edit': 'Open my README on GitHub',
      'gh.editHelp': 'Clicking it copies the code and opens your README in the GitHub editor: paste it where you want it and press «Commit changes».',
      'readme.title': 'Your README', 'readme.copy': 'Copy all', 'readme.open': 'Open my profile repository',
      'readme.help': (u) => `Paste it into README.md in the ${u}/${u} repository. If it does not exist, create it with that name: GitHub shows it on your profile.`,
      'readme.count': (n) => (n === 1 ? '1 piece' : `${n} pieces`),
      'readme.empty': '<!-- Tick "Add to README" on the pieces you want -->',
      'foot.note': 'Everything is SVG with CSS: your profile runs no JavaScript.',
      'ex.title': 'What a whole profile looks like', 'ex.lead': 'The same profile in all seven styles. Pick one and type your username.',
      'ex.use': 'Use this style', 'ex.chosen': (n) => `${n} style picked. Now type your username.`,
      'msg.checking': (u) => `Looking for @${u}…`,
      'msg.invalid': 'That does not look like a GitHub username: letters, numbers and dashes, up to 39.',
      'msg.notFound': (u) => `We could not find @${u} on GitHub.`,
      'msg.org': (u) => `@${u} is an organization: Portafil works with personal accounts.`,
      'msg.down': 'GitHub is not answering right now. Try again in a moment.',
      'piece.theme': 'Style', 'piece.themeAll': 'Same as the rest',
      'res.fixed': (name) => `${name} is a color theme: it looks the same in light and dark mode. The checkbox applies to pieces in Ink, Paper, Phosphor or GitHub light.`,
      'piece.add': 'Add to README', 'piece.copy': 'Copy code', 'piece.copied': 'Copied', 'piece.open': 'Open SVG',
      'tab.profile': 'Profile', 'tab.games': 'Games', 'tab.pair': 'Versus', 'tab.share': 'Share', 'tabs.label': 'Piece groups',
      'g.profile': 'Your profile', 'g.profileP': 'The basics. The header goes full width and the rest two by two. Data refreshes every hour and days are counted in UTC, as in the GitHub API.',
      'g.games': 'Games', 'g.gamesP': 'Your contribution graph turned into a game, animated in an SVG. The snake sleeps after a week without contributions and shows off your streak once it passes 7 days. You can play all of them in the studio.',
      'g.pair': 'Against another profile', 'g.pairP': 'Compare yourself with someone or challenge them to a duel. The duel links to a page to share.',
      'g.share': 'For sharing outside GitHub', 'g.shareP': 'Your 1200×630 card for LinkedIn, X or WhatsApp, in the style you picked. The link shows the card when shared and leads to your pieces.',
      'share.download': 'Download PNG', 'share.copy': 'Copy link', 'share.x': 'Share on X', 'share.in': 'Share on LinkedIn',
      'share.text': (u) => `My GitHub profile in one style, made with Portafil: @${u}`,
      'readme.template': 'Template', 'readme.preview': 'Preview',
      tpl: { pieces: 'Only the pieces I pick', developer: 'Developer', student: 'Student', maintainer: 'Open source maintainer', minimal: 'Minimal' },
      'preview.title': 'This is how it will look on GitHub', 'preview.light': 'Light', 'preview.dark': 'Dark', 'preview.close': 'Close',
      'preview.note': 'Replace the texts [in brackets] with your own after pasting.',
      'rival.label': 'Rival username', 'rival.cta': 'Compare', 'rival.placeholder': 'rival',
      'rival.needed': 'Type a rival above to see this piece.',
      'snake.morph': 'Shape', 'snake.speed': 'Speed',
      morph: { matrix_viper: 'Viper', capsule: 'Capsule', retro: 'Retro' },
      speed: { normal: 'Normal', fast: 'Fast', relaxed: 'Relaxed' },
      themes: { ink: 'Ink', paper: 'Paper', dark: 'Phosphor', light: 'GitHub light', cyberpunk: 'Cyberpunk', neon_cyan: 'Cyan', amber_terminal: 'Amber' },
      pieces: {
        header: ['Header', 'Avatar, name, bio and numbers (own repos, no forks)'],
        stats: ['Stats', 'Contributions, commits, PRs, issues, reviews'],
        streak: ['Streak', 'Current, longest and last 30 days'],
        langs: ['Languages', 'By code size, no forks'],
        activity: ['Activity', 'Contributions per week'],
        kit: ['All in one image', 'The five pieces in a single SVG'],
        snake: ['Snake', 'Eats your year of commits'],
        life: ['Game of Life', 'Your contributions evolve with Conway\'s rules'],
        pacman: ['Pac-Man', 'Eats your graph while two ghosts chase it'],
        invaders: ['Invaders', 'A ship shoots your contributions, column by column'],
        tetris: ['Tetris', 'Your year falls toward the past and pieces complete weeks'],
        versus: ['Versus', 'Your numbers next to another profile'],
        duel: ['Duel', 'Same AI on both graphs, 60 seconds']
      }
    }
  };

  const GROUPS = [
    { id: 'profile', pieces: ['header', 'stats', 'streak', 'langs', 'activity', 'kit'] },
    { id: 'games', pieces: ['snake', 'life', 'pacman', 'invaders', 'tetris'] },
    { id: 'pair', pieces: ['versus', 'duel'] }
  ];

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const storedLang = (() => { try { return localStorage.getItem('portafil.lang'); } catch (e) { return null; } })();

  const state = {
    ui: params.get('lang') || storedLang || (/^es\b/i.test(navigator.language) ? 'es' : 'en'),
    user: '',
    theme: THEMES.includes(params.get('t')) ? params.get('t') : 'ink',
    other: THEMES.includes(params.get('o')) ? params.get('o') : '',
    adaptive: params.get('a') !== '0',
    rival: '',
    morph: params.get('m') || 'matrix_viper',
    speed: params.get('s') || 'normal',
    template: KitSnippet.TEMPLATES[params.get('tpl')] ? params.get('tpl') : 'pieces',
    group: 'profile',
    previewMode: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    pieceThemes: Object.fromEntries(String(params.get('pt') || '').split(',').map(p => p.split(':')).filter(([k, t]) => KitSnippet.PIECES[k] && THEMES.includes(t))),
    picked: new Set((params.get('p') || KitSnippet.templatePieces(params.get('tpl')) || KitSnippet.DEFAULT_SELECTION).toString().split(',').filter(k => KitSnippet.PIECES[k]))
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

  /**
   * Medición sin cookies ni usuario (server/event.js): cuánto se tarda desde abrir la web hasta copiar.
   * Respeta Do Not Track y Global Privacy Control.
   */
  const pageStart = performance.now();
  function track(event, extra = {}) {
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl || !location.protocol.startsWith('http') || !navigator.sendBeacon) return;
    const body = { event, ms: Math.round(performance.now() - pageStart), theme: state.theme, template: state.template, lang: state.ui, ...extra };
    try { navigator.sendBeacon(`${previewBase}/api/event`, JSON.stringify(body)); } catch (e) {}
  }

  const otherTheme = () => state.other || PARTNER[state.theme];
  // Los temas de color (Cyberpunk, Cian, Ámbar) no cambian con el modo de GitHub: el mismo en los dos.
  // La casilla «cambiar con el modo» sigue valiendo para las piezas con Tinta, Papel, Fósforo o GitHub claro.
  const FIXED = new Set(ThemeTokens.fixed);
  const snippetOptions = (base) => {
    const light = LIGHT.has(state.theme);
    const fixed = FIXED.has(state.theme);
    return {
      apiBase: base,
      dark: state.adaptive && !fixed ? (light ? otherTheme() : state.theme) : state.theme,
      light: fixed ? state.theme : (light ? state.theme : otherTheme()),
      adaptive: state.adaptive,
      themes: state.pieceThemes,
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
    $('langBtn').setAttribute('aria-label', state.ui === 'es' ? 'EN · English' : 'ES · Español');
  }

  // --- Portada: el perfil de demostración cambiando de estilo, como vista de lo que obtienes ---
  let heroTimer = null;
  let heroIndex = 0;
  let heroPaused = false;
  function showHero(i) {
    heroIndex = (i + THEMES.length) % THEMES.length;
    const imgs = $('heroStage').querySelectorAll('img');
    // Solo se descargan la visible y la siguiente (cada dashboard pesa ~45 KB con el avatar incrustado)
    [heroIndex, (heroIndex + 1) % imgs.length].forEach(k => { if (imgs[k] && !imgs[k].src) imgs[k].src = imgs[k].dataset.src; });
    imgs.forEach((img, k) => img.classList.toggle('on', k === heroIndex));
    $('heroDots').querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === heroIndex)));
    $('heroCaption').textContent = T('hero.caption', Brand.demoUser, T('themes')[THEMES[heroIndex]]);
  }

  function buildHero() {
    const stage = $('heroStage');
    const dots = $('heroDots');
    stage.innerHTML = '';
    dots.innerHTML = '';
    THEMES.forEach((theme, i) => {
      const t = ThemeTokens.get(theme);
      const img = document.createElement('img');
      img.alt = `@${Brand.demoUser} · ${T('themes')[theme]}`;
      img.decoding = 'async';
      img.width = 797;
      img.height = 474;
      img.dataset.src = `${previewBase}/api/kit/${Brand.demoUser}.svg?theme=${theme}${state.ui === 'es' ? '&lang=es' : ''}`;
      if (i === heroIndex) img.fetchPriority = 'high';
      stage.appendChild(img);
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.style.setProperty('--a', t.bg);
      dot.style.setProperty('--b', t.l4);
      dot.setAttribute('aria-label', T('themes')[theme]);
      dot.addEventListener('click', () => { showHero(i); restartHero(); });
      dots.appendChild(dot);
    });
    showHero(heroIndex);
    restartHero();
  }

  function restartHero() {
    clearInterval(heroTimer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    heroTimer = setInterval(() => { if (!document.hidden && !heroPaused && $('results').hidden) showHero(heroIndex + 1); }, 3200);
  }

  function buildSwatches() {
    $('stepSwatches').innerHTML = THEMES.map(theme => {
      const t = ThemeTokens.get(theme);
      return `<i style="--a:${t.bg};--b:${t.l4}" title="${T('themes')[theme]}"></i>`;
    }).join('');
  }

  /** Enlaces al estudio: con el usuario escrito (o cargado), el estudio abre directamente su gráfico */
  function studioUrl(extra = {}) {
    const typed = cleanUser($('user').value);
    const user = state.user || (USER_RE.test(typed) ? typed : '');
    const p = new URLSearchParams();
    if (user) p.set('u', user);
    if (state.theme !== 'ink') p.set('t', state.theme);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    const q = p.toString();
    return `play.html${q ? `?${q}` : ''}`;
  }

  function updateStudioLinks() {
    $('playCta').href = studioUrl();
    $('navPlay').href = studioUrl();
  }

  // --- Ejemplos: el perfil de demostración en cada estilo ---
  function buildExamples() {
    const box = $('examplesGrid');
    box.innerHTML = '';
    for (const theme of THEMES) {
      const card = document.createElement('article');
      card.className = 'example';
      const src = `${previewBase}/api/kit/${Brand.demoUser}.svg?theme=${theme}${state.ui === 'es' ? '&lang=es' : ''}`;
      card.innerHTML = `<img src="${src}" alt="@${Brand.demoUser} · ${T('themes')[theme]}" loading="lazy" decoding="async" width="797" height="474">
        <div class="example-foot"><strong>${T('themes')[theme]}</strong><button type="button" class="btn small">${T('ex.use')}</button></div>`;
      card.querySelector('button').addEventListener('click', () => {
        state.theme = theme;
        state.other = '';
        if (state.user) {
          refresh();
          $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        syncUrl();
        $('formMsg').classList.remove('error');
        $('formMsg').textContent = T('ex.chosen', T('themes')[theme]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('user').focus({ preventScroll: true });
      });
      box.appendChild(card);
    }
  }

  // --- URL ---
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.user) p.set('u', state.user);
    if (state.theme !== 'ink') p.set('t', state.theme);
    if (state.other) p.set('o', state.other);
    if (!state.adaptive) p.set('a', '0');
    const own = Object.entries(state.pieceThemes).map(([k, t]) => `${k}:${t}`).join(',');
    if (own) p.set('pt', own);
    if (state.rival) p.set('r', state.rival);
    if (state.morph !== 'matrix_viper') p.set('m', state.morph);
    if (state.speed !== 'normal') p.set('s', state.speed);
    if (state.template !== 'pieces') p.set('tpl', state.template);
    const picked = [...state.picked].join(',');
    if (picked !== KitSnippet.DEFAULT_SELECTION.join(',')) p.set('p', picked);
    const q = p.toString();
    try { history.replaceState(null, '', q ? `?${q}` : location.pathname); } catch (e) {}
  }

  // --- Galería ---
// Alto de cada pieza (el ancho sale de ThemeTokens): reservar el hueco evita que la página salte al cargar
  const PIECE_HEIGHT = { header: 120, kit: 474, versus: 278, duel: 442 };

  function pieceUrl(kind, base = previewBase) {
    const opts = snippetOptions(base);
    const ctx = KitSnippet.context(state.user, { ...opts, adaptive: false });
    return KitSnippet.url(kind, state.pieceThemes[kind] || state.theme, ctx);
  }

/** En el móvil los grupos van en pestañas: once tarjetas seguidas eran casi 7.000 px de página */
  function buildGroupTabs(gallery) {
    const tabs = document.createElement('div');
    tabs.className = 'group-tabs';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', T('tabs.label'));
    for (const id of [...GROUPS.map(g => g.id), 'share']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.group = id;
      button.textContent = T(`tab.${id}`);
      button.addEventListener('click', () => showGroup(id, true));
      tabs.appendChild(button);
    }
    gallery.prepend(tabs);
    showGroup(state.group);
  }

  function showGroup(id, scroll = false) {
    state.group = id;
    const gallery = $('gallery');
    gallery.querySelectorAll('.group-tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === id)));
    gallery.querySelectorAll('.group').forEach(s => s.classList.toggle('active', s.dataset.group === id));
    if (scroll && gallery.getBoundingClientRect().top < 0) gallery.scrollIntoView({ block: 'start' });
  }

  function buildGallery() {
    const gallery = $('gallery');
    gallery.innerHTML = '';
    for (const group of GROUPS) {
      const section = document.createElement('section');
      section.className = 'group';
      section.dataset.group = group.id;
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
    const share = document.createElement('section');
    share.className = 'group';
    share.dataset.group = 'share';
    share.innerHTML = `<h3>${T('g.share')}</h3><p>${T('g.shareP')}</p>
      <article class="share"><div class="preview"><img id="ogImg" alt="" loading="lazy" decoding="async" width="1200" height="630"></div>
      <div class="piece-foot"><div class="piece-actions wrap">
        <a class="btn small" id="ogDownload" href="#">${T('share.download')}</a>
        <button type="button" class="btn small" id="ogCopy">${T('share.copy')}</button>
        <a class="btn small" id="ogX" href="#" target="_blank" rel="noopener noreferrer">${T('share.x')}</a>
        <a class="btn small" id="ogIn" href="#" target="_blank" rel="noopener noreferrer">${T('share.in')}</a>
      </div></div></article>`;
    gallery.appendChild(share);
    buildGroupTabs(gallery);
    $('ogCopy').addEventListener('click', (e) => {
      copy(e.currentTarget, shareUrl());
      track('share');
    });
    $('ogDownload').addEventListener('click', () => track('share'));
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
    // Cada pieza puede llevar su propio estilo; vacío = el general de la barra
    const own = state.pieceThemes[kind] || '';
    const themeSelect = `<label class="inline piece-theme">${T('piece.theme')} <select data-piece-theme><option value="">${T('piece.themeAll')}</option>${THEMES.map(t => `<option value="${t}"${t === own ? ' selected' : ''}>${T('themes')[t]}</option>`).join('')}</select></label>`;
    let opts = themeSelect;
    if (kind === 'snake') {
      const select = (id, label, values, current) => `<label class="inline">${label} <select data-opt="${id}">${Object.entries(values).map(([v, name]) => `<option value="${v}"${v === current ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`;
      opts += select('morph', T('snake.morph'), T('morph'), state.morph) + select('speed', T('snake.speed'), T('speed'), state.speed);
    }
    opts = `<div class="piece-opts">${opts}</div>`;
    card.innerHTML = `<div class="piece-head"><h4>${title}</h4><span>${desc}</span></div>
      ${opts}
      <div class="preview"></div>
      <div class="piece-foot">
        <label class="check"><input type="checkbox" data-pick${state.picked.has(kind) ? ' checked' : ''}> ${T('piece.add')}</label>
        <div class="piece-actions"><a target="_blank" rel="noopener noreferrer" data-open>${T('piece.open')}</a>${meta.game ? `<a class="btn small" href="play.html" data-play>${T('piece.play')}</a>` : ''}<button type="button" class="btn small" data-copy>${T('piece.copy')}</button></div>
      </div>`;
    card.querySelector('[data-pick]').addEventListener('change', (e) => {
      if (e.target.checked) state.picked.add(kind); else state.picked.delete(kind);
      updateReadme();
    });
    card.querySelector('[data-copy]').addEventListener('click', (e) => {
      const code = KitSnippet.piece(kind, state.user, snippetOptions(publicBase));
      if (code) {
        copy(e.currentTarget, code);
        track('copy-piece', { kind });
      }
    });
    card.querySelector('[data-piece-theme]').addEventListener('change', (e) => {
      if (e.target.value) state.pieceThemes[kind] = e.target.value; else delete state.pieceThemes[kind];
      refresh();
    });
    card.querySelectorAll('[data-opt]').forEach(sel => sel.addEventListener('change', () => {
      state[sel.dataset.opt] = sel.value;
      refresh();
    }));
    return card;
  }

  /** Enlace para compartir el perfil: la página /u/ muestra la tarjeta en redes y lleva a las piezas */
  function shareUrl() {
    const p = new URLSearchParams();
    if (state.theme !== 'ink') p.set('t', state.theme);
    if (state.ui === 'es') p.set('lang', 'es');
    const q = p.toString();
    return `${publicBase}/u/${state.user}${q ? `?${q}` : ''}`;
  }

  function updateShare() {
    const img = $('ogImg');
    if (!img) return;
    const src = `${previewBase}/api/og/${state.user}.png?theme=${state.theme}${state.ui === 'es' ? '&lang=es' : ''}`;
    if (img.getAttribute('src') !== src) img.src = src;
    img.alt = `@${state.user} · Portafil`;
    $('ogDownload').href = src;
    $('ogDownload').setAttribute('download', `portafil-${state.user}.png`);
    $('ogX').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(T('share.text', state.user))}&url=${encodeURIComponent(shareUrl())}`;
    $('ogIn').href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`;
  }

  function updatePreviews() {
    updateShare();
    updateStudioLinks();
    document.querySelectorAll('.piece').forEach(card => {
      const kind = card.dataset.kind;
      const play = card.querySelector('[data-play]');
      if (play) play.href = studioUrl({ game: KitSnippet.PIECES[kind].game });
      const box = card.querySelector('.preview');
      const ready = !KitSnippet.PIECES[kind].pair || state.rival;
      card.querySelector('[data-copy]').disabled = !ready;
      const open = card.querySelector('[data-open]');
      if (!ready) {
        box.innerHTML = `<p class="placeholder">${T('rival.needed')}</p>`;
        open.hidden = true;
        open.href = '#rivalForm';
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
        img.width = ThemeTokens.size[KitSnippet.PIECES[kind].width];
        img.height = PIECE_HEIGHT[kind] || 160;
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

  // --- Repositorio de perfil: el botón lleva al paso que le falta a cada uno (crear el repositorio, crear el
  // README con el código ya escrito o abrir el README en el editor). La API pública de GitHub admite 60 consultas
  // por hora y por IP: se comprueba al cargar el usuario y al volver a la pestaña, como mucho cada 15 s.
  const profileRepo = { user: '', status: 'unknown', checked: 0 };

  async function checkProfileRepo(user) {
    try {
      const repo = await fetch(`https://api.github.com/repos/${user}/${user}`);
      if (repo.status === 404) return { status: 'none' };
      if (!repo.ok) return { status: 'unknown' };
      const branch = (await repo.json()).default_branch || 'main';
      const readme = await fetch(`https://api.github.com/repos/${user}/${user}/readme`);
      if (readme.status === 404) return { status: 'noReadme', branch };
      if (!readme.ok) return { status: 'unknown' };
      return { status: 'readme', branch, path: (await readme.json()).path || 'README.md' };
    } catch (e) {
      return { status: 'unknown' };
    }
  }

  async function refreshProfileRepo() {
    const user = state.user;
    if (!user || (profileRepo.user === user && Date.now() - profileRepo.checked < 15000)) return;
    profileRepo.checked = Date.now();
    const info = await checkProfileRepo(user);
    if (state.user !== user) return;
    Object.assign(profileRepo, { user, branch: undefined, path: undefined, ...info });
    updateReadme();
  }

  function githubTarget(code) {
    const u = state.user;
    const repo = profileRepo.user === u ? profileRepo : { status: 'unknown' };
    if (repo.status === 'none') {
      return { href: `https://github.com/new?name=${u}&visibility=public`, label: T('gh.create'), help: T('gh.createHelp', u) };
    }
    if (repo.status === 'noReadme') {
      const base = `https://github.com/${u}/${u}/new/${encodeURIComponent(repo.branch)}?filename=README.md`;
      // El código va en la URL; si es muy largo se abre vacío y se pega (se copia al pulsar)
      const filled = `${base}&value=${encodeURIComponent(code)}`;
      return { href: filled.length < 8000 ? filled : base, label: T('gh.newReadme'), help: T('gh.newReadmeHelp') };
    }
    if (repo.status === 'readme') {
      return { href: `https://github.com/${u}/${u}/edit/${encodeURIComponent(repo.branch)}/${repo.path}`, label: T('gh.edit'), help: T('gh.editHelp') };
    }
    return { href: `https://github.com/${u}/${u}`, label: T('readme.open'), help: T('readme.help', u) };
  }

  function updateReadme() {
    document.querySelectorAll('.piece').forEach(card => card.classList.toggle('picked', state.picked.has(card.dataset.kind)));
    const code = KitSnippet.build(state.user, { ...snippetOptions(publicBase), pieces: [...state.picked], template: state.template });
    const included = [...state.picked].filter(k => KitSnippet.piece(k, state.user, snippetOptions(publicBase)));
    $('readmeCode').textContent = code || T('readme.empty');
    $('count').textContent = T('readme.count', included.length);
    $('dockCount').textContent = T('readme.count', included.length);
    $('copyAll').disabled = !code;
    $('dockCopy').disabled = !code;
    const target = githubTarget(code);
    $('readmeHelp').textContent = target.help;
    $('openProfile').href = target.href;
    $('openProfile').textContent = target.label;
    $('templateSelect').value = state.template;
    if ($('previewDialog').open) renderPreview();
    syncUrl();
  }

  // --- Plantillas y vista previa ---
  function buildTemplates() {
    $('templateSelect').innerHTML = Object.keys(KitSnippet.TEMPLATES).map(k => `<option value="${k}">${T('tpl')[k]}</option>`).join('');
    $('templateSelect').value = state.template;
  }

  /** El README tal como lo pintaría GitHub en el modo elegido: sin <picture>, con el tema de ese modo */
  function renderPreview() {
    // Cada pieza con el tema que GitHub mostraría en ese modo (el suyo propio o el general, con la misma regla)
    const opts = snippetOptions(previewBase);
    const ctx = KitSnippet.context(state.user, opts);
    const themes = Object.fromEntries(Object.keys(KitSnippet.PIECES).map(kind => {
      const t = KitSnippet.themesFor(kind, ctx);
      return [kind, state.previewMode === 'dark' ? t.dark : t.light];
    }));
    const md = KitSnippet.build(state.user, { ...opts, adaptive: false, themes, pieces: [...state.picked], template: state.template });
    const box = $('ghPreview');
    box.dataset.mode = state.previewMode;
    box.innerHTML = KitSnippet.previewHtml(md) || `<p>${T('readme.empty').replace(/[<>]/g, '')}</p>`;
    document.querySelectorAll('[data-preview-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.previewMode === state.previewMode)));
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
      btn.setAttribute('aria-label', T('themes')[theme]);
      btn.title = T('themes')[theme];
      btn.innerHTML = `<span class="swatch" style="--a:${t.bg};--b:${t.l4}"></span>`;
      btn.addEventListener('click', () => {
        state.theme = theme;
        state.other = '';
        refresh();
      });
      box.appendChild(btn);
    }
    $('themeName').textContent = T('themes')[state.theme];
    const other = $('otherTheme');
    other.innerHTML = THEMES.filter(t => LIGHT.has(t) !== LIGHT.has(state.theme)).map(t => `<option value="${t}"${t === otherTheme() ? ' selected' : ''}>${T('themes')[t]}</option>`).join('');
    $('otherLabel').textContent = LIGHT.has(state.theme) ? T('res.inDark') : T('res.inLight');
    const fixed = FIXED.has(state.theme);
    $('otherWrap').hidden = !state.adaptive || fixed;
    $('fixedNote').hidden = !fixed;
    $('fixedNote').textContent = fixed ? T('res.fixed', T('themes')[state.theme]) : '';
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

  /** La API de Portafil solo conoce usuarios: ante un 404, GitHub dice si el nombre es de una organización */
  async function isOrganization(user) {
    try {
      const res = await fetch(`https://api.github.com/users/${user}`);
      return res.ok && (await res.json()).type === 'Organization';
    } catch (e) {
      return false;
    }
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
    let dataSource = '';
    try {
      // La cabecera necesita perfil y calendario: si responde, todas las piezas tienen sus datos en caché
      const res = await fetch(`${previewBase}/api/header/${user}.svg`, { method: 'HEAD' });
      status = res.status;
      dataSource = res.headers.get('X-Portafil-Data') || '';
    } catch (e) {
      status = 0;
    }
    $('userBtn').disabled = false;
    if (status === 404) {
      msg.textContent = T(await isOrganization(user) ? 'msg.org' : 'msg.notFound', user);
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
    $('whoAvatar').src = `https://github.com/${user}.png?size=64`;
    // Fuera de producción, avisa de dónde salen los datos (server dev: --fixture o sin token)
    const note = dataSource === 'fixture' ? T('data.fixture', user) : dataSource === 'public' ? T('data.public') : '';
    $('dataNote').innerHTML = note;
    $('dataNote').hidden = !note;
    track('user');
    refreshProfileRepo();
    $('results').hidden = false;
    $('how').hidden = true;
    $('examples').hidden = true;
    $('playTeaser').hidden = true;
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
  // Opinión en un clic justo después de copiar o de ir a GitHub: se cuenta como evento (sin datos personales)
  // y quien quiera contar más va a las plantillas de issues. Solo se pregunta una vez por navegador.
  const FEEDBACK_KEY = 'portafil.feedback';
  function askFeedback() {
    try { if (localStorage.getItem(FEEDBACK_KEY)) return; } catch (e) {}
    if ($('feedbackThanks').hidden) $('feedback').hidden = false;
  }
  document.querySelectorAll('[data-feedback]').forEach(btn => btn.addEventListener('click', () => {
    track('feedback', { value: btn.dataset.feedback });
    try { localStorage.setItem(FEEDBACK_KEY, btn.dataset.feedback); } catch (e) {}
    $('feedback').hidden = true;
    $('feedbackThanks').hidden = false;
  }));

  const copyAll = (e) => {
    copy(e.currentTarget, $('readmeCode').textContent);
    track('copy', { pieces: state.picked.size });
    askFeedback();
  };
  $('copyAll').addEventListener('click', copyAll);
  // Al ir a GitHub el código va copiado: en el editor solo hay que pegarlo
  $('openProfile').addEventListener('click', () => {
    try { navigator.clipboard.writeText($('readmeCode').textContent); } catch (e) {}
    track('open-readme', { pieces: state.picked.size });
    askFeedback();
  });
  // Quien crea el repositorio o el README en otra pestaña ve el siguiente paso al volver
  addEventListener('focus', () => { if (!$('results').hidden) refreshProfileRepo(); });
  $('dockCopy').addEventListener('click', copyAll);
  $('templateSelect').addEventListener('change', (e) => {
    state.template = e.target.value;
    const pieces = KitSnippet.templatePieces(state.template);
    if (pieces) {
      state.picked = new Set(pieces);
      document.querySelectorAll('.piece [data-pick]').forEach(box => { box.checked = state.picked.has(box.closest('.piece').dataset.kind); });
    }
    updateReadme();
  });
  $('toolbarCopy').addEventListener('click', copyAll);
  $('toolbarPreview').addEventListener('click', () => $('previewBtn').click());
  $('user').addEventListener('input', updateStudioLinks);
  $('previewBtn').addEventListener('click', () => {
    track('preview');
    renderPreview();
    $('previewDialog').showModal();
  });
  $('previewClose').addEventListener('click', () => $('previewDialog').close());
  $('previewDialog').addEventListener('click', (e) => { if (e.target === $('previewDialog')) $('previewDialog').close(); });
  document.querySelectorAll('[data-preview-mode]').forEach(b => b.addEventListener('click', () => {
    state.previewMode = b.dataset.previewMode;
    renderPreview();
  }));
  $('langBtn').addEventListener('click', () => {
    state.ui = state.ui === 'es' ? 'en' : 'es';
    try { localStorage.setItem('portafil.lang', state.ui); } catch (e) {}
    applyStaticText();
    buildTemplates();
    buildExamples();
    buildHero();
    buildSwatches();
    if (state.user) {
      buildGallery();
      refresh();
    }
  });

  applyStaticText();
  buildTemplates();
  buildExamples();
  buildHero();
  // El carrusel se detiene mientras alguien lo mira con el puntero o recorre sus puntos con el teclado
  const heroBox = $('heroStage').parentElement;
  heroBox.addEventListener('pointerenter', () => { heroPaused = true; });
  heroBox.addEventListener('pointerleave', () => { heroPaused = false; });
  heroBox.addEventListener('focusin', () => { heroPaused = true; });
  heroBox.addEventListener('focusout', () => { heroPaused = false; });
  buildSwatches();
  $('playPreview').src = `${previewBase}/api/${Brand.demoUser}.svg?game=pacman`;
  updateStudioLinks();
  const rivalParam = cleanUser(params.get('r'));
  // Quien llega desde un duelo compartido ve primero el grupo de comparar
  if (USER_RE.test(rivalParam)) Object.assign(state, { rival: rivalParam, group: 'pair' });
  if (params.get('u')) loadUser(params.get('u'));
})();
