import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
  // Configuration Supabase directe pour s'assurer que ça marche côté serveur Vercel
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

  try {
    // Initialisation du client officiel (plus robuste que fetch manuel)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Récupération des murs publics via le SDK
    const { data: walls, error } = await supabase
        .from('walls')
        .select('id, updated_at, created_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false }) // On trie par date de mise à jour si possible
        .limit(1000);

    if (error) {
        throw new Error(`Supabase SDK Error: ${error.message}`);
    }

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Si on a des murs, on les liste
    if (walls && walls.length > 0) {
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
        // Fallback si la liste est vide (pas de mur public ou base vide)
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

  } catch (error: any) {
    console.error('Sitemap Generation Error:', error);
    
    // En cas d'erreur fatale, on renvoie un XML minimal valide
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
    // On renvoie 200 même en erreur pour que Google ne rejette pas le fichier
    return response.status(200).send(fallbackXml);
  }
}