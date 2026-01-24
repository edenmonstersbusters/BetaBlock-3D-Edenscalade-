
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
      // Guideline: ALWAYS use process.env.API_KEY for Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let latLng = undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 1000 }));
        latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {}

      const prompt = `Find climbing gyms for query: "${searchQuery}". Format: Name | Address | City | Country`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng } },
        },
      });

      const text = response.text || "";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsUris = new Map<string, string>();
      chunks.forEach((chunk: any) => { if (chunk.maps?.title) mapsUris.set(chunk.maps.title.toLowerCase(), chunk.maps.uri); });

      const parsedResults: GymSearchResult[] = text
        .split('\n')
        .map(line => line.replace(/^[-*•#]\s*/, '').trim())
        .filter(line => line.includes('|'))
        .map(line => {
          const parts = line.split('|').map(s => s.trim());
          const name = parts[0] || "";
          const address = parts[1] || "";
          const city = parts[2] || "";
          const country = parts[3] || "";
          // Attempt to match URI from grounding chunks
          const uri = mapsUris.get(name.toLowerCase());
          
          return { name, address, city, country, uri };
        })
        .filter(g => g.name.length > 0);

      setResults(parsedResults);
      setLoading(false);
      setIsOpen(true);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query && query !== value?.name) {
        searchTimeout.current = window.setTimeout(() => {
            searchGyms(query);
        }, 1000);
    }
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query]);

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
                    if (!e.target.value) onChange(null);
                }}
                onFocus={() => { if(results.length > 0) setIsOpen(true); }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 outline-none text-white placeholder-gray-600"
                placeholder={placeholder || "Rechercher une salle..."}
             />
             {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
             {query && !loading && (
                 <button onClick={() => { setQuery(''); onChange(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                     <X size={14} />
                 </button>
             )}
        </div>
        
        {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {results.map((gym, i) => (
                    <GymResultItem key={i} gym={gym} onSelect={() => handleSelect(gym)} />
                ))}
            </div>
        )}
    </div>
  );
};
