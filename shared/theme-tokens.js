/**
 * Design tokens compartidos por la serpiente (web, Action y endpoint) y las tarjetas del kit.
 * Una pieza nueva solo entra si usa estos colores, esta tipografía y estos radios: así el perfil parece un solo diseño.
 * Script plano (sin import/export) para cargarse igual que el resto del motor.
 */

const ThemeTokens = {
  // Tipografía: monoespaciada en todo el kit. Además de encajar con la estética de terminal, permite estimar
  // el ancho de un texto sin medirlo (no hay DOM en el servidor) para cortar bios y nombres largos.
  font: {
    family: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    charWidth: 0.6, // ancho de un carácter en em
    size: { label: 10, body: 12, value: 18, display: 20, hero: 32 },
    weight: { regular: 400, bold: 700, heavy: 800 }
  },

  // Medidas en px, tomadas de la cabecera de la serpiente
  radius: { card: 12, cell: 2.5, bar: 4 },
  space: { padding: 16, gap: 17, header: 30 },
  size: { full: 797, half: 390 },

  // Colores por tema. Las claves de la serpiente (text, bg, border, empty, l1-l4, head, body, glow, spine) no cambian:
  // el exportador las usa tal cual. muted y series son para las tarjetas.
  themes: {
    dark: {
      text: '#e6fff2', muted: '#8fb8a2', bg: '#040806', border: 'rgba(0, 255, 102, 0.15)',
      empty: '#0a140e', l1: '#07381b', l2: '#096831', l3: '#00b34d', l4: '#00ff66',
      head: '#ffffff', body: '#00ff66', glow: 'rgba(0, 255, 102, 0.85)', spine: '#ffffff',
      series: ['#00ff66', '#00b34d', '#7dffb3', '#096831', '#c8ffe0', '#3f6b52']
    },
    light: {
      text: '#1f2328', muted: '#59636e', bg: '#ffffff', border: 'rgba(31, 35, 40, 0.15)',
      empty: '#ebedf0', l1: '#9be9a8', l2: '#40c463', l3: '#30a14e', l4: '#216e39',
      head: '#0969da', body: '#1a7f37', glow: 'rgba(26, 127, 55, 0.35)', spine: '#ffffff',
      series: ['#1a7f37', '#0969da', '#40c463', '#54aeff', '#9be9a8', '#8c959f']
    },
    cyberpunk: {
      text: '#ffd6f5', muted: '#b58ab0', bg: '#090614', border: 'rgba(255, 0, 127, 0.25)',
      empty: '#170d2b', l1: '#3b1059', l2: '#72128a', l3: '#c01ec7', l4: '#ff007f',
      head: '#00ffff', body: '#ff007f', glow: 'rgba(255, 0, 127, 0.85)', spine: '#00ffff',
      series: ['#ff007f', '#00ffff', '#c01ec7', '#ff6fb5', '#7fe9ff', '#72128a']
    },
    neon_cyan: {
      text: '#d8fbff', muted: '#86b7c4', bg: '#030a12', border: 'rgba(0, 242, 254, 0.25)',
      empty: '#091c2e', l1: '#073a54', l2: '#08668f', l3: '#00aee6', l4: '#00f2fe',
      head: '#ffffff', body: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', spine: '#ffffff',
      series: ['#00f2fe', '#00aee6', '#7af8ff', '#08668f', '#d8fbff', '#2c5770']
    },
    amber_terminal: {
      text: '#ffe2b0', muted: '#b89a6a', bg: '#0f0a02', border: 'rgba(255, 170, 0, 0.25)',
      empty: '#241806', l1: '#4a3006', l2: '#855304', l3: '#d98200', l4: '#ffaa00',
      head: '#ffffff', body: '#ffaa00', glow: 'rgba(255, 170, 0, 0.85)', spine: '#ffffff',
      series: ['#ffaa00', '#d98200', '#ffd27a', '#855304', '#ffe2b0', '#5c4520']
    }
  },

  names() {
    return Object.keys(this.themes);
  },

  /** Colores de un tema (dark si no existe) */
  get(theme) {
    return this.themes[theme] || this.themes.dark;
  },

  /** Paleta en la forma que espera el exportador de la serpiente */
  snakePalettes() {
    const palettes = {};
    for (const [name, t] of Object.entries(this.themes)) {
      const { muted, series, ...snake } = t;
      palettes[name] = snake;
    }
    return palettes;
  }
};

window.ThemeTokens = ThemeTokens;
