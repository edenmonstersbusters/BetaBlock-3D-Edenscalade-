import type { VercelRequest, VercelResponse } from '@vercel/node';

// On retire la config 'edge' pour utiliser le Node.js standard (plus stable pour les appels DB)

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

    if (Array.isArray(walls)) {
        walls.forEach((wall: any) => {
            // On utilise updated_at s'il existe, sinon created_at, sinon aujourd'hui
            const dateRaw = wall.updated_at || wall.created_at;
            const lastMod = dateRaw ? dateRaw.split('T')[0] : today;
            
            // On inclut /#/ pour que le lien pointe bien vers l'application
            const loc = `${BASE_URL}/#/view/${escapeXml(wall.id)}`;

            xml += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });
    }

    xml += `
</urlset>`;

    // Envoi de la réponse XML correcte
    response.setHeader('Content-Type', 'application/xml');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).send(xml);

  } catch (error) {
    console.error('Sitemap Generation Error:', error);
    
    // En cas d'erreur, on renvoie quand même un XML valide (mais vide) pour éviter le 500 chez Google
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    
    response.setHeader('Content-Type', 'application/xml');
    return response.status(200).send(fallbackXml);
  }
}