
import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Core & Utils
import { Scene } from '../../core/Scene';
import { resolveHoldWorldData } from '../../utils/geometry';

// Hooks
import { useEditorState } from './hooks/useEditorState';
import { useEditorLogic } from './hooks/useEditorLogic';

// Feature Components
import { EditorPanel } from '../builder/EditorPanel';
import { RouteEditorPanel } from '../builder/RouteEditorPanel';
import { ViewerPanel } from '../viewer/ViewerPanel';

// UI Components
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { GlobalModal } from '../../components/ui/GlobalModal';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { AuthModal } from '../../components/auth/AuthModal';
import { Undo2, Redo2, Save, Globe, ArrowLeft, Edit2 } from 'lucide-react';

// Types
import { WallConfig, AppMode, PlacedHold, WallMetadata } from '../../types';

interface WallEditorProps {
  mode: AppMode;
  user: any;
  config: WallConfig;
  setConfig: React.Dispatch<React.SetStateAction<WallConfig>>;
  holds: PlacedHold[];
  setHolds: React.Dispatch<React.SetStateAction<PlacedHold[]>>;
  metadata: WallMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<WallMetadata>>;
  recordAction: (state: { config: WallConfig; holds: PlacedHold[] }) => void;
  undo: (current: any, apply: any) => void;
  redo: (current: any, apply: any) => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveCloud: () => Promise<boolean>; // Changé pour retourner un booléen
  isSavingCloud: boolean;
  generatedLink: string | null;
  onHome: () => void;
  onNewWall: () => void;
  onRemix?: (mode: 'structure' | 'holds') => void;
  onRemoveAllHolds?: () => void;
  onChangeAllHoldsColor?: (color: string) => void;
  isLoadingCloud: boolean;
  cloudId: string | null;
  screenshotRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
}

