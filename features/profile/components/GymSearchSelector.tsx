
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Dumbbell, Globe, ExternalLink, Navigation } from 'lucide-react';

interface GymSearchResult {
  name: string;
  address: string;
  city: string;
  country: string;
  uri?: string;
}

/**
 * Composant interne ultra-compact pour un résultat de recherche
 */
const GymResultItem: React.FC<{ 
  gym: GymSearchResult; 
  onSelect: () => void;
}> = ({ 
  gym, 
  onSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const [scrollDist, setScrollDist] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
          title="Voir sur la carte"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
};

interface GymSearchSelectorProps {
  value: any;
  onChange: (val: any) => void;
  placeholder?: string;
}

export const GymSearchSelector: React.FC<GymSearchSelectorProps> = ({ value, onChange, placeholder }) => {
  const [query, setQuery] = useState(typeof value === 'string' ? value : value?.name || '');
  const [results, setResults] = useState<GymSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const fetchFromNominatim = async (queryString: string, limit: number = 50) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryString)}&limit=${limit}&addressdetails=1`;
    const response = await fetch(url, { 
      signal: abortControllerRef.current?.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'BetaBlock-Climbing-App' }
    });
    if (!response.ok) return [];
    return await response.json();
  };

  const searchGyms = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      let data: any[] = [];
      data = await fetchFromNominatim(`centre sportif ${searchQuery}`);
      if (data.length < 2) {
        const fallbackData = await fetchFromNominatim(`${searchQuery} climbing`);
        data = [...data, ...fallbackData];
      }
      if (data.length < 5) {
        const rawData = await fetchFromNominatim(searchQuery);
        data = [...data, ...rawData];
      }

      const parsedResults: GymSearchResult[] = data.map((item: any) => {
        const addr = item.address || {};
        const nameParts = item.display_name.split(',');
        const rawName = nameParts[0].trim();
        const street = addr.road || addr.pedestrian || "";
        const house = addr.house_number || "";
        const addressStr = `${house} ${street}`.trim() || addr.suburb || nameParts[1]?.trim() || "Adresse non renseignée";

        return {
          name: rawName,
          address: addressStr,
          city: addr.city || addr.town || addr.village || addr.municipality || "Ville inconnue",
          country: addr.country || "",
          uri: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=17/${item.lat}/${item.lon}`
        };
      });

      const uniqueResults = parsedResults.filter((v, i, a) => 
        a.findIndex(t => (t.name === v.name && t.city === v.city)) === i
      ).slice(0, 50);

      setResults(uniqueResults);
      setIsOpen(uniqueResults.length > 0);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Search cascade error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => searchGyms(val), 500) as unknown as number;
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
          placeholder={placeholder || "Rechercher une salle..."}
        />
        {query && !loading && (
          <button 
            onClick={() => { setQuery(''); onChange(null); setResults([]); setIsOpen(false); }}
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
            <span className="text-[7.5px] font-black text-gray-600 uppercase tracking-widest">Nominatim (OSM) - Top 50</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {results.map((gym, idx) => (
              <GymResultItem 
                key={idx} 
                gym={gym} 
                onSelect={() => { 
                  onChange(gym); // Renvoie l'objet complet
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
