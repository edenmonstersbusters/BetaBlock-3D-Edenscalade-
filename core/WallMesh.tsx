
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { WallConfig, WallSegment } from '../types';
import '../types';

interface DimensionLabelProps {
  value: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
}

const DimensionLabel: React.FC<DimensionLabelProps> = ({ value, position, label }) => (
  <Html position={position} center distanceFactor={10}>
    <div className="bg-gray-950/80 border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap backdrop-blur-sm pointer-events-none select-none">
      <span className="opacity-50 mr-1">{label}:</span>
      <span className="font-bold">{value.toFixed(2)}m</span>
    </div>
  </Html>
);

interface WallPanelProps {
  segment: WallSegment;
  width: number;
  thickness: number;
  panelSize: number;
  baseY: number;
  baseZ: number;
  cumulativeDist: number;
  texture: THREE.CanvasTexture | null;
  interactive?: boolean;
  onPointerMove?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>, segmentId: string) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>, segmentId: string) => void;
}

const WallPanel: React.FC<WallPanelProps> = ({ 
  segment, width, thickness, panelSize, baseY, baseZ, cumulativeDist, texture, 
  interactive, onPointerMove, onPointerDown, onPointerUp, onContextMenu 
}) => {
  const rad = (segment.angle * Math.PI) / 180;
  const topY = segment.height * Math.cos(rad);
  const topZ = segment.height * Math.sin(rad);

  const geometry = useMemo(() => {
    const wHalf = width / 2;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Points de base (0-3)
    vertices.push(-wHalf, 0, 0); uvs.push(-wHalf / panelSize, cumulativeDist / panelSize);
    vertices.push(wHalf, 0, 0); uvs.push(wHalf / panelSize, cumulativeDist / panelSize);
    vertices.push(wHalf, 0, -thickness); uvs.push(wHalf / panelSize, cumulativeDist / panelSize);
    vertices.push(-wHalf, 0, -thickness); uvs.push(-wHalf / panelSize, cumulativeDist / panelSize);

    // Points de sommet (4-7)
    vertices.push(-wHalf, topY, topZ); uvs.push(-wHalf / panelSize, (cumulativeDist + segment.height) / panelSize);
    vertices.push(wHalf, topY, topZ); uvs.push(wHalf / panelSize, (cumulativeDist + segment.height) / panelSize);
    vertices.push(wHalf, topY, topZ - thickness); uvs.push(wHalf / panelSize, (cumulativeDist + segment.height) / panelSize);
    vertices.push(-wHalf, topY, topZ - thickness); uvs.push(-wHalf / panelSize, (cumulativeDist + segment.height) / panelSize);

    // Faces (Front, Back, Left, Right)
    indices.push(0, 1, 5, 0, 5, 4); // Front
    indices.push(2, 3, 7, 2, 7, 6); // Back
    indices.push(3, 0, 4, 3, 4, 7); // Left
    indices.push(1, 2, 6, 1, 6, 5); // Right
    
    // Bottom cap (only for base)
    if (cumulativeDist === 0) indices.push(0, 3, 2, 0, 2, 1);
    // Top cap (always, to ensure volume)
    indices.push(4, 5, 6, 4, 6, 7);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [width, thickness, panelSize, segment.height, topY, topZ, cumulativeDist]);

  // Points pour la ligne de cotation de hauteur
  const heightLinePoints = useMemo(() => [
    new THREE.Vector3(width / 2 + 0.1, 0, 0.01),
    new THREE.Vector3(width / 2 + 0.1, topY, topZ + 0.01)
  ], [width, topY, topZ]);

  const heightLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(heightLinePoints), [heightLinePoints]);

  // Fix: Create memoized THREE.Line object to use with primitive tag
  const heightLineObject = useMemo(() => new THREE.Line(heightLineGeometry), [heightLineGeometry]);

  return (
    <group position={[0, baseY, baseZ]}>
      <mesh 
        geometry={geometry}
        name="climbing-wall-panel"
        userData={{ segmentId: segment.id }}
        castShadow 
        receiveShadow
        onPointerMove={interactive ? (e) => onPointerMove?.(e, segment.id) : undefined}
        onPointerDown={interactive ? (e) => onPointerDown?.(e, segment.id) : undefined}
        onPointerUp={interactive ? (e) => onPointerUp?.(e, segment.id) : undefined}
        onContextMenu={interactive ? (e) => onContextMenu?.(e, segment.id) : undefined}
      >
        <meshStandardMaterial map={texture} color="#ffffff" roughness={0.8} metalness={0.0} />
      </mesh>

      {/* DIMENSIONS DE HAUTEUR DU PAN */}
      {/* Fix: Use primitive to mount THREE.Line and avoid conflict with SVG 'line' tag in JSX */}
      <primitive object={heightLineObject}>
        <lineBasicMaterial attach="material" color="#ffffff" opacity={0.3} transparent />
      </primitive>
      
      {/* Arrêts de ligne */}
      <mesh position={[width / 2 + 0.1, 0, 0.01]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </mesh>
      <mesh position={[width / 2 + 0.1, topY, topZ + 0.01]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </mesh>

      <DimensionLabel 
        label="H"
        value={segment.height} 
        position={[width / 2 + 0.4, topY / 2, topZ / 2 + 0.05]} 
      />
    </group>
  );
};

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

  // Calcul des positions de base pour chaque segment
  const panels = useMemo(() => {
    const result = [];
    let currentY = 0;
    let currentZ = 0;
    let currentDist = 0;

    for (const seg of config.segments) {
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

  // Ligne de cotation de largeur (bas du mur)
  const widthLinePoints = useMemo(() => [
    new THREE.Vector3(-config.width / 2, -0.05, 0.2),
    new THREE.Vector3(config.width / 2, -0.05, 0.2)
  ], [config.width]);
  const widthLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(widthLinePoints), [widthLinePoints]);

  // Fix: Create memoized THREE.Line object to use with primitive tag
  const widthLineObject = useMemo(() => new THREE.Line(widthLineGeometry), [widthLineGeometry]);

  return (
    <group name="wall-group">
      {/* DIMENSION DE LARGEUR GLOBALE */}
      {/* Fix: Use primitive to mount THREE.Line and avoid conflict with SVG 'line' tag in JSX */}
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