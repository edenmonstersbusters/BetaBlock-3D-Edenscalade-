
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Dégradé de profondeur discret et pro */}
        <linearGradient id="brandGradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" /> {/* Blue 500 */}
          <stop offset="1" stopColor="#06B6D4" /> {/* Cyan 500 */}
        </linearGradient>
      </defs>

      {/* Forme Globale : Hexagone technique (type prise d'escalade) */}
      <path 
        d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
        fill="#0F172A" /* Slate 900 - Fond sombre très pro */
      />

      {/* Le "B" construit par les panneaux 3D */}
      {/* Panneau Supérieur (Lumière) */}
      <path 
        d="M50 20L75 32.5V47.5L50 40V20Z" 
        fill="url(#brandGradient)"
      />
      
      {/* Panneau Inférieur (Lumière) */}
      <path 
        d="M50 45L75 57.5V72.5L50 80V60L50 45Z" 
        fill="url(#brandGradient)"
      />

      {/* Structure Latérale (Ombre / Perspective) */}
      <path 
        d="M30 32.5L50 20V80L30 67.5V32.5Z" 
        fill="white" 
        fillOpacity="0.15"
      />

      {/* Point de fixation (T-Nut) - Signature BetaBlock */}
      <circle cx="50" cy="50" r="3" fill="#3B82F6" className="animate-pulse" />
      
      {/* Bordure de finition */}
      <path 
        d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
        stroke="white" 
        strokeOpacity="0.1" 
        strokeWidth="1"
      />
    </svg>
  );
};
