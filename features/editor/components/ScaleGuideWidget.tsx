
import React, { useState, Suspense } from 'react';
import { PersonStanding, GripVertical, Ruler, Accessibility, Eye, EyeOff } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { Mannequin } from '../../../core/Mannequin';

interface ScaleGuideWidgetProps {
  show: boolean;
  onToggle: () => void;
  height: number;
  setHeight: (h: number) => void;
  armPosture: number;
  setArmPosture: (p: number) => void;
  
  isPlacedOnWall: boolean;
  onTogglePlacement: () => void;
}

export const ScaleGuideWidget: React.FC<ScaleGuideWidgetProps> = ({
  show, onToggle, height, setHeight, armPosture, setArmPosture,
  isPlacedOnWall, onTogglePlacement
}) => {
  
  return (
    <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-2">
        {show && (
            <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-4 w-64 animate-in slide-in-from-bottom-4 duration-200 mb-2">
                {/* APERÇU 3D */}
                <div className="h-48 bg-gradient-to-b from-gray-800 to-gray-950 rounded-xl mb-4 relative overflow-hidden border border-white/5">
                    {/* Stage gère tout : lumières, centrage, zoom automatique */}
                    <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
                        <Suspense fallback={null}>
                            <Stage 
                                intensity={0.5} 
                                environment={null} // Désactivé pour éviter les erreurs réseau sur le HDR
                                adjustCamera={1.2} // Zoom factor (plus grand = plus loin)
                                preset="rembrandt"
                            >
                                <Mannequin 
                                    position={[0, 0, 0]} 
                                    rotation={[0, 0, 0]} 
                                    height={height} 
                                    armPosture={armPosture} 
                                />
                            </Stage>
                        </Suspense>
                        <OrbitControls 
                            makeDefault 
                            autoRotate 
                            autoRotateSpeed={1.5}
                            enableZoom={true} 
                            enablePan={false}
                            minPolarAngle={Math.PI / 4}
                            maxPolarAngle={Math.PI / 1.8}
                        />
                    </Canvas>
                </div>

                {/* CONTRÔLES */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Ruler size={12}/> Taille</span>
                            <span className="text-blue-400">{height.toFixed(2)}m</span>
                        </div>
                        <input 
                            type="range" min="1.40" max="2.10" step="0.01" 
                            value={height} 
                            onChange={(e) => setHeight(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Accessibility size={12}/> Bras</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={armPosture} 
                            onChange={(e) => setArmPosture(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-[9px] text-gray-600 font-mono uppercase mt-1">
                            <span>Bas</span>
                            <span>T-Pose</span>
                            <span>Haut</span>
                        </div>
                    </div>
                </div>
                
                {/* BOUTON D'ACTION PRINCIPAL */}
                <div className="mt-5 pt-3 border-t border-white/5">
                    <button 
                        onClick={onTogglePlacement}
                        className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            isPlacedOnWall 
                            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                        }`}
                    >
                        {isPlacedOnWall ? (
                            <>
                                <EyeOff size={14} />
                                <span>Retirer du mur</span>
                            </>
                        ) : (
                            <>
                                <Eye size={14} />
                                <span>Afficher sur le mur</span>
                            </>
                        )}
                    </button>
                    <p className="text-[9px] text-gray-500 text-center mt-2 italic">
                        {isPlacedOnWall ? "Cliquez sur le mannequin pour le déplacer" : "Ajustez puis affichez pour comparer"}
                    </p>
                </div>
            </div>
        )}

        <button 
            onClick={onToggle}
            className={`p-3 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center border ${show ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-white/10 hover:text-white hover:bg-gray-700'}`}
            title="Outil Échelle / Mannequin"
        >
            <PersonStanding size={24} />
        </button>
    </div>
  );
};
