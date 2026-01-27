
export const config = {
  runtime: 'edge',
};

// Fonction utilitaire pour échapper les caractères spéciaux XML
function escapeXml(unsafe: string): string {
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

export default async function handler(request: Request) {
  const BASE_URL = 'https://betablock-3d.vercel.app';
  // Note: En production réelle, ces clés devraient être dans process.env
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

  try {
    // Récupération des 1000 derniers murs publics
    const response = await fetch(`${SUPABASE_URL}/rest/v1/walls?select=id,updated_at,created_at&is_public=eq.true&order=updated_at.desc&limit=1000`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        console.error(`Supabase Error: ${response.statusText}`);
        return new Response('Error fetching walls', { status: 500 });
    }

    const walls = await response.json();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    walls.forEach((wall: any) => {
        // On utilise updated_at s'il existe, sinon created_at, sinon aujourd'hui
        const dateRaw = wall.updated_at || wall.created_at;
        const lastMod = dateRaw ? dateRaw.split('T')[0] : today;
        
        // URL HashRouter : On inclut /#/ pour que le lien soit fonctionnel au clic
        const loc = `${BASE_URL}/#/view/${escapeXml(wall.id)}`;

        xml += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache 1 heure
      }
    });

  } catch (error) {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
}