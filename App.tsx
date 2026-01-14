
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import * as THREE from 'three';

// Core imports
import { Scene } from './core/Scene';
import { api } from './core/api'; 
import { auth } from './core/auth';
import { resolveHoldWorldData, calculateLocalCoords } from './utils/geometry';

// Custom Hooks
import { useHistory } from './hooks/useHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Feature Components
import { EditorPanel } from './features/builder/EditorPanel';
import { RouteEditorPanel } from './features/builder/RouteEditorPanel';
import { ViewerPanel } from './features/viewer/ViewerPanel';
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';

// UI Components
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { GlobalModal, ModalConfig } from './components/ui/GlobalModal';
import { ContextMenu, ContextMenuData } from './components/ui/ContextMenu';
import { AuthModal } from './components/auth/AuthModal';
import { Undo2, Redo2, Save, Globe, ArrowLeft } from 'lucide-react';

// Types
import { WallConfig, AppMode, HoldDefinition, PlacedHold, WallSegment, BetaBlockFile, WallMetadata } from './types';
import './types';

const APP_VERSION = "1.1";

const INITIAL_CONFIG: WallConfig = {
  width: 4.5,
  segments: [
    { id: '1', height: 2.2, angle: 0 },
    { id: '2', height: 2.0, angle: 30 },
    { id: '3', height: 1.5, angle: 15 },
  ],
};

const STORAGE_KEYS = {
  CONFIG: 'betablock_wall_config',
  HOLDS: 'betablock_placed_holds',
};

