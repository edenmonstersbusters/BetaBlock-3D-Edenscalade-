
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WallSegment } from '../../types';
import { DimensionLabel } from '../../components/ui/3d/DimensionLabel';

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

export const WallPanel: React.FC<WallPanelProps> = ({ 
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

    indices.push(0, 1, 5, 0, 5, 4); 
    indices.push(2, 3, 7, 2, 7, 6); 
    indices.push(3, 0, 4, 3, 4, 7); 
    indices.push(1, 2, 6, 1, 6, 5); 
    
    if (cumulativeDist === 0) indices.push(0, 3, 2, 0, 2, 1);
    indices.push(4, 5, 6, 4, 6, 7);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [width, thickness, panelSize, segment.height, topY, topZ, cumulativeDist]);

  const heightLinePoints = useMemo(() => [
    new THREE.Vector3(width / 2 + 0.1, 0, 0.01),
    new THREE.Vector3(width / 2 + 0.1, topY, topZ + 0.01)
  ], [width, topY, topZ]);

  const heightLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(heightLinePoints), [heightLinePoints]);
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

      <primitive object={heightLineObject}>
        <lineBasicMaterial attach="material" color="#ffffff" opacity={0.3} transparent />
      </primitive>
      
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
