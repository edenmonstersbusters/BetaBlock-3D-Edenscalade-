
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Dumbbell, ExternalLink, Navigation } from 'lucide-react';

interface GymSearchResult {
  name: string;
  address: string;
  city: string;
  country: string;
  uri?: string;
}

interface GymSearchSelectorProps {
  value: GymSearchResult | null | any;
  onChange: (value: GymSearchResult | null) => void;
  placeholder?: string;
}

const GymResultItem: React.FC<{ gym: GymSearchResult; onSelect: () => void }> = ({ gym, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-all cursor-pointer group border-b border-white/5 last:border-0"
    >
      <div className="shrink-0 p-1 bg-gray-800/50 rounded text-gray-600 group-hover:text-blue-400 transition-colors">
        <Navigation size={12} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-[12px] font-bold text-gray-300 group-hover:text-white truncate">{gym.name}</h4>
        <div className="flex items-center gap-1.5 opacity-60">
          <span className="text-[10px] text-gray-500 truncate">{gym.address}</span>
          <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-tighter">{gym.city}</span>
        </div>
      </div>
      {gym.uri && <ExternalLink size={12} className="text-gray-700" />}
    </div>
  );
};

export const GymSearchSelector: React.FC<GymSearchSelectorProps> = ({ value, onChange, placeholder }) => {
  const [query, setQuery] = useState(typeof value === 'string' ? value : value?.name || '');
  const [results, setResults] = useState<GymSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchGyms = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) { setResults([]); return; }
    setLoading(true);
    
    try {
      // Utilisation de PHOTON (Komoot) : Moteur de recherche flou basé sur OSM
      // Extrêmement rapide, gère les fautes de frappe et permet de filtrer par tags
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&osm_tag=sport:climbing&limit=10`;
      
      // Optionnel : Ajout de la localisation pour prioriser les résultats proches
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 1000 })
        );
        url += `&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
      } catch (e) {
        // Fallback si la géolocalisation est refusée/indisponible
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.features) {
        setResults([]);
        return;
      }

      const parsedResults: GymSearchResult[] = data.features.map((feature: any) => {
        const p = feature.properties;
        
        // Photon retourne les composants d'adresse séparément
        const name = p.name || "Salle sans nom";
        const city = p.city || p.town || p.district || "";
        const country = p.country || "";
        const street = p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : "";
        
        // On génère un lien Google Maps basé sur le nom et la ville pour plus de précision
        const fullSearchQuery = `${name} ${city} ${country}`.trim();
        const uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearchQuery)}`;

        return {
          name,
          address: street || city || country,
          city,
          country,
          uri
        };
      });

      setResults(parsedResults);
      setIsOpen(true);
    } catch (e) {
      console.error("Photon Search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    
    // Si l'utilisateur a sélectionné une salle, on ne relance pas la recherche pour son propre nom
    const isSelectedName = value?.name === query;
    
    if (query && !isSelectedName) {
        searchTimeout.current = window.setTimeout(() => {
            searchGyms(query);
        }, 300); // Délai de 300ms pour une sensation de "temps réel"
    } else if (!query) {
        setResults([]);
    }
    
    return () => { if (searchTimeout.current) window.clearTimeout(searchTimeout.current); };
  }, [query, value]);

  const handleSelect = (gym: GymSearchResult) => {
      setQuery(gym.name);
      onChange(gym);
      setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
        <div className="relative">
             <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
             <input 
                type="text" 
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value) {
                        onChange(null);
                        setIsOpen(false);
                    }
                }}
                onFocus={() => { if(results.length > 0) setIsOpen(true); }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 outline-none text-white placeholder-gray-600 transition-all shadow-inner"
                placeholder={placeholder || "Nom de votre salle..."}
             />
             {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
             {query && !loading && (
                 <button onClick={() => { setQuery(''); onChange(null); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                     <X size={14} />
                 </button>
             )}
        </div>
        
        {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                {results.map((gym, i) => (
                    <GymResultItem key={i} gym={gym} onSelect={() => handleSelect(gym)} />
                ))}
            </div>
        )}
    </div>
  );
};