export const WallEditor: React.FC<WallEditorProps> = ({ 
  mode, user, 
  config, setConfig, holds, setHolds, metadata, setMetadata,
  recordAction, undo, redo, canUndo, canRedo,
  onSaveCloud, isSavingCloud, generatedLink,
  onHome, onNewWall, onRemix, onRemoveAllHolds, onChangeAllHoldsColor,
  isLoadingCloud, cloudId, screenshotRef
}) => {
  const navigate = useNavigate();

  // 1. Initialisation de l'état UI
  const state = useEditorState();

  // 2. Initialisation de la logique métier
  const logic = useEditorLogic({
    mode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
    undo, redo, recordAction,
    state,
    onHome, onNewWall
  });

  // 3. Wrapper pour la sauvegarde afin de gérer l'état isDirty et l'authentification
  const wrappedSaveCloud = async () => {
      if (!user) {
          state.setShowAuthModal(true);
          return false;
      }
      const success = await onSaveCloud();
      if (success) {
          state.setIsDirty(false);
      }
      return success;
  };

  // 4. Calculs de rendu
  const renderableHolds = useMemo(() => holds.map((h) => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter((h) => h !== null)
  , [holds, config]);

  const handleDownloadLocal = () => {
    const file = { version: "1.1", metadata, config, holds };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name || 'betablock-wall'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      if (state.contextMenu) state.setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('contextmenu', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, [state.contextMenu]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      <LoadingOverlay isVisible={isLoadingCloud} />
      
      {state.showAuthModal && <AuthModal onClose={() => state.setShowAuthModal(false)} onSuccess={() => state.setShowAuthModal(false)} />}
      
      {/* Top Bar */}
      {mode !== 'VIEW' && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-3 bg-gray-900 border-b border-white/5 z-[110] relative">
            <div className="flex items-center gap-4 justify-start">
                <button onClick={() => logic.handleAction('exit')} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors flex items-center gap-2">
                    <ArrowLeft size={16} />
                    <span className="font-black italic tracking-tighter text-blue-500 hidden sm:inline">BetaBlock</span>
                </button>
            </div>
            <div className="flex flex-col items-center justify-center min-w-0 px-4">
                {state.isEditingName ? (
                  <input 
                    autoFocus
                    className="bg-gray-800 text-white text-sm font-bold border-b border-blue-500 outline-none px-2 py-1 text-center"
                    value={metadata.name}
                    onChange={(e) => { 
                        setMetadata(prev => ({ ...prev, name: e.target.value }));
                        state.setIsDirty(true);
                    }}
                    onBlur={() => state.setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && state.setIsEditingName(false)}
                  />
                ) : (
                  <div 
                    className="relative flex items-center justify-center cursor-pointer group"
                    onClick={() => state.setIsEditingName(true)}
                  >
                    <h1 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-[400px] text-center" title={metadata.name}>
                        {metadata.name || "Nouveau mur"}
                    </h1>
                    <div className="absolute left-full flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Edit2 size={12} className="text-gray-500" />
                    </div>
                  </div>
                )}
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                    {mode === 'BUILD' ? 'Mode Structure' : 'Mode Ouverture'}
                    {state.isDirty && <span className="ml-2 text-blue-400 font-black">•</span>}
                </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
                <button onClick={() => logic.handleAction('save')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-700 hover:border-gray-600">
                    <Save size={14} /> <span className="hidden sm:inline">Sauvegarder</span>
                </button>
                <button onClick={() => logic.handleAction('publish')} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/20">
                    <Globe size={14} /> <span>PUBLIER</span>
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {mode === 'VIEW' ? (
            <ViewerPanel 
                wallId={cloudId || ''} metadata={metadata} config={config} holds={holds}
                onHome={() => logic.handleAction('exit')} 
                onRemix={onRemix || (() => {})} 
                onShare={() => logic.handleAction('share')}
                onEdit={() => navigate(`/builder?id=${cloudId}`)}
            />
        ) : mode === 'BUILD' ? (
            <EditorPanel 
                config={config} holds={holds} onUpdate={setConfig} metadata={metadata}
                onNext={() => navigate('/setter')} showModal={(c) => state.setModal(c)}
                onActionStart={logic.saveToHistory} onExport={() => logic.handleAction('save')}
                onImport={() => logic.globalFileInputRef.current?.click()} onNew={logic.handleNewWallRequest}
                onHome={() => logic.handleAction('exit')}
                onRemoveSegment={logic.removeSegmentAction}
            />
        ) : (
            <RouteEditorPanel 
                onBack={() => navigate('/builder')} 
                selectedHold={state.selectedHold} onSelectHold={state.setSelectedHold}
                metadata={metadata}
                holdSettings={state.holdSettings} onUpdateSettings={(s:any) => state.setHoldSettings(prev => ({ ...prev, ...s }))}
                placedHolds={holds} onRemoveHold={(id) => logic.removeHoldsAction([id], true)} 
                onRemoveAllHolds={onRemoveAllHolds || (() => {})} 
                onChangeAllHoldsColor={onChangeAllHoldsColor || (() => {})} 
                selectedPlacedHoldIds={state.selectedPlacedHoldIds}
                onUpdatePlacedHold={(ids, u) => { 
                    if (metadata.remixMode === 'structure') return;
                    const idSet = new Set(ids); setHolds(hds => hds.map(h => idSet.has(h.id) ? { ...h, ...u } : h)); 
                    state.setIsDirty(true);
                }}
                onSelectPlacedHold={state.handleSelectPlacedHold} 
                onDeselect={() => state.setSelectedPlacedHoldIds([])}
                onActionStart={logic.saveToHistory} 
                onReplaceHold={(ids, def) => { 
                    if (metadata.remixMode === 'structure') return;
                    logic.saveToHistory(); const idSet = new Set(ids); setHolds(prev => prev.map(h => idSet.has(h.id) ? { ...h, modelId: def.id, filename: def.filename } : h)); 
                }}
                onRemoveMultiple={() => logic.removeHoldsAction(state.selectedPlacedHoldIds, true)}
                onExport={() => logic.handleAction('save')}
                onImport={() => logic.globalFileInputRef.current?.click()} onNew={logic.handleNewWallRequest}
                onHome={() => logic.handleAction('exit')}
                isMeasuring={state.isMeasuring}
                onToggleMeasure={() => {
                     state.setSelectedPlacedHoldIds([]);
                     state.setIsMeasuring(prev => !prev);
                }}
                isDynamicMeasuring={state.isDynamicMeasuring}
                onToggleDynamicMeasure={() => {
                    state.setIsDynamicMeasuring(prev => !prev);
                    state.setReferenceHoldId(null);
                }}
                referenceHoldId={state.referenceHoldId}
            />
        )}

        <div className="flex-1 relative h-full">
            {mode !== 'VIEW' && (
                <div className="fixed bottom-6 right-6 z-[100] flex gap-2 p-1 bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
                    <button disabled={!canUndo} onClick={logic.performUndo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Undo2 size={20} /></button>
                    <button disabled={!canRedo} onClick={logic.performRedo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Redo2 size={20} /></button>
                </div>
            )}

            <Scene 
                config={config} mode={mode} holds={renderableHolds as any} 
                onPlaceHold={logic.handlePlaceHold} 
                selectedHoldDef={state.selectedHold} holdSettings={state.holdSettings} 
                selectedPlacedHoldIds={state.selectedPlacedHoldIds}
                onSelectPlacedHold={state.handleSelectPlacedHold}
                onContextMenu={(type, id, x, y, wx, wy) => state.setContextMenu({ type, id, x, y, wallX: wx, wallY: wy })}
                onHoldDrag={(id, x, y, segId) => {
                    if (metadata.remixMode === 'structure') return;
                    setHolds(prev => prev.map(h => h.id === id ? { ...h, x, y, segmentId: segId } : h))
                    state.setIsDirty(true);
                }}
                onHoldDragEnd={logic.saveToHistory} screenshotRef={screenshotRef}
                isDynamicMeasuring={state.isDynamicMeasuring}
                referenceHoldId={state.referenceHoldId}
                setReferenceHoldId={state.setReferenceHoldId}
            />
        </div>
      </div>

      <ContextMenu 
        data={state.contextMenu} onClose={() => state.setContextMenu(null)} onUpdateData={state.setContextMenu}
        onCopyHold={() => { 
            if (state.selectedPlacedHoldIds.length > 0) {
                const toCopy = holds.filter(h => state.selectedPlacedHoldIds.includes(h.id));
                state.setClipboard(JSON.parse(JSON.stringify(toCopy))); 
            }
        }} 
        hasClipboard={state.clipboard.length > 0}
        onPasteHold={(target) => {
             // standard paste handled by logic shortcuts
        }} 
        onDelete={(id, type) => { 
            if (type === 'HOLD') {
              logic.removeHoldsAction([id], true); 
            } else {
              logic.removeSegmentAction(id);
            }
        }}
        onRotateHold={(id, delta) => { 
            if (metadata.remixMode === 'structure') return;
            logic.saveToHistory(); setHolds(hds => hds.map(h => id === h.id ? { ...h, spin: h.spin + delta } : h)); 
        }}
        // Fix: Remove duplicate onColorHold attribute
        onColorHold={(id, c) => { 
            if (metadata.remixMode === 'structure') return;
            logic.saveToHistory(); setHolds(hds => hds.map(h => id === h.id ? { ...h, color: c } : h)); 
        }}
        onSegmentUpdate={logic.updateSegmentQuickly}
      />

      <GlobalModal 
        config={state.modal} onClose={() => state.setModal(null)} 
        isSavingCloud={isSavingCloud} generatedLink={generatedLink || `${window.location.origin}/#/view/${cloudId}`} 
        onSaveCloud={wrappedSaveCloud} 
        onDownload={handleDownloadLocal}
        wallName={metadata.name}
        onWallNameChange={(name) => {
            setMetadata(prev => ({ ...prev, name }));
            state.setIsDirty(true);
        }}
      />
    </div>
  );
};
