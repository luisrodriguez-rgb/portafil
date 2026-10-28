/**
 * Datos de marca y despliegue en un solo sitio: nombre, dominio, repositorio y referencia de la Action.
 * Al tener dominio y repositorio definitivos solo hay que cambiar este archivo (docs/BRAND.md).
 * Script plano (sin import/export) para cargarse igual que el resto del motor y en la web.
 */

const Brand = {
  name: 'Perfila',
  // Dominio público de la web y la API (provisional hasta elegir dominio)
  site: 'https://perfila.vercel.app',
  // Repositorio público (vacío hasta crearlo): la web enlaza a él si existe
  repo: '',
  // Referencia de la GitHub Action para el workflow generado
  actionRef: 'perfila/perfila@v1',
  userAgent: 'perfila'
};

window.Brand = Brand;
