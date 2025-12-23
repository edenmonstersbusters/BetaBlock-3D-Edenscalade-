
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallConfig } from '../types';

interface WallMeshProps {
  config: WallConfig;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>) => void;
  interactive?: boolean;
}

export const WallMesh: React.FC<WallMeshProps> = ({ config, onPointerMove, onPointerDown, onContextMenu, interactive }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const thickness = 0.3; 

  const geometry = useMemo(() => {
    const spinePoints: { y: number; z: number }[] = [{ y: 0, z: 0 }];
    let currentY = 0;
    let currentZ = 0;
    config.segments.forEach((seg) => {
      const rad = (seg.angle * Math.PI) / 180;
      const dy = seg.height * Math.cos(rad);
      const dz = seg.height * Math.sin(rad);
      currentY += dy;
      currentZ += dz;
      spinePoints.push({ y: currentY, z: currentZ });
    });

    const wHalf = config.width / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const pushV = (x: number, y: number, z: number, u: number, v: number) => {
      vertices.push(x, y, z);
      uvs.push(u, v);
      return (vertices.length / 3) - 1;
    };

    // 1. FRONT FACE (Z+)
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i];
      const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z, 0, p1.y/3);
      const v1 = pushV(wHalf, p1.y, p1.z, 1, p1.y/3);
      const v2 = pushV(wHalf, p2.y, p2.z, 1, p2.y/3);
      const v3 = pushV(-wHalf, p2.y, p2.z, 0, p2.y/3);
      indices.push(v0, v1, v2, v0, v2, v3);
    }
    // ... Simplified rendering for other faces to match existing geometry logic
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z - thickness, 0, p1.y/3);
      const v1 = pushV(wHalf, p1.y, p1.z - thickness, 1, p1.y/3);
      const v2 = pushV(wHalf, p2.y, p2.z - thickness, 1, p2.y/3);
      const v3 = pushV(-wHalf, p2.y, p2.z - thickness, 0, p2.y/3);
      indices.push(v0, v2, v1, v0, v3, v2);
    }
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z, 0, p1.y/3);
      const v1 = pushV(-wHalf, p2.y, p2.z, 1, p2.y/3);
      const v2 = pushV(-wHalf, p2.y, p2.z - thickness, 1, p2.y/3);
      const v3 = pushV(-wHalf, p1.y, p1.z - thickness, 0, p1.y/3);
      indices.push(v0, v1, v2, v0, v2, v3);
    }
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(wHalf, p1.y, p1.z, 0, p1.y/3);
      const v1 = pushV(wHalf, p2.y, p2.z, 1, p2.y/3);
      const v2 = pushV(wHalf, p2.y, p2.z - thickness, 1, p2.y/3);
      const v3 = pushV(wHalf, p1.y, p1.z - thickness, 0, p1.y/3);
      indices.push(v0, v2, v1, v0, v3, v2);
    }
    const b = spinePoints[0];
    const bv0 = pushV(-wHalf, b.y, b.z, 0, 0); const bv1 = pushV(wHalf, b.y, b.z, 1, 0); const bv2 = pushV(wHalf, b.y, b.z - thickness, 1, 1); const bv3 = pushV(-wHalf, b.y, b.z - thickness, 0, 1);
    indices.push(bv0, bv2, bv1, bv0, bv3, bv2);
    const t = spinePoints[spinePoints.length - 1];
    const tv0 = pushV(-wHalf, t.y, t.z, 0, 0); const tv1 = pushV(wHalf, t.y, t.z, 1, 0); const tv2 = pushV(wHalf, t.y, t.z - thickness, 1, 1); const tv3 = pushV(-wHalf, t.y, t.z - thickness, 0, 1);
    indices.push(tv0, tv1, tv2, tv0, tv2, tv3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [config]);

  return (
    <mesh 
      ref={meshRef} name="climbing-wall" geometry={geometry} castShadow receiveShadow
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onContextMenu={interactive ? onContextMenu : undefined}
    >
      <meshStandardMaterial color="#e5e7eb" roughness={0.9} metalness={0.05} side={THREE.FrontSide} />
    </mesh>
  );
};
