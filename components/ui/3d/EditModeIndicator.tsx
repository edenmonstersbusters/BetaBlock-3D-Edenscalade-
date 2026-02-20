import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { X } from 'lucide-react';

interface EditModeIndicatorProps {
  position: [number, number, number];
  onDismiss: () => void;
}

export const EditModeIndicator: React.FC<EditModeIndicatorProps> = ({ position, onDismiss }) => {
  return (
    <group position={position}>
      <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
        <div className="flex items-center gap-2 pointer-events-none select-none whitespace-nowrap">
          {/* Ligne rouge */}
          <div className="w-12 h-0.5 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] origin-left" />
          
          {/* Label et Bouton */}
          <div className="flex items-center gap-2 bg-red-950/90 border border-red-500/50 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-sm pointer-events-auto">
            <span className="text-[10px] font-black text-red-100 uppercase tracking-wider animate-pulse">
              VOUS ETES EN TRAIN D'EDITER CETTE PRISE
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="ml-2 p-0.5 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded transition-colors"
              title="Quitter la sélection"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </Html>
      
      {/* Ligne 3D optionnelle pour renforcer l'effet visuel dans l'espace */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.5, 8]} />
        <meshBasicMaterial color="red" transparent opacity={0.6} depthTest={false} />
      </mesh>
    </group>
  );
};