// Composant Editeur principal
const WallEditor = ({ 
  mode, 
  user, 
  config, setConfig, 
  holds, setHolds, 
  metadata, setMetadata,
  recordAction, undo, redo, canUndo, canRedo,
  onSaveCloud, isSavingCloud, generatedLink,
  onHome, onNewWall, onRemix, onRemoveAllHolds, onChangeAllHoldsColor,
  isLoadingCloud, cloudId, screenshotRef
}: any) => {
  const navigate = useNavigate();
  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldIds, setSelectedPlacedHoldIds] = useState<string[]>([]);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const [clipboard, setClipboard] = useState<PlacedHold[]>([]);

  const applyHistoryState = useCallback((state: any) => {
    setConfig(state.config);
    setHolds(state.holds);
  }, [setConfig, setHolds]);

  const performUndo = useCallback(() => undo({ config, holds }, applyHistoryState), [undo, config, holds, applyHistoryState]);
  const performRedo = useCallback(() => redo({ config, holds }, applyHistoryState), [redo, config, holds, applyHistoryState]);

  const saveToHistory = useCallback(() => {
    if (mode !== 'VIEW') recordAction({ config, holds });
  }, [recordAction, config, holds, mode]);

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (metadata.remixMode === 'structure') return;
    if (!selectedHold) return;
    const coords = calculateLocalCoords(position, segmentId, config);
    if (!coords) return;
    const segment = config.segments.find(s => s.id === segmentId);
    if (!segment) return;
    const clampedY = Math.max(0, Math.min(segment.height, coords.y));
    const clampedX = Math.max(-config.width/2, Math.min(config.width/2, coords.x));
    saveToHistory();
    const newHold: PlacedHold = {
      id: crypto.randomUUID(),
      modelId: selectedHold.id,
      filename: selectedHold.filename,
      modelBaseScale: selectedHold.baseScale,
      segmentId: segmentId,
      x: clampedX,
      y: clampedY,
      spin: holdSettings.rotation,
      scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale],
      color: holdSettings.color,
    };
    setHolds((prev: any) => [...prev, newHold]);
  };

  const removeHoldsAction = useCallback((ids: string[]) => {
    if (ids.length === 0 || mode === 'VIEW') return;
    if (metadata.remixMode === 'structure') return;
    saveToHistory();
    const idSet = new Set(ids);
    setHolds((prev: any) => prev.filter((h: any) => !idSet.has(h.id)));
    setSelectedPlacedHoldIds(prev => prev.filter(id => !idSet.has(id)));
  }, [saveToHistory, mode, setHolds, metadata.remixMode]);

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
      if(mode === 'VIEW') return;
      if (metadata.remixMode === 'holds') return;
      const seg = config.segments.find((s: any) => s.id === id);
      if (!seg) return;
      const newHeight = updates.height !== undefined ? seg.height + updates.height : seg.height;
      const newAngle = updates.angle !== undefined ? seg.angle + updates.angle : seg.angle;
      saveToHistory();
      setConfig((prev: any) => ({ ...prev, segments: prev.segments.map((s: any) => s.id === id ? { ...s, height: Math.max(0.5, newHeight), angle: Math.min(85, Math.max(-15, newAngle)) } : s) }));
  };

  const handleAction = (type: 'save' | 'publish') => {
      if (!user) {
          setShowAuthModal(true);
          return;
      }
      // On met à jour l'intention dans les métadonnées juste avant l'envoi
      setMetadata((prev: any) => ({ ...prev, isPublic: type === 'publish' }));
      
      setModal({ 
          title: type === 'publish' ? "Publier dans le Hub" : "Enregistrer le projet", 
          message: type === 'publish' ? "Votre mur sera visible par toute la communauté." : "Le projet sera sauvegardé dans votre espace privé.",
          isSaveDialog: true 
      });
  };

  useKeyboardShortcuts({
    undo: performUndo, redo: performRedo, selectAll: () => setSelectedPlacedHoldIds(holds.map((h: any) => h.id)),
    copy: () => { if (selectedPlacedHoldIds.length > 0) setClipboard(JSON.parse(JSON.stringify(holds.filter((h: any) => selectedPlacedHoldIds.includes(h.id))))); },
    paste: () => { 
        if (metadata.remixMode === 'structure') return;
        if (clipboard.length > 0 && mode !== 'VIEW') { 
            saveToHistory(); 
            setHolds((prev: any) => [...prev, ...clipboard.map(h => ({ ...h, id: crypto.randomUUID(), x: h.x + 0.1, y: Math.min(h.y + 0.1, config.segments.find((s: any) => s.id === h.segmentId)?.height || h.y) }))]); 
        } 
    },
    save: () => handleAction('save'),
    open: () => globalFileInputRef.current?.click(),
    deleteAction: () => removeHoldsAction(selectedPlacedHoldIds)
  }, [performUndo, performRedo, selectedPlacedHoldIds, removeHoldsAction, clipboard, mode, holds, config, metadata.remixMode, user]);

  const renderableHolds = useMemo(() => holds.map((h: any) => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter((h: any) => h !== null)
  , [holds, config]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      <LoadingOverlay isVisible={isLoadingCloud} />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      {/* HEADER ACTIONS HAUTE VISIBILITÉ - DESIGN ÉQUILIBRÉ */}
      {mode !== 'VIEW' && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-3 bg-gray-900 border-b border-white/5 z-[110] relative">
            
            {/* GAUCHE: Navigation & Contexte App */}
            <div className="flex items-center gap-4 justify-start">
                <button onClick={onHome} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors flex items-center gap-2">
                    <ArrowLeft size={16} />
                    <span className="font-black italic tracking-tighter text-blue-500 hidden sm:inline">BetaBlock</span>
                </button>
            </div>

            {/* CENTRE: Titre du Projet (Max Width Control) */}
            <div className="flex flex-col items-center justify-center min-w-0 px-4">
                <h1 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-[400px] text-center" title={metadata.name}>
                    {metadata.name || "Mur Sans Nom"}
                </h1>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                    {mode === 'BUILD' ? 'Mode Structure' : 'Mode Ouverture'}
                </span>
            </div>
            
            {/* DROITE: Actions */}
            <div className="flex items-center gap-2 justify-end">
                <button 
                    onClick={() => handleAction('save')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-700 hover:border-gray-600"
                >
                    <Save size={14} />
                    <span className="hidden sm:inline">Sauvegarder</span>
                </button>
                <button 
                    onClick={() => handleAction('publish')}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/20"
                >
                    <Globe size={14} />
                    <span>PUBLIER</span>
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {mode === 'VIEW' ? (
            <ViewerPanel 
                wallId={cloudId || ''}
                metadata={metadata} config={config} holds={holds}
                onHome={onHome} 
                onRemix={onRemix}
                onShare={() => handleAction('publish')}
            />
        ) : mode === 'BUILD' ? (
            <EditorPanel 
                config={config} holds={holds} onUpdate={setConfig} 
                metadata={metadata}
                onNext={() => navigate('/setter')} showModal={(c) => setModal(c)}
                onActionStart={saveToHistory} onExport={() => handleAction('save')}
                onImport={(f:any) => globalFileInputRef.current?.click()} onNew={onNewWall}
                onHome={onHome}
            />
        ) : (
            <RouteEditorPanel 
                onBack={() => navigate('/builder')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
                metadata={metadata}
                holdSettings={holdSettings} onUpdateSettings={(s:any) => setHoldSettings(prev => ({ ...prev, ...s }))}
                placedHolds={holds} onRemoveHold={(id:any) => removeHoldsAction([id])} 
                onRemoveAllHolds={onRemoveAllHolds} 
                onChangeAllHoldsColor={onChangeAllHoldsColor} 
                selectedPlacedHoldIds={selectedPlacedHoldIds}
                onUpdatePlacedHold={(ids:any, u:any) => { 
                    if (metadata.remixMode === 'structure') return;
                    const idSet = new Set(ids); setHolds((hds: any) => hds.map((h: any) => idSet.has(h.id) ? { ...h, ...u } : h)); 
                }}
                onSelectPlacedHold={(id:any, multi:any) => {
                    if (id === null) { setSelectedPlacedHoldIds([]); return; }
                    if (multi) setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                    else setSelectedPlacedHoldIds([id]);
                }} 
                onDeselect={() => setSelectedPlacedHoldIds([])}
                onActionStart={saveToHistory} onReplaceHold={(ids:any, def:any) => { 
                    if (metadata.remixMode === 'structure') return;
                    saveToHistory(); const idSet = new Set(ids); setHolds((prev: any) => prev.map((h: any) => idSet.has(h.id) ? { ...h, modelId: def.id, filename: def.filename } : h)); 
                }}
                onRemoveMultiple={() => removeHoldsAction(selectedPlacedHoldIds)}
                onExport={() => handleAction('save')}
                onImport={(f:any) => globalFileInputRef.current?.click()} onNew={onNewWall}
                onHome={onHome}
            />
        )}

        <div className="flex-1 relative h-full">
            {/* UNDO/REDO flottants au centre bas */}
            {mode !== 'VIEW' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex gap-2 p-1 bg-gray-950/80 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
                    <button disabled={!canUndo} onClick={performUndo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Undo2 size={20} /></button>
                    <button disabled={!canRedo} onClick={performRedo} className="p-3 hover:bg-white/10 rounded-xl text-white disabled:opacity-30 transition-all"><Redo2 size={20} /></button>
                </div>
            )}

            <Scene 
                config={config} mode={mode} holds={renderableHolds} 
                onPlaceHold={handlePlaceHold} 
                selectedHoldDef={selectedHold} holdSettings={holdSettings} selectedPlacedHoldIds={selectedPlacedHoldIds}
                onSelectPlacedHold={(id:any, multi:any) => {
                    if (id === null) { setSelectedPlacedHoldIds([]); return; }
                    if (multi) setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                    else setSelectedPlacedHoldIds([id]);
                }}
                onContextMenu={(type:any, id:any, x:any, y:any, wx:any, wy:any) => setContextMenu({ type, id, x, y, wallX: wx, wallY: wy })}
                onHoldDrag={(id:any, x:any, y:any, segId:any) => {
                    if (metadata.remixMode === 'structure') return;
                    setHolds((prev: any) => prev.map((h: any) => h.id === id ? { ...h, x, y, segmentId: segId } : h))
                }}
                onHoldDragEnd={saveToHistory} screenshotRef={screenshotRef}
            />
        </div>
      </div>

      <ContextMenu 
        data={contextMenu} onClose={() => setContextMenu(null)} onUpdateData={setContextMenu}
        onCopyHold={() => { if (selectedPlacedHoldIds.length > 0) setClipboard(JSON.parse(JSON.stringify(holds.filter((h: any) => selectedPlacedHoldIds.includes(h.id))))); }} 
        hasClipboard={clipboard.length > 0}
        onPasteHold={() => {}} onDelete={(id:any, type:any) => { 
            if (type === 'HOLD' && metadata.remixMode === 'structure') return;
            if (type === 'SEGMENT' && metadata.remixMode === 'holds') return;
            removeHoldsAction([id]); 
        }}
        onRotateHold={(id:any, delta:any) => { 
            if (metadata.remixMode === 'structure') return;
            saveToHistory(); setHolds((hds: any) => hds.map((h: any) => h.id === id ? { ...h, spin: (h.spin + delta) } : h)); 
        }}
        onColorHold={(id:any, c:any) => { 
            if (metadata.remixMode === 'structure') return;
            saveToHistory(); setHolds((hds: any) => hds.map((h: any) => h.id === id ? { ...h, color: c } : h)); 
        }}
        onSegmentUpdate={updateSegmentQuickly}
      />

      <GlobalModal 
        config={modal} onClose={() => setModal(null)} 
        isSavingCloud={isSavingCloud} generatedLink={generatedLink} 
        onSaveCloud={onSaveCloud} 
        wallName={metadata.name}
        onWallNameChange={(name:any) => setMetadata((prev: any) => ({ ...prev, name }))}
      />
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const screenshotRef = useRef<(() => Promise<string | null>) | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<WallMetadata>({ 
    name: 'Mon Mur', timestamp: new Date().toISOString(), appVersion: APP_VERSION, isPublic: false
  });
  
  const [config, setConfig] = useState<WallConfig>(() => INITIAL_CONFIG);
  const [holds, setHolds] = useState<PlacedHold[]>(() => []);

  const { recordAction, undo, redo, canUndo, canRedo } = useHistory<{config: WallConfig, holds: PlacedHold[]}>({ config, holds });

  const handleNewWall = useCallback(() => {
      setHolds([]);
      setConfig(INITIAL_CONFIG);
      setMetadata({ name: 'Mon Mur', timestamp: new Date().toISOString(), appVersion: APP_VERSION, isPublic: false });
      setCloudId(null);
      setGeneratedLink(null);
      navigate('/builder');
  }, [navigate]);

  const handleRemix = useCallback((mode: 'structure' | 'holds') => {
      const parentName = metadata.name;
      const parentAuthor = metadata.authorName;
      const parentId = cloudId;
      setMetadata({
          name: `${parentName} (Remix)`,
          timestamp: new Date().toISOString(),
          appVersion: APP_VERSION,
          parentId: parentId || undefined,
          parentName: parentName,
          parentAuthorName: parentAuthor,
          remixMode: mode,
          isPublic: false
      });
      setCloudId(null);
      setGeneratedLink(null);
      navigate(mode === 'structure' ? '/builder' : '/setter');
  }, [metadata, cloudId, navigate]);

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const activeId = searchParams.get('id') || (location.pathname.startsWith('/view') ? location.pathname.split('/').pop() : null);
    if (activeId && activeId !== cloudId && activeId.length > 5) {
      setIsLoadingCloud(true);
      api.getWall(activeId).then(({ data }) => {
        if (data) {
          setConfig(data.config);
          setHolds(data.holds);
          setMetadata(data.metadata);
          setCloudId(activeId);
        }
        setIsLoadingCloud(false);
      });
    }
  }, [location.pathname, searchParams, cloudId]);

  const saveToCloud = useCallback(async () => {
    if (!user) return;
    setIsSavingCloud(true);
    let thumbnail: string | undefined = undefined;
    if (screenshotRef.current) thumbnail = await screenshotRef.current() || undefined; 
    
    const updatedMetadata = { 
        ...metadata, 
        timestamp: new Date().toISOString(), 
        thumbnail, 
        authorName: user.user_metadata?.display_name || user.email.split('@')[0] 
    };
    
    setMetadata(updatedMetadata);
    const file: BetaBlockFile = { version: APP_VERSION, metadata: updatedMetadata, config, holds };
    
    const { id } = cloudId ? await api.updateWall(cloudId, file).then(() => ({ id: cloudId })) : await api.saveWall(file);
    
    setIsSavingCloud(false);
    if (id) {
      if (updatedMetadata.isPublic) {
          setGeneratedLink(`${window.location.origin}/#/view/${id}`);
      } else {
          setGeneratedLink(null);
          alert("Projet sauvegardé dans vos projets privés.");
      }
      setCloudId(id);
    }
  }, [config, holds, metadata, user, cloudId]);

  return (
    <Routes>
      <Route path="/" element={<GalleryPage onResetState={handleNewWall} />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/builder" element={
        <WallEditor 
          mode="BUILD" user={user} config={config} setConfig={setConfig} holds={holds} setHolds={setHolds} metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall} onRemix={handleRemix}
          onRemoveAllHolds={() => setHolds([])}
          onChangeAllHoldsColor={(c:any) => setHolds(h => h.map(x => ({...x, color: c})))}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/setter" element={
        <WallEditor 
          mode="SET" user={user} config={config} setConfig={setConfig} holds={holds} setHolds={setHolds} metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall} onRemix={handleRemix}
          onRemoveAllHolds={() => setHolds([])}
          onChangeAllHoldsColor={(c:any) => setHolds(h => h.map(x => ({...x, color: c})))}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/view/:wallId" element={
        <WallEditor 
          mode="VIEW" user={user} config={config} setConfig={setConfig} holds={holds} setHolds={setHolds} metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall} onRemix={handleRemix}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
