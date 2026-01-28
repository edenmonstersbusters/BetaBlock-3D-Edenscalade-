import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fonction utilitaire pour échapper les caractères spéciaux XML
function escapeXml(unsafe: any): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const BASE_URL = 'https://betablock-3d.vercel.app';
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

  try {
    // Récupération des 1000 derniers murs publics
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/walls?select=id,updated_at,created_at&is_public=eq.true&order=updated_at.desc&limit=1000`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!fetchRes.ok) {
        throw new Error(`Supabase Error: ${fetchRes.statusText}`);
    }

    const walls = await fetchRes.json();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Si on a des murs, on les liste
    if (Array.isArray(walls) && walls.length > 0) {
        walls.forEach((wall: any) => {
            const dateRaw = wall.updated_at || wall.created_at;
            const lastMod = dateRaw ? dateRaw.split('T')[0] : today;
            const loc = `${BASE_URL}/#/view/${escapeXml(wall.id)}`;

            xml += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });
    } else {
        // IMPORTANT : Si aucun mur n'est trouvé, on ajoute une URL par défaut (la galerie)
        // Cela empêche l'erreur "Balise XML manquante" dans la Search Console
        xml += `
  <url>
    <loc>${BASE_URL}/#/gallery</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    response.setHeader('Content-Type', 'application/xml');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).send(xml);

  } catch (error) {
    console.error('Sitemap Generation Error:', error);
    
    // Fallback robuste : même en cas d'erreur fatale (ex: DB hors ligne),
    // on renvoie un XML valide avec une URL par défaut pour ne pas fâcher Google.
    const today = new Date().toISOString().split('T')[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/#/gallery</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
    
    response.setHeader('Content-Type', 'application/xml');
    return response.status(200).send(fallbackXml);
  }
}