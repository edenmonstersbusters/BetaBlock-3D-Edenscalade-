
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Utilitaire pour échapper les caractères XML
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
  const BASE_URL = 'https://betablock-3d.fr';
  const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (!SERVICE_KEY) {
        throw new Error("Clé SERVICE_ROLE manquante. Configurez la variable d'environnement sur Vercel.");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Récupération Parallèle des Données
    const [wallsResult, profilesResult] = await Promise.all([
        supabase.from('walls').select('id, created_at').eq('is_public', true).limit(5000),
        supabase.from('profiles').select('id, created_at').limit(2000)
    ]);

    if (wallsResult.error) throw wallsResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const walls = wallsResult.data || [];
    const profiles = profilesResult.data || [];
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // --- A. PAGES STATIQUES ---
    const staticPages = [
        { path: '', priority: '1.0', freq: 'daily' },
        { path: '/gallery', priority: '1.0', freq: 'daily' },
        { path: '/builder', priority: '0.9', freq: 'weekly' },
        { path: '/setter', priority: '0.8', freq: 'weekly' },
        { path: '/projects', priority: '0.7', freq: 'daily' },
        { path: '/profile', priority: '0.7', freq: 'daily' },
        { path: '/login', priority: '0.5', freq: 'monthly' },
        { path: '/signup', priority: '0.5', freq: 'monthly' },
    ];

    staticPages.forEach(p => {
        xml += `
  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
    });

    // --- B. MURS DYNAMIQUES (Triplé d'URLs) ---
    walls.forEach((wall: any) => {
        const lastMod = (wall.created_at || today).split('T')[0];
        const id = escapeXml(wall.id);

        // 1. La Vue (Priorité maximale pour ce mur)
        xml += `
  <url>
    <loc>${BASE_URL}/view/${id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

        // 2. Le Builder (Pour permettre l'édition/remix direct)
        xml += `
  <url>
    <loc>${BASE_URL}/builder?id=${id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;

        // 3. Le Setter (Mode ouverture)
        xml += `
  <url>
    <loc>${BASE_URL}/setter?id=${id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;
    });

    // --- C. PROFILS UTILISATEURS ---
    profiles.forEach((profile: any) => {
        const lastMod = (profile.created_at || today).split('T')[0];
        xml += `
  <url>
    <loc>${BASE_URL}/profile/${escapeXml(profile.id)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    response.setHeader('Content-Type', 'application/xml');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return response.status(200).send(xml);

  } catch (error: any) {
    console.error('Sitemap Error:', error);
    return response.status(500).send(`Error generating sitemap: ${error.message}`);
  }
}
