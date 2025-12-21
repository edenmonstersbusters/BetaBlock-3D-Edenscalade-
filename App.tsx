
import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { EditorPanel } from './components/EditorPanel';
import { RouteEditorPanel } from './components/RouteEditorPanel';
import { CalibrationOverlay } from './components/CalibrationOverlay';
import { WallConfig, AppMode, HoldDefinition, PlacedHold, OrientationMap } from './types';
import { X, Copy, Check } from 'lucide-react';

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
  ORIENTATIONS: 'betablock_calibrated_orientations',
};

// Valeurs de calibration validées par l'utilisateur
const DEFAULT_ORIENTATIONS: OrientationMap = {
  "1": [0, 0, -1.5707963267948966],
  "2": [0, 0, 0],
  "3": [0, 0, -1.5707963267948966],
  "4": [0, 0, 0],
  "5": [0, -3.141592653589793, 0],
  "6": [0, 0, 0],
  "7": [0, -3.141592653589793, 0],
  "8": [0, -3.141592653589793, -1.5707963267948966],
  "9": [0, 0, -1.5707963267948966],
  "10": [0, 0, -1.5707963267948966],
  "11": [0, 0, -1.5707963267948966]
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
  
  const [calibratedOrientations, setCalibratedOrientations] = useState<OrientationMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORIENTATIONS);
      const parsedSaved = saved ? JSON.parse(saved) : {};
      // On donne la priorité au localStorage mais on garde les DEFAULT si rien n'est stocké pour ces IDs
      return { ...DEFAULT_ORIENTATIONS, ...parsedSaved };
    } catch { 
      return DEFAULT_ORIENTATIONS; 
    }
  });

  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sauvegarde automatique lors des changements
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOLDS, JSON.stringify(holds));
  }, [holds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORIENTATIONS, JSON.stringify(calibratedOrientations));
  }, [calibratedOrientations]);

  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldId, setSelectedPlacedHoldId] = useState<string | null>(null);
  const [calibratingHold, setCalibratingHold] = useState<HoldDefinition | null>(null);

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

  const saveCalibration = (rot: [number, number, number]) => {
    if (calibratingHold) {
      setCalibratedOrientations(prev => ({
        ...prev,
        [calibratingHold.id]: rot
      }));
      setCalibratingHold(null);
    }
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(JSON.stringify(calibratedOrientations, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      
      {calibratingHold && (
        <CalibrationOverlay 
          hold={calibratingHold}
          onSave={saveCalibration}
          onCancel={() => setCalibratingHold(null)}
        />
      )}

      {showExport && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gray-950">
              <div>
                <h2 className="text-xl font-bold text-white">Exportation des Orientations</h2>
                <p className="text-xs text-gray-500 mt-1">Copiez ce code pour enregistrer vos calibrations définitivement.</p>
              </div>
              <button onClick={() => setShowExport(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="relative group">
                <textarea 
                  readOnly
                  className="w-full h-80 bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-sm text-blue-300 resize-none focus:outline-none scrollbar-thin scrollbar-thumb-gray-800"
                  value={JSON.stringify(calibratedOrientations, null, 2)}
                />
                <button 
                  onClick={handleCopyExport}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 text-xs font-bold border border-white/10 transition-all shadow-xl"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copié !' : 'Tout copier'}
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-950/50 flex justify-end">
              <button 
                onClick={() => setShowExport(false)}
                className="px-6 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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
            calibratedOrientations={calibratedOrientations}
            onOpenCalibration={setCalibratingHold}
            onExport={() => setShowExport(true)}
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
            calibratedOrientations={calibratedOrientations}
        />
      </div>
    </div>
  );
}

export default App;
