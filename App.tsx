
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { EditorPanel } from './components/EditorPanel';
import { RouteEditorPanel } from './components/RouteEditorPanel';
import { WallConfig, AppMode, HoldDefinition, PlacedHold, WallSegment, BetaBlockFile } from './types';
import { AlertTriangle, Info, Trash2, RotateCw, RotateCcw, MoveUp, MoveDown, Palette, ChevronRight, Undo2, Redo2, Copy, ClipboardPaste, ArrowLeft } from 'lucide-react';

// Import types to ensure global JSX intrinsic element extensions are loaded
import './types';

const APP_VERSION = "1.1";

const PALETTE = [
    '#990000', // Rouge Sang
    '#004400', // Vert Forêt
    '#002266', // Bleu de Prusse
    '#aa4400', // Orange Industriel
    '#ccaa00', // Jaune Ocre
    '#440066', // Violet de Minuit
    '#882244', // Rose Oxyde
    '#444444', // Gris Béton
    '#f8f8f8', // Blanc Pur
    '#111111'  // Noir Mat
];

const INITIAL_CONFIG: WallConfig = {
  width: 4.5,
  segments: [
    { id: '1', height: 2.2, angle: 0 },   // Socle vertical
    { id: '2', height: 2.0, angle: 30 },  // Dévers principal
    { id: '3', height: 1.5, angle: 15 },  // Rétablissement
  ],
};

const STORAGE_KEYS = {
  CONFIG: 'betablock_wall_config',
  HOLDS: 'betablock_placed_holds',
};

const resolveHoldWorldData = (hold: PlacedHold, config: WallConfig) => {
  const segmentIndex = config.segments.findIndex(s => s.id === hold.segmentId);
  if (segmentIndex === -1) return null;

  let currentY = 0;
  let currentZ = 0;
  for (let i = 0; i < segmentIndex; i++) {
    const s = config.segments[i];
    const rad = (s.angle * Math.PI) / 180;
    currentY += s.height * Math.cos(rad);
    currentZ += s.height * Math.sin(rad);
  }

  const segment = config.segments[segmentIndex];
  const rad = (segment.angle * Math.PI) / 180;
  
  const dirY = Math.cos(rad);
  const dirZ = Math.sin(rad);

  const posX = hold.x;
  const posY = currentY + (hold.y * dirY);
  const posZ = currentZ + (hold.y * dirZ);

  const qBase = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), 
    new THREE.Vector3(0, -Math.sin(rad), Math.cos(rad))
  );
  const qSpin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1), 
    (hold.spin * Math.PI) / 180
  );
  qBase.multiply(qSpin);
  const euler = new THREE.Euler().setFromQuaternion(qBase);

  return {
    position: [posX, posY, posZ] as [number, number, number],
    rotation: [euler.x, euler.y, euler.z] as [number, number, number]
  };
};

function App() {
  const [mode, setMode] = useState<AppMode>('BUILD');
  const [clipboard, setClipboard] = useState<PlacedHold[]>([]);
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const lastWallPointer = useRef<{ x: number, y: number, segmentId: string } | null>(null);
  
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

  const [past, setPast] = useState<{config: WallConfig, holds: PlacedHold[]}[]>([]);
  const [future, setFuture] = useState<{config: WallConfig, holds: PlacedHold[]}[]>([]);

  const recordAction = useCallback(() => {
    setPast(prev => [...prev, { config: JSON.parse(JSON.stringify(config)), holds: JSON.parse(JSON.stringify(holds)) }]);
    setFuture([]);
  }, [config, holds]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [{ config: JSON.parse(JSON.stringify(config)), holds: JSON.parse(JSON.stringify(holds)) }, ...prev]);
    setConfig(previous.config);
    setHolds(previous.holds);
    setPast(prev => prev.slice(0, -1));
  }, [past, config, holds]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, { config: JSON.parse(JSON.stringify(config)), holds: JSON.parse(JSON.stringify(holds)) }]);
    setConfig(next.config);
    setHolds(next.holds);
    setFuture(prev => prev.slice(1));
  }, [future, config, holds]);

  const exportWallToJson = useCallback(() => {
    const data: BetaBlockFile = {
      version: APP_VERSION,
      metadata: {
        name: `Mur Beta ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        appVersion: APP_VERSION
      },
      config: config,
      holds: holds
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mon-mur-beta-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [config, holds]);

  const validateBetaBlockJson = (json: any): BetaBlockFile | null => {
    if (!json || typeof json !== 'object') return null;
    if (!json.version || !json.config || !Array.isArray(json.holds)) return null;
    const config = json.config;
    if (typeof config.width !== 'number' || !Array.isArray(config.segments)) return null;
    for (const seg of config.segments) if (!seg.id || typeof seg.height !== 'number' || typeof seg.angle !== 'number') return null;
    for (const hold of json.holds) {
      if (!hold.id || !hold.segmentId || typeof hold.x !== 'number' || typeof hold.y !== 'number') return null;
      const segment = config.segments.find((s: any) => s.id === hold.segmentId);
      if (!segment || hold.y > segment.height || Math.abs(hold.x) > config.width / 2) console.warn(`Validation: Prise ${hold.id} hors limites.`);
    }
    return json as BetaBlockFile;
  };

  const importWallFromJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const validated = validateBetaBlockJson(json);
        if (!validated) throw new Error("Fichier corrompu ou format incompatible.");
        recordAction();
        setConfig(validated.config);
        setHolds(validated.holds);
        setModal({ title: "Succès", message: "Le mur a été chargé avec succès.", isAlert: true });
      } catch (err: any) {
        setModal({ title: "Erreur de chargement", message: err.message || "Impossible de lire le fichier.", isAlert: true });
      }
    };
    reader.readAsText(file);
  }, [recordAction]);

  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldIds, setSelectedPlacedHoldIds] = useState<string[]>([]);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });

  const copySelectedHolds = useCallback(() => {
    if (selectedPlacedHoldIds.length === 0) return;
    const toCopy = holds.filter(h => selectedPlacedHoldIds.includes(h.id));
    setClipboard(JSON.parse(JSON.stringify(toCopy)));
  }, [selectedPlacedHoldIds, holds]);

  const pasteHolds = useCallback((targetPos?: { x: number, y: number, segmentId: string }) => {
    if (clipboard.length === 0) return;
    recordAction();

    let newHolds: PlacedHold[] = [];
    
    if (targetPos) {
      const anchor = clipboard[0];
      const dx = targetPos.x - anchor.x;
      const dy = targetPos.y - anchor.y;

      newHolds = clipboard.map(h => {
        const seg = config.segments.find(s => s.id === targetPos.segmentId);
        const maxHeight = seg?.height || 10;
        return {
          ...h,
          id: crypto.randomUUID(),
          segmentId: targetPos.segmentId,
          x: h.x + dx,
          y: Math.min(maxHeight, Math.max(0, h.y + dy))
        };
      });
    } else {
      newHolds = clipboard.map(h => ({
        ...h,
        id: crypto.randomUUID(),
        x: h.x + 0.1,
        y: Math.min(h.y + 0.1, config.segments.find(s => s.id === h.segmentId)?.height || h.y)
      }));
    }

    setHolds(prev => [...prev, ...newHolds]);
    setSelectedPlacedHoldIds(newHolds.map(h => h.id));
  }, [clipboard, recordAction, config.segments]);

  const selectAllHolds = useCallback(() => {
    setSelectedPlacedHoldIds(holds.map(h => h.id));
  }, [holds]);

  const [modal, setModal] = useState<{
    title: string; message: string; onConfirm?: () => void; confirmText?: string; isAlert?: boolean;
  } | null>(null);

  const removeHoldsAction = useCallback((ids: string[]) => {
    const isMultiple = ids.length > 1;
    setModal({
      title: "Suppression", 
      message: isMultiple ? `Voulez-vous vraiment supprimer ces ${ids.length} prises ?` : "Voulez-vous vraiment supprimer cette prise ?", 
      confirmText: "Supprimer",
      onConfirm: () => {
        recordAction();
        const idSet = new Set(ids);
        setHolds(prev => prev.filter(h => !idSet.has(h.id)));
        setSelectedPlacedHoldIds(prev => prev.filter(id => !idSet.has(id)));
      }
    });
  }, [recordAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Éviter de supprimer si l'utilisateur est dans un champ texte (ex: nom du mur)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key;
      const lowerKey = key.toLowerCase();

      if (isCtrl) {
        // Liste des touches avec Ctrl que nous voulons intercepter
        const handledCtrlKeys = ['z', 'y', 'a', 'c', 'v', 's', 'o'];
        if (handledCtrlKeys.includes(lowerKey)) {
          e.preventDefault();
          e.stopPropagation();
          switch (lowerKey) {
            case 'z': if (e.shiftKey) redo(); else undo(); break;
            case 'y': redo(); break;
            case 'a': selectAllHolds(); break;
            case 'c': copySelectedHolds(); break;
            case 'v': pasteHolds(lastWallPointer.current || undefined); break;
            case 's': exportWallToJson(); break;
            case 'o': globalFileInputRef.current?.click(); break;
          }
        }
      } else {
        // Liste des touches sans Ctrl (Suppression)
        if ((key === 'Delete' || key === 'Backspace') && selectedPlacedHoldIds.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          removeHoldsAction(selectedPlacedHoldIds);
        }
      }
    };
    
    // Utilisation de capture: true pour être certain d'intercepter avant les raccourcis système
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo, selectAllHolds, copySelectedHolds, pasteHolds, exportWallToJson, selectedPlacedHoldIds, removeHoldsAction]);

  const [contextMenu, setContextMenu] = useState<{
    type: 'HOLD' | 'SEGMENT'; id: string; x: number; y: number; wallX?: number; wallY?: number; subMenu?: 'COLOR';
  } | null>(null);

  useEffect(() => {
    const validIds = new Set(config.segments.map(s => s.id));
    const filtered = holds.filter(h => validIds.has(h.segmentId));
    if (filtered.length !== holds.length) setHolds(filtered);
  }, [config.segments]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds)); }, [holds]);

  const renderableHolds = useMemo(() => {
    return holds.map(h => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter(h => h !== null) as (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  }, [holds, config]);

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (!selectedHold || selectedPlacedHoldIds.length > 0) return;
    const segmentIndex = config.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return;
    recordAction(); 
    const x = position.x;
    let segmentStartY = 0; let segmentStartZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i]; const r = (s.angle * Math.PI) / 180;
        segmentStartY += s.height * Math.cos(r); segmentStartZ += s.height * Math.sin(r);
    }
    const dy = position.y - segmentStartY; const dz = position.z - segmentStartZ;
    const y = Math.sqrt(dy * dy + dz * dz);
    const newHold: PlacedHold = {
      id: crypto.randomUUID(), modelId: selectedHold.id, filename: selectedHold.filename,
      modelBaseScale: selectedHold.baseScale, segmentId: segmentId,
      x, y, spin: holdSettings.rotation, scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale], color: holdSettings.color
    };
    setHolds([...holds, newHold]);
  };

  const handleReplaceHold = (ids: string[], holdDef: HoldDefinition) => {
    recordAction();
    const idSet = new Set(ids);
    setHolds(prev => prev.map(h => idSet.has(h.id) ? { 
      ...h, modelId: holdDef.id, filename: holdDef.filename, modelBaseScale: holdDef.baseScale 
    } : h));
  };

  const removeAllHoldsAction = () => {
    if (holds.length === 0) return;
    setModal({
      title: "Tout supprimer", 
      message: `Voulez-vous vraiment supprimer les ${holds.length} prises du mur ? Cette action est irréversible.`, 
      confirmText: "Tout supprimer",
      onConfirm: () => {
        recordAction();
        setHolds([]);
        setSelectedPlacedHoldIds([]);
      }
    });
  };

  const changeAllHoldsColorAction = (newColor: string) => {
    if (holds.length === 0) return;
    setModal({
      title: "Confirmation du changement",
      message: `Appliquer la couleur choisie à l'intégralité des ${holds.length} prises ?`,
      confirmText: "Confirmer",
      isAlert: false,
      onConfirm: () => {
        recordAction();
        setHolds(holds.map(h => ({ ...h, color: newColor })));
      }
    });
  };

  const removeSegmentAction = (id: string) => {
    const segmentHolds = holds.filter(h => h.segmentId === id);
    const message = segmentHolds.length > 0 
      ? `Ce pan contient ${segmentHolds.length} prise(s). Elles seront supprimées. Confirmer la suppression ?`
      : "Voulez-vous vraiment supprimer ce pan de mur ?";
    setModal({
      title: "Supprimer le pan",
      message,
      confirmText: "Supprimer",
      onConfirm: () => {
        recordAction();
        setConfig(prev => ({ ...prev, segments: prev.segments.filter((s) => s.id !== id) }));
      }
    });
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
    recordAction();
    setConfig(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === id ? { ...s, height: Math.max(0.5, newHeight), angle: Math.min(85, Math.max(-15, newAngle)) } : s)
    }));
  };

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

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      <input 
        type="file" ref={globalFileInputRef} className="hidden" accept=".json"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) importWallFromJson(file); e.target.value = ''; }}
      />

      {mode === 'BUILD' ? (
        <EditorPanel 
            config={config} holds={holds} onUpdate={setConfig} 
            onNext={() => setMode('SET')} showModal={(c) => setModal(c)}
            onActionStart={recordAction}
            onExport={exportWallToJson}
            onImport={importWallFromJson}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => setMode('BUILD')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
            holdSettings={holdSettings} onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds} onRemoveHold={(id) => removeHoldsAction([id])} onRemoveAllHolds={removeAllHoldsAction} 
            onChangeAllHoldsColor={changeAllHoldsColorAction} selectedPlacedHoldIds={selectedPlacedHoldIds}
            onUpdatePlacedHold={(ids, u) => {
              const idSet = new Set(ids);
              setHolds(holds.map(h => idSet.has(h.id) ? { ...h, ...u } : h));
            }}
            onSelectPlacedHold={handleSelectHold} onDeselect={() => setSelectedPlacedHoldIds([])}
            onActionStart={recordAction} onReplaceHold={handleReplaceHold}
            onRemoveMultiple={() => removeHoldsAction(selectedPlacedHoldIds)}
            onExport={exportWallToJson}
            onImport={importWallFromJson}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          <button disabled={past.length === 0} onClick={undo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Annuler (Ctrl+Z)"><Undo2 size={20} /></button>
          <button disabled={future.length === 0} onClick={redo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Rétablir (Ctrl+Y)"><Redo2 size={20} /></button>
      </div>

      <div className="flex-1 relative h-full">
        <Scene 
            config={config} mode={mode} holds={renderableHolds} onPlaceHold={handlePlaceHold}
            selectedHoldDef={selectedHold} holdSettings={holdSettings} selectedPlacedHoldIds={selectedPlacedHoldIds}
            onSelectPlacedHold={handleSelectHold}
            onContextMenu={(type, id, x, y, wx, wy) => setContextMenu({ type, id, x, y, wallX: wx, wallY: wy })}
            onWallPointerUpdate={(info) => { lastWallPointer.current = info; }}
        />
      </div>

      {contextMenu && (
        <div className="fixed z-[150] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 w-56 animate-in fade-in zoom-in-95 duration-150" style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 240) }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'HOLD' ? (
            <>
              {contextMenu.subMenu === 'COLOR' ? (
                  <div className="p-3">
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">Choisir une couleur</span>
                          <button onClick={() => setContextMenu({ ...contextMenu, subMenu: undefined })} className="text-gray-500 hover:text-white"><ArrowLeft size={16}/></button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                          {PALETTE.map(c => (
                              <button
                                  key={c}
                                  onClick={() => {
                                      const targetIds = selectedPlacedHoldIds.includes(contextMenu.id) ? selectedPlacedHoldIds : [contextMenu.id];
                                      recordAction();
                                      const idSet = new Set(targetIds);
                                      setHolds(holds.map(item => idSet.has(item.id) ? { ...item, color: c } : item));
                                      setContextMenu(null);
                                  }}
                                  className="w-8 h-8 rounded-full border border-white/20 hover:scale-110 hover:border-white transition-all shadow-sm"
                                  style={{ backgroundColor: c }}
                              />
                          ))}
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Prise</div>
                    <button onClick={() => { copySelectedHolds(); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><Copy size={16} className="text-blue-400" /> Copier <span className="ml-auto text-[10px] text-gray-500">Ctrl+C</span></button>
                    
                    <button onClick={() => { 
                        const targetIds = selectedPlacedHoldIds.includes(contextMenu.id) ? selectedPlacedHoldIds : [contextMenu.id];
                        recordAction();
                        const idSet = new Set(targetIds);
                        setHolds(holds.map(item => idSet.has(item.id) ? { ...item, spin: (item.spin + 90) % 360 } : item)); 
                    }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCw size={16} className="text-emerald-400" /> Rotation +90°</button>
                    
                    <button onClick={() => { 
                        const targetIds = selectedPlacedHoldIds.includes(contextMenu.id) ? selectedPlacedHoldIds : [contextMenu.id];
                        recordAction();
                        const idSet = new Set(targetIds);
                        setHolds(holds.map(item => idSet.has(item.id) ? { ...item, spin: (item.spin - 90) % 360 } : item)); 
                    }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCcw size={16} className="text-red-400" /> Rotation -90°</button>

                    <button onClick={() => setContextMenu({ ...contextMenu, subMenu: 'COLOR' })} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><Palette size={16} className="text-orange-400" /> Modifier couleur</button>
                    
                    <div className="h-px bg-white/5 my-1" />
                    <button onClick={() => { 
                        const targetIds = selectedPlacedHoldIds.includes(contextMenu.id) ? selectedPlacedHoldIds : [contextMenu.id];
                        removeHoldsAction(targetIds); 
                        setContextMenu(null); 
                    }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-sm text-red-400"><Trash2 size={16} /> Supprimer</button>
                  </>
              )}
            </>
          ) : (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Pan</div>
              {clipboard.length > 0 && (
                <button onClick={() => { 
                  if (contextMenu.wallX !== undefined && contextMenu.wallY !== undefined) {
                    pasteHolds({ x: contextMenu.wallX, y: contextMenu.wallY, segmentId: contextMenu.id });
                  } else {
                    pasteHolds();
                  }
                  setContextMenu(null); 
                }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-500/10 text-sm text-emerald-400 font-bold"><ClipboardPaste size={16} /> Coller ici <span className="ml-auto text-[10px] text-gray-500">Ctrl+V</span></button>
              )}
              <button onClick={() => updateSegmentQuickly(contextMenu.id, { angle: 10 })} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><RotateCw size={16} className="text-orange-400"/> Dévers +10°</span><ChevronRight size={14} className="text-gray-600"/></button>
              <button onClick={() => updateSegmentQuickly(contextMenu.id, { angle: -10 })} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><RotateCw size={16} className="text-blue-400"/> Dévers -10°</span><ChevronRight size={14} className="text-gray-600"/></button>
              <button onClick={() => updateSegmentQuickly(contextMenu.id, { height: 0.5 })} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><MoveUp size={16} className="text-emerald-400"/> Hauteur +0.5m</span><ChevronRight size={14} className="text-gray-600"/></button>
              <button onClick={() => updateSegmentQuickly(contextMenu.id, { height: -0.5 })} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><MoveDown size={16} className="text-red-400"/> Hauteur -0.5m</span><ChevronRight size={14} className="text-gray-600"/></button>
              <div className="h-px bg-white/5 my-1" />
              <button onClick={() => { removeSegmentAction(contextMenu.id); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-sm text-red-400"><Trash2 size={16} /> Supprimer le pan</button>
            </>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6"><div className="flex items-center gap-3 mb-4"><div className={`p-2 rounded-lg ${modal.isAlert ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{modal.isAlert ? <Info size={24} /> : <AlertTriangle size={24} />}</div><h2 className="text-xl font-bold text-white">{modal.title}</h2></div><p className="text-gray-400 text-sm leading-relaxed">{modal.message}</p></div>
            <div className="p-4 bg-gray-950/50 flex flex-row-reverse gap-3"><button onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal(null); }} className={`px-6 py-2 rounded-xl font-bold transition-all ${modal.isAlert ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{modal.confirmText || "OK"}</button>{!modal.isAlert && <button onClick={() => setModal(null)} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-white/5">Annuler</button>}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
