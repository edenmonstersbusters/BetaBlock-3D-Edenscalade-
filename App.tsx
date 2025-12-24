
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { EditorPanel } from './components/EditorPanel';
import { RouteEditorPanel } from './components/RouteEditorPanel';
import { WallConfig, AppMode, HoldDefinition, PlacedHold, WallSegment } from './types';
import { AlertTriangle, Info, Trash2, RotateCw, RotateCcw, MoveUp, MoveDown, Palette, ChevronRight, Undo2, Redo2 } from 'lucide-react';

const INITIAL_CONFIG: WallConfig = {
  width: 4,
  segments: [
    { id: '1', height: 3, angle: 0 },
    { id: '2', height: 2, angle: 20 },
    { id: '3', height: 1.5, angle: -10 },
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

  // --- UNDO / REDO LOGIC ---
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo(); else undo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- UI MODALS & MENUS ---
  const [modal, setModal] = useState<{
    title: string; message: string; onConfirm?: () => void; confirmText?: string; isAlert?: boolean;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    type: 'HOLD' | 'SEGMENT'; id: string; x: number; y: number;
  } | null>(null);

  useEffect(() => {
    const validIds = new Set(config.segments.map(s => s.id));
    const filtered = holds.filter(h => validIds.has(h.segmentId));
    if (filtered.length !== holds.length) setHolds(filtered);
  }, [config.segments]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds)); }, [holds]);

  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldId, setSelectedPlacedHoldId] = useState<string | null>(null);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });

  const renderableHolds = useMemo(() => {
    return holds.map(h => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter(h => h !== null) as (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  }, [holds, config]);

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, faceIndex?: number) => {
    if (!selectedHold || selectedPlacedHoldId || faceIndex === undefined) return;
    const segmentIndex = Math.floor(faceIndex / 2);
    if (segmentIndex >= config.segments.length) return;
    
    recordAction(); 
    const segment = config.segments[segmentIndex];
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
      modelBaseScale: selectedHold.baseScale, segmentId: segment.id,
      x, y, spin: holdSettings.rotation, scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale], color: holdSettings.color
    };
    setHolds([...holds, newHold]);
  };

  const handleReplaceHold = (id: string, holdDef: HoldDefinition) => {
    recordAction();
    setHolds(prev => prev.map(h => h.id === id ? { 
      ...h, 
      modelId: holdDef.id, 
      filename: holdDef.filename, 
      modelBaseScale: holdDef.baseScale 
    } : h));
  };

  const removeHoldAction = (id: string) => {
    setModal({
      title: "Suppression", message: "Voulez-vous vraiment supprimer cette prise ?", confirmText: "Supprimer",
      onConfirm: () => {
        recordAction();
        setHolds(holds.filter(h => h.id !== id));
        if (selectedPlacedHoldId === id) setSelectedPlacedHoldId(null);
      }
    });
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
        setSelectedPlacedHoldId(null);
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
        setConfig(prev => ({
          ...prev,
          segments: prev.segments.filter((s) => s.id !== id),
        }));
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

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      {mode === 'BUILD' ? (
        <EditorPanel 
            config={config} holds={holds} onUpdate={setConfig} 
            onNext={() => setMode('SET')} showModal={(c) => setModal(c)}
            onActionStart={recordAction}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => setMode('BUILD')} selectedHold={selectedHold} onSelectHold={setSelectedHold}
            holdSettings={holdSettings} onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds} onRemoveHold={removeHoldAction} onRemoveAllHolds={removeAllHoldsAction} selectedPlacedHoldId={selectedPlacedHoldId}
            onUpdatePlacedHold={(id, u) => setHolds(holds.map(h => h.id === id ? { ...h, ...u } : h))}
            onSelectPlacedHold={setSelectedPlacedHoldId} onDeselect={() => setSelectedPlacedHoldId(null)}
            onActionStart={recordAction} onReplaceHold={handleReplaceHold}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          <button disabled={past.length === 0} onClick={undo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Annuler (Ctrl+Z)"><Undo2 size={20} /></button>
          <button disabled={future.length === 0} onClick={redo} className="p-3 bg-gray-900/90 border border-white/10 rounded-full text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xl backdrop-blur-md" title="Rétablir (Ctrl+Y)"><Redo2 size={20} /></button>
      </div>

      <div className="flex-1 relative h-full">
        <Scene 
            config={config} mode={mode} holds={renderableHolds} onPlaceHold={handlePlaceHold}
            selectedHoldDef={selectedHold} holdSettings={holdSettings} selectedPlacedHoldId={selectedPlacedHoldId}
            onSelectPlacedHold={setSelectedPlacedHoldId}
            onContextMenu={(type, id, x, y) => setContextMenu({ type, id, x, y })}
        />
      </div>

      {contextMenu && (
        <div className="fixed z-[150] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 w-56 animate-in fade-in zoom-in-95 duration-150" style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 240) }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'HOLD' ? (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Prise</div>
              <button onClick={() => { const h = holds.find(h => h.id === contextMenu.id); if (h) { recordAction(); setHolds(holds.map(item => item.id === h.id ? { ...item, spin: (item.spin + 90) % 360 } : item)); } }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCw size={16} className="text-emerald-400" /> Rotation +90°</button>
              <button onClick={() => { const h = holds.find(h => h.id === contextMenu.id); if (h) { recordAction(); setHolds(holds.map(item => item.id === h.id ? { ...item, spin: (item.spin - 90 + 360) % 360 } : item)); } }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCcw size={16} className="text-blue-400" /> Rotation -90°</button>
              <button onClick={() => { const colors = ['#ff8800', '#fbbf24', '#22c55e', '#3b82f6', '#9f0000', '#f472b6', '#ffffff', '#000000']; const h = holds.find(h => h.id === contextMenu.id); if (h) { recordAction(); const idx = colors.indexOf(h.color || ''); setHolds(holds.map(item => item.id === h.id ? { ...item, color: colors[(idx + 1) % colors.length] } : item)); } }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><Palette size={16} className="text-orange-400" /> Couleur Suivante</button>
              <div className="h-px bg-white/5 my-1" />
              <button onClick={() => { removeHoldAction(contextMenu.id); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-sm text-red-400"><Trash2 size={16} /> Supprimer</button>
            </>
          ) : (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Pan</div>
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
            <div className="p-6"><div className="flex items-center gap-3 mb-4"><div className={`p-2 rounded-lg ${modal.isAlert ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>{modal.isAlert ? <Info size={24} /> : <AlertTriangle size={24} />}</div><h2 className="text-xl font-bold text-white">{modal.title}</h2></div><p className="text-gray-400 text-sm leading-relaxed">{modal.message}</p></div>
            <div className="p-4 bg-gray-950/50 flex flex-row-reverse gap-3"><button onClick={() => { if (modal.onConfirm) modal.onConfirm(); setModal(null); }} className={`px-6 py-2 rounded-xl font-bold transition-all ${modal.isAlert ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>{modal.confirmText || "OK"}</button>{!modal.isAlert && <button onClick={() => setModal(null)} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-white/5">Annuler</button>}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
