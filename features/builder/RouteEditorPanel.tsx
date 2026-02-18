
import React, { useEffect, useState, useMemo } from 'react';
import { Box, RotateCw, Scaling, GitFork } from 'lucide-react';
import { HoldDefinition, PlacedHold, WallMetadata } from '../../types';
import { ColorPalette } from '../../components/ui/ColorPalette';
import { HoldCatalogue } from './components/HoldCatalogue';
import { HoldInspector } from './components/HoldInspector';
import { PlacedHoldsList } from './components/PlacedHoldsList';
import { HoldPreview } from './components/HoldPreview';

interface RouteEditorPanelProps {
  onBack: () => void;
  selectedHold: HoldDefinition | null; onSelectHold: (hold: HoldDefinition) => void;
  metadata: WallMetadata;
  holdSettings: { scale: number; rotation: number; color: string }; onUpdateSettings: (settings: any) => void;
  placedHolds: PlacedHold[]; onRemoveHold: (id: string) => void;
  onRemoveMultiple: () => void; onRemoveAllHolds: () => void; onChangeAllHoldsColor: (color: string) => void;
  selectedPlacedHoldIds: string[]; onUpdatePlacedHold: (ids: string[], updates: Partial<PlacedHold>) => void;
  onSelectPlacedHold: (id: string | null, multi?: boolean) => void; onDeselect: () => void;
  onActionStart: () => void; onReplaceHold: (ids: string[], holdDef: HoldDefinition) => void;
  onExport: () => void; onImport: (file: File) => void; onNew: () => void; onHome: () => void;
}

const CATALOGUE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/catalogue.json';

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  onBack, selectedHold, onSelectHold, metadata, holdSettings, onUpdateSettings, placedHolds, onRemoveHold, onRemoveMultiple, onRemoveAllHolds, onChangeAllHoldsColor, selectedPlacedHoldIds, onUpdatePlacedHold, onSelectPlacedHold, onDeselect, onActionStart, onReplaceHold, onExport, onImport, onNew, onHome
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogueExpanded, setCatalogueExpanded] = useState(true);
  const [isReplacingMode, setIsReplacingMode] = useState(false);

  useEffect(() => {
    fetch(CATALOGUE_URL).then(r => r.json()).then(data => {
        setLibrary(Array.isArray(data) ? data
            .filter((item: any) => item && (item.id || item.name))
            .map((item: any, i: number) => ({
             id: String(item.id || item.name || crypto.randomUUID()),
             name: item.nom_affichage || item.name,
             filename: (item.nom_du_fichier || item.filename || '').endsWith('.glb') ? (item.nom_du_fichier || item.filename) : `${item.nom_du_fichier || item.filename}.glb`,
             category: item.category || 'General', baseScale: i === 0 ? 0.02 : 0.001
        })).filter(h => h.id && h.filename && h.filename !== '.glb') : []);
        setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  const anyHoldSelected = selectedPlacedHoldIds.length > 0;

  // Déterminer quelle prise afficher dans la prévisualisation 3D
  const previewHoldDef = useMemo(() => {
    if (anyHoldSelected) {
      // Si une prise est sélectionnée sur le mur, on cherche sa définition dans la bibliothèque
      const firstSelected = placedHolds.find(h => h && selectedPlacedHoldIds.includes(h.id));
      if (firstSelected) {
        return library.find(def => def.id === firstSelected.modelId) || null;
      }
    }
    // Sinon on affiche la prise sélectionnée dans le catalogue pour la pose
    return selectedHold;
  }, [anyHoldSelected, selectedPlacedHoldIds, placedHolds, library, selectedHold]);

  // Settings à utiliser pour la preview (ceux du mur si sélectionné, sinon ceux de pose)
  const previewSettings = useMemo(() => {
    if (anyHoldSelected) {
        const firstSelected = placedHolds.find(h => h && selectedPlacedHoldIds.includes(h.id));
        if (firstSelected) {
            return {
                scale: firstSelected.scale[0],
                rotation: firstSelected.spin,
                color: firstSelected.color || '#ff8800'
            };
        }
    }
    return holdSettings;
  }, [anyHoldSelected, selectedPlacedHoldIds, placedHolds, holdSettings]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-full relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {metadata.parentId && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1"><GitFork size={12} /><span>REMIX</span></div>
                <p className="text-[11px] text-gray-400 leading-tight">Inspiré par <span className="text-white font-bold">{metadata.parentName}</span>.</p>
            </div>
        )}

        {/* SECTION 1: INSPECTEUR OU PARAMÈTRES DE POSE */}
        {anyHoldSelected ? (
          <HoldInspector 
             selectedHolds={placedHolds.filter(h => h && selectedPlacedHoldIds.includes(h.id))}
             onUpdate={(u) => { onUpdatePlacedHold(selectedPlacedHoldIds, u); }}
             onRemove={onRemoveMultiple} onDeselect={onDeselect} isLocked={false}
             onToggleReplaceMode={() => { setCatalogueExpanded(true); setIsReplacingMode(true); }}
             isReplacingMode={isReplacingMode} onActionStart={onActionStart}
          />
        ) : (
          <section className="space-y-4">
               <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Box size={14} /><span>Paramètres de Pose</span></div>
               <div className="bg-gray-800 p-4 rounded-xl space-y-5 border border-gray-700">
                  <ColorPalette selectedColor={holdSettings.color} onSelect={(c) => onUpdateSettings({ color: c })} />
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille</span><span className="text-white font-mono">x{holdSettings.scale.toFixed(1)}</span></div>
                      <input type="range" min="0.1" max="3" step="0.1" value={holdSettings.scale} onChange={(e) => onUpdateSettings({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  </div>
                  <div>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span><span className="text-white font-mono">{holdSettings.rotation}°</span></div>
                      <input type="range" min="0" max="360" step="15" value={holdSettings.rotation} onChange={(e) => onUpdateSettings({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
               </div>
          </section>
        )}

        {/* SECTION 2: RENDU 3D TEMPS RÉEL (TOUJOURS ENTRE L'ÉDITION ET LE CATALOGUE) */}
        {previewHoldDef && (
           <HoldPreview hold={previewHoldDef} settings={previewSettings} />
        )}
        
        {/* SECTION 3: CATALOGUE */}
        <div>
            <HoldCatalogue 
               library={library} loading={loading} selectedHoldId={selectedHold?.id}
               onSelectHold={(h) => { 
                   if(anyHoldSelected && isReplacingMode) { 
                       // Mode Remplacement Actif : On remplace la prise
                       onReplaceHold(selectedPlacedHoldIds, h); 
                       setIsReplacingMode(false); 
                   } else if (anyHoldSelected && !isReplacingMode) {
                       // Mode Remplacement INACTIF : On sort de l'édition et on sélectionne la prise catalogue
                       onDeselect();
                       onSelectHold(h);
                   } else { 
                       // Comportement standard (pas de prise murale sélectionnée)
                       onSelectHold(h); 
                   } 
               }}
               expanded={catalogueExpanded} onToggleExpand={() => { setCatalogueExpanded(!catalogueExpanded); if(catalogueExpanded) setIsReplacingMode(false); }}
               isReplacingMode={isReplacingMode}
            />
        </div>

        {/* SECTION 4: LISTE DES PRISES POSÉES */}
        <PlacedHoldsList 
            holds={placedHolds} selectedIds={selectedPlacedHoldIds} onSelect={onSelectPlacedHold} 
            onRemove={onRemoveHold} isLocked={false} onRemoveAll={onRemoveAllHolds} 
            onGlobalColor={onChangeAllHoldsColor}
        />
      </div>
    </div>
  );
};
