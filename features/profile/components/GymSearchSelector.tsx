
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Dumbbell, Globe, ExternalLink, Navigation } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface GymSearchResult {
  name: string;
  address: string;
  city: string;
  country: string;
  uri?: string;
}

interface GymSearchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Composant interne ultra-compact pour un résultat de recherche
 * Fix: Use React.FC to allow the 'key' prop when used in JSX maps
 */
const GymResultItem: React.FC<{ 
  gym: GymSearchResult; 
  query: string; 
  onSelect: () => void;
}> = ({ 
  gym, 
  query, 
  onSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const [scrollDist, setScrollDist] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Recalcule la distance de défilement si le nom change ou si le conteneur est redimensionné
  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const diff = textRef.current.offsetWidth - containerRef.current.offsetWidth;
      setScrollDist(diff > 0 ? diff : 0);
    }
  }, [gym.name]);

  const animationId = React.useId().replace(/:/g, '');
  const duration = Math.max(2.5, scrollDist / 35);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full flex items-center gap-2 p-1.5 hover:bg-white/5 transition-all cursor-pointer group border-b border-white/5 last:border-0"
    >
      {/* Icône discrète */}
      <div className="shrink-0 p-1 bg-gray-800/50 rounded text-gray-600 group-hover:text-blue-400 transition-colors">
        <Navigation size={11} />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 h-4 overflow-hidden">
          <div ref={containerRef} className="flex-1 overflow-hidden whitespace-nowrap relative">
            <h4 
              ref={textRef}
              className="text-[12px] font-bold text-gray-300 group-hover:text-white leading-none inline-block"
              style={{
                animation: (isHovered && scrollDist > 0) 
                    ? `marquee-${animationId} ${duration}s linear infinite alternate` 
                    : 'none',
                transform: isHovered ? undefined : 'translateX(0)',
                transition: isHovered ? 'none' : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
            >
              <style>{`
                @keyframes marquee-${animationId} {
                  0%, 15% { transform: translateX(0); }
                  85%, 100% { transform: translateX(-${scrollDist}px); }
                }
              `}</style>
              {gym.name}
            </h4>
          </div>
          {gym.name.toLowerCase().includes(query.toLowerCase()) && (
            <div className="shrink-0 w-1 h-1 rounded-full bg-emerald-500/50" />
          )}
        </div>
        
        <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
          <span className="text-[9.5px] text-gray-500 truncate max-w-[140px]">{gym.address}</span>
          <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-tighter shrink-0">{gym.city}</span>
        </div>
      </div>

      {gym.uri && (
        <a 
          href={gym.uri} 
          target="_blank" 
          rel="noreferrer" 
          onClick={e => e.stopPropagation()} 
          className="shrink-0 p-1 text-gray-700 hover:text-blue-400 transition-colors"
          title="Maps"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
};

export const GymSearchSelector: React.FC<GymSearchSelectorProps> = ({ value, onChange, placeholder }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GymSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchGyms = async (searchQuery: string) => {
    // Changement : On autorise la recherche dès 1 caractère
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let latLng = undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 1000 });
        });
        latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) { }

      // Amélioration du prompt pour gérer les recherches partielles (type-ahead)
      const prompt = `Search for climbing gyms matching the partial query: "${searchQuery}". 
      Include gyms that start with or contain these letters. 
      Format exactly: Name | Address | City | Country`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: latLng } },
          thinkingConfig: { thinkingBudget: 0 }
        },
      });

      const text = response.text || "";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsUris = new Map<string, string>();
      
      chunks.forEach((chunk: any) => {
        if (chunk.maps?.title && chunk.maps?.uri) {
          mapsUris.set(chunk.maps.title.toLowerCase(), chunk.maps.uri);
        }
      });

      const parsedResults: GymSearchResult[] = text
        .split('\n')
        .map(line => line.replace(/^[-*•#]\s*/, '').trim())
        .filter(line => line.includes('|'))
        .map(line => {
          const parts = line.split('|').map(s => s.trim());
          const name = parts[0] || "Salle inconnue";
          return {
            name: name,
            address: parts[1] || "Localisation",
            city: parts[2] || "",
            country: parts[3] || "",
            uri: mapsUris.get(name.toLowerCase())
          };
        });

      // Si l'IA n'a pas renvoyé de texte structuré mais que Maps a des chunks, on les utilise
      if (parsedResults.length === 0 && chunks.length > 0) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps) {
            parsedResults.push({
              name: chunk.maps.title,
              address: "Localisation Maps",
              city: "Recherche",
              country: "Monde",
              uri: chunk.maps.uri
            });
          }
        });
      }

      setResults(parsedResults);
      setIsOpen(parsedResults.length > 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    // On garde un léger debounce pour ne pas mitrailler l'IA, mais on est prêt dès la première lettre
    searchTimeout.current = window.setTimeout(() => searchGyms(val), 400) as unknown as number;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="text-blue-500 animate-spin" size={12} />
          ) : (
            <Dumbbell className="text-gray-600 group-focus-within:text-blue-500 transition-colors" size={12} />
          )}
        </div>
        <input 
          type="text" 
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full bg-gray-950 border border-white/5 rounded-lg py-1.5 pl-8 pr-7 text-[12px] text-white placeholder:text-gray-700 focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/5 outline-none transition-all font-medium"
          placeholder={placeholder || "Trouver une salle..."}
        />
        {query && !loading && (
          <button 
            onClick={() => { setQuery(''); onChange(''); setResults([]); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1.5 border-b border-white/5 bg-black/40 flex items-center gap-1.5">
            <Globe size={10} className="text-blue-500/50" />
            <span className="text-[7.5px] font-black text-gray-600 uppercase tracking-widest">Base de données Live</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {results.map((gym, idx) => (
              <GymResultItem 
                key={idx} 
                gym={gym} 
                query={query} 
                onSelect={() => { 
                  onChange(gym.name); 
                  setQuery(gym.name); 
                  setIsOpen(false); 
                }} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
