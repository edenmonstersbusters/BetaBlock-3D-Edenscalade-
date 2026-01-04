
import React, { useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';
import '../types'; 

interface SceneProps {
  config: WallConfig;
  mode: AppMode;
  holds: (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  onPlaceHold: (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => void;
  selectedHoldDef: HoldDefinition | null;
  holdSettings: { scale: number; rotation: number; color: string };
  selectedPlacedHoldIds: string[];
  onSelectPlacedHold: (id: string | null, multi?: boolean) => void;
  onContextMenu: (type: 'HOLD' | 'SEGMENT', id: string, x: number, y: number, wallX?: number, wallY?: number) => void;
  onWallPointerUpdate?: (info: { x: number, y: number, segmentId: string } | null) => void;
}

export const Scene: React.FC<SceneProps> = ({ 
  config, 
  mode, 
  holds, 
  onPlaceHold, 
  selectedHoldDef,
  holdSettings,
  selectedPlacedHoldIds,
  onSelectPlacedHold,
  onContextMenu,
  onWallPointerUpdate,
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);

  const getWallCoords = (point: THREE.Vector3, segmentId: string) => {
    const segmentIndex = config.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return null;
    
    let segmentStartY = 0; let segmentStartZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i]; const r = (s.angle * Math.PI) / 180;
        segmentStartY += s.height * Math.cos(r); segmentStartZ += s.height * Math.sin(r);
    }
    const dy = point.y - segmentStartY;
    const dz = point.z - segmentStartZ;
    const wallY = Math.sqrt(dy * dy + dz * dz);
    return { x: point.x, y: wallY };
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    // Mise à jour de la position de collage globale (App.tsx)
    const wallCoords = getWallCoords(e.point, segmentId);
    if (wallCoords) {
      onWallPointerUpdate?.({ ...wallCoords, segmentId });
    }

    if (mode !== 'SET') return;
    if (!selectedHoldDef || selectedPlacedHoldIds.length > 0) {
      if (ghostPos) setGhostPos(null);
      return;
    }
    
    e.stopPropagation();
    setGhostPos(e.point.clone());
    const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const spinQ = new THREE.Quaternion();
    spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (holdSettings.rotation * Math.PI) / 180);
    quaternion.multiply(spinQ);
    setGhostRot(new THREE.Euler().setFromQuaternion(quaternion));
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (mode !== 'SET') return;
    if (e.button !== 0) return;
    
    if (selectedPlacedHoldIds.length > 0) {
      e.stopPropagation();
      onSelectPlacedHold(null);
    } else if (selectedHoldDef) {
      e.stopPropagation();
      const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
      onPlaceHold(e.point.clone(), normal, segmentId);
    }
  };

  const handleWallContextMenu = (e: ThreeEvent<MouseEvent>, segmentId: string) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    const wallCoords = getWallCoords(e.point, segmentId);
    onContextMenu('SEGMENT', segmentId, e.nativeEvent.clientX, e.nativeEvent.clientY, wallCoords?.x, wallCoords?.y);
  };

  return (
    <Canvas 
      shadows 
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => onWallPointerUpdate?.(null)}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      
      <OrbitControls makeDefault target={[0, 2, 0]} minDistance={1} maxDistance={40} />
      
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight intensity={0.2} color="#ffffff" groundColor="#000000" />

      <group position={[0, 0, 0]}>
        <WallMesh 
          config={config} 
          interactive={mode === 'SET'}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onContextMenu={handleWallContextMenu}
        />
        
        <Suspense fallback={null}>
            {holds.map((hold) => (
                <HoldModel 
                    key={hold.id}
                    modelFilename={hold.filename} 
                    baseScale={hold.modelBaseScale}
                    position={hold.position}
                    rotation={hold.rotation}
                    scale={hold.scale}
                    color={hold.color}
                    isSelected={selectedPlacedHoldIds.includes(hold.id)}
                    onClick={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        onSelectPlacedHold(hold.id, e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.preventDefault();
                      onContextMenu('HOLD', hold.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
                    }}
                />
            ))}
        </Suspense>

        {mode === 'SET' && selectedHoldDef && ghostPos && ghostRot && selectedPlacedHoldIds.length === 0 && (
            <Suspense fallback={null}>
                <HoldModel 
                    modelFilename={selectedHoldDef.filename}
                    baseScale={selectedHoldDef.baseScale}
                    position={[ghostPos.x, ghostPos.y, ghostPos.z]}
                    rotation={[ghostRot.x, ghostRot.y, ghostRot.z]}
                    scale={[holdSettings.scale, holdSettings.scale, holdSettings.scale]}
                    opacity={0.5}
                    color={holdSettings.color}
                    preview={true}
                />
            </Suspense>
        )}
      </group>

      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellColor="#222" sectionColor="#333" infiniteGrid />
      <ContactShadows opacity={0.4} scale={20} blur={2} far={10} resolution={512} color="#000000" />
      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
    </Canvas>
  );
};