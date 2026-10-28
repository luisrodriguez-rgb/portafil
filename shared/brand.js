/**
 * Datos de marca y despliegue en un solo sitio: nombre, dominio, repositorio y referencia de la Action.
 * Al tener dominio y repositorio definitivos solo hay que cambiar este archivo (docs/BRAND.md).
 * Script plano (sin import/export) para cargarse igual que el resto del motor y en la web.
 */

const Brand = {
  name: 'Portafil',
  // Dominio público de la web y la API (provisional hasta elegir dominio)
  site: 'https://portafil.vercel.app',
  // Repositorio público (vacío hasta crearlo): la web enlaza a él si existe
  repo: '',
  // Perfil público que se usa en los ejemplos de la web y de examples/ (el del autor)
  demoUser: 'luisrodriguez-rgb',
  // Referencia de la GitHub Action para el workflow generado
  actionRef: 'portafil/portafil@v1',
  userAgent: 'portafil'
};

window.Brand = Brand;
