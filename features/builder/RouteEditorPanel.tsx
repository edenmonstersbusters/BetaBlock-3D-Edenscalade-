import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Html } from '@react-three/drei';
import { ArrowLeft, Box, Loader2, RotateCw, Scaling, Trash2, Eye, Home, Palette, X } from 'lucide-react';
import { HoldDefinition, PlacedHold } from '../../types';
import '../../types';
import { HoldModel } from '../../core/HoldModel';
import { FileControls } from '../../components/ui/FileControls';
import { ColorPalette } from '../../components/ui/ColorPalette';
import { HoldCatalogue } from './components/HoldCatalogue';
import { HoldInspector } from './components/HoldInspector';

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
  onExport: () => void;
  onImport: (file: File) => void;
  onNew: () => void;
  onHome: () => void;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
const CATALOGUE_URL = `${BASE_URL}catalogue.json`;

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  onBack, selectedHold, onSelectHold, holdSettings, onUpdateSettings, placedHolds, onRemoveHold, onRemoveMultiple, onRemoveAllHolds, onChangeAllHoldsColor, selectedPlacedHoldIds, onUpdatePlacedHold, onSelectPlacedHold, onDeselect, onActionStart, onReplaceHold, onExport, onImport, onNew, onHome
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogueExpanded, setCatalogueExpanded] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  const [isPickingAllColor, setIsPickingAllColor] = useState(false);
  
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch(CATALOGUE_URL);
        if (!response.ok) throw new Error(`Failed`);
        const data = await response.json();
        const holds = Array.isArray(data) ? data.map((item: any, index: number) => {
             const rawId = item.id !== undefined ? String(item.id) : String(item.name || crypto.randomUUID());
             const name = item.nom_affichage || item.name || String(rawId);
             let filename = item.nom_du_fichier || item.filename || name;
             if (typeof filename === 'string' && !filename.toLowerCase().endsWith('.glb')) filename = `${filename}.glb`;
             return { id: rawId, name, filename, category: item.category || 'General', baseScale: index === 0 ? 0.02 : 0.001 };
        }).filter(h => h.id) : [];
        setLibrary(holds);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchLibrary();
  }, []);

  const anyHoldSelected = selectedPlacedHoldIds.length > 0;
  const selectedHoldsObjects = placedHolds.filter(h => selectedPlacedHoldIds.includes(h.id));

  const handleCatalogueItemClick = (hold: HoldDefinition) => {
    if (anyHoldSelected && isReplacingMode) {
      onReplaceHold(selectedPlacedHoldIds, hold);
      setIsReplacingMode(false);
    } else {
      onSelectHold(hold);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-[60] overflow-hidden relative">
       
       <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button onClick={onHome} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors" title="Retour à la Galerie">
             <Home size={20} />
          </button>
          <div className="h-6 w-px bg-gray-800" />
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0" title="Retour Configuration"><ArrowLeft size={20} /></button>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white truncate">Création de Voie</h1>
            <p className="text-xs text-gray-500 truncate">Étape 2: Pose de prises</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {anyHoldSelected ? (
          <HoldInspector 
             selectedHolds={selectedHoldsObjects}
             onUpdate={(u) => onUpdatePlacedHold(selectedPlacedHoldIds, u)}
             onRemove={onRemoveMultiple}
             onDeselect={onDeselect}
             onToggleReplaceMode={() => { setCatalogueExpanded(true); setIsReplacingMode(true); }}
             isReplacingMode={isReplacingMode}
             onActionStart={onActionStart}
          />
        ) : (
          <section className="space-y-4">
               <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Box size={14} /><span>Paramètres de Pose</span></div>
               <div className="bg-gray-800 p-4 rounded-xl space-y-5 border border-gray-700">
                  <ColorPalette 
                      selectedColor={holdSettings.color} 
                      onSelect={(c) => onUpdateSettings({ color: c })} 
                  />
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille par défaut</span><span className="text-white font-mono">x{holdSettings.scale.toFixed(1)}</span></div>
                      <input type="range" min="0.1" max="3" step="0.1" value={holdSettings.scale} onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation par défaut</span><span className="text-white font-mono">{holdSettings.rotation}°</span></div>
                      <input type="range" min="0" max="360" step="15" value={holdSettings.rotation} onChange={(e) => onUpdateSettings({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
               </div>
          </section>
        )}

        {/* PRÉVISUALISATION ACTIVE : 3D TEMPS RÉEL (Si pas de sélection active) */}
        {!anyHoldSelected && selectedHold && (
          <section className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest px-1">
              <Eye size={12} />
              <span>Rendu 3D Temps Réel</span>
            </div>
            <div className="bg-gray-950/50 rounded-2xl border-2 border-blue-500/20 relative overflow-hidden h-56 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute inset-0">
                  <Canvas camera={{ position: [0, 0, 0.4], fov: 45 }}>
                      <ambientLight intensity={0.6} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                      <pointLight position={[-10, -10, -10]} intensity={0.5} />
                      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
                      <Suspense fallback={<Html center><Loader2 className="animate-spin text-blue-500" size={32} /></Html>}>
                          <Center>
                              <HoldModel 
                                modelFilename={selectedHold.filename} 
                                baseScale={selectedHold.baseScale} 
                                rotation={[0, 0, (holdSettings.rotation * Math.PI) / 180]} 
                                scale={[holdSettings.scale, holdSettings.scale, holdSettings.scale]} 
                                color={holdSettings.color} 
                                preview={true} 
                              />
                          </Center>
                      </Suspense>
                      <OrbitControls makeDefault enableZoom={false} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI} />
                  </Canvas>
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
                 <span className="text-[11px] font-black text-white uppercase tracking-tighter bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30 backdrop-blur-md shadow-lg">{selectedHold.name}</span>
              </div>
            </div>
          </section>
        )}

        <HoldCatalogue 
           library={library} 
           loading={loading}
           selectedHoldId={selectedHold?.id}
           onSelectHold={handleCatalogueItemClick}
           expanded={catalogueExpanded}
           onToggleExpand={() => { setCatalogueExpanded(!catalogueExpanded); if(catalogueExpanded) setIsReplacingMode(false); }}
           isReplacingMode={isReplacingMode}
        />

        {!anyHoldSelected && (
          <section className="pt-4 border-t border-gray-800">
               <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"><span>Prises posées ({placedHolds.length})</span></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                  {placedHolds.slice().reverse().map((h, i) => (
                      <div key={h.id} className={`flex justify-between items-center text-xs p-2 rounded-lg border cursor-pointer transition-colors ${selectedPlacedHoldIds.includes(h.id) ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`} onClick={(e) => onSelectPlacedHold(h.id, e.ctrlKey || e.metaKey)}>
                          <span className="text-gray-300 font-bold">Prise #{placedHolds.length - i}</span>
                          <button onClick={(e) => { e.stopPropagation(); onRemoveHold(h.id); }} className="text-gray-500 hover:text-red-400"><Trash2 size={12}/></button>
                      </div>
                  ))}
              </div>
              {placedHolds.length > 0 && (
                <div className="space-y-2 mt-4">
                  {isPickingAllColor ? (
                    <div className="bg-gray-800 p-4 rounded-xl border-2 border-blue-500 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">COULEUR GLOBALE</span>
                        <button onClick={() => setIsPickingAllColor(false)} className="text-gray-500 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16}/></button>
                      </div>
                      <ColorPalette onSelect={(c) => { onChangeAllHoldsColor(c); setIsPickingAllColor(false); }} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsPickingAllColor(true)}
                      className="w-full py-2 px-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                    >
                      <Palette size={14} />
                      <span>Couleur globale</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={onRemoveAllHolds}
                    className="w-full py-2 px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                  >
                    <Trash2 size={14} />
                    <span>Vider le mur</span>
                  </button>
                </div>
              )}
          </section>
        )}

        <FileControls onExport={onExport} onImport={onImport} onNew={onNew} />
      </div>
    </div>
  );
};