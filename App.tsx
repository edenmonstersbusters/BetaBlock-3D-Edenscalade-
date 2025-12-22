
import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { EditorPanel } from './components/EditorPanel';
import { RouteEditorPanel } from './components/RouteEditorPanel';
import { WallConfig, AppMode, HoldDefinition, PlacedHold } from './types';

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

function App() {
  const [mode, setMode] = useState<AppMode>('BUILD');
  
  // Initialisation robuste : on fusionne les défauts du code avec le localStorage
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

  // Sauvegarde automatique lors des changements
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

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3) => {
    if (!selectedHold || selectedPlacedHoldId) return;

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    
    const spinQ = new THREE.Quaternion();
    spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (holdSettings.rotation * Math.PI) / 180);
    quaternion.multiply(spinQ);
    
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    const newHold: PlacedHold = {
      id: crypto.randomUUID(),
      modelId: selectedHold.id,
      filename: selectedHold.filename,
      modelBaseScale: selectedHold.baseScale,
      position: [position.x, position.y, position.z],
      rotation: [euler.x, euler.y, euler.z],
      scale: [holdSettings.scale, holdSettings.scale, holdSettings.scale],
      color: holdSettings.color
    };

    setHolds([...holds, newHold]);
  };

  const handleUpdatePlacedHold = (id: string, updates: Partial<PlacedHold>) => {
    setHolds(holds.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleRemoveHold = (id: string) => {
    setHolds(holds.filter(h => h.id !== id));
    if (selectedPlacedHoldId === id) setSelectedPlacedHoldId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      
      {mode === 'BUILD' ? (
        <EditorPanel 
            config={config} 
            onUpdate={setConfig} 
            onNext={() => setMode('SET')}
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
            holds={holds}
            onPlaceHold={handlePlaceHold}
            selectedHoldDef={selectedHold}
            holdSettings={holdSettings}
            selectedPlacedHoldId={selectedPlacedHoldId}
            onSelectPlacedHold={setSelectedPlacedHoldId}
        />
      </div>
    </div>
  );
}

export default App;
