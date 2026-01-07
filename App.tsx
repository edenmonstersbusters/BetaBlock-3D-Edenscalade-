
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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

function App() {
  // --- ROUTING & AUTH ---
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  
  // Routing Logic
  const isGallery = location.pathname === '/';
  const isBuilder = location.pathname.startsWith('/builder');
  const isSetter = location.pathname.startsWith('/setter');
  const isViewer = location.pathname.startsWith('/view');

  let mode: AppMode = 'BUILD';
  if (isSetter) mode = 'SET';
  if (isViewer) mode = 'VIEW';

  // --- STATE ---
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const screenshotRef = useRef<(() => Promise<string | null>) | null>(null);
  
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

  const [clipboard, setClipboard] = useState<PlacedHold[]>([]);
  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldIds, setSelectedPlacedHoldIds] = useState<string[]>([]);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });
  
  // UI States
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const lastWallPointer = useRef<{ x: number, y: number, segmentId: string } | null>(null);

  // --- HISTORY HOOK ---
  const { past, future, recordAction, undo, redo, canUndo, canRedo } = useHistory<{config: WallConfig, holds: PlacedHold[]}>({ config, holds });

  // Dirty State Logic (Safety Exit)
  const isDirty = past.length > 0;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // --- AUTH & LOAD EFFECTS ---
  useEffect(() => {
    // Initial Auth Check (Safe)
    auth.getUser().then(u => {
      if (u) setUser(u);
    });
    
    // Auth Listener
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isGallery) return;

    // Handle Route ID Loading
    const wallId = searchParams.get('id') || (isViewer ? location.pathname.split('/').pop() : null);

    if (wallId && wallId !== cloudId) {
      const loadFromCloud = async () => {
        setIsLoadingCloud(true);
        const { data, error } = await api.getWall(wallId);
        if (data) {
          setConfig(data.config);
          setHolds(data.holds);
          setMetadata(data.metadata);
          setCloudId(wallId);
          // Don't show success modal for Viewer mode to keep it clean
          if (!isViewer) {
            setModal({ title: "Mur Chargé", message: "La configuration a été récupérée.", isAlert: false });
          }
        } else {
          setModal({ title: "Erreur", message: `Impossible de charger le mur : ${error}`, isAlert: true });
        }
        setIsLoadingCloud(false);
      };
      loadFromCloud();
    }
  }, [searchParams, isViewer, isGallery, location.pathname, cloudId]); 

  // Persistence Locale
  useEffect(() => { 
    if (!isViewer) { 
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); 
      localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds)); 
    }
  }, [config, holds, isViewer]);

  const validIds = useMemo(() => new Set(config.segments.map(s => s.id)), [config.segments]);
  useEffect(() => {
    const filtered = holds.filter(h => validIds.has(h.segmentId));
    if (filtered.length !== holds.length) setHolds(filtered);
  }, [validIds]);

  // --- LOGIC: PLACING HOLDS ---
  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (!selectedHold) return;

    const coords = calculateLocalCoords(position, segmentId, config);
    if (!coords) return;

    // Vérification des limites
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

    setHolds(prev => [...prev, newHold]);
  };

  // --- LOGIC: IMPORT FILE ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const validated = validateBetaBlockJson(json);
        
        if (validated) {
          saveToHistory();
          setConfig(validated.config);
          setHolds(validated.holds);
          setMetadata({ 
              ...validated.metadata, 
              // On garde l'auteur original s'il existe, sinon on reset
              // Important : si on importe, on reset le cloudId pour éviter d'écraser l'original
          });
          setCloudId(null);
          setModal({ title: "Import réussi", message: "Le mur a été chargé avec succès.", isAlert: false });
        } else {
          throw new Error("Format invalide");
        }
      } catch (err) {
        setModal({ title: "Erreur d'import", message: "Le fichier n'est pas un fichier BetaBlock valide.", isAlert: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- ACTIONS ---

  const saveToHistory = useCallback(() => {
    if (mode !== 'VIEW') recordAction({ config, holds });
  }, [recordAction, config, holds, mode]);

  const applyHistoryState = useCallback((state: {config: WallConfig, holds: PlacedHold[]}) => {
    setConfig(state.config);
    setHolds(state.holds);
  }, []);

  const performUndo = useCallback(() => undo({ config, holds }, applyHistoryState), [undo, config, holds, applyHistoryState]);
  const performRedo = useCallback(() => redo({ config, holds }, applyHistoryState), [redo, config, holds, applyHistoryState]);

  const handleSafeHome = () => {
    if (isDirty) {
      setModal({
        title: "Modifications non sauvegardées",
        message: "En quittant, vous perdrez vos changements. Voulez-vous vraiment retourner à la galerie ?",
        confirmText: "Quitter sans sauver",
        onConfirm: () => navigate('/')
      });
    } else {
      navigate('/');
    }
  };

  const handleRemix = () => {
    if (!user) {
      setModal({
        title: "Connexion Requise",
        message: "Vous devez être connecté pour remixer ce mur et le sauvegarder dans votre collection.",
        confirmText: "Se connecter",
        onConfirm: () => setShowAuthModal(true)
      });
      return;
    }

    setModal({
      title: "Remixer ce mur ?",
      message: "Cela va créer une copie locale de ce mur que vous pourrez modifier. Le mur original restera intact.",
      confirmText: "Créer une copie",
      onConfirm: () => {
        setCloudId(null);
        setMetadata({ 
          ...metadata, 
          name: `${metadata.name} (Remix)`, 
          authorId: user.id,
          // On change l'auteur pour le remixeur
          authorName: user.user_metadata?.display_name || user.email.split('@')[0],
          timestamp: new Date().toISOString()
        });
        navigate('/builder');
      }
    });
  };

  const handleNewWall = useCallback(() => {
    setModal({
      title: "Nouveau Mur",
      message: "Voulez-vous créer un nouveau mur vierge ? Tout travail non sauvegardé sera perdu.",
      confirmText: "Créer",
      onConfirm: () => {
        saveToHistory();
        const resetConfig = JSON.parse(JSON.stringify(INITIAL_CONFIG));
        setConfig(resetConfig);
        setHolds([]);
        setMetadata(prev => ({ ...prev, name: "Nouveau Mur", authorId: undefined, authorName: undefined }));
        setCloudId(null);
        setSelectedPlacedHoldIds([]);
      }
    });
  }, [saveToHistory]);

  const saveToCloud = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSavingCloud(true);
    let thumbnail: string | undefined = undefined;
    
    if (screenshotRef.current) { 
        thumbnail = await screenshotRef.current() || undefined; 
    }

    // Récupération du pseudo utilisateur
    const authorName = user.user_metadata?.display_name || user.email.split('@')[0];

    const updatedMetadata = { 
        ...metadata, 
        timestamp: new Date().toISOString(), 
        thumbnail,
        authorId: user.id,
        authorName: authorName 
    };

    // Mise à jour de l'état local pour refléter la sauvegarde
    setMetadata(updatedMetadata);

    const data: BetaBlockFile = {
      version: APP_VERSION,
      metadata: updatedMetadata,
      config: config, 
      holds: holds
    };

    const { id, error } = await api.saveWall(data);
    setIsSavingCloud(false);
    
    if (id) {
      setGeneratedLink(`${window.location.origin}${window.location.pathname}#/view/${id}`);
      setCloudId(id);
    } else {
      setGeneratedLink(null);
      alert(`Erreur de sauvegarde : ${error}`);
    }
  }, [config, holds, metadata, user]);

  // --- RENDER ---
  const renderableHolds = useMemo(() => holds.map(h => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter(h => h !== null) as (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[]
  , [holds, config]);

  const handleSelectHold = (id: string | null, multi: boolean = false) => {
    if (mode === 'VIEW') return;
    if (id === null) { setSelectedPlacedHoldIds([]); return; }
    if (multi) setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    else setSelectedPlacedHoldIds([id]);
  };

  const removeHoldsAction = useCallback((ids: string[]) => {
    if (ids.length === 0 || mode === 'VIEW') return;
    saveToHistory();
    const idSet = new Set(ids);
    setHolds(prev => prev.filter(h => !idSet.has(h.id)));
    setSelectedPlacedHoldIds(prev => prev.filter(id => !idSet.has(id)));
  }, [saveToHistory, mode]);

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
      if(mode === 'VIEW') return;
      const seg = config.segments.find(s => s.id === id);
      if (!seg) return;
      const newHeight = updates.height !== undefined ? seg.height + updates.height : seg.height;
      const newAngle = updates.angle !== undefined ? seg.angle + updates.angle : seg.angle;
      saveToHistory();
      setConfig(prev => ({ ...prev, segments: prev.segments.map(s => s.id === id ? { ...s, height: Math.max(0.5, newHeight), angle: Math.min(85, Math.max(-15, newAngle)) } : s) }));
  };

  useKeyboardShortcuts({
    undo: performUndo, redo: performRedo, selectAll: () => setSelectedPlacedHoldIds(holds.map(h => h.id)),
    copy: () => { if (selectedPlacedHoldIds.length > 0) setClipboard(JSON.parse(JSON.stringify(holds.filter(h => selectedPlacedHoldIds.includes(h.id))))); },
    paste: () => { if (clipboard.length > 0 && mode !== 'VIEW') { saveToHistory(); setHolds(prev => [...prev, ...clipboard.map(h => ({ ...h, id: crypto.randomUUID(), x: h.x + 0.1, y: Math.min(h.y + 0.1, config.segments.find(s => s.id === h.segmentId)?.height || h.y) }))]); } },
    save: () => setModal({ title: "Sauvegarder", message: "Sauvegarder ?", isSaveDialog: true }),
    open: () => globalFileInputRef.current?.click(),
    deleteAction: () => removeHoldsAction(selectedPlacedHoldIds)
  }, [performUndo, performRedo, selectedPlacedHoldIds, removeHoldsAction, clipboard, mode]);

  if (isGallery) return <GalleryPage />;

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      <input 
        type="file" 
        ref={globalFileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleImportFile}
      />
      <LoadingOverlay isVisible={isLoadingCloud} />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}

      {/* PANELS */}
      {mode === 'VIEW' ? (
        <ViewerPanel 
            metadata={metadata} config={config} holds={holds}
            onHome={handleSafeHome} onRemix={handleRemix}
            onShare={() => setModal({ title: "Partager", message: "Lien généré", isSaveDialog: true })}
        />
      ) : mode === 'BUILD' ? (
        <EditorPanel 
            config={config} holds={holds} onUpdate={setConfig} 
            onNext={() => navigate('/setter')} showModal={(c) => setModal(c)}
            onActionStart={saveToHistory} onExport={() => setModal({ title: "Sauvegarder", message: "", isSaveDialog: true })}
            onImport={() => globalFileInputRef.current?.click()} onNew={handleNewWall}
            onHome={handleSafeHome}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => navigate('/builder')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
            holdSettings={holdSettings} onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds} onRemoveHold={(id) => removeHoldsAction([id])} 
            onRemoveAllHolds={() => { saveToHistory(); setHolds([]); }} 
            onChangeAllHoldsColor={(c) => { saveToHistory(); setHolds(holds.map(h => ({ ...h, color: c }))); }} 
            selectedPlacedHoldIds={selectedPlacedHoldIds}
            onUpdatePlacedHold={(ids, u) => { const idSet = new Set(ids); setHolds(holds.map(h => idSet.has(h.id) ? { ...h, ...u } : h)); }}
            onSelectPlacedHold={handleSelectHold} onDeselect={() => setSelectedPlacedHoldIds([])}
            onActionStart={saveToHistory} onReplaceHold={(ids, def) => { saveToHistory(); const idSet = new Set(ids); setHolds(prev => prev.map(h => idSet.has(h.id) ? { ...h, modelId: def.id, filename: def.filename } : h)); }}
            onRemoveMultiple={() => removeHoldsAction(selectedPlacedHoldIds)}
            onExport={() => setModal({ title: "Sauvegarder", message: "", isSaveDialog: true })}
            onImport={() => globalFileInputRef.current?.click()} onNew={handleNewWall}
            onHome={handleSafeHome}
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
            onSelectPlacedHold={handleSelectHold}
            onContextMenu={(type, id, x, y, wx, wy) => setContextMenu({ type, id, x, y, wallX: wx, wallY: wy })}
            onWallPointerUpdate={(info) => { lastWallPointer.current = info; }}
            onHoldDrag={(id, x, y, segId) => setHolds(prev => prev.map(h => h.id === id ? { ...h, x, y, segmentId: segId } : h))}
            onHoldDragEnd={saveToHistory} screenshotRef={screenshotRef}
        />
      </div>

      <ContextMenu 
        data={contextMenu} onClose={() => setContextMenu(null)} onUpdateData={setContextMenu}
        onCopyHold={() => {}} hasClipboard={clipboard.length > 0}
        onPasteHold={() => {}} onDelete={(id) => { if (contextMenu?.type === 'HOLD') removeHoldsAction([id]); }}
        onRotateHold={(id, delta) => { saveToHistory(); setHolds(holds.map(h => h.id === id ? { ...h, spin: (h.spin + delta) } : h)); }}
        onColorHold={(id, c) => { saveToHistory(); setHolds(holds.map(h => h.id === id ? { ...h, color: c } : h)); }}
        onSegmentUpdate={updateSegmentQuickly}
      />

      <GlobalModal 
        config={modal} onClose={() => setModal(null)} 
        isSavingCloud={isSavingCloud} generatedLink={generatedLink} 
        onSaveCloud={saveToCloud} onDownload={() => {/* DL Logic */}}
        wallName={metadata.name}
        onWallNameChange={(name) => setMetadata(prev => ({ ...prev, name }))}
      />
    </div>
  );
}

export default App;
