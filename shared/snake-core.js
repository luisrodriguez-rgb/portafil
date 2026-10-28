/**
 * Núcleo compartido por la GitHub Action (Node) y el endpoint SVG (función serverless de Node, ver server/snake-svg.js):
 * opciones válidas del SVG y conversión del calendario GraphQL de GitHub a la matriz 53x7 del motor.
 * Script plano (sin import/export) para cargarse igual que el resto del motor.
 */

// Temas del contrato: los mismos para la serpiente, los juegos y las tarjetas
const CONTRACT_THEMES = ['ink', 'paper', 'dark', 'light', 'cyberpunk', 'neon_cyan', 'amber_terminal'];

const SnakeCore = {
  LEVELS: { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 },

  // Contrato público de las URL (docs/contract.md). Hay perfiles publicados que dependen de él:
  // se pueden añadir opciones y valores, nunca quitarlos ni renombrarlos sin subir la versión.
  CONTRACT_VERSION: 1,

  OPTION_VALUES: {
    theme: CONTRACT_THEMES,
    speed: ['normal', 'fast', 'relaxed'],
    morph: ['matrix_viper', 'capsule', 'retro'],
    pause: ['fast', 'medium', 'none'],
    lang: ['en', 'es'],
    // Modo de juego (shared/games.js) y estados según la actividad (la serpiente duerme o celebra la racha)
    game: ['snake', 'life', 'pacman', 'invaders', 'tetris'],
    mood: ['auto', 'off']
  },

  // Tarjetas del kit (/api/<pieza>/<usuario>.svg): solo tema e idioma, para que todas combinen
  CARD_KINDS: ['header', 'stats', 'streak', 'langs', 'activity', 'kit'],
  CARD_OPTION_VALUES: {
    theme: CONTRACT_THEMES,
    lang: ['en', 'es']
  },

  // Piezas de dos perfiles (/api/<pieza>/<a>-vs-<b>.svg): mismas opciones que las tarjetas
  PAIR_KINDS: ['duel', 'versus'],

  CALENDAR_QUERY: `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
}`,

  /** Valida un query string ('theme=dark&speed=fast'); devuelve las opciones o lanza un Error legible */
  parseOptions(query, context = '', allowed = this.OPTION_VALUES) {
    const options = {};
    const where = context ? ` en '${context}'` : '';
    for (const [key, value] of new URLSearchParams(query)) {
      if (!allowed[key]) {
        throw new Error(`Opción desconocida '${key}'${where}. Válidas: ${Object.keys(allowed).join(', ')}`);
      }
      if (!allowed[key].includes(value)) {
        throw new Error(`Valor '${value}' no válido para '${key}'${where}. Válidos: ${allowed[key].join(', ')}`);
      }
      options[key] = value;
    }
    return options;
  },

  /** Semanas de GraphQL -> matriz 53x7 (la semana actual en la última columna) */
  weeksToGrid(weeks, cols = 53, rows = 7) {
    const recent = weeks.slice(-cols);
    const offset = cols - recent.length;
    const grid = [];

    for (let x = 0; x < cols; x++) {
      const column = [];
      for (let y = 0; y < rows; y++) {
        column.push({ x, y, level: 0, originalLevel: 0, count: 0, date: null });
      }
      grid.push(column);
    }

    recent.forEach((week, i) => {
      for (const day of week.contributionDays) {
        const level = this.LEVELS[day.contributionLevel] ?? 0;
        const cell = grid[offset + i][day.weekday];
        cell.level = level;
        cell.originalLevel = level;
        cell.count = day.contributionCount;
        cell.date = day.date;
      }
    });

    return grid;
  },

  /** Lee el calendario de un usuario con la API GraphQL oficial */
  async fetchCalendarWeeks(username, token, fetchImpl = fetch) {
    const user = await this.queryUser(this.CALENDAR_QUERY, username, token, fetchImpl);
    return user.contributionsCollection.contributionCalendar.weeks;
  },

  /**
   * Ejecuta una consulta GraphQL con raíz user(login: $login) y devuelve data.user.
   * Errores: .status con el código HTTP, .code = 'NOT_FOUND' si el usuario no existe.
   */
  async queryUser(query, username, token, fetchImpl = fetch) {
    const res = await fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': Brand.userAgent
      },
      body: JSON.stringify({ query, variables: { login: username } })
    });
    if (!res.ok) {
      const httpError = new Error(`GitHub GraphQL respondió ${res.status} ${res.statusText}`);
      httpError.status = res.status;
      throw httpError;
    }
    const body = await res.json();
    const errors = body.errors || [];
    // GraphQL responde 200 con un error de tipo NOT_FOUND cuando el usuario no existe
    if (errors.some(e => e.type === 'NOT_FOUND') || (!errors.length && body.data && !body.data.user)) {
      const notFound = new Error(`No existe el usuario de GitHub '${username}'`);
      notFound.code = 'NOT_FOUND';
      throw notFound;
    }
    if (errors.length || !body.data || !body.data.user) {
      throw new Error(`GitHub GraphQL: ${errors.map(e => e.message).join('; ') || 'respuesta sin datos'}`);
    }
    return body.data.user;
  }
};

window.SnakeCore = SnakeCore;
