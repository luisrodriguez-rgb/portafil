/**
 * Perfil público de un usuario para las tarjetas del kit: datos de cabecera, totales del año, estrellas y lenguajes.
 * Una sola consulta GraphQL (~1 punto del límite) y el avatar incrustado como data URI, porque GitHub
 * sirve el SVG como imagen y una imagen no puede cargar otra desde fuera.
 */

const { engine } = require('./common');
const { cached } = require('./cache');

const PROFILE_QUERY = `query($login: String!) {
  user(login: $login) {
    login name bio location avatarUrl(size: 176)
    followers { totalCount }
    following { totalCount }
    contributionsCollection {
      totalCommitContributions totalPullRequestContributions totalIssueContributions
      totalPullRequestReviewContributions restrictedContributionsCount
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      nodes { stargazerCount languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

// Igual que el calendario: caché de dos niveles (server/cache.js)
const profileCache = new Map();

// Un avatar PNG/JPEG a 176 px pesa ~5-20 KB, pero uno GIF animado pasa de 150 KB: si no cabe a 176 px (retina)
// se pide a 88 px (su tamaño en la cabecera), y si tampoco cabe se dibujan las iniciales
const AVATAR_MAX_BYTES = 64 * 1024;
const AVATAR_SIZES = [176, 88];

/** Tipo por la firma del archivo: la CDN de avatares a veces etiqueta como image/gif un PNG redimensionado */
function imageType(bytes) {
  const hex = bytes.subarray(0, 4).toString('hex');
  if (hex === '89504e47') return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex === '47494638') return 'image/gif';
  if (hex === '52494646' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

async function fetchAvatar(url, fetchImpl) {
  if (!url) return null;
  for (const size of AVATAR_SIZES) {
    try {
      const sized = new URL(url);
      sized.searchParams.set('s', String(size));
      const res = await fetchImpl(sized.toString(), { headers: { 'User-Agent': engine.Brand.userAgent } });
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      const type = imageType(bytes);
      if (!type) return null;
      if (bytes.length <= AVATAR_MAX_BYTES) return `data:${type};base64,${bytes.toString('base64')}`;
    } catch {
      return null;
    }
  }
  return null;
}

/** Respuesta GraphQL -> perfil normalizado (el formato que leen las tarjetas) */
function normalizeProfile(user, avatar = null) {
  const repos = user.repositories.nodes || [];
  const sizes = new Map();
  let stars = 0;
  for (const repo of repos) {
    stars += repo.stargazerCount || 0;
    for (const edge of (repo.languages && repo.languages.edges) || []) {
      sizes.set(edge.node.name, (sizes.get(edge.node.name) || 0) + edge.size);
    }
  }
  const c = user.contributionsCollection;
  return {
    login: user.login,
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    avatar,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    publicRepos: user.repositories.totalCount,
    stars,
    totals: {
      commits: c.totalCommitContributions,
      pullRequests: c.totalPullRequestContributions,
      issues: c.totalIssueContributions,
      reviews: c.totalPullRequestReviewContributions,
      restricted: c.restrictedContributionsCount
    },
    languages: [...sizes].map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size)
  };
}

async function fetchProfile(user, token, fetchImpl = fetch) {
  const data = await engine.SnakeCore.queryUser(PROFILE_QUERY, user, token, fetchImpl);
  return normalizeProfile(data, await fetchAvatar(data.avatarUrl, fetchImpl));
}

function getProfile(user, token, fetchImpl = fetch) {
  return cached(profileCache, 'profile', user, token, fetchImpl, (t, f) => fetchProfile(user, t, f));
}

module.exports = { PROFILE_QUERY, getProfile, fetchProfile, normalizeProfile, profileCache };
