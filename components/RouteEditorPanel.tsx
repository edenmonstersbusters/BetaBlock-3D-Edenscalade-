import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Html } from '@react-three/drei';
import { ArrowLeft, Box, Loader2, RotateCw, Scaling, Trash2, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Palette, X, Layers, Image as ImageIcon, Eye } from 'lucide-react';
import { HoldDefinition, PlacedHold } from '../types';
// Import types side-effect to ensure global JSX extensions for Three.js elements are active in this file
import '../types';
import { HoldModel } from './HoldModel';

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
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
const CATALOGUE_URL = `${BASE_URL}catalogue.json`;

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  onBack, selectedHold, onSelectHold, holdSettings, onUpdateSettings, placedHolds, onRemoveHold, onRemoveMultiple, onRemoveAllHolds, onChangeAllHoldsColor, selectedPlacedHoldIds, onUpdatePlacedHold, onSelectPlacedHold, onDeselect, onActionStart, onReplaceHold, onExport, onImport
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogueExpanded, setCatalogueExpanded] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  const [isPickingAllColor, setIsPickingAllColor] = useState(false);
  
  // États pour la prévisualisation au survol (Catalogue)
  const [hoveredHold, setHoveredHold] = useState<HoldDefinition | null>(null);
  const [previewIndex, setPreviewIndex] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Effet pour l'animation cyclique des screenshots (1-4) au survol dans le catalogue uniquement
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

  // Palette Industrielle
  const palette = [
    '#990000', '#004400', '#002266', '#aa4400', '#ccaa00',
    '#440066', '#882244', '#444444', '#f8f8f8', '#111111'
  ];

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

  const getThumbnailUrl = (filename: string, index: number) => {
    const baseName = filename.replace(/\.[^/.]+$/, "");
    return `${BASE_URL}screenshot/${baseName}-${index}.png`;
  };

  const ColorButton: React.FC<{ color: string; isActive: boolean; onClick: () => void }> = ({ color, isActive, onClick }) => (
    <button 
        className={`relative w-11 h-11 rounded-full border-2 border-white/40 shadow-xl transition-all duration-300 transform active:scale-90 ${
            isActive 
            ? 'scale-110 ring-4 ring-blue-500/50 ring-offset-2 ring-offset-gray-900 z-10 border-white' 
            : 'hover:scale-110 hover:border-white/80 opacity-90 hover:opacity-100'
        }`} 
        style={{ 
            backgroundColor: color,
            boxShadow: isActive ? `0 0 15px ${color}88, 0 4px 6px -1px rgb(0 0 0 / 0.1)` : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }} 
        onClick={onClick}
    >
        {isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
            </div>
        )}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-[60] overflow-hidden relative">
       
       {/* Prévisualisation flottante au survol (Catalogue) */}
       {hoveredHold && (
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

       <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0"><ArrowLeft size={20} /></button>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white truncate">Création de Voie</h1>
            <p className="text-xs text-gray-500 truncate">Étape 2: Pose de prises</p>
          </div>
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
             <div className={`bg-gray-800 p-4 rounded-xl space-y-5 border ${isMultiSelection ? 'border-emerald-500/30 bg-emerald-950/5' : 'border-blue-500/30'}`}>
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
                </div>

                <div>
                    <label className="text-[10px] text-gray-400 mb-4 block font-black uppercase tracking-[0.2em]">COULEUR</label>
                    <div className="grid grid-cols-5 gap-4">
                        {palette.map(c => (
                            <ColorButton 
                                key={c} 
                                color={c} 
                                isActive={firstSelectedHold?.color === c} 
                                onClick={() => { onActionStart(); onUpdatePlacedHold(selectedPlacedHoldIds, { color: c }); }} 
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille</span><span className="text-white font-mono">x{firstSelectedHold?.scale[0].toFixed(1)}</span></div>
                    <input type="range" min="0.5" max="3" step="0.1" value={firstSelectedHold?.scale[0] || 1} 
                      onPointerDown={onActionStart}
                      onChange={(e) => { const s = parseFloat(e.target.value); onUpdatePlacedHold(selectedPlacedHoldIds, { scale: [s, s, s] }); }}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span><span className="text-white font-mono">{Math.round(firstSelectedHold?.spin || 0)}°</span></div>
                    <input type="range" min="0" max="360" step="15" value={firstSelectedHold?.spin || 0} 
                      onPointerDown={onActionStart}
                      onChange={(e) => onUpdatePlacedHold(selectedPlacedHoldIds, { spin: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
                <div className="pt-2">
                    <button onClick={onRemoveMultiple} className="w-full py-2 text-xs bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 font-bold"><Trash2 size={12}/> {isMultiSelection ? 'Supprimer la sélection' : 'Supprimer la prise'}</button>
                </div>
             </div>
          </section>
        ) : (
          <section className="space-y-4">
               <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Box size={14} /><span>Paramètres de Pose</span></div>
               <div className="bg-gray-800 p-4 rounded-xl space-y-5 border border-gray-700">
                  <div>
                      <label className="text-[10px] text-gray-400 mb-4 block font-black uppercase tracking-[0.2em]">COULEUR</label>
                      <div className="grid grid-cols-5 gap-4">
                          {palette.map(c => (
                              <ColorButton 
                                key={c} 
                                color={c} 
                                isActive={holdSettings.color === c} 
                                onClick={() => { onUpdateSettings({ color: c }); }} 
                              />
                          ))}
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille par défaut</span><span className="text-white font-mono">x{holdSettings.scale.toFixed(1)}</span></div>
                      <input type="range" min="0.5" max="3" step="0.1" value={holdSettings.scale} onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation par défaut</span><span className="text-white font-mono">{holdSettings.rotation}°</span></div>
                      <input type="range" min="0" max="360" step="15" value={holdSettings.rotation} onChange={(e) => onUpdateSettings({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
               </div>
          </section>
        )}

        {/* PRÉVISUALISATION ACTIVE : 3D TEMPS RÉEL */}
        {!anyHoldSelected && selectedHold && (
          <section className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest px-1">
              <Eye size={12} />
              <span>Rendu 3D Temps Réel</span>
            </div>
            <div className="bg-gray-950/50 rounded-2xl border-2 border-blue-500/20 relative overflow-hidden h-56 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              {/* Overlay décoratif de fond */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
              
              <div className="absolute inset-0">
                  <Canvas camera={{ position: [0, 0, 0.4], fov: 45 }}>
                      <ambientLight intensity={0.6} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                      <pointLight position={[-10, -10, -10]} intensity={0.5} />
                      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
                      
                      <Suspense fallback={
                        <Html center>
                          <div className="flex items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                          </div>
                        </Html>
                      }>
                          <Center>
                              <HoldModel 
                                  modelFilename={selectedHold.filename}
                                  baseScale={selectedHold.baseScale}
                                  rotation={[0, 0, (holdSettings.rotation * Math.PI) / 180]}
                                  scale={[1, 1, 1]} 
                                  color={holdSettings.color}
                                  preview={true}
                              />
                          </Center>
                      </Suspense>
                      <OrbitControls makeDefault enableZoom={false} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI} />
                  </Canvas>
              </div>

              <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
                 <span className="text-[11px] font-black text-white uppercase tracking-tighter bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30 backdrop-blur-md shadow-lg">
                   {selectedHold.name}
                 </span>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-2">
            <button 
              onClick={() => {
                setCatalogueExpanded(!catalogueExpanded);
                if (catalogueExpanded) setIsReplacingMode(false);
              }}
              className={`w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider p-3 rounded-lg transition-colors ${isReplacingMode ? 'bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/50' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
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
                            onMouseEnter={(e) => {
                              setHoveredHold(hold);
                              setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => {
                              setHoveredHold(null);
                              setPreviewIndex(1);
                            }}
                            className={`relative group rounded-lg border p-2 flex flex-col items-start transition-all ${selectedHold?.id === hold.id && !anyHoldSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-700' : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'}`}
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
                      <div className="grid grid-cols-5 gap-4">
                        {palette.map(c => (
                          <ColorButton key={c} color={c} isActive={false} onClick={() => { handleAllColorPick(c); }} />
                        ))}
                      </div>
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
      </div>
    </div>
  );
};