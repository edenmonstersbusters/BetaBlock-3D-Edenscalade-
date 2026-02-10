
import React, { useState, useEffect } from 'react';
import { Box, ChevronUp, ChevronDown, Loader2, Image as ImageIcon } from 'lucide-react';
import { HoldDefinition } from '../../../types';

interface HoldCatalogueProps {
  library: HoldDefinition[];
  selectedHoldId?: string;
  onSelectHold: (hold: HoldDefinition) => void;
  loading: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  isReplacingMode: boolean;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';

export const HoldCatalogue: React.FC<HoldCatalogueProps> = ({ 
  library, selectedHoldId, onSelectHold, loading, expanded, onToggleExpand, isReplacingMode 
}) => {
  const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(1);

  useEffect(() => {
    if (!hoveredHoldId) {
      setPreviewIndex(1);
      return;
    }
    const interval = setInterval(() => {
      setPreviewIndex((prev) => (prev % 4) + 1);
    }, 1200); // Défilement ralenti à 1.2 secondes
    return () => clearInterval(interval);
  }, [hoveredHoldId]);

  const getThumbnailUrl = (filename: string, index: number) => {
    const baseName = filename.replace(/\.[^/.]+$/, "");
    return `${BASE_URL}screenshot/${baseName}-v${index}.png`;
  };

  const validLibrary = library.filter(h => h && h.id);

  return (
    <section className="space-y-2">
      <button 
        onClick={onToggleExpand}
        className={`w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider p-3 rounded-lg transition-colors ${
          isReplacingMode 
            ? 'bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/50' 
            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <Box size={14} />
          <span>Catalogue ({validLibrary.length})</span>
          {isReplacingMode && (
            <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse ml-2">
              REMPLACEMENT
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      
      {expanded && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" />
            </div>
          ) : (
            /* Passage à 2 colonnes pour des images plus grandes et une meilleure visibilité */
            <div className="grid grid-cols-2 gap-3 mt-2">
              {validLibrary.map((hold) => {
                const isHovered = hoveredHoldId === hold.id;
                const currentImgIndex = isHovered ? previewIndex : 1;
                const isSelected = selectedHoldId === hold.id && !isReplacingMode;

                return (
                  <button 
                    key={hold.id} 
                    onClick={() => onSelectHold(hold)} 
                    onMouseEnter={() => setHoveredHoldId(hold.id)}
                    onMouseLeave={() => setHoveredHoldId(null)}
                    className={`group relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-500 ${
                      isSelected 
                        ? 'border-blue-500 ring-4 ring-blue-500/20 bg-gray-800 scale-95' 
                        : 'bg-gray-950 border-gray-800/50 hover:border-gray-400 hover:scale-105 hover:shadow-2xl hover:z-10'
                    }`}
                    title={hold.name}
                  >
                    {/* Image principale - Cycle au survol */}
                    <div className="w-full h-full relative">
                        <img 
                          src={getThumbnailUrl(hold.filename, currentImgIndex)} 
                          alt={hold.name}
                          className="w-full h-full object-contain p-2 transition-transform duration-700 ease-out scale-[1.35] group-hover:scale-[1.6]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/111/444?text=?';
                          }}
                        />
                    </div>

                    {/* Indicateur de défilement (points) */}
                    {isHovered && (
                      <div className="absolute top-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                        {[1, 2, 3, 4].map(idx => (
                          <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                              idx === currentImgIndex ? 'bg-blue-500 scale-125' : 'bg-gray-700'
                            }`} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Overlay Nom au survol - Plus discret */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none p-3">
                      <span className="text-[9px] font-black text-white uppercase tracking-tighter truncate block text-center">
                        {hold.name}
                      </span>
                    </div>

                    {/* Badge sélection */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 bg-blue-500 rounded-full shadow-lg ring-2 ring-white/20">
                        <ImageIcon size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
