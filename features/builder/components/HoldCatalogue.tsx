
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
    }, 1200); // Cycle rapide pour un feedback visuel direct
    return () => clearInterval(interval);
  }, [hoveredHoldId]);

  const getThumbnailUrl = (filename: string, index: number) => {
    const baseName = filename.replace(/\.[^/.]+$/, "");
    return `${BASE_URL}screenshot/${baseName}-${index}.png`;
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
            <div className="grid grid-cols-3 gap-2 mt-2">
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
                    className={`group relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                      isSelected 
                        ? 'border-blue-500 ring-4 ring-blue-500/20 bg-gray-700 scale-95' 
                        : 'bg-gray-950 border-gray-800 hover:border-gray-500 hover:scale-105 hover:shadow-xl hover:z-10'
                    }`}
                    title={hold.name}
                  >
                    {/* Image de la prise */}
                    <img 
                      src={getThumbnailUrl(hold.filename, currentImgIndex)} 
                      alt={hold.name}
                      className="w-full h-full object-contain p-1 transition-opacity duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/111/444?text=?';
                      }}
                    />

                    {/* Indicateur de cycle (petits points en bas) */}
                    {isHovered && (
                      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-0.5 pointer-events-none">
                        {[1, 2, 3, 4].map(idx => (
                          <div 
                            key={idx} 
                            className={`w-1 h-1 rounded-full transition-colors ${
                              idx === currentImgIndex ? 'bg-blue-400' : 'bg-gray-600/30'
                            }`} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Overlay Nom au survol */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end p-2">
                      <span className="text-[8px] font-black text-white uppercase truncate w-full leading-tight">
                        {hold.name}
                      </span>
                    </div>

                    {/* Badge de sélection */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 p-0.5 bg-blue-500 rounded-full shadow-lg">
                        <ImageIcon size={8} className="text-white" />
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
