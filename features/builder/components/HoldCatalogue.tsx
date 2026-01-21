
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
  // Logic de prévisualisation flottante interne au catalogue
  const [hoveredHold, setHoveredHold] = useState<HoldDefinition | null>(null);
  const [previewIndex, setPreviewIndex] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!hoveredHold) {
      setPreviewIndex(1);
      return;
    }
    const interval = setInterval(() => {
      setPreviewIndex((prev) => (prev % 4) + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, [hoveredHold]);

  const getThumbnailUrl = (filename: string, index: number) => {
    const baseName = filename.replace(/\.[^/.]+$/, "");
    return `${BASE_URL}screenshot/${baseName}-${index}.png`;
  };

  const validLibrary = library.filter(h => h && h.id);

  return (
    <>
        {/* Prévisualisation Flottante (Portal-like logic, fixed position) */}
        {hoveredHold && expanded && (
         <div 
           className="fixed z-[300] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
           style={{ 
             top: Math.max(20, Math.min(mousePos.y - 100, window.innerHeight - 250)), 
             left: 330 
           }}
         >
           <div className="bg-gray-800 border-2 border-blue-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden w-48 transition-all duration-300">
              <div className="aspect-square bg-gray-950 relative flex items-center justify-center overflow-hidden">
                <img 
                  key={`${hoveredHold.id}-${previewIndex}`}
                  src={getThumbnailUrl(hoveredHold.filename, previewIndex)} 
                  alt={hoveredHold.name}
                  className="w-full h-full object-contain p-2 animate-in fade-in duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/111/444?text=Pas+d\'aperçu';
                  }}
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === previewIndex ? 'bg-blue-500' : 'bg-gray-600'}`} />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <p className="text-[10px] font-black text-white uppercase truncate">{hoveredHold.name}</p>
                </div>
              </div>
           </div>
         </div>
       )}

       {/* Composant Liste */}
       <section className="space-y-2">
            <button 
              onClick={onToggleExpand}
              className={`w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider p-3 rounded-lg transition-colors ${isReplacingMode ? 'bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/50' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <Box size={14} />
                <span>Catalogue ({validLibrary.length})</span>
                {isReplacingMode && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse ml-2">REMPLACEMENT</span>}
              </div>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {expanded && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                      {validLibrary.map((hold) => (
                          <button 
                            key={hold.id} 
                            onClick={() => onSelectHold(hold)} 
                            onMouseEnter={(e) => {
                              setHoveredHold(hold);
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => {
                              setHoveredHold(null);
                              setPreviewIndex(1);
                            }}
                            className={`relative group rounded-lg border p-2 flex flex-col items-start transition-all ${selectedHoldId === hold.id && !isReplacingMode ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-700' : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'}`}
                          >
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon size={12} className="text-blue-400" />
                              </div>
                              <span className="text-[11px] font-bold text-gray-100 truncate w-full text-left">{hold.name}</span>
                              <span className="text-[9px] text-gray-500 truncate w-full text-left mt-0.5">{hold.filename}</span>
                          </button>
                      ))}
                  </div>
                )}
              </div>
            )}
        </section>
    </>
  );
};
