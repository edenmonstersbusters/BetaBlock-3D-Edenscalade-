
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { HoldDefinition } from '../types';
import { HoldModel } from './HoldModel';
import { RotateCw, RotateCcw, Check, X, Info, Sun } from 'lucide-react';

interface CalibrationOverlayProps {
  hold: HoldDefinition;
  onSave: (rotation: [number, number, number]) => void;
  onCancel: () => void;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({ hold, onSave, onCancel }) => {
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  const rotate = (axis: number, direction: number) => {
    const newRot = [...rotation] as [number, number, number];
    newRot[axis] = (newRot[axis] + (direction * Math.PI / 2)) % (Math.PI * 2);
    setRotation(newRot);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 left-6 text-white max-w-sm">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
          Calibrage de la prise
        </h2>
        <div className="mt-4 bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
          <div className="flex gap-2 text-emerald-400 font-bold items-center">
             <Check size={16} />
             <p className="text-xs">Objectif : relief vers vous</p>
          </div>
          <p className="text-[11px] text-gray-400 leading-tight">
            Faites pivoter la prise pour que son volume ressorte. Si vous ne voyez qu'une face plane, elle est à l'envers ou dans le mur.
          </p>
        </div>
      </div>

      <div className="w-full h-full max-w-5xl bg-gray-900 rounded-3xl overflow-hidden border border-white/5 relative shadow-2xl">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={30} />
          
          {/* SETUP LUMIERE CONTRASTÉ POUR CALIBRATION */}
          <ambientLight intensity={0.2} />
          <hemisphereLight intensity={0.8} color="#ffffff" groundColor="#222222" />
          
          {/* Lumière principale forte pour accentuer les volumes */}
          <directionalLight 
            position={[5, 10, 5]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[1024, 1024]}
          />
          
          {/* Lumière frontale très faible pour éviter les zones de noir pur */}
          <pointLight position={[0, 0, 5]} intensity={0.3} />
          
          <OrbitControls makeDefault minDistance={1.5} maxDistance={6} />
          
          {/* Mur de test (Gris neutre pour bien voir les ombres) */}
          <mesh position={[0, 0, -0.01]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial 
              color="#333336" 
              roughness={0.8} 
              metalness={0.1}
            />
          </mesh>

          {/* Grille de repère */}
          <gridHelper 
            args={[10, 20, 0x444444, 0x222222]} 
            rotation={[Math.PI / 2, 0, 0]} 
            position={[0, 0, -0.005]}
          />

          <Suspense fallback={null}>
            <HoldModel 
              modelFilename={hold.filename}
              baseScale={hold.baseScale}
              position={[0, 0, 0]}
              rotation={rotation} 
              scale={[1.2, 1.2, 1.2]}
              color="#ff4400" 
            />
          </Suspense>

          {/* Ombre portée sur le mur pour valider le volume */}
          <ContactShadows 
            position={[0, 0, 0]} 
            opacity={0.6} 
            scale={4} 
            blur={1} 
            far={0.5} 
            resolution={512} 
            color="#000000"
          />

          <Environment preset="city" />
        </Canvas>

        {/* Contrôles simples */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/80 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
           {[
             { label: 'X', axis: 0 },
             { label: 'Y', axis: 1 },
             { label: 'Z', axis: 2 }
           ].map((item) => (
             <div key={item.label} className="flex flex-col items-center gap-1">
               <span className="text-[10px] text-gray-500 font-bold uppercase">{item.label}</span>
               <div className="flex gap-2">
                 <button 
                  onClick={() => rotate(item.axis, 1)} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/5"
                 >
                   <RotateCw size={18}/>
                 </button>
                 <button 
                  onClick={() => rotate(item.axis, -1)} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/5"
                 >
                   <RotateCcw size={18}/>
                 </button>
               </div>
             </div>
           ))}
        </div>
      </div>

      <div className="mt-8 flex gap-4 w-full max-w-sm">
        <button 
          onClick={onCancel}
          className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
        >
          <X size={18} /> Annuler
        </button>
        <button 
          onClick={() => onSave(rotation)}
          className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl"
        >
          <Check size={18} /> Valider l'orientation
        </button>
      </div>
    </div>
  );
};
