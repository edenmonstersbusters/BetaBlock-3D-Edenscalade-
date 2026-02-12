
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallConfig } from '../types';
import { WallPanel } from './wall/WallPanel';
import { DimensionLabel } from '../components/ui/3d/DimensionLabel';
import '../types';

interface WallMeshProps {
  config: WallConfig;
  onPointerMove?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>, segmentId: string) => void;
  interactive?: boolean;
}

export const WallMesh: React.FC<WallMeshProps> = ({ config, onPointerMove, onPointerDown, onPointerUp, onContextMenu, interactive }) => {
  const thickness = 0.25; 
  const panelSize = 1.25; 

  // Génération Texture (Procédurale)
  const plywoodTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#e6c9a8'; 
    ctx.fillRect(0, 0, 1024, 1024);

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

    const spacingPx = (0.2 / panelSize) * 1024;
    ctx.globalAlpha = 1.0;
    for (let x = spacingPx / 2; x < 1024; x += spacingPx) {
      for (let y = spacingPx / 2; y < 1024; y += spacingPx) {
        ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; 
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }, [panelSize]);

  // Calcul des segments
  const panels = useMemo(() => {
    const result = [];
    let currentY = 0;
    let currentZ = 0;
    let currentDist = 0;

    const validSegments = config.segments ? config.segments.filter(s => s && s.id) : [];

    for (const seg of validSegments) {
      result.push({
        segment: seg,
        baseY: currentY,
        baseZ: currentZ,
        cumulativeDist: currentDist
      });
      const rad = (seg.angle * Math.PI) / 180;
      currentY += seg.height * Math.cos(rad);
      currentZ += seg.height * Math.sin(rad);
      currentDist += seg.height;
    }
    return result;
  }, [config.segments]);

  const widthLinePoints = useMemo(() => [
    new THREE.Vector3(-config.width / 2, -0.05, 0.2),
    new THREE.Vector3(config.width / 2, -0.05, 0.2)
  ], [config.width]);
  
  const widthLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(widthLinePoints), [widthLinePoints]);
  const widthLineObject = useMemo(() => new THREE.Line(widthLineGeometry), [widthLineGeometry]);

  return (
    <group name="wall-group">
      <primitive object={widthLineObject}>
        <lineBasicMaterial attach="material" color="#3b82f6" opacity={0.6} transparent />
      </primitive>
      
      <DimensionLabel 
        label="Largeur"
        value={config.width} 
        position={[0, -0.3, 0.2]} 
      />

      {panels.map((p) => (
        <WallPanel 
          key={p.segment.id}
          segment={p.segment}
          width={config.width}
          thickness={thickness}
          panelSize={panelSize}
          baseY={p.baseY}
          baseZ={p.baseZ}
          cumulativeDist={p.cumulativeDist}
          texture={plywoodTexture}
          interactive={interactive}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onContextMenu={onContextMenu}
        />
      ))}
    </group>
  );
};
