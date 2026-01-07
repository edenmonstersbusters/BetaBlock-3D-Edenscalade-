
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';

// Core imports
import { Scene } from './core/Scene';
import { api } from './core/api'; 
import { validateBetaBlockJson } from './utils/validation';
import { resolveHoldWorldData, calculateLocalCoords } from './utils/geometry';

// Custom Hooks
import { useHistory } from './hooks/useHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Feature Components
import { EditorPanel } from './features/builder/EditorPanel';
import { RouteEditorPanel } from './features/builder/RouteEditorPanel';
import { GalleryPage } from './features/gallery/GalleryPage';

// UI Components
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { GlobalModal, ModalConfig } from './components/ui/GlobalModal';
import { ContextMenu, ContextMenuData } from './components/ui/ContextMenu';
import { Undo2, Redo2 } from 'lucide-react';

// Types
import { WallConfig, AppMode, HoldDefinition, PlacedHold, WallSegment, BetaBlockFile } from './types';
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
  // --- ROUTING ---
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGallery = location.pathname === '/';
  const mode: AppMode = location.pathname.startsWith('/setter') ? 'SET' : 'BUILD';

  // --- STATE ---
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const screenshotRef = useRef<(() => string | null) | null>(null);
  
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

  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const lastWallPointer = useRef<{ x: number, y: number, segmentId: string } | null>(null);

  // --- HISTORY HOOK ---
  const { past, future, recordAction, undo, redo, canUndo, canRedo } = useHistory<{config: WallConfig, holds: PlacedHold[]}>({ config, holds });

  // Wrapper pour l'historique qui sauvegarde l'état courant
  const saveToHistory = useCallback(() => {
    recordAction({ config, holds });
  }, [recordAction, config, holds]);

  // Fonction pour appliquer un état depuis l'historique
  const applyHistoryState = useCallback((state: {config: WallConfig, holds: PlacedHold[]}) => {
    setConfig(state.config);
    setHolds(state.holds);
  }, []);

  const performUndo = useCallback(() => undo({ config, holds }, applyHistoryState), [undo, config, holds, applyHistoryState]);
  const performRedo = useCallback(() => redo({ config, holds }, applyHistoryState), [redo, config, holds, applyHistoryState]);

  // --- EFFECTS ---
  useEffect(() => {
    if (isGallery) return;
    const wallId = searchParams.get('id');
    if (wallId && wallId !== cloudId) {
      const loadFromCloud = async () => {
        setIsLoadingCloud(true);
        const { data, error } = await api.getWall(wallId);
        if (data) {
          setConfig(data.config);
          setHolds(data.holds);
          setCloudId(wallId);
          setModal({ title: "Mur Chargé", message: "La configuration a été récupérée depuis le cloud.", isAlert: false });
        } else {
          setModal({ title: "Erreur", message: `Impossible de charger le mur : ${error}`, isAlert: true });
        }
        setIsLoadingCloud(false);
      };
      loadFromCloud();
    }
  }, [searchParams, isGallery, cloudId]); 

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds)); }, [holds]);

  const validIds = useMemo(() => new Set(config.segments.map(s => s.id)), [config.segments]);
  useEffect(() => {
    const filtered = holds.filter(h => validIds.has(h.segmentId));
    if (filtered.length !== holds.length) setHolds(filtered);
  }, [validIds]);

  // --- LOGIC: HOLDS & SELECTION ---
  const selectAllHolds = useCallback(() => {
    setSelectedPlacedHoldIds(holds.map(h => h.id));
  }, [holds]);

  const handleSelectHold = (id: string | null, multi: boolean = false) => {
    if (id === null) {
        setSelectedPlacedHoldIds([]);
        return;
    }
    if (multi) {
        setSelectedPlacedHoldIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
        setSelectedPlacedHoldIds([id]);
    }
  };

  const copySelectedHolds = useCallback(() => {
    if (selectedPlacedHoldIds.length === 0) return;
    const toCopy = holds.filter(h => selectedPlacedHoldIds.includes(h.id));
    setClipboard(JSON.parse(JSON.stringify(toCopy)));
  }, [selectedPlacedHoldIds, holds]);

  const pasteHolds = useCallback((targetPos?: { x: number, y: number, segmentId: string }) => {
    if (clipboard.length === 0) return;
    saveToHistory();
    let newHolds: PlacedHold[] = [];
    if (targetPos) {
      const anchor = clipboard[0];
      const dx = targetPos.x - anchor.x;
      const dy = targetPos.y - anchor.y;
      newHolds = clipboard.map(h => {
        const seg = config.segments.find(s => s.id === targetPos.segmentId);
        const maxHeight = seg?.height || 10;
        return { ...h, id: crypto.randomUUID(), segmentId: targetPos.segmentId, x: h.x + dx, y: Math.min(maxHeight, Math.max(0, h.y + dy)) };
      });
    } else {
      newHolds = clipboard.map(h => ({
        ...h, id: crypto.randomUUID(), x: h.x + 0.1, y: Math.min(h.y + 0.1, config.segments.find(s => s.id === h.segmentId)?.height || h.y)
      }));
    }
    setHolds(prev => [...prev, ...newHolds]);
    setSelectedPlacedHoldIds(newHolds.map(h => h.id));
  }, [clipboard, saveToHistory, config.segments]);

  const removeHoldsAction = useCallback((ids: string[]) => {
    if (ids.length === 0) return; // Sécurité ajoutée
    const isMultiple = ids.length > 1;
    setModal({
      title: "Suppression", 
      message: isMultiple ? `Voulez-vous vraiment supprimer ces ${ids.length} prises ?` : "Voulez-vous vraiment supprimer cette prise ?", 
      confirmText: "Supprimer",
      onConfirm: () => {
        saveToHistory();
        const idSet = new Set(ids);
        setHolds(prev => prev.filter(h => !idSet.has(h.id)));
        setSelectedPlacedHoldIds(prev => prev.filter(id => !idSet.has(id)));
      }
    });
  }, [saveToHistory]);

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (!selectedHold || selectedPlacedHoldIds.length > 0) return;
    saveToHistory(); 
    const coords = calculateLocalCoords(position, segmentId, config);
    if (!coords) return;
    const newHold: PlacedHold = {
      id: crypto.randomUUID(), modelId: selectedHold.id, filename: selectedHold.filename,
      modelBaseScale: selectedHold.baseScale, segmentId: segmentId,
      x: coords.x, y: coords.y, spin: holdSettings.rotation, scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale], color: holdSettings.color
    };
    setHolds([...holds, newHold]);
  };

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
    const seg = config.segments.find(s => s.id === id);
    if (!seg) return;
    const newHeight = updates.height !== undefined ? seg.height + updates.height : seg.height;
    const newAngle = updates.angle !== undefined ? seg.angle + updates.angle : seg.angle;
    if (updates.height !== undefined) {
      const segmentHolds = holds.filter(h => h.segmentId === id);
      if (segmentHolds.some(h => h.y > newHeight)) {
        setModal({ title: "Action impossible", message: "Des prises dépassent la nouvelle hauteur.", isAlert: true });
        return;
      }
    }
    saveToHistory();
    setConfig(prev => ({ ...prev, segments: prev.segments.map(s => s.id === id ? { ...s, height: Math.max(0.5, newHeight), angle: Math.min(85, Math.max(-15, newAngle)) } : s) }));
  };

  const removeSegmentAction = (id: string) => {
    const segmentHolds = holds.filter(h => h.segmentId === id);
    setModal({
      title: "Supprimer le pan",
      message: segmentHolds.length > 0 ? `Ce pan contient ${segmentHolds.length} prise(s). Elles seront supprimées.` : "Voulez-vous vraiment supprimer ce pan ?",
      confirmText: "Supprimer",
      onConfirm: () => {
        saveToHistory();
        setConfig(prev => ({ ...prev, segments: prev.segments.filter((s) => s.id !== id) }));
      }
    });
  };

  // --- PERSISTENCE ---
  const handleNewWall = useCallback(() => {
    setModal({
      title: "Nouveau Mur",
      message: "Voulez-vous créer un nouveau mur vierge ? Tout travail non sauvegardé sera perdu.",
      confirmText: "Créer",
      onConfirm: () => {
        saveToHistory();
        // Reset to strict initial config to ensure clean slate
        const resetConfig = JSON.parse(JSON.stringify(INITIAL_CONFIG));
        setConfig(resetConfig);
        setHolds([]);
        setCloudId(null);
        setSelectedPlacedHoldIds([]);
      }
    });
  }, [saveToHistory]);

  const downloadJson = useCallback(() => {
    const data: BetaBlockFile = {
      version: APP_VERSION,
      metadata: { name: `Mur Beta ${new Date().toLocaleDateString()}`, timestamp: new Date().toISOString(), appVersion: APP_VERSION },
      config: config, holds: holds
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `mon-mur-beta-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    setModal(null);
  }, [config, holds]);

  const saveToCloud = useCallback(async () => {
    setIsSavingCloud(true);
    let thumbnail: string | undefined = undefined;
    if (screenshotRef.current) { const shot = screenshotRef.current(); if (shot) thumbnail = shot; }
    const data: BetaBlockFile = {
      version: APP_VERSION,
      metadata: { name: `Mur Cloud ${new Date().toLocaleDateString()}`, timestamp: new Date().toISOString(), appVersion: APP_VERSION, thumbnail },
      config: config, holds: holds
    };
    const { id, error } = await api.saveWall(data);
    setIsSavingCloud(false);
    if (id) {
      setGeneratedLink(`${window.location.origin}${window.location.pathname}#/builder?id=${id}`);
      setCloudId(id);
    } else {
      setGeneratedLink(null);
      alert(`Erreur de sauvegarde : ${error}`);
    }
  }, [config, holds]);

  const openSaveDialog = useCallback(() => {
    setGeneratedLink(null);
    setModal({ title: "Options de Sauvegarde", message: "Choisissez comment vous souhaitez sauvegarder votre mur.", isSaveDialog: true });
  }, []);

  const importWallFromJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const validated = validateBetaBlockJson(json);
        if (!validated) throw new Error("Fichier corrompu ou format incompatible.");
        saveToHistory();
        setConfig(validated.config);
        setHolds(validated.holds);
        setModal({ title: "Succès", message: "Le mur a été chargé avec succès.", isAlert: true });
      } catch (err: any) {
        setModal({ title: "Erreur de chargement", message: err.message || "Impossible de lire le fichier.", isAlert: true });
      }
    };
    reader.readAsText(file);
  }, [saveToHistory]);

  // --- SHORTCUTS HOOK ---
  useKeyboardShortcuts({
    undo: performUndo,
    redo: performRedo,
    selectAll: selectAllHolds,
    copy: copySelectedHolds,
    paste: () => pasteHolds(lastWallPointer.current || undefined),
    save: openSaveDialog,
    open: () => globalFileInputRef.current?.click(),
    deleteAction: () => {
      if (selectedPlacedHoldIds.length > 0) {
        removeHoldsAction(selectedPlacedHoldIds);
      }
    }
  }, [performUndo, performRedo, selectAllHolds, copySelectedHolds, pasteHolds, openSaveDialog, selectedPlacedHoldIds, removeHoldsAction]);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // --- RENDER ---
  const renderableHolds = useMemo(() => holds.map(h => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter(h => h !== null) as (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[]
  , [holds, config]);

  if (isGallery) return <GalleryPage />;

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      <input type="file" ref={globalFileInputRef} className="hidden" accept=".json" onChange={(e) => { const file = e.target.files?.[0]; if (file) importWallFromJson(file); e.target.value = ''; }} />

      <LoadingOverlay isVisible={isLoadingCloud} />

      {mode === 'BUILD' ? (
        <EditorPanel 
            config={config} holds={holds} onUpdate={setConfig} 
            onNext={() => navigate('/setter')} showModal={(c) => setModal(c)}
            onActionStart={saveToHistory} onExport={openSaveDialog} onImport={importWallFromJson}
            onNew={handleNewWall}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => navigate('/builder')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
            holdSettings={holdSettings} onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds} onRemoveHold={(id) => removeHoldsAction([id])} 
            onRemoveAllHolds={() => { if (holds.length === 0) return; setModal({ title: "Tout supprimer", message: "Vider le mur ?", confirmText: "Tout supprimer", onConfirm: () => { saveToHistory(); setHolds([]); setSelectedPlacedHoldIds([]); }}); }} 
            onChangeAllHoldsColor={(c) => { if (holds.length === 0) return; setModal({ title: "Confirmation", message: "Changer la couleur de toutes les prises ?", isAlert: false, onConfirm: () => { saveToHistory(); setHolds(holds.map(h => ({ ...h, color: c }))); }}); }} 
            selectedPlacedHoldIds={selectedPlacedHoldIds}
            onUpdatePlacedHold={(ids, u) => { const idSet = new Set(ids); setHolds(holds.map(h => idSet.has(h.id) ? { ...h, ...u } : h)); }}
            onSelectPlacedHold={handleSelectHold} onDeselect={() => setSelectedPlacedHoldIds([])}
            onActionStart={saveToHistory} onReplaceHold={(ids, def) => { saveToHistory(); const idSet = new Set(ids); setHolds(prev => prev.map(h => idSet.has(h.id) ? { ...h, modelId: def.id, filename: def.filename, modelBaseScale: def.baseScale } : h)); }}
            onRemoveMultiple={() => removeHoldsAction(selectedPlacedHoldIds)}
            onExport={openSaveDialog} onImport={importWallFromJson}
            onNew={handleNewWall}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          <button disabled={!canUndo} onClick={performUndo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Annuler (Ctrl+Z)"><Undo2 size={20} /></button>
          <button disabled={!canRedo} onClick={performRedo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Rétablir (Ctrl+Y)"><Redo2 size={20} /></button>
      </div>

      <div className="flex-1 relative h-full">
        <Scene 
            config={config} mode={mode} holds={renderableHolds} onPlaceHold={handlePlaceHold}
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
        onCopyHold={copySelectedHolds} hasClipboard={clipboard.length > 0}
        onPasteHold={pasteHolds} onDelete={(id) => { if (contextMenu?.type === 'HOLD') removeHoldsAction([id]); else removeSegmentAction(id); }}
        onRotateHold={(id, delta) => { const targetIds = selectedPlacedHoldIds.includes(id) ? selectedPlacedHoldIds : [id]; saveToHistory(); const idSet = new Set(targetIds); setHolds(holds.map(item => idSet.has(item.id) ? { ...item, spin: (item.spin + delta) % 360 } : item)); }}
        onColorHold={(id, color) => { const targetIds = selectedPlacedHoldIds.includes(id) ? selectedPlacedHoldIds : [id]; saveToHistory(); const idSet = new Set(targetIds); setHolds(holds.map(item => idSet.has(item.id) ? { ...item, color: color } : item)); }}
        onSegmentUpdate={updateSegmentQuickly}
      />

      <GlobalModal 
        config={modal} onClose={() => setModal(null)} 
        isSavingCloud={isSavingCloud} generatedLink={generatedLink} 
        onSaveCloud={saveToCloud} onDownload={downloadJson} 
      />
    </div>
  );
}

export default App;
