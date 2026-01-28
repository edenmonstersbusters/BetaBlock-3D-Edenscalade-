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
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  
  // SÉCURITÉ : On récupère la clé secrète depuis les variables d'environnement Vercel
  // Si la clé n'est pas définie dans Vercel, le sitemap sera vide mais sécurisé.
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (!SERVICE_KEY) {
        console.warn("ATTENTION : SUPABASE_SERVICE_ROLE_KEY manquante dans Vercel.");
        throw new Error("Configuration serveur incomplète");
    }

    // Initialisation avec la Service Key pour contourner le RLS (Row Level Security)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Récupération des murs publics
    const { data: walls, error } = await supabase
        .from('walls')
        .select('id, updated_at, created_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(1000);

    if (error) {
        throw new Error(`Supabase Error: ${error.message}`);
    }

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. URL de la Galerie (Priorité haute)
    xml += `
  <url>
    <loc>${BASE_URL}/#/gallery</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // 2. URLs des murs dynamiques
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
    }

    xml += `
</urlset>`;

    response.setHeader('Content-Type', 'application/xml');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).send(xml);

  } catch (error: any) {
    console.error('Sitemap Generation Error:', error);
    
    // Fallback : En cas d'erreur (ex: clé manquante), on renvoie au moins la page d'accueil
    // pour que Google ne rejette pas le fichier ("Balise XML manquante").
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