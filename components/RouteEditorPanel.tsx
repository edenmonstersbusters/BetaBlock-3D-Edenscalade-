
import React, { useEffect, useState } from 'react';
// Added Info to the imports from lucide-react
import { ArrowLeft, Box, Loader2, RotateCw, Scaling, Trash2, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Palette, X, Layers, Info } from 'lucide-react';
import { HoldDefinition, PlacedHold } from '../types';

interface RouteEditorPanelProps {
  onBack: () => void;
  selectedHold: HoldDefinition | null;
  onSelectHold: (hold: HoldDefinition) => void;
  holdSettings: { scale: number; rotation: number; color: string };
  onUpdateSettings: (settings: any) => void;
  placedHolds: PlacedHold[];
  onRemoveHold: (id: string) => void;
  onRemoveMultiple: () => void;
  onRemoveAllHolds: () => void;
  onChangeAllHoldsColor: (color: string) => void;
  selectedPlacedHoldIds: string[];
  onUpdatePlacedHold: (ids: string[], updates: Partial<PlacedHold>) => void;
  onSelectPlacedHold: (id: string | null, multi?: boolean) => void;
  onDeselect: () => void;
  onActionStart: () => void;
  onReplaceHold: (ids: string[], holdDef: HoldDefinition) => void;
}

