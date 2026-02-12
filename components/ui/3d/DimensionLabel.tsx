
import React from 'react';
import { Html } from '@react-three/drei';

interface DimensionLabelProps {
  value: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
}

export const DimensionLabel: React.FC<DimensionLabelProps> = ({ value, position, label }) => (
  <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
    <div className="bg-gray-950/80 border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap backdrop-blur-sm pointer-events-none select-none">
      <span className="opacity-50 mr-1">{label}:</span>
      <span className="font-bold">{value.toFixed(2)}m</span>
    </div>
  </Html>
);
