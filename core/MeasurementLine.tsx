
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface MeasurementLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export const MeasurementLine: React.FC<MeasurementLineProps> = ({ start, end }) => {
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([start, end]);
  }, [start, end]);

  return (
    <group>
      {/* Ligne principale bien visible */}
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: '#ef4444', linewidth: 3, depthTest: false, transparent: true, opacity: 0.9 }))} />
      
      {/* Points aux extrémités */}
      <mesh position={start}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="#ef4444" depthTest={false} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="#ef4444" depthTest={false} />
      </mesh>

      {/* Label de distance */}
      <Html position={midPoint} center zIndexRange={[100, 0]}>
        <div className="bg-red-500/90 text-white font-black text-xs px-2 py-1 rounded shadow-lg border border-white backdrop-blur-sm transform hover:scale-110 transition-transform">
          {distance.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
};