const CATALOGUE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/catalogue.json';

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  onBack, selectedHold, onSelectHold, holdSettings, onUpdateSettings, placedHolds, onRemoveHold, onRemoveMultiple, onRemoveAllHolds, onChangeAllHoldsColor, selectedPlacedHoldIds, onUpdatePlacedHold, onSelectPlacedHold, onDeselect, onActionStart, onReplaceHold
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogueExpanded, setCatalogueExpanded] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  const [isPickingAllColor, setIsPickingAllColor] = useState(false);

  const palette = ['#ff8800', '#fbbf24', '#22c55e', '#3b82f6', '#9f0000', '#f472b6', '#ffffff', '#000000'];

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch(CATALOGUE_URL);
        if (!response.ok) throw new Error(`Failed to fetch library: ${response.statusText}`);
        const data = await response.json();
        const holds = Array.isArray(data) ? data.map((item: any, index: number) => {
             const rawId = item.id !== undefined ? String(item.id) : String(item.name || crypto.randomUUID());
             const name = item.nom_affichage || item.name || String(rawId);
             let filename = item.nom_du_fichier || item.filename || name;
             if (typeof filename === 'string' && !filename.toLowerCase().endsWith('.glb')) filename = `${filename}.glb`;
             return { id: rawId, name, filename, category: item.category || 'General', baseScale: index === 0 ? 0.02 : 0.001 };
        }).filter(h => h.id) : [];
        setLibrary(holds);
      } catch (err) { setError("Impossible de charger le catalogue"); } finally { setLoading(false); }
    };
    fetchLibrary();
  }, []);

  const isMultiSelection = selectedPlacedHoldIds.length > 1;
  const anyHoldSelected = selectedPlacedHoldIds.length > 0;
  
  // Utilise les valeurs du premier élément sélectionné pour les contrôles de groupe
  const firstSelectedHold = placedHolds.find(h => h.id === selectedPlacedHoldIds[0]);

  const handleCatalogueItemClick = (hold: HoldDefinition) => {
    if (anyHoldSelected && isReplacingMode) {
      onReplaceHold(selectedPlacedHoldIds, hold);
      setIsReplacingMode(false);
    } else {
      onSelectHold(hold);
    }
  };

  const handleAllColorPick = (color: string) => {
    onChangeAllHoldsColor(color);
    setIsPickingAllColor(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden">
       <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0"><ArrowLeft size={20} /></button>
          <div className="overflow-hidden"><h1 className="text-lg font-bold text-white truncate">Création de Voie</h1><p className="text-xs text-gray-500 truncate">Étape 2: Pose de prises</p></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {anyHoldSelected ? (
          <section className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2 text-sm font-medium text-blue-400 uppercase tracking-wider">
                 {isMultiSelection ? <Layers size={14} /> : <CheckCircle size={14} />}
                 <span>{isMultiSelection ? `Groupe (${selectedPlacedHoldIds.length})` : 'Édition Prise'}</span>
               </div>
               <button onClick={onDeselect} className="text-xs text-gray-500 hover:text-white underline">Fermer</button>
             </div>
             <div className={`bg-gray-800 p-4 rounded-lg space-y-4 border ${isMultiSelection ? 'border-emerald-500/30 bg-emerald-950/5' : 'border-blue-500/30'}`}>
                <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        setCatalogueExpanded(true);
                        setIsReplacingMode(true);
                      }}
                      className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all border ${isReplacingMode ? 'bg-orange-600 border-orange-500 text-white animate-pulse' : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-600/50'}`}
                    >
                      <RefreshCw size={16} className={isReplacingMode ? 'animate-spin' : ''} />
                      <span>{isReplacingMode ? 'Sélectionnez une prise...' : isMultiSelection ? 'Changer le type du groupe' : 'Changer le type'}</span>
                    </button>
                    {isReplacingMode && (
                      <p className="text-[10px] text-orange-400 text-center italic">Cliquez sur une prise du catalogue ci-dessous</p>
                    )}
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                        {palette.map(c => (
                            <button key={c} className={`w-6 h-6 rounded-full border-2 ${firstSelectedHold?.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => { onActionStart(); onUpdatePlacedHold(selectedPlacedHoldIds, { color: c }); }} />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille</span><span className="text-white">x{firstSelectedHold?.scale[0].toFixed(1)}</span></div>
                    <input type="range" min="0.5" max="3" step="0.1" value={firstSelectedHold?.scale[0] || 1} 
                      onPointerDown={onActionStart}
                      onChange={(e) => { const s = parseFloat(e.target.value); onUpdatePlacedHold(selectedPlacedHoldIds, { scale: [s, s, s] }); }}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span><span className="text-white">{Math.round(firstSelectedHold?.spin || 0)}°</span></div>
                    <input type="range" min="0" max="360" step="15" value={firstSelectedHold?.spin || 0} 
                      onPointerDown={onActionStart}
                      onChange={(e) => onUpdatePlacedHold(selectedPlacedHoldIds, { spin: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
                <div className="pt-2">
                    <button onClick={onRemoveMultiple} className="w-full py-2 text-xs bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"><Trash2 size={12}/> {isMultiSelection ? 'Supprimer la sélection' : 'Supprimer la prise'}</button>
                </div>
             </div>
          </section>
        ) : (
          <section className="space-y-4">
               <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Box size={14} /><span>Nouvelle Prise</span></div>
               <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
                  <div>
                      <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
                      <div className="flex space-x-2">
                          {palette.map(c => (
                              <button key={c} className={`w-6 h-6 rounded-full border-2 ${holdSettings.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => onUpdateSettings({ color: c })} />
                          ))}
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille</span><span className="text-white">x{holdSettings.scale.toFixed(1)}</span></div>
                      <input type="range" min="0.5" max="3" step="0.1" value={holdSettings.scale} onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span><span className="text-white">{holdSettings.rotation}°</span></div>
                      <input type="range" min="0" max="360" step="15" value={holdSettings.rotation} onChange={(e) => onUpdateSettings({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
               </div>
               <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                 <p className="text-[10px] text-blue-300 leading-tight flex items-start gap-2">
                   <Info size={12} className="flex-shrink-0 mt-0.5" />
                   Astuce : Maintenez Ctrl ou Cmd pour sélectionner plusieurs prises sur le mur.
                 </p>
               </div>
          </section>
        )}

        <section className="space-y-2">
            <button 
              onClick={() => {
                setCatalogueExpanded(!catalogueExpanded);
                if (catalogueExpanded) setIsReplacingMode(false);
              }}
              className={`w-full flex items-center justify-between text-sm font-medium uppercase tracking-wider p-2 rounded-lg transition-colors ${isReplacingMode ? 'bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/50' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <Box size={14} />
                <span>Catalogue ({library.length})</span>
                {isReplacingMode && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse ml-2">REMPLACEMENT</span>}
              </div>
              {catalogueExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {catalogueExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                      {library.map((hold) => (
                          <button 
                            key={hold.id} 
                            onClick={() => handleCatalogueItemClick(hold)} 
                            className={`relative rounded-lg border p-2 flex flex-col items-start transition-all ${selectedHold?.id === hold.id && !anyHoldSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-700' : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'}`}
                          >
                              <span className="text-[11px] font-bold text-gray-100 truncate w-full text-left">{hold.name}</span>
                              <span className="text-[9px] text-gray-500 truncate w-full text-left mt-0.5">{hold.filename}</span>
                          </button>
                      ))}
                  </div>
                )}
              </div>
            )}
        </section>

        {!anyHoldSelected && (
          <section className="pt-4 border-t border-gray-800">
               <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"><span>Prises posées ({placedHolds.length})</span></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                  {placedHolds.slice().reverse().map((h, i) => (
                      <div key={h.id} className={`flex justify-between items-center text-xs p-2 rounded border cursor-pointer transition-colors ${selectedPlacedHoldIds.includes(h.id) ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`} onClick={(e) => onSelectPlacedHold(h.id, e.ctrlKey || e.metaKey)}>
                          <span className="text-gray-300">Prise #{placedHolds.length - i}</span>
                          <button onClick={(e) => { e.stopPropagation(); onRemoveHold(h.id); }} className="text-gray-500 hover:text-red-400"><Trash2 size={12}/></button>
                      </div>
                  ))}
              </div>
              {placedHolds.length > 0 && (
                <div className="space-y-2 mt-4">
                  {isPickingAllColor ? (
                    <div className="bg-gray-800 p-3 rounded-xl border border-blue-500/50 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Choisir la couleur</span>
                        <button onClick={() => setIsPickingAllColor(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {palette.map(c => (
                          <button key={c} className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: c }} onClick={() => handleAllColorPick(c)} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsPickingAllColor(true)}
                      className="w-full py-2 px-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                    >
                      <Palette size={14} />
                      <span>Changer la couleur de toutes les prises</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={onRemoveAllHolds}
                    className="w-full py-2 px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                  >
                    <Trash2 size={14} />
                    <span>Supprimer toutes les prises</span>
                  </button>
                </div>
              )}
          </section>
        )}
      </div>
    </div>
  );
};
