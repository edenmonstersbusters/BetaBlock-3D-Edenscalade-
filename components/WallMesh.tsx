
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallConfig } from '../types';
// Import types to ensure global JSX intrinsic element extensions are loaded
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
  const thickness = 0.3; 
  const panelSize = 1.25; // Taille standard d'un panneau de contreplaqué en mètres

  const plywoodTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; 
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Fond Bois Saturé (Honey Birch)
    ctx.fillStyle = '#a67c52'; 
    ctx.fillRect(0, 0, 2048, 2048);

    // 2. Grain de bois organique
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#5d4037';
    for (let i = 0; i < 300; i++) {
      const y = Math.random() * 2048;
      ctx.beginPath();
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.moveTo(0, y);
      const segments = 8;
      for(let j = 1; j <= segments; j++) {
        const px = (2048 / segments) * j;
        const py = y + Math.sin(j * 0.4) * 40 + (Math.random() - 0.5) * 15;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Variations de teintes
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 60; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#c19a6b' : '#8d6e63';
        ctx.fillRect(0, Math.random() * 2048, 2048, Math.random() * 120);
    }

    // 3. Grille de T-nuts - Effet de relief "Chanfreiné" (Fraisage)
    const spacingPx = (0.2 / panelSize) * 2048;
    ctx.globalAlpha = 1.0;
    
    for (let x = spacingPx / 2; x < 2048; x += spacingPx) {
      for (let y = spacingPx / 2; y < 2048; y += spacingPx) {
        // A. Simuler le trou de fraisage (dégradé bois -> métal)
        const gradient = ctx.createRadialGradient(x, y, 7, x, y, 12);
        gradient.addColorStop(0, '#555555'); // Acier
        gradient.addColorStop(0.4, '#333333'); // Ombre de bordure
        gradient.addColorStop(1, 'rgba(166, 124, 82, 0)'); // Retour au bois
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // B. Le cœur du trou (Noir absolu pour la profondeur)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // C. Reflet spéculaire ponctuel
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    // 4. Joints de panneaux biseautés
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; 
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 2044, 2044);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2046, 0); ctx.lineTo(2046, 2046); ctx.lineTo(0, 2046);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 16;
    return tex;
  }, []);

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

    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i];
      const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z, (-wHalf) / panelSize, p1.y / panelSize);
      const v1 = pushV(wHalf, p1.y, p1.z, (wHalf) / panelSize, p1.y / panelSize);
      const v2 = pushV(wHalf, p2.y, p2.z, (wHalf) / panelSize, p2.y / panelSize);
      const v3 = pushV(-wHalf, p2.y, p2.z, (-wHalf) / panelSize, p2.y / panelSize);
      indices.push(v0, v1, v2, v0, v2, v3);
    }
    
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z - thickness, 0, p1.y / panelSize);
      const v1 = pushV(wHalf, p1.y, p1.z - thickness, 1, p1.y / panelSize);
      const v2 = pushV(wHalf, p2.y, p2.z - thickness, 1, p2.y / panelSize);
      const v3 = pushV(-wHalf, p2.y, p2.z - thickness, 0, p2.y / panelSize);
      indices.push(v0, v2, v1, v0, v3, v2);
    }

    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(-wHalf, p1.y, p1.z, 0, p1.y/panelSize);
      const v1 = pushV(-wHalf, p2.y, p2.z, 0.2, p2.y/panelSize);
      const v2 = pushV(-wHalf, p2.y, p2.z - thickness, 0.2, p2.y/panelSize);
      const v3 = pushV(-wHalf, p1.y, p1.z - thickness, 0, p1.y/panelSize);
      indices.push(v0, v1, v2, v0, v2, v3);
    }
    for (let i = 0; i < config.segments.length; i++) {
      const p1 = spinePoints[i]; const p2 = spinePoints[i+1];
      const v0 = pushV(wHalf, p1.y, p1.z, 0, p1.y/panelSize);
      const v1 = pushV(wHalf, p2.y, p2.z, 0.2, p2.y/panelSize);
      const v2 = pushV(wHalf, p2.y, p2.z - thickness, 0.2, p2.y/panelSize);
      const v3 = pushV(wHalf, p1.y, p1.z - thickness, 0, p1.y/panelSize);
      indices.push(v0, v2, v1, v0, v3, v2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [config, panelSize]);

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
        roughness={0.92} 
        metalness={0.0} 
      />
    </mesh>
  );
};
