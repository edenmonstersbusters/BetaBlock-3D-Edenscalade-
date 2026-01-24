
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
      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all cursor-pointer group border-b border-white/5 last:border-0"
    >
      <div className="shrink-0 p-2 bg-gray-800/50 rounded-lg text-gray-500 group-hover:text-blue-400 transition-colors shadow-inner">
        <Navigation size={14} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-[13px] font-bold text-gray-200 group-hover:text-white truncate">{gym.name}</h4>
        <div className="flex items-center gap-1.5 opacity-60">
          <span className="text-[11px] text-gray-500 truncate">{gym.address}</span>
          {gym.city && (
              <>
                <span className="text-[10px] text-gray-700">•</span>
                <span className="text-[10px] font-black text-blue-500/70 uppercase tracking-tighter">{gym.city}</span>
              </>
          )}
        </div>
      </div>
      {gym.uri && <ExternalLink size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />}
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
    if (!searchQuery || searchQuery.trim().length < 2) { 
        setResults([]); 
        setLoading(false);
        return; 
    }
    
    setLoading(true);
    try {
      // Selon votre demande : on cherche "Centre sportif" + votre texte.
      // On n'utilise pas la position ni de tags OSM spécifiques, juste le texte.
      const prefix = "Centre sportif ";
      const finalQuery = `${prefix}${searchQuery}`;
      
      // On utilise Photon pour sa rapidité et sa recherche floue (fuzzy)
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(finalQuery)}&limit=15`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Photon API error');
      
      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        setResults([]);
        setIsOpen(false);
      } else {
        const parsedResults: GymSearchResult[] = data.features.map((feature: any) => {
          const p = feature.properties;
          // Photon renvoie le nom du lieu s'il existe, sinon la rue.
          const name = p.name || p.street || "Établissement";
          const city = p.city || p.town || p.district || "";
          const country = p.country || "";
          const street = p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : "";
          
          const fullSearchQuery = `${name} ${city} ${country}`.trim();
          const uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearchQuery)}`;

          return {
            name,
            address: street || city || country || "Adresse non spécifiée",
            city,
            country,
            uri
          };
        });
        setResults(parsedResults);
        setIsOpen(true);
      }
    } catch (e) {
      console.error("Gym search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    
    // Si la requête est identique au nom déjà sélectionné, on ne cherche pas
    const isSelectedName = (typeof value === 'object' && value?.name === query) || (typeof value === 'string' && value === query);
    
    if (query && !isSelectedName && query.length >= 2) {
        searchTimeout.current = window.setTimeout(() => {
            searchGyms(query);
        }, 400); 
    } else if (!query) {
        setResults([]);
        setLoading(false);
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
             <Dumbbell className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-blue-500' : 'text-gray-500'}`} size={16} />
             <input 
                type="text" 
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value) {
                        onChange(null);
                        setIsOpen(false);
                        setResults([]);
                    }
                }}
                onFocus={() => { if(results.length > 0) setIsOpen(true); }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-white placeholder-gray-600 transition-all shadow-inner"
                placeholder={placeholder || "Nom de votre salle..."}
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {loading && <Loader2 className="animate-spin text-blue-500" size={16} />}
                {query && !loading && (
                    <button 
                        onClick={() => { setQuery(''); onChange(null); setResults([]); setIsOpen(false); }} 
                        className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                        <X size={14} />
                    </button>
                )}
             </div>
        </div>
        
        {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar border-t-0">
                <div className="p-2 border-b border-white/5 bg-gray-950/50">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Centres sportifs trouvés</span>
                </div>
                {results.map((gym, i) => (
                    <GymResultItem key={i} gym={gym} onSelect={() => handleSelect(gym)} />
                ))}
            </div>
        )}

        {isOpen && query.length >= 2 && !loading && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-2xl p-4 text-center z-50 shadow-2xl">
                <p className="text-xs text-gray-500 italic">Aucun centre trouvé pour "{query}"</p>
                <p className="text-[9px] text-gray-700 uppercase font-black mt-2">Vérifiez l'orthographe du nom de la salle</p>
            </div>
        )}
    </div>
  );
};
