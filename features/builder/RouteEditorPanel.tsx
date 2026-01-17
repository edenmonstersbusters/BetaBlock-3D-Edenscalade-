
import React, { useEffect, useState, useMemo } from 'react';
import { GitFork, Lock } from 'lucide-react';
import { HoldDefinition, PlacedHold, WallMetadata } from '../../types';
import { FileControls } from '../../components/ui/FileControls';
import { HoldCatalogue } from './components/HoldCatalogue';
import { HoldInspector } from './components/HoldInspector';
import { Hold3DPreview } from './components/Hold3DPreview';
import { HoldSettings } from './components/HoldSettings';
import { PlacedHoldsList } from './components/PlacedHoldsList';

interface RouteEditorPanelProps {
  selectedHold: HoldDefinition | null;
  onSelectHold: (hold: HoldDefinition) => void;
  metadata: WallMetadata;
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
  
  // Props Mesure Dynamique (Désormais intégrées dans HoldSettings)
  isDynamicMeasuring: boolean;
  onToggleDynamicMeasure: () => void;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
const CATALOGUE_URL = `${BASE_URL}catalogue.json`;

export const RouteEditorPanel: React.FC<RouteEditorPanelProps> = ({
  selectedHold, onSelectHold, metadata, holdSettings, onUpdateSettings, placedHolds, onRemoveHold, onRemoveMultiple, onRemoveAllHolds, onChangeAllHoldsColor, selectedPlacedHoldIds, onUpdatePlacedHold, onSelectPlacedHold, onDeselect, onActionStart, onReplaceHold, onExport, onImport, onNew,
  isDynamicMeasuring, onToggleDynamicMeasure
}) => {
  const [library, setLibrary] = useState<HoldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogueExpanded, setCatalogueExpanded] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  
  const isLocked = metadata.remixMode === 'structure';

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch(CATALOGUE_URL);
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

  // Logique de calcul de la cible de prévisualisation
  const previewTarget = useMemo(() => {
    if (selectedPlacedHoldIds.length === 1) {
        const h = placedHolds.find(ph => ph.id === selectedPlacedHoldIds[0]);
        if (h) return { 
            def: { id: h.modelId, name: 'Sélection', filename: h.filename, baseScale: h.modelBaseScale || 0.001, category: 'Placed' } as HoldDefinition, 
            settings: { scale: h.scale[0], rotation: h.spin, color: h.color || '#ff8800' }
        };
    }
    if (selectedHold && !anyHoldSelected) {
        return { def: selectedHold, settings: holdSettings };
    }
    return null;
  }, [selectedPlacedHoldIds, placedHolds, selectedHold, anyHoldSelected, holdSettings]);

  const handleCatalogueItemClick = (hold: HoldDefinition) => {
    if (isLocked) return;
    if (anyHoldSelected && isReplacingMode) {
      onReplaceHold(selectedPlacedHoldIds, hold);
      setIsReplacingMode(false);
    } else {
      onSelectHold(hold);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {metadata.parentId && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                    <GitFork size={12} /><span>REMIX {isLocked ? 'ARCHITECTE' : 'OUVREUR'}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-tight">Inspiré par <span className="text-white font-bold">{metadata.parentName}</span>.</p>
                {isLocked && <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded"><Lock size={10} /> PRISES VERROUILLÉES</div>}
            </div>
        )}

        {anyHoldSelected ? (
          <HoldInspector 
             selectedHolds={selectedHoldsObjects}
             onUpdate={(u) => { if(!isLocked) onUpdatePlacedHold(selectedPlacedHoldIds, u); }}
             onRemove={onRemoveMultiple}
             onDeselect={onDeselect}
             onToggleReplaceMode={() => { if(!isLocked) { setCatalogueExpanded(true); setIsReplacingMode(true); } }}
             isReplacingMode={isReplacingMode}
             onActionStart={onActionStart}
             isLocked={isLocked}
          />
        ) : (
          <HoldSettings 
            settings={holdSettings} 
            onUpdate={onUpdateSettings} 
            isDynamicMeasuring={isDynamicMeasuring}
            onToggleDynamicMeasure={onToggleDynamicMeasure}
            isLocked={isLocked}
          />
        )}

        {previewTarget && !isLocked && (
            <Hold3DPreview holdDef={previewTarget.def} settings={previewTarget.settings} />
        )}

        <div className={isLocked ? "opacity-50 pointer-events-none grayscale" : ""}>
            <HoldCatalogue 
               library={library} loading={loading} selectedHoldId={selectedHold?.id}
               onSelectHold={handleCatalogueItemClick} expanded={catalogueExpanded}
               onToggleExpand={() => { if(!isLocked) { setCatalogueExpanded(!catalogueExpanded); if(catalogueExpanded) setIsReplacingMode(false); } }}
               isReplacingMode={isReplacingMode}
            />
        </div>

        <PlacedHoldsList 
            holds={placedHolds} selectedIds={selectedPlacedHoldIds} 
            onSelect={onSelectPlacedHold} onRemove={onRemoveHold} 
            onRemoveAll={onRemoveAllHolds} onColorAll={onChangeAllHoldsColor}
            isLocked={isLocked}
        />

        <FileControls onExport={onExport} onImport={onImport} onNew={onNew} />
      </div>
    </div>
  );
};
