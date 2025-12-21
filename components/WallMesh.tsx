
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallConfig } from '../types';

interface WallMeshProps {
  config: WallConfig;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  interactive?: boolean;
}

export const WallMesh: React.FC<WallMeshProps> = ({ config, onPointerMove, onPointerDown, interactive }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const thickness = 0.3; 

  const geometry = useMemo(() => {
    const spinePoints: { x: number; y: number; z: number }[] = [
      { x: 0, y: 0, z: 0 },
    ];

    let currentY = 0;
    let currentZ = 0;

    config.segments.forEach((seg) => {
      const rad = (seg.angle * Math.PI) / 180;
      const dy = seg.height * Math.cos(rad);
      const dz = seg.height * Math.sin(rad);
      currentY += dy;
      currentZ += dz;
      spinePoints.push({ x: 0, y: currentY, z: currentZ });
    });

    const wHalf = config.width / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const pushVertex = (x: number, y: number, z: number) => {
      vertices.push(x, y, z);
      return (vertices.length / 3) - 1;
    };

    // --- FRONT FACE (Orientée vers le grimpeur Z+) ---
    const frontIndicesMap: number[] = [];
    for (let i = 0; i < spinePoints.length; i++) {
      const p = spinePoints[i];
      const idxL = pushVertex(-wHalf, p.y, p.z);
      pushVertex(wHalf, p.y, p.z);
      frontIndicesMap.push(idxL);
      uvs.push(0, p.y / 3); 
      uvs.push(1, p.y / 3); 
    }

    for (let i = 0; i < config.segments.length; i++) {
      const base = frontIndicesMap[i];
      const nextBase = frontIndicesMap[i+1];
      const FL = base;
      const FR = base + 1;
      const NL = nextBase;
      const NR = nextBase + 1;
      // Correction de l'ordre pour orienter la normale vers l'extérieur
      indices.push(FL, FR, NL);
      indices.push(FR, NR, NL);
    }

    // --- BACK FACE ---
    const backIndicesMap: number[] = [];
    for (let i = 0; i < spinePoints.length; i++) {
      const p = spinePoints[i];
      const idxL = pushVertex(-wHalf, p.y, p.z - thickness);
      pushVertex(wHalf, p.y, p.z - thickness);
      backIndicesMap.push(idxL);
      uvs.push(0, p.y / 3);
      uvs.push(1, p.y / 3);
    }

    for (let i = 0; i < config.segments.length; i++) {
      const base = backIndicesMap[i];
      const nextBase = backIndicesMap[i+1];
      const FL = base;
      const FR = base + 1;
      const NL = nextBase;
      const NR = nextBase + 1;
      indices.push(FL, NL, FR);
      indices.push(FR, NL, NR);
    }

    // --- SIDE FACES ---
    for (let i = 0; i < config.segments.length; i++) {
      const fBase = frontIndicesMap[i];
      const fNext = frontIndicesMap[i+1];
      const bBase = backIndicesMap[i];
      const bNext = backIndicesMap[i+1];
      // Left
      indices.push(fBase, bBase, fNext);
      indices.push(fNext, bBase, bNext);
      // Right
      indices.push(fBase + 1, fNext + 1, bBase + 1);
      indices.push(fNext + 1, bNext + 1, bBase + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    return geo;
  }, [config]);

  return (
    <mesh 
      ref={meshRef} 
      name="climbing-wall"
      geometry={geometry} 
      castShadow 
      receiveShadow
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
    >
      <meshStandardMaterial 
        color="#e5e7eb" 
        roughness={0.9}
        metalness={0.05}
        side={THREE.FrontSide}
      />
    </mesh>
  );
};
