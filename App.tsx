
import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { EditorPanel } from './components/EditorPanel';
import { RouteEditorPanel } from './components/RouteEditorPanel';
import { WallConfig, AppMode, HoldDefinition, PlacedHold } from './types';
import { AlertTriangle, Info, X } from 'lucide-react';

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

  // Système de modale pour remplacé confirm/alert
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const validIds = new Set(config.segments.map(s => s.id));
    const filtered = holds.filter(h => validIds.has(h.segmentId));
    if (filtered.length !== holds.length) {
      setHolds(filtered);
    }
  }, [config.segments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds));
  }, [holds]);

  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldId, setSelectedPlacedHoldId] = useState<string | null>(null);

  const [holdSettings, setHoldSettings] = useState({
    scale: 1,
    rotation: 0,
    color: '#ff4400'
  });

  const renderableHolds = useMemo(() => {
    return holds.map(h => {
      const world = resolveHoldWorldData(h, config);
      if (!world) return null;
      return { ...h, ...world };
    }).filter(h => h !== null) as (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  }, [holds, config]);

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, faceIndex?: number) => {
    if (!selectedHold || selectedPlacedHoldId || faceIndex === undefined) return;

    const segmentCount = config.segments.length;
    if (faceIndex >= segmentCount * 2) return;

    const segmentIndex = Math.floor(faceIndex / 2);
    const segment = config.segments[segmentIndex];

    const x = position.x;
    
    let segmentStartY = 0;
    let segmentStartZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i];
        const r = (s.angle * Math.PI) / 180;
        segmentStartY += s.height * Math.cos(r);
        segmentStartZ += s.height * Math.sin(r);
    }
    const dy = position.y - segmentStartY;
    const dz = position.z - segmentStartZ;
    const y = Math.sqrt(dy * dy + dz * dz);

    const newHold: PlacedHold = {
      id: crypto.randomUUID(),
      modelId: selectedHold.id,
      filename: selectedHold.filename,
      modelBaseScale: selectedHold.baseScale,
      segmentId: segment.id,
      x,
      y,
      spin: holdSettings.rotation,
      scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale],
      color: holdSettings.color
    };

    setHolds([...holds, newHold]);
  };

  const handleUpdatePlacedHold = (id: string, updates: Partial<PlacedHold>) => {
    setHolds(holds.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleRemoveHold = (id: string) => {
    setModal({
      title: "Suppression",
      message: "Voulez-vous vraiment supprimer cette prise ?",
      confirmText: "Supprimer",
      onConfirm: () => {
        setHolds(holds.filter(h => h.id !== id));
        if (selectedPlacedHoldId === id) setSelectedPlacedHoldId(null);
      }
    });
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      
      {mode === 'BUILD' ? (
        <EditorPanel 
            config={config} 
            holds={holds}
            onUpdate={setConfig} 
            onNext={() => setMode('SET')}
            showModal={(config) => setModal(config)}
        />
      ) : (
        <RouteEditorPanel 
            onBack={() => setMode('BUILD')}
            selectedHold={selectedHold}
            onSelectHold={setSelectedHold}
            holdSettings={holdSettings}
            onUpdateSettings={(s) => setHoldSettings(prev => ({ ...prev, ...s }))}
            placedHolds={holds}
            onRemoveHold={handleRemoveHold}
            selectedPlacedHoldId={selectedPlacedHoldId}
            onUpdatePlacedHold={handleUpdatePlacedHold}
            onSelectPlacedHold={setSelectedPlacedHoldId}
            onDeselect={() => setSelectedPlacedHoldId(null)}
        />
      )}

      <div className="flex-1 relative h-full">
        <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-white pointer-events-none select-none">
            <p className="font-bold text-gray-300 mb-1">
                {mode === 'BUILD' ? 'Navigation 3D' : 'Mode Pose de Prises'}
            </p>
            <ul className="space-y-1 text-gray-400">
                <li>Clic Gauche + Glisser: Tourner</li>
                <li>Molette: Zoomer</li>
                <li>Clic Droit + Glisser: Déplacer</li>
                {mode === 'SET' && (
                    <li className="text-blue-400 mt-2 border-t border-gray-700 pt-1">
                        Clic sur Mur: Poser / Clic sur Prise: Éditer
                    </li>
                )}
            </ul>
        </div>

        <Scene 
            config={config} 
            mode={mode}
            holds={renderableHolds}
            onPlaceHold={handlePlaceHold}
            selectedHoldDef={selectedHold}
            holdSettings={holdSettings}
            selectedPlacedHoldId={selectedPlacedHoldId}
            onSelectPlacedHold={setSelectedPlacedHoldId}
        />
      </div>

      {/* CUSTOM MODAL OVERLAY */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${modal.isAlert ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                   {modal.isAlert ? <Info size={24} /> : <AlertTriangle size={24} />}
                </div>
                <h2 className="text-xl font-bold text-white">{modal.title}</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {modal.message}
              </p>
            </div>
            <div className="p-4 bg-gray-950/50 flex flex-row-reverse gap-3">
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal(null);
                }}
                className={`px-6 py-2 rounded-xl font-bold transition-all ${modal.isAlert ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
              >
                {modal.confirmText || "OK"}
              </button>
              {!modal.isAlert && (
                <button 
                  onClick={() => setModal(null)}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-white/5"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
