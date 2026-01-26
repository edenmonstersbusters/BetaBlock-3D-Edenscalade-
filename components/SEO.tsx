
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { StructuredData } from './StructuredData';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  schema?: {
      type: 'WebSite' | 'SoftwareApplication' | '3DModel' | 'Person' | 'ProfilePage';
      data: any;
  };
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Créez, modélisez et partagez vos murs d'escalade en 3D. L'outil ultime pour les ouvreurs et les passionnés.", 
  image = "https://betablock-3d.vercel.app/preview-image.jpg", 
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  schema
}) => {
  const siteTitle = "BetaBlock 3D";
  const fullTitle = `${title} | ${siteTitle}`;
  const currentUrl = url || window.location.href.split('?')[0]; // Canonical URL (sans query params)

  return (
    <>
        <Helmet>
        <html lang="fr" />
        
        {/* Standard Metadata */}
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={currentUrl} />
        <meta name="robots" content="index, follow" />
        {author && <meta name="author" content={author} />}

        {/* Open Graph / Facebook / LinkedIn */}
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content={siteTitle} />
        {publishedTime && <meta property="article:published_time" content={publishedTime} />}
        {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
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
    </>
  );
};
