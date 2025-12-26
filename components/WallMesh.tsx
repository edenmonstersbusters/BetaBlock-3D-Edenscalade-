
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallConfig } from '../types';
import '../types'; 

interface WallMeshProps {
  config: WallConfig;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>) => void;
  interactive?: boolean;
}

export const WallMesh: React.FC<WallMeshProps> = ({ config, onPointerMove, onPointerDown, onContextMenu, interactive }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const thickness = 0.25; 
  const panelSize = 1.25; 

  const plywoodTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; 
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Couleur bouleau claire : #e6c9a8
    ctx.fillStyle = '#e6c9a8'; 
    ctx.fillRect(0, 0, 1024, 1024);

    // Veines du bois subtiles
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#8d6e63';
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * 1024;
      ctx.beginPath();
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.moveTo(0, y);
      for(let j = 1; j <= 5; j++) {
        ctx.lineTo((1024 / 5) * j, y + Math.sin(j + i) * 15 + (Math.random() - 0.5) * 8);
      }
      ctx.stroke();
    }

    // T-nuts (trous de fixation)
    const spacingPx = (0.2 / panelSize) * 1024;
    ctx.globalAlpha = 1.0;
    for (let x = spacingPx / 2; x < 1024; x += spacingPx) {
      for (let y = spacingPx / 2; y < 1024; y += spacingPx) {
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bordures de panneaux
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; 
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const spinePoints: { y: number; z: number; dist: number }[] = [{ y: 0, z: 0, dist: 0 }];
    let currentY = 0;
    let currentZ = 0;
    let totalDist = 0;
    config.segments.forEach((seg) => {
      const rad = (seg.angle * Math.PI) / 180;
      currentY += seg.height * Math.cos(rad);
      currentZ += seg.height * Math.sin(rad);
      totalDist += seg.height;
      spinePoints.push({ y: currentY, z: currentZ, dist: totalDist });
    });

    const wHalf = config.width / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // On génère tous les points du profil (gauche et droit, avant et arrière)
    // Structure par "ligne" de spine : 0: FrontLeft, 1: FrontRight, 2: BackRight, 3: BackLeft
    spinePoints.forEach((p, i) => {
      // Front Left
      vertices.push(-wHalf, p.y, p.z);
      uvs.push(-wHalf / panelSize, p.dist / panelSize);
      
      // Front Right
      vertices.push(wHalf, p.y, p.z);
      uvs.push(wHalf / panelSize, p.dist / panelSize);
      
      // Back Right
      vertices.push(wHalf, p.y, p.z - thickness);
      uvs.push(wHalf / panelSize, p.dist / panelSize);
      
      // Back Left
      vertices.push(-wHalf, p.y, p.z - thickness);
      uvs.push(-wHalf / panelSize, p.dist / panelSize);
    });

    // Stitching des faces par segments
    for (let i = 0; i < spinePoints.length - 1; i++) {
      const b = i * 4; // Base index de la ligne courante
      const n = (i + 1) * 4; // Base index de la ligne suivante

      // Face Avant (Front)
      indices.push(b, b + 1, n + 1);
      indices.push(b, n + 1, n);

      // Face Arrière (Back)
      indices.push(b + 2, b + 3, n + 3);
      indices.push(b + 2, n + 3, n + 2);

      // Côté Gauche (Left)
      indices.push(b + 3, b, n);
      indices.push(b + 3, n, n + 3);

      // Côté Droit (Right)
      indices.push(b + 1, b + 2, n + 2);
      indices.push(b + 1, n + 2, n + 1);
    }

    // Caps (Bottom and Top)
    // Bottom
    indices.push(0, 3, 2);
    indices.push(0, 2, 1);
    // Top
    const last = (spinePoints.length - 1) * 4;
    indices.push(last, last + 1, last + 2);
    indices.push(last, last + 2, last + 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [config, thickness, panelSize]);

  return (
    <mesh 
      ref={meshRef} 
      name="climbing-wall" 
      geometry={geometry} 
      castShadow 
      receiveShadow
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onContextMenu={interactive ? onContextMenu : undefined}
    >
      <meshStandardMaterial 
        map={plywoodTexture}
        color="#ffffff" 
        roughness={0.8} 
        metalness={0.0} 
      />
    </mesh>
  );
};
