
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scene } from '../../core/Scene';
import { resolveHoldWorldData } from '../../utils/geometry';
import { useEditorState } from './hooks/useEditorState';
import { useEditorLogic } from './hooks/useEditorLogic';
import { useAutoSave } from '../../hooks/useAutoSave';
import { EditorPanel } from '../builder/EditorPanel';
import { RouteEditorPanel } from '../builder/RouteEditorPanel';
import { ViewerPanel } from '../viewer/ViewerPanel';
import { EditorTopBar } from './components/EditorTopBar';
import { SidebarTabs } from './components/SidebarTabs';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { GlobalModal } from '../../components/ui/GlobalModal';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { AuthModal } from '../../components/auth/AuthModal';
import { Undo2, Redo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { WallConfig, AppMode, PlacedHold, WallMetadata } from '../../types';
import { SEO } from '../../components/SEO';
import { api } from '../../core/api';

interface WallEditorProps {
  mode: AppMode; user: any;
  config: WallConfig; setConfig: React.Dispatch<React.SetStateAction<WallConfig>>;
  holds: PlacedHold[]; setHolds: React.Dispatch<React.SetStateAction<PlacedHold[]>>;
  metadata: WallMetadata; setMetadata: React.Dispatch<React.SetStateAction<WallMetadata>>;
  recordAction: (state: { config: WallConfig; holds: PlacedHold[] }) => void;
  undo: (current: any, apply: any) => void; redo: (current: any, apply: any) => void; canUndo: boolean; canRedo: boolean;
  onSaveCloud: () => Promise<boolean>; isSavingCloud: boolean; generatedLink: string | null;
  onHome: () => void; onNewWall: () => void; onRemix?: () => void;
  onRemoveAllHolds?: () => void; onChangeAllHoldsColor?: (color: string) => void;
  isLoadingCloud: boolean; cloudId: string | null; screenshotRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
}

export const WallEditor: React.FC<WallEditorProps> = ({ 
  mode: initialMode, user, config, setConfig, holds, setHolds, metadata, setMetadata,
  recordAction, undo, redo, canUndo, canRedo, onSaveCloud, isSavingCloud, generatedLink,
  onHome, onNewWall, onRemix, onRemoveAllHolds, onChangeAllHoldsColor, isLoadingCloud, cloudId, screenshotRef
}) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'structure' | 'holds'>(initialMode === 'SET' ? 'holds' : 'structure');
  
  const derivedMode: AppMode = initialMode === 'VIEW' ? 'VIEW' : (activeTab === 'structure' ? 'BUILD' : 'SET');

  const cursorPosRef = useRef<{ x: number, y: number, segmentId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const state = useEditorState();
  
  const logic = useEditorLogic({
    mode: derivedMode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
    undo, redo, recordAction, state, onHome, onNewWall, cursorPosRef, fileInputRef
  });

  // --- AUTO SAVE INTEGRATION ---
  const { status: autoSaveStatus, triggerImmediateSave } = useAutoSave({
      isDirty: state.isDirty,
      saveFunction: async () => {
          // Si pas connecté, on ne tente pas de sauvegarder en auto (silencieux)
          if (!user) return false;
          
          // Si c'est un nouveau mur (pas de cloudId) et qu'on est en train d'éditer,
          // on sauvegarde pour CRÉER l'entrée en base.
          // onSaveCloud gère le INSERT ou le UPDATE selon si cloudId existe.
          const success = await onSaveCloud();
          
          if (success) {
              state.setIsDirty(false);
          } else {
              // Si échec (ex: RLS error), on garde le statut dirty
              // Mais on ne spamme pas d'alerte visuelle bloquante, le status indicator suffit
          }
          return success;
      },
      user,
      cloudId, 
      delay: 4000 // Délai un peu plus long pour éviter de spammer la création initiale
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const wrappedSaveCloud = async () => {
      if (!user) { state.setShowAuthModal(true); return false; }
      const success = await onSaveCloud();
      if (success) state.setIsDirty(false);
      return success;
  };

  const handleToggleVisibility = async () => {
      if (!user) { state.setShowAuthModal(true); return; }
      
      const newStatus = !metadata.isPublic;
      
      // Cas 1 : C'est un mur existant (déjà sauvegardé)
      if (cloudId) {
          // Optimistic UI Update
          setMetadata(prev => ({ ...prev, isPublic: newStatus }));
          const { error } = await api.toggleWallVisibility(cloudId, newStatus);
          
          if (error) {
              // Rollback en cas d'erreur
              setMetadata(prev => ({ ...prev, isPublic: !newStatus }));
              state.setModal({ 
                  title: "Erreur", 
                  message: "Impossible de changer la visibilité. Vérifiez votre connexion.", 
                  isAlert: true 
              });
          } else {
              triggerImmediateSave(); // On force une sauvegarde pour sync le timestamp
          }
      } 
      // Cas 2 : C'est un nouveau mur (jamais sauvegardé)
      else {
          // On met à jour la métadonné LOCALE
          setMetadata(prev => ({ ...prev, isPublic: newStatus }));
          
          // On déclenche immédiatement la sauvegarde pour CRÉER le mur avec le bon statut
          // Note : onSaveCloud utilisera l'état metadata à jour (grâce aux fermetures React, attention ici on doit forcer le refresh)
          // Astuce : onSaveCloud lit 'metadata' du scope.
          // Comme setState est asynchrone, on ne peut pas appeler onSaveCloud tout de suite après setMetadata dans la même fonction
          // Sauf si onSaveCloud utilisait une ref.
          
          // Solution : On demande confirmation de sauvegarde/création
          state.setModal({
              title: newStatus ? "Publier ce mur ?" : "Enregistrer en Privé ?",
              message: newStatus 
                  ? "Votre mur sera créé et visible dans la galerie publique."
                  : "Votre mur sera créé dans votre espace personnel privé.",
              confirmText: "Sauvegarder",
              onConfirm: async () => {
                  // On force la mise à jour avant sauvegarde
                  const updatedMeta = { ...metadata, isPublic: newStatus };
                  setMetadata(updatedMeta);
                  
                  // On doit attendre un tick pour que le state se propage, ou passer les data manuellement
                  // Ici, on fait confiance au flux : on déclenche la modale de sauvegarde générique
                  // mais on pré-configure le switch.
                  
                  // Approche directe : on appelle wrappedSaveCloud qui lira le state au prochain render ? Non.
                  // On utilise triggerImmediateSave qui dépend de user/cloudId.
                  
                  // Le plus simple pour un nouveau mur :
                  state.setIsDirty(true); // Pour forcer l'auto-save au prochain tick qui verra le nouveau metadata
              }
          });
      }
  };

  const renderableHolds = useMemo(() => holds.map((h) => {
      if (!h) return null; 
      const world = resolveHoldWorldData(h, config); return world ? { ...h, ...world } : null;
    }).filter((h) => h !== null), [holds, config]);

  const handleDownloadLocal = () => {
    const blob = new Blob([JSON.stringify({ version: "1.1", metadata, config, holds }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${metadata.name || 'betablock'}.json`; a.click();
  };

  useEffect(() => {
    const h = () => { if (state.contextMenu) state.setContextMenu(null); };
    window.addEventListener('click', h); window.addEventListener('contextmenu', h);
    return () => { window.removeEventListener('click', h); window.removeEventListener('contextmenu', h); };
  }, [state.contextMenu]);

  const defaultShareLink = cloudId ? `https://betablock-3d.fr/view/${cloudId}` : "";

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      <SEO 
        title={initialMode === 'VIEW' ? "Visualisation" : "Atelier de Création"} 
        description="Concevez votre mur d'escalade en 3D avec précision."
      />
      
      <LoadingOverlay 
        isVisible={isLoadingCloud || isInitializing} 
        message={isInitializing ? "Initialisation de l'atelier..." : "Chargement du mur..."} 
      />
      {state.showAuthModal && <AuthModal onClose={() => state.setShowAuthModal(false)} onSuccess={() => state.setShowAuthModal(false)} />}
      
      <EditorTopBar 
          mode={derivedMode} metadata={metadata} setMetadata={(m) => { setMetadata(m); state.setIsDirty(true); }}
          isDirty={state.isDirty} isEditingName={state.isEditingName} setIsEditingName={state.setIsEditingName}
          onExit={() => logic.handleAction('exit')} 
          onSave={() => logic.handleAction('save')} // Reste manuel via menu Fichier
          onPublish={() => logic.handleAction('publish')} // Reste manuel via menu Fichier
          onImport={logic.handleImportFile}
          onExport={handleDownloadLocal}
          onNew={logic.handleNewWallRequest}
          onRemix={onRemix}
          // Nouveaux props
          saveStatus={autoSaveStatus}
          onTogglePublic={handleToggleVisibility}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`relative z-20 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
             
             {initialMode !== 'VIEW' && (
                <SidebarTabs activeTab={activeTab} onChange={setActiveTab} />
             )}

             <div className="flex-1 w-80 overflow-hidden relative">
                {initialMode === 'VIEW' ? (
                    <ViewerPanel wallId={cloudId || ''} metadata={metadata} config={config} holds={holds} onHome={() => logic.handleAction('exit')} onRemix={onRemix || (() => {})} onShare={() => logic.handleAction('share')} onEdit={() => navigate(`/builder?id=${cloudId}`)} />
                ) : activeTab === 'structure' ? (
                    <EditorPanel 
                        config={config} holds={holds} onUpdate={setConfig} metadata={metadata} 
                        onNext={() => setActiveTab('holds')} 
                        showModal={(c) => state.setModal(c)}
                        onActionStart={logic.saveToHistory} 
                        onExport={() => logic.handleAction('save')} 
                        onImport={logic.handleImportFile} 
                        onNew={logic.handleNewWallRequest} 
                        onHome={() => logic.handleAction('exit')} 
                        onRemoveSegment={logic.removeSegmentAction}
                    />
                ) : (
                    <RouteEditorPanel 
                        onBack={() => setActiveTab('structure')} 
                        selectedHold={state.selectedHold} onSelectHold={state.setSelectedHold} metadata={metadata}
                        holdSettings={state.holdSettings} onUpdateSettings={(s:any) => state.setHoldSettings(prev => ({ ...prev, ...s }))}
                        placedHolds={holds} onRemoveHold={(id) => logic.removeHoldsAction([id], true)} 
                        onRemoveAllHolds={logic.handleRemoveAllHolds} 
                        onChangeAllHoldsColor={logic.handleChangeAllHoldsColor} 
                        selectedPlacedHoldIds={state.selectedPlacedHoldIds} onUpdatePlacedHold={(ids, u) => { const s = new Set(ids); setHolds(h => h.map(x => (x && s.has(x.id)) ? { ...x, ...u } : x)); state.setIsDirty(true); }}
                        onSelectPlacedHold={state.handleSelectPlacedHold} onDeselect={() => state.setSelectedPlacedHoldIds([])} onActionStart={logic.saveToHistory} 
                        onReplaceHold={(ids, def) => { logic.saveToHistory(); const s = new Set(ids); setHolds(prev => prev.map(h => (h && s.has(h.id)) ? { ...h, modelId: def.id, filename: def.filename } : h)); }}
                        onRemoveMultiple={() => logic.removeHoldsAction(state.selectedPlacedHoldIds, true)} 
                        onExport={() => logic.handleAction('save')} 
                        onImport={logic.handleImportFile} 
                        onNew={logic.handleNewWallRequest} 
                        onHome={() => logic.handleAction('exit')}
                    />
                )}
             </div>
        </div>
        
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`absolute top-1/2 z-30 -translate-y-1/2 bg-gray-800 border border-gray-600 text-gray-400 p-1 rounded-r-lg hover:bg-blue-600 hover:text-white transition-all shadow-xl ${isSidebarOpen ? 'left-80' : 'left-0'}`}> {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />} </button>
        
        <div className="flex-1 relative h-full bg-black">
            {initialMode !== 'VIEW' && (
                <div className="fixed bottom-6 right-6 z-[100] flex gap-2 p-1 bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
                    <button disabled={!canUndo} onClick={logic.performUndo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Undo2 size={20} /></button>
                    <button disabled={!canRedo} onClick={logic.performRedo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Redo2 size={20} /></button>
                </div>
            )}
            <Scene config={config} mode={derivedMode} holds={renderableHolds as any} onPlaceHold={logic.handlePlaceHold} selectedHoldDef={state.selectedHold} holdSettings={state.holdSettings} selectedPlacedHoldIds={state.selectedPlacedHoldIds} onSelectPlacedHold={state.handleSelectPlacedHold} onContextMenu={(t, i, x, y, wx, wy) => state.setContextMenu({ type: t, id: i, x, y, wallX: wx, wallY: wy })} onWallPointerUpdate={(i) => { cursorPosRef.current = i; }} onHoldDrag={(id, x, y, segId) => { setHolds(prev => prev.map(h => (h && h.id === id) ? { ...h, x, y, segmentId: segId } : h)); state.setIsDirty(true); }} onHoldDragEnd={logic.saveToHistory} screenshotRef={screenshotRef} />
        </div>
      </div>
      <ContextMenu 
        data={state.contextMenu} onClose={() => state.setContextMenu(null)} onUpdateData={state.setContextMenu}
        onCopyHold={() => { const ids = (state.contextMenu?.id && state.selectedPlacedHoldIds.includes(state.contextMenu.id)) ? state.selectedPlacedHoldIds : (state.contextMenu?.id ? [state.contextMenu.id] : []); if (ids.length) state.setClipboard(JSON.parse(JSON.stringify(holds.filter(h => h && ids.includes(h.id))))); }} 
        hasClipboard={state.clipboard.length > 0} onPasteHold={(t) => logic.handlePaste(t)} 
        onDelete={(id, type) => type === 'HOLD' ? logic.removeHoldsAction([id], true) : logic.removeSegmentAction(id)}
        onRotateHold={(id, d) => { logic.saveToHistory(); setHolds(h => h.map(x => (x && x.id === id) ? { ...x, spin: x.spin + d } : x)); }}
        onColorHold={(id, c) => { logic.saveToHistory(); setHolds(h => h.map(x => (x && x.id === id) ? { ...x, color: c } : x)); }}
        onSegmentUpdate={logic.updateSegmentQuickly}
      />
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={(e) => { 
              const file = e.target.files?.[0]; 
              if (file) {
                  logic.handleImportFile(file);
                  e.target.value = '';
              }
          }} 
      />
      <GlobalModal 
        config={state.modal} 
        onClose={() => state.setModal(null)} 
        isSavingCloud={isSavingCloud} 
        generatedLink={generatedLink || defaultShareLink} 
        onSaveCloud={wrappedSaveCloud} 
        onDownload={handleDownloadLocal} 
        wallName={metadata.name} 
        onWallNameChange={(n) => { setMetadata(p => ({ ...p, name: n })); state.setIsDirty(true); }} 
      />
    </div>
  );
};
