
export default async function handler(request: Request) {
  const BASE_URL = 'https://betablock-3d.vercel.app';
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

  try {
    // Récupération des murs publics via l'API REST Supabase (plus léger que le client JS)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/walls?select=id,updated_at&is_public=eq.true`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`Supabase Error: ${response.statusText}`);
    }

    const walls = await response.json();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/#/builder</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Ajout dynamique des murs (avec Hashbang pour compatibilité HashRouter)
    walls.forEach((wall: any) => {
        const lastMod = wall.updated_at ? wall.updated_at.split('T')[0] : today;
        xml += `
  <url>
    <loc>${BASE_URL}/#/view/${wall.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache 1h sur le CDN
      }
    });

  } catch (error) {
    console.error(error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}