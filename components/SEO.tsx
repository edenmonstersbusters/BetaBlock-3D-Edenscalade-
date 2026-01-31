
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { StructuredData } from './StructuredData';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOProps {
  title: string;
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
  description = "Créez, modélisez et partagez vos murs d'escalade en 3D. L'outil ultime pour les ouvreurs et les passionnés.", 
  image = "https://betablock-3d.fr/preview-image.jpg", 
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs,
  schema
}) => {
  const siteTitle = "BetaBlock 3D";
  const fullTitle = `${title} | ${siteTitle}`;
  
  // LOGIQUE URL CANONIQUE
  // On force l'URL canonique vers le domaine de prod avec des chemins propres (sans #)
  // Cela permet à Google d'indexer correctement même si le crawler arrive sur une version hashée.
  const prodBase = 'https://betablock-3d.fr';
  
  // On nettoie l'URL courante pour enlever le hash éventuel
  // ex: /#/view/123 -> /view/123
  let cleanPath = '';
  if (url) {
      cleanPath = url.replace(prodBase, '').replace('#/', '').replace('#', '');
  } else {
      const hashPath = window.location.hash.replace('#', '');
      const path = window.location.pathname;
      cleanPath = hashPath.length > 1 ? hashPath : path;
  }
  
  // Normalisation
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  if (cleanPath === '/') cleanPath = ''; // Root

  const canonicalUrl = `${prodBase}${cleanPath}`;

  // Détection simple de la langue (par défaut FR)
  const lang = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'fr';

  return (
    <>
        <Helmet>
        <html lang={lang} />
        
        {/* Standard Metadata */}
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        {author && <meta name="author" content={author} />}

        {/* Internationalization Hints */}
        <link rel="alternate" href={canonicalUrl} hrefLang="x-default" />
        <link rel="alternate" href={canonicalUrl} hrefLang={lang} />

        {/* Open Graph / Facebook / LinkedIn */}
        <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : 'en_US'} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:alt" content={`Aperçu de ${title}`} />
        <meta property="og:site_name" content={siteTitle} />
        {publishedTime && <meta property="article:published_time" content={publishedTime} />}
        {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@BetaBlock3D" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <meta name="twitter:creator" content="@BetaBlock3D" />
        </Helmet>

        {/* Injection JSON-LD si fourni, sinon Application par défaut */}
        {schema ? (
            <StructuredData type={schema.type} data={schema.data} />
        ) : (
            <StructuredData type="SoftwareApplication" data={{}} />
        )}

        {/* Injection JSON-LD pour les Breadcrumbs (Sitelinks) */}
        {breadcrumbs && (
            <StructuredData 
                type="BreadcrumbList" 
                data={{
                    items: breadcrumbs.map((b, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: b.name,
                        // Les breadcrumbs doivent aussi pointer vers les URLs propres
                        item: `${prodBase}${b.url.startsWith('/') ? '' : '/'}${b.url.replace('#/', '')}`
                    }))
                }}
            />
        )}
    </>
  );
};
