import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import * as THREE from 'three';

// Core imports
import { Scene } from './core/Scene';
import { api } from './core/api'; 
import { auth } from './core/auth';
import { validateBetaBlockJson } from './utils/validation';
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

// UI Components
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { GlobalModal, ModalConfig } from './components/ui/GlobalModal';
import { ContextMenu, ContextMenuData } from './components/ui/ContextMenu';
import { AuthModal } from './components/auth/AuthModal';
import { Undo2, Redo2 } from 'lucide-react';

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

// Composant Editeur principal (Builder + Setter + Scene)
const WallEditor = ({ 
  mode, 
  user, 
  config, setConfig, 
  holds, setHolds, 
  metadata, setMetadata,
  recordAction, undo, redo, canUndo, canRedo,
  onSaveCloud, isSavingCloud, generatedLink,
  onHome, onNewWall, onRemoveAllHolds, onChangeAllHoldsColor,
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
  const lastWallPointer = useRef<{ x: number, y: number, segmentId: string } | null>(null);
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
    saveToHistory();
    const idSet = new Set(ids);
    setHolds((prev: any) => prev.filter((h: any) => !idSet.has(h.id)));
    setSelectedPlacedHoldIds(prev => prev.filter(id => !idSet.has(id)));
  }, [saveToHistory, mode, setHolds]);

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
      if(mode === 'VIEW') return;
      const seg = config.segments.find((s: any) => s.id === id);
      if (!seg) return;
      const newHeight = updates.height !== undefined ? seg.height + updates.height : seg.height;
      const newAngle = updates.angle !== undefined ? seg.angle + updates.angle : seg.angle;
      saveToHistory();
      setConfig((prev: any) => ({ ...prev, segments: prev.segments.map((s: any) => s.id === id ? { ...s, height: Math.max(0.5, newHeight), angle: Math.min(85, Math.max(-15, newAngle)) } : s) }));
  };

  useKeyboardShortcuts({
    undo: performUndo, redo: performRedo, selectAll: () => setSelectedPlacedHoldIds(holds.map((h: any) => h.id)),
    copy: () => { if (selectedPlacedHoldIds.length > 0) setClipboard(JSON.parse(JSON.stringify(holds.filter((h: any) => selectedPlacedHoldIds.includes(h.id))))); },
    paste: () => { if (clipboard.length > 0 && mode !== 'VIEW') { saveToHistory(); setHolds((prev: any) => [...prev, ...clipboard.map(h => ({ ...h, id: crypto.randomUUID(), x: h.x + 0.1, y: Math.min(h.y + 0.1, config.segments.find((s: any) => s.id === h.segmentId)?.height || h.y) }))]); } },
    save: () => setModal({ title: "Sauvegarder", message: "Sauvegarder ?", isSaveDialog: true }),
    open: () => globalFileInputRef.current?.click(),
    deleteAction: () => removeHoldsAction(selectedPlacedHoldIds)
  }, [performUndo, performRedo, selectedPlacedHoldIds, removeHoldsAction, clipboard, mode, holds, config]);

  const renderableHolds = useMemo(() => holds.map((h: any) => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter((h: any) => h !== null)
  , [holds, config]);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      <LoadingOverlay isVisible={isLoadingCloud} />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      {mode === 'VIEW' ? (
        <ViewerPanel 
            wallId={cloudId || ''}
            metadata={metadata} config={config} holds={holds}
            onHome={onHome} onRemix={() => navigate('/builder')}
            onShare={() => setModal({ title: "Partager", message: "Lien généré", isSaveDialog: true })}
        />
      ) : mode === 'BUILD' ? (
        <EditorPanel 
            config={config} holds={holds} onUpdate={setConfig} 
            onNext={() => navigate('/setter')} showModal={(c) => setModal(c)}
            onActionStart={saveToHistory} onExport={() => setModal({ title: "Sauvegarder", message: "", isSaveDialog: true })}
            onImport={() => globalFileInputRef.current?.click()} onNew={onNewWall}
            onHome={onHome}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => navigate('/builder')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
            holdSettings={holdSettings} onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds} onRemoveHold={(id) => removeHoldsAction([id])} 
            onRemoveAllHolds={onRemoveAllHolds} 
            onChangeAllHoldsColor={onChangeAllHoldsColor} 
            selectedPlacedHoldIds={selectedPlacedHoldIds}
            onUpdatePlacedHold={(ids, u) => { const idSet = new Set(ids); setHolds((hds: any) => hds.map((h: any) => idSet.has(h.id) ? { ...h, ...u } : h)); }}
            onSelectPlacedHold={(id, multi) => {
                 if (id === null) { setSelectedPlacedHoldIds([]); return; }
                 if (multi) setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                 else setSelectedPlacedHoldIds([id]);
            }} 
            onDeselect={() => setSelectedPlacedHoldIds([])}
            onActionStart={saveToHistory} onReplaceHold={(ids, def) => { saveToHistory(); const idSet = new Set(ids); setHolds((prev: any) => prev.map((h: any) => idSet.has(h.id) ? { ...h, modelId: def.id, filename: def.filename } : h)); }}
            onRemoveMultiple={() => removeHoldsAction(selectedPlacedHoldIds)}
            onExport={() => setModal({ title: "Sauvegarder", message: "", isSaveDialog: true })}
            onImport={() => globalFileInputRef.current?.click()} onNew={onNewWall}
            onHome={onHome}
        />
      )}

      {/* UNDO/REDO */}
      {mode !== 'VIEW' && (
        <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
            <button disabled={!canUndo} onClick={performUndo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition-all shadow-2xl backdrop-blur-md"><Undo2 size={20} /></button>
            <button disabled={!canRedo} onClick={performRedo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition-all shadow-2xl backdrop-blur-md"><Redo2 size={20} /></button>
        </div>
      )}

      <div className="flex-1 relative h-full">
        <Scene 
            config={config} mode={mode} holds={renderableHolds} 
            onPlaceHold={handlePlaceHold} 
            selectedHoldDef={selectedHold} holdSettings={holdSettings} selectedPlacedHoldIds={selectedPlacedHoldIds}
            onSelectPlacedHold={(id, multi) => {
                 if (id === null) { setSelectedPlacedHoldIds([]); return; }
                 if (multi) setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                 else setSelectedPlacedHoldIds([id]);
            }}
            onContextMenu={(type, id, x, y, wx, wy) => setContextMenu({ type, id, x, y, wallX: wx, wallY: wy })}
            onWallPointerUpdate={(info) => { lastWallPointer.current = info; }}
            onHoldDrag={(id, x, y, segId) => setHolds((prev: any) => prev.map((h: any) => h.id === id ? { ...h, x, y, segmentId: segId } : h))}
            onHoldDragEnd={saveToHistory} screenshotRef={screenshotRef}
        />
      </div>

      <ContextMenu 
        data={contextMenu} onClose={() => setContextMenu(null)} onUpdateData={setContextMenu}
        onCopyHold={() => { if (selectedPlacedHoldIds.length > 0) setClipboard(JSON.parse(JSON.stringify(holds.filter((h: any) => selectedPlacedHoldIds.includes(h.id))))); }} 
        hasClipboard={clipboard.length > 0}
        onPasteHold={() => {}} onDelete={(id) => { if (contextMenu?.type === 'HOLD') removeHoldsAction([id]); }}
        // Fix: Removed duplicate onRotateHold and onColorHold props
        onRotateHold={(id, delta) => { saveToHistory(); setHolds((hds: any) => hds.map((h: any) => h.id === id ? { ...h, spin: (h.spin + delta) } : h)); }}
        onColorHold={(id, c) => { saveToHistory(); setHolds((hds: any) => hds.map((h: any) => h.id === id ? { ...h, color: c } : h)); }}
        onSegmentUpdate={updateSegmentQuickly}
      />

      <GlobalModal 
        config={modal} onClose={() => setModal(null)} 
        isSavingCloud={isSavingCloud} generatedLink={generatedLink} 
        onSaveCloud={onSaveCloud} onDownload={() => {/* DL Logic */}}
        wallName={metadata.name}
        onWallNameChange={(name) => setMetadata((prev: any) => ({ ...prev, name }))}
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
    name: 'Mon Mur', timestamp: new Date().toISOString(), appVersion: APP_VERSION 
  });
  
  const [config, setConfig] = useState<WallConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch { return INITIAL_CONFIG; }
  });
  
  const [holds, setHolds] = useState<PlacedHold[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOLDS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const { past, future, recordAction, undo, redo, canUndo, canRedo } = useHistory<{config: WallConfig, holds: PlacedHold[]}>({ config, holds });

  // RESET FUNCTION
  const handleNewWall = useCallback(() => {
      setHolds([]);
      setConfig(INITIAL_CONFIG);
      setMetadata({ name: 'Mon Mur', timestamp: new Date().toISOString(), appVersion: APP_VERSION });
      setCloudId(null);
      setGeneratedLink(null);
      navigate('/builder');
  }, [navigate]);

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/view') && !location.pathname.startsWith('/setter') && !location.pathname.startsWith('/builder')) return;
    
    // Check if we need to reset state because we just left a viewer to go to builder
    const isEnteringEmptyBuilder = location.pathname === '/builder' && !searchParams.get('id') && cloudId !== null;
    if (isEnteringEmptyBuilder) {
        handleNewWall();
        return;
    }

    const activeId = searchParams.get('id') || (location.pathname.startsWith('/view') ? location.pathname.split('/').pop() : null);
    if (activeId && activeId !== cloudId && activeId.length > 5) {
      const loadFromCloud = async () => {
        setIsLoadingCloud(true);
        const { data, error } = await api.getWall(activeId);
        if (data) {
          setConfig(data.config);
          setHolds(data.holds);
          setMetadata(data.metadata);
          setCloudId(activeId);
        }
        setIsLoadingCloud(false);
      };
      loadFromCloud();
    }
  }, [location.pathname, searchParams, cloudId, handleNewWall]);

  const saveToCloud = useCallback(async () => {
    if (!user) return;
    setIsSavingCloud(true);
    let thumbnail: string | undefined = undefined;
    if (screenshotRef.current) thumbnail = await screenshotRef.current() || undefined; 
    const authorName = user.user_metadata?.display_name || user.email.split('@')[0];
    const authorAvatarUrl = user.user_metadata?.avatar_url;
    const updatedMetadata = { ...metadata, timestamp: new Date().toISOString(), thumbnail, authorId: user.id, authorName: authorName, authorAvatarUrl: authorAvatarUrl };
    setMetadata(updatedMetadata);
    const data: BetaBlockFile = { version: APP_VERSION, metadata: updatedMetadata, config: config, holds: holds };
    const { id, error } = await api.saveWall(data);
    setIsSavingCloud(false);
    if (id) {
      setGeneratedLink(`${window.location.origin}/#/view/${id}`);
      setCloudId(id);
    }
  }, [config, holds, metadata, user]);

  return (
    <Routes>
      <Route path="/" element={<GalleryPage onResetState={handleNewWall} />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route path="/builder" element={
        <WallEditor 
          mode="BUILD" user={user} 
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall}
          onRemoveAllHolds={() => setHolds([])}
          onChangeAllHoldsColor={(c: string) => setHolds(h => h.map(x => ({...x, color: c})))}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/setter" element={
        <WallEditor 
          mode="SET" user={user} 
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall}
          onRemoveAllHolds={() => setHolds([])}
          onChangeAllHoldsColor={(c: string) => setHolds(h => h.map(x => ({...x, color: c})))}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/view/:wallId" element={
        <WallEditor 
          mode="VIEW" user={user} 
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          recordAction={recordAction} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
          onSaveCloud={saveToCloud} isSavingCloud={isSavingCloud} generatedLink={generatedLink}
          onHome={() => navigate('/')} onNewWall={handleNewWall}
          onRemoveAllHolds={() => {}}
          onChangeAllHoldsColor={() => {}}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
