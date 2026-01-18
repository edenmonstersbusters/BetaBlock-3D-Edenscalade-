
import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { DragController } from './DragController';
import { ScreenshotHandler } from './ScreenshotHandler';
import { MeasurementLine } from './MeasurementLine';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';
import { calculateLocalCoords } from '../utils/geometry';
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
  screenshotRef?: React.MutableRefObject<(() => Promise<string | null>) | null>;
  isDynamicMeasuring?: boolean;
  referenceHoldId?: string | null;
  setReferenceHoldId?: (id: string | null) => void;
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
  onHoldDragEnd,
  screenshotRef,
  isDynamicMeasuring,
  referenceHoldId,
  setReferenceHoldId
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
  
  const orbitRef = useRef<any>(null);
  const pointerDownRef = useRef<{x: number, y: number, button: number, time: number} | null>(null);

  const isHoveringSelected = hoveredHoldId && selectedPlacedHoldIds.includes(hoveredHoldId);
  const orbitEnabled = !draggingId && !isHoveringSelected;

  useEffect(() => {
    if (draggingId) {
      document.body.style.cursor = 'grabbing';
    } else if (isHoveringSelected) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => { document.body.style.cursor = 'auto'; };
  }, [draggingId, isHoveringSelected]);

  const measurementData = useMemo(() => {
    if (selectedPlacedHoldIds.length !== 2) return null;
    const h1 = holds.find(h => h.id === selectedPlacedHoldIds[0]);
    const h2 = holds.find(h => h.id === selectedPlacedHoldIds[1]);
    if (h1 && h2) {
        return {
            start: new THREE.Vector3(...h1.position),
            end: new THREE.Vector3(...h2.position)
        };
    }
    return null;
  }, [selectedPlacedHoldIds, holds]);

  const dynamicMeasurementData = useMemo(() => {
      if (!isDynamicMeasuring || !referenceHoldId || !ghostPos) return null;
      const refHold = holds.find(h => h.id === referenceHoldId);
      if (!refHold) return null;
      return {
          start: new THREE.Vector3(...refHold.position),
          end: ghostPos
      };
  }, [isDynamicMeasuring, referenceHoldId, ghostPos, holds]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (draggingId) return;

    const coords = calculateLocalCoords(e.point, segmentId, config);
    if (coords) {
      onWallPointerUpdate?.({ ...coords, segmentId });
    }

    if (mode !== 'SET') return;
    if (!selectedHoldDef || selectedPlacedHoldIds.length > 0) {
      if (ghostPos) setGhostPos(null);
      return;
    }
    
    setGhostPos(e.point.clone());
    const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const spinQ = new THREE.Quaternion();
    spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (holdSettings.rotation * Math.PI) / 180);
    quaternion.multiply(spinQ);
    setGhostRot(new THREE.Euler().setFromQuaternion(quaternion));
  };

  // --- GESTION CENTRALISÉE DES ÉVÉNEMENTS SOURIS ---

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // On enregistre les coordonnées et le bouton pressé
    pointerDownRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        button: e.button,
        time: Date.now() 
    };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!pointerDownRef.current) return;
    
    const { x, y, button, time } = pointerDownRef.current;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    pointerDownRef.current = null;
    
    // DISTINCTION CLÉ : Si on a bougé de plus de 5px, c'est un DRAG (caméra ou objet), on ignore le clic
    if (dist > 5) return;

    // --- CLIC GAUCHE (0) ---
    if (button === 0) {
      if (draggingId) return;
      
      // Check if Hold
      if (e.object.userData && (e.object.userData.type === 'HOLD' || e.object.parent?.userData?.type === 'HOLD')) {
          const holdData = e.object.userData.type === 'HOLD' ? e.object.userData : e.object.parent!.userData;
          const holdId = holdData.id;

          if (isDynamicMeasuring && !referenceHoldId && setReferenceHoldId) {
            setReferenceHoldId(holdId);
            e.stopPropagation();
            return;
          }

          if (orbitRef.current) orbitRef.current.enabled = false;
          const isMultiSelect = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
          
          if (mode === 'SET' && !isMultiSelect) {
             onSelectPlacedHold(holdId, false);
             setDraggingId(holdId);
          } else {
             onSelectPlacedHold(holdId, isMultiSelect);
          }
          e.stopPropagation();
          return;
      }

      // Check if Wall (Placement)
      if (mode === 'SET' && e.object.name === 'climbing-wall-panel') {
          if (selectedPlacedHoldIds.length > 0) {
            onSelectPlacedHold(null);
            e.stopPropagation();
          } else if (selectedHoldDef) {
            const segmentId = e.object.userData.segmentId;
            const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
            onPlaceHold(e.point.clone(), normal, segmentId);
            e.stopPropagation();
          }
      }
    }

    // --- CLIC DROIT (2) ---
    if (button === 2) {
        // C'est un clic droit STATIQUE (pas un drag caméra, car dist < 5px)
        
        // 1. Check Hold (même si sélectionnée)
        let target = e.object;
        let holdFound = false;
        
        // Traverser la hiérarchie pour trouver userData.type === 'HOLD'
        while (target) {
            if (target.userData && target.userData.type === 'HOLD') {
                e.stopPropagation();
                onContextMenu('HOLD', target.userData.id, e.clientX, e.clientY);
                holdFound = true;
                break;
            }
            if (target.parent) target = target.parent as THREE.Object3D;
            else break;
        }
        if (holdFound) return;

        // 2. Check Wall
        if (e.object.name === 'climbing-wall-panel') {
             const segmentId = e.object.userData.segmentId;
             const coords = calculateLocalCoords(e.point, segmentId, config);
             onContextMenu('SEGMENT', segmentId, e.clientX, e.clientY, coords?.x, coords?.y);
             e.stopPropagation();
        }
    }
  };

  return (
    <Canvas 
      shadows 
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => {
        onWallPointerUpdate?.(null);
        setHoveredHoldId(null);
      }}
      // Empêcher le menu contextuel natif du navigateur
      onContextMenu={(e) => e.preventDefault()}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      
      {screenshotRef && <ScreenshotHandler onScreenshotRef={screenshotRef} />}

      <OrbitControls 
        ref={orbitRef}
        makeDefault 
        target={[0, 2, 0]} 
        minDistance={1} 
        maxDistance={40} 
        enabled={orbitEnabled} 
      />
      
      <DragController 
        draggingId={draggingId}
        config={config}
        onHoldDrag={onHoldDrag}
        onDragEnd={() => onHoldDragEnd?.()}
        setDraggingId={setDraggingId}
        orbitRef={orbitRef}
      />
      
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight intensity={0.2} color="#ffffff" groundColor="#000000" />

      {/* GROUPE PRINCIPAL : Intercepte les événements pointeur pour toute la scène */}
      <group 
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <WallMesh 
          config={config} 
          interactive={mode === 'SET'}
          onPointerMove={handlePointerMove}
        />
        
        {measurementData && <MeasurementLine start={measurementData.start} end={measurementData.end} />}
        {dynamicMeasurementData && <MeasurementLine start={dynamicMeasurementData.start} end={dynamicMeasurementData.end} />}

        <Suspense fallback={null}>
            {holds.map((hold) => (
                <HoldModel 
                    key={hold.id}
                    // Injection des données pour la détection dans Scene
                    userData={{ type: 'HOLD', id: hold.id }}
                    modelFilename={hold.filename} 
                    baseScale={hold.modelBaseScale}
                    position={hold.position}
                    rotation={hold.rotation}
                    scale={hold.scale}
                    color={hold.color}
                    isSelected={selectedPlacedHoldIds.includes(hold.id) || referenceHoldId === hold.id}
                    isDragging={draggingId === hold.id}
                    onPointerOver={(e) => { e.stopPropagation(); setHoveredHoldId(hold.id); }}
                    onPointerOut={(e) => { if (hoveredHoldId === hold.id) setHoveredHoldId(null); }}
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
