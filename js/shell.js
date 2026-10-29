/**
 * Lo común a la web y al estudio: los enlaces al repositorio (estrellas y opiniones) y la medición de visitas
 * de Cloudflare Web Analytics, que no usa cookies y solo se activa con un token en shared/brand.js.
 */
(() => {
  if (!window.Brand) return;
  const repoUrl = Brand.repo ? `https://github.com/${Brand.repo}` : '';

  // [data-repo-link] lleva al repositorio y [data-repo-feedback] a abrir una issue con las plantillas
  document.querySelectorAll('[data-repo-link]').forEach(a => { if (repoUrl) a.href = repoUrl; else a.hidden = true; });
  document.querySelectorAll('[data-repo-feedback]').forEach(a => { if (repoUrl) a.href = `${repoUrl}/issues/new/choose`; else a.hidden = true; });

  // Estrellas del repositorio: la API pública admite 60 consultas por hora y por IP, así que una cada 10 min
  async function stars() {
    const key = 'portafil.stars';
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.count;
    } catch (e) {}
    const res = await fetch(`https://api.github.com/repos/${Brand.repo}`);
    if (!res.ok) return null;
    const count = (await res.json()).stargazers_count;
    try { sessionStorage.setItem(key, JSON.stringify({ time: Date.now(), count })); } catch (e) {}
    return count;
  }
  // Con cero estrellas no se muestra el número: solo la invitación
  if (repoUrl) {
    stars().then(count => {
      if (typeof count !== 'number' || count < 1) return;
      document.querySelectorAll('[data-star-count]').forEach(el => {
        el.textContent = count.toLocaleString(document.documentElement.lang || 'es');
        el.hidden = false;
      });
    }).catch(() => {});
  }

  // Cloudflare Web Analytics: visitas, páginas, países y dispositivos, sin cookies. Respeta Do Not Track
  // y Global Privacy Control, y no mide en local
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const optOut = navigator.doNotTrack === '1' || navigator.globalPrivacyControl;
  if (Brand.cloudflareAnalytics && location.protocol === 'https:' && !local && !optOut) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({ token: Brand.cloudflareAnalytics });
    document.head.appendChild(script);
  }
})();
