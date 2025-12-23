
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Box, Loader2, RotateCw, Scaling, Trash2, CheckCircle } from 'lucide-react';
import { HoldDefinition, PlacedHold } from '../types';

interface RouteEditorPanelProps {
  onBack: () => void;
  selectedHold: HoldDefinition | null;
  onSelectHold: (hold: HoldDefinition) => void;
  holdSettings: { scale: number; rotation: number; color: string };
  onUpdateSettings: (settings: any) => void;
  placedHolds: PlacedHold[];
  onRemoveHold: (id: string) => void;
  selectedPlacedHoldId: string | null;
  onUpdatePlacedHold: (id: string, updates: Partial<PlacedHold>) => void;
  onSelectPlacedHold: (id: string | null) => void;
  onDeselect: () => void;
}

const CATALOGUE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/catalogue.json';

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  onBack,
  selectedHold,
  onSelectHold,
  holdSettings,
  onUpdateSettings,
  placedHolds,
  onRemoveHold,
  selectedPlacedHoldId,
  onUpdatePlacedHold,
  onSelectPlacedHold,
  onDeselect
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
             const baseScale = index === 0 ? 0.02 : 0.001;
             return { id: rawId, name, filename, category: item.category || 'General', baseScale };
        }).filter(h => h.id) : [];
        setLibrary(holds);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger le catalogue");
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  const selectedPlacedHold = placedHolds.find(h => h.id === selectedPlacedHoldId);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden">
       <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0">
              <ArrowLeft size={20} />
          </button>
          <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-white truncate">Création de Voie</h1>
              <p className="text-xs text-gray-500 truncate">Étape 2: Pose de prises</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
        
        {selectedPlacedHold ? (
          <section className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2 text-sm font-medium text-blue-400 uppercase tracking-wider">
                  <CheckCircle size={14} />
                  <span>Édition Prise</span>
               </div>
               <div className="flex gap-2">
                 <button onClick={onDeselect} className="text-xs text-gray-500 hover:text-white underline">Annuler</button>
               </div>
             </div>
             
             <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-blue-500/30">
                <div>
                    <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                        {['#ff4400', '#fbbf24', '#22c55e', '#3b82f6', '#ef4444', '#f472b6', '#ffffff', '#000000'].map(c => (
                            <button
                                key={c}
                                className={`w-6 h-6 rounded-full border-2 ${selectedPlacedHold.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => onUpdatePlacedHold(selectedPlacedHold.id, { color: c })}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span className="flex items-center gap-1"><Scaling size={12}/> Taille</span>
                      <span className="text-white">x{selectedPlacedHold.scale[0].toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0.5" max="3" step="0.1"
                      value={selectedPlacedHold.scale[0]}
                      onChange={(e) => {
                        const s = parseFloat(e.target.value);
                        onUpdatePlacedHold(selectedPlacedHold.id, { scale: [s, s, s] });
                      }}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span>
                      <span className="text-white">
                        {Math.round(selectedPlacedHold.spin)}°
                      </span>
                    </div>
                    <input
                      type="range" min="0" max="360" step="15"
                      value={selectedPlacedHold.spin}
                      onChange={(e) => {
                        onUpdatePlacedHold(selectedPlacedHold.id, { spin: parseFloat(e.target.value) });
                      }}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                </div>

                <div className="pt-2">
                    <button 
                      onClick={() => onRemoveHold(selectedPlacedHold.id)}
                      className="w-full py-2 text-xs bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={12}/> Supprimer la prise
                    </button>
                </div>
             </div>
          </section>
        ) : (
          <>
            <section className="space-y-4">
                 <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    <Box size={14} />
                    <span>Nouvelle Prise</span>
                 </div>
                 
                 <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
                    <div>
                        <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
                        <div className="flex space-x-2">
                            {['#ff4400', '#fbbf24', '#22c55e', '#3b82f6', '#ef4444', '#f472b6', '#ffffff', '#000000'].map(c => (
                                <button key={c} className={`w-6 h-6 rounded-full border-2 ${holdSettings.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => onUpdateSettings({ color: c })} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-400">
                          <span className="flex items-center gap-1"><Scaling size={12}/> Taille</span>
                          <span className="text-white">x{holdSettings.scale.toFixed(1)}</span>
                        </div>
                        <input type="range" min="0.5" max="3" step="0.1" value={holdSettings.scale} onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-400">
                          <span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span>
                          <span className="text-white">{holdSettings.rotation}°</span>
                        </div>
                        <input type="range" min="0" max="360" step="15" value={holdSettings.rotation} onChange={(e) => onUpdateSettings({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                 </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider">
                    <span>Catalogue ({library.length})</span>
                </div>
                {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div> : error ? <div className="text-red-400 text-xs text-center">{error}</div> : (
                    <div className="grid grid-cols-2 gap-2">
                        {library.map((hold) => (
                            <button key={hold.id} onClick={() => onSelectHold(hold)} className={`relative rounded-lg bg-gray-800 border p-2 flex flex-col items-start transition-all ${selectedHold?.id === hold.id ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-700' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-750'}`}>
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-[11px] font-bold text-gray-100 truncate w-full text-left">{hold.name}</span>
                                </div>
                                <span className="text-[9px] text-gray-500 truncate w-full text-left mt-0.5">{hold.filename}</span>
                            </button>
                        ))}
                    </div>
                )}
            </section>
          </>
        )}

        <section className="pt-4 border-t border-gray-800">
             <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                <span>Prises posées ({placedHolds.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
                {placedHolds.slice().reverse().map((h, i) => (
                    <div key={h.id} className={`flex justify-between items-center text-xs p-2 rounded border cursor-pointer transition-colors ${selectedPlacedHoldId === h.id ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`} onClick={() => onSelectPlacedHold(h.id)}>
                        <span className="text-gray-300">Prise #{placedHolds.length - i}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); onRemoveHold(h.id); }} className="text-gray-500 hover:text-red-400"><Trash2 size={12}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </div>
    </div>
  );
};
