
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { StructuredData } from './StructuredData';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOProps {
  title: string; // Ex: "Galerie", "Atelier", "Profil de Marc"
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  breadcrumbs?: BreadcrumbItem[];
  schema?: {
      type: 'WebSite' | 'SoftwareApplication' | '3DModel' | 'Person' | 'ProfilePage' | 'BreadcrumbList';
      data: any;
  };
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Concevez, visualisez et partagez vos murs d'escalade en 3D. L'outil de route setting ultime pour les grimpeurs et les ouvreurs.", 
  image = "https://i.ibb.co/Wpc05q7K/Betablock.png", 
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs,
  schema
}) => {
  // Modification demandée : Ajout du suffixe descriptif global
  const siteTitle = "BetaBlock 3D | Ouverture de murs d'escalade 3D";
  
  // Format du titre : "Nom de Page | BetaBlock 3D | Ouverture de murs d'escalade 3D"
  const fullTitle = title === "Accueil" ? siteTitle : `${title} | ${siteTitle}`;
  
  const prodBase = 'https://betablock-3d.fr';
  
  // LOGIQUE CANONIQUE ROBUSTE
  let cleanPath = '';
  if (url) {
      cleanPath = url.replace(prodBase, '').replace('#/', '').replace('#', '');
  } else {
      const hashPath = window.location.hash.replace('#', '');
      const path = window.location.pathname;
      // On privilégie le chemin du hash s'il existe (pour le routage client)
      cleanPath = hashPath.length > 1 ? hashPath : path;
  }
  
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  if (cleanPath === '/' || cleanPath === '/index.html') cleanPath = '';

  const canonicalUrl = `${prodBase}${cleanPath}`;
  const lang = "fr"; // On force le FR pour le SEO localisé France d'abord

  return (
    <>
        <Helmet>
        <html lang={lang} />
        
        {/* Métadonnées Primaires */}
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        {author && <meta name="author" content={author} />}

        {/* Internationalisation */}
        <link rel="alternate" href={canonicalUrl} hrefLang="x-default" />
        <link rel="alternate" href={canonicalUrl} hrefLang="fr" />

        {/* Open Graph */}
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:alt" content={`Aperçu de ${title}`} />
        <meta property="og:site_name" content="BetaBlock 3D" />
        {publishedTime && <meta property="article:published_time" content={publishedTime} />}
        {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@BetaBlock3D" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        </Helmet>

        {schema ? (
            <StructuredData type={schema.type} data={schema.data} />
        ) : (
            <StructuredData type="SoftwareApplication" data={{}} />
        )}

        {breadcrumbs && (
            <StructuredData 
                type="BreadcrumbList" 
                data={{
                    items: breadcrumbs.map((b, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: b.name,
                        item: `${prodBase}${b.url.startsWith('/') ? '' : '/'}${b.url.replace('#/', '')}`
                    }))
                }}
            />
        )}
    </>
  );
};
