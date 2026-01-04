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
  onHoldDrag?: (id: string, x: number, y: number, segmentId: string) => void;
  onHoldDragEnd?: () => void;
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
  onHoldDrag,
  onHoldDragEnd
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Calcule les coordonnées locales (x, y) relatives à un segment spécifique
  const getSegmentLocalCoords = (point: THREE.Vector3, segmentId: string) => {
    const segmentIndex = config.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return null;
    
    // Calculer l'offset de base du segment
    let startY = 0; 
    let startZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i]; 
        const r = (s.angle * Math.PI) / 180;
        startY += s.height * Math.cos(r); 
        startZ += s.height * Math.sin(r);
    }

    // Le X local est simplement le X global (le mur est centré)
    const localX = point.x;

    // Le Y local est la distance entre le point d'impact et la base du segment
    const dy = point.y - startY;
    const dz = point.z - startZ;
    // Théorème de Pythagore pour obtenir la distance le long de la pente
    const localY = Math.sqrt(dy * dy + dz * dz);

    return { x: localX, y: localY };
  };

  const getWallCoords = (point: THREE.Vector3, segmentId: string) => {
    // Legacy support for global wallY calculation if needed, though getSegmentLocalCoords is better for placement
    const local = getSegmentLocalCoords(point, segmentId);
    if (!local) return null;
    
    // Pour la compatibilité avec l'affichage global (App.tsx info)
    // On recalcule une sorte de Y global approximatif pour l'UI si nécessaire
    // Mais ici on retourne les coords locales car c'est ce qu'on utilise
    return { x: local.x, y: local.y }; 
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    // Si on drag une prise
    if (draggingId && onHoldDrag) {
      e.stopPropagation();
      const localCoords = getSegmentLocalCoords(e.point, segmentId);
      if (localCoords) {
        // Limites du mur
        const segment = config.segments.find(s => s.id === segmentId);
        if (segment) {
            const clampedY = Math.max(0, Math.min(segment.height, localCoords.y));
            const clampedX = Math.max(-config.width/2, Math.min(config.width/2, localCoords.x));
            onHoldDrag(draggingId, clampedX, clampedY, segmentId);
        }
      }
      return;
    }

    // Mise à jour de la position de collage globale (App.tsx)
    const localCoords = getSegmentLocalCoords(e.point, segmentId);
    if (localCoords) {
      onWallPointerUpdate?.({ ...localCoords, segmentId });
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
    if (draggingId) return; // Déjà en train de drag
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

  const handlePointerUp = () => {
    if (draggingId) {
      setDraggingId(null);
      onHoldDragEnd?.();
    }
  };

  const handleWallContextMenu = (e: ThreeEvent<MouseEvent>, segmentId: string) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    const localCoords = getSegmentLocalCoords(e.point, segmentId);
    onContextMenu('SEGMENT', segmentId, e.nativeEvent.clientX, e.nativeEvent.clientY, localCoords?.x, localCoords?.y);
  };

  return (
    <Canvas 
      shadows 
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => onWallPointerUpdate?.(null)}
      onPointerUp={handlePointerUp}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      
      {/* Désactive les contrôles de caméra pendant le drag pour une meilleure UX */}
      <OrbitControls makeDefault target={[0, 2, 0]} minDistance={1} maxDistance={40} enabled={!draggingId} />
      
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
                    isDragging={draggingId === hold.id}
                    onPointerDown={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        // Important: Release pointer capture so subsequent pointer events are not locked to this hold,
                        // allowing the wall behind to receive pointerMove events for dragging calculation.
                        (e.target as any).releasePointerCapture(e.pointerId);

                        // Si mode SET et aucune prise sélectionnée dans le catalogue, on commence le drag
                        // Si Ctrl est enfoncé, on fait de la multisélection classique, pas de drag
                        if (mode === 'SET' && !selectedHoldDef && !(e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)) {
                           setDraggingId(hold.id);
                           onSelectPlacedHold(hold.id, false); // Sélectionne la prise qu'on drag
                        } else {
                           onSelectPlacedHold(hold.id, e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
                        }
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

        {mode === 'SET' && selectedHoldDef && ghostPos && ghostRot && selectedPlacedHoldIds.length === 0 && !draggingId && (
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