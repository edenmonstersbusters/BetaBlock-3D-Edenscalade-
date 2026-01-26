
// Ce script doit être exécuté avec Node.js : node scripts/sitemap-generator.js
// Il génère un fichier public/sitemap.xml à jour avec tous les murs publics.

const fs = require('fs');
const path = require('path');

// URL de base du site
const BASE_URL = 'https://betablock-3d.vercel.app';

// Configuration Supabase (Clé publique ANON, sans danger car on ne lit que les murs publics)
const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

async function fetchPublicWalls() {
    try {
        console.log('🔍 Récupération des murs publics depuis Supabase...');
        
        // On utilise fetch natif (Node 18+)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/walls?select=id,updated_at&is_public=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const walls = await response.json();
        console.log(`✅ ${walls.length} murs trouvés.`);
        return walls;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération:', error);
        return [];
    }
}

function generateSitemap(walls) {
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Accueil -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Builder -->
  <url>
    <loc>${BASE_URL}/builder</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Ajout des murs dynamiques
    walls.forEach(wall => {
        const lastMod = wall.updated_at ? wall.updated_at.split('T')[0] : today;
        xml += `  <url>
    <loc>${BASE_URL}/#/view/${wall.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });

    xml += `</urlset>`;
    return xml;
}

async function main() {
    const walls = await fetchPublicWalls();
    const sitemapXml = generateSitemap(walls);
    
    // Chemin de sortie : public/sitemap.xml
    const publicDir = path.join(__dirname, '..', 'public');
    const outputPath = path.join(publicDir, 'sitemap.xml');

    // Création du dossier public si inexistant (rare mais possible)
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sitemapXml);
    console.log(`🎉 Sitemap généré avec succès : ${outputPath}`);
}

main();
