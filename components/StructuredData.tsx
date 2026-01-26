
import React from 'react';
import { Helmet } from 'react-helmet-async';

type SchemaType = 'WebSite' | 'SoftwareApplication' | '3DModel' | 'Person' | 'ProfilePage';

interface StructuredDataProps {
  type: SchemaType;
  data: Record<string, any>;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ type, data }) => {
  let schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  if (type === 'SoftwareApplication') {
    schema = {
        ...schema,
        name: "BetaBlock 3D",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web Browser",
        offers: {
            '@type': "Offer",
            price: "0",
            priceCurrency: "USD"
        },
        aggregateRating: {
            '@type': "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "1250"
        },
        ...data
    };
  } else if (type === '3DModel') {
      // Spécifique pour les murs d'escalade
      schema = {
          ...schema,
          encoding: [
              {
                  '@type': "MediaObject",
                  contentUrl: data.modelUrl || "",
                  encodingFormat: "application/json"
              }
          ],
          ...data
      };
  } else {
      schema = { ...schema, ...data };
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};
