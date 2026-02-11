
import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { Mannequin } from './Mannequin'; 
import { DragController } from './DragController';
import { ScreenshotHandler } from './ScreenshotHandler';
import { WallConfig, PlacedHold, AppMode, HoldDefinition, WallSegment } from '../types';
import { calculateLocalCoords, resolveHoldWorldData } from '../utils/geometry';
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
  
  mannequinConfig?: { height: number; posture: number };
  mannequinState?: { pos: [number,number,number], rot: [number,number,number] } | null;
  onUpdateMannequin?: (state: { pos: [number,number,number], rot: [number,number,number] }) => void;
}

export const Scene: React.FC<SceneProps> = ({ 
  config, mode, holds, onPlaceHold, selectedHoldDef, holdSettings,
  selectedPlacedHoldIds, onSelectPlacedHold, onContextMenu, onWallPointerUpdate,
  onHoldDrag, onHoldDragEnd, screenshotRef,
  mannequinConfig, mannequinState, onUpdateMannequin,
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
  
  const [isHoveringMannequin, setIsHoveringMannequin] = useState(false);
  const [isDraggingMannequin, setIsDraggingMannequin] = useState(false);
  
  const orbitRef = useRef<any>(null);
  const pointerDownScreenPos = useRef<{x: number, y: number} | null>(null);

  const isHoveringSelected = hoveredHoldId && selectedPlacedHoldIds.includes(hoveredHoldId);
  const orbitEnabled = !draggingId && !isHoveringSelected && !isDraggingMannequin;

  useEffect(() => {
    if (draggingId || isDraggingMannequin) {
      document.body.style.cursor = 'grabbing';
    } else if (isHoveringSelected || isHoveringMannequin) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => { document.body.style.cursor = 'auto'; };
  }, [draggingId, isHoveringSelected, isDraggingMannequin, isHoveringMannequin]);

  // --- ALGORITHME DE PLACEMENT DU MANNEQUIN (OFFSET) ---
  const calculateMannequinTransform = (
      cursorPoint: THREE.Vector3, 
      segmentId: string, 
      mannequinHeight: number,
      config: WallConfig
  ) => {
      const segmentIndex = config.segments.findIndex(s => s.id === segmentId);
      if (segmentIndex === -1) return null;
      const currentSeg = config.segments[segmentIndex];

      const angleRad = (currentSeg.angle * Math.PI) / 180;

      // 1. Calcul de la Normale du Mur (Direction vers le vide)
      // Pour un mur vertical (0°), normale = (0, 0, 1)
      // Rotation autour de X pour l'inclinaison
      const wallNormal = new THREE.Vector3(0, 0, 1);
      wallNormal.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleRad);
      wallNormal.normalize();

      // 2. POSITION AVEC OFFSET
      // On décale le point de pivot (ventre) hors du mur de 22cm pour éviter que les fesses rentrent dedans
      const offsetDistance = 0.22; 
      const bellyPos = cursorPoint.clone().add(wallNormal.clone().multiplyScalar(offsetDistance));

      // On descend pour trouver les pieds (environ la moitié de la hauteur)
      // Mais attention, on descend selon la verticalité du corps, pas celle du mur
      // Si on veut que le corps soit parallèle au mur, "Bas" = vecteur opposé au "Haut" du mur
      
      const wallUp = new THREE.Vector3(0, 1, 0);
      wallUp.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleRad);
      wallUp.normalize();

      const halfHeight = mannequinHeight * 0.5;
      const feetPos = bellyPos.clone().sub(wallUp.multiplyScalar(halfHeight));

      // 3. ROTATION (Dos au vide, parallèle au mur)
      const wallRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angleRad);
      const turn180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      const finalRotQ = wallRotation.clone().multiply(turn180);

      return {
          pos: feetPos,
          rot: new THREE.Euler().setFromQuaternion(finalRotQ)
      };
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (draggingId) return;

    // --- MANNEQUIN DRAG ---
    if (isDraggingMannequin && onUpdateMannequin && mannequinConfig) {
        e.stopPropagation();

        const transform = calculateMannequinTransform(
            e.point.clone(), 
            segmentId, 
            mannequinConfig.height, 
            config
        );

        if (transform) {
            onUpdateMannequin({
                pos: [transform.pos.x, transform.pos.y, transform.pos.z],
                rot: [transform.rot.x, transform.rot.y, transform.rot.z]
            });
        }
        return; 
    }

    // --- GHOST PRISE ---
    const coords = calculateLocalCoords(e.point, segmentId, config);
    if (coords) {
      onWallPointerUpdate?.({ ...coords, segmentId });
    }

    if (mode !== 'SET') return;
    if (!selectedHoldDef || selectedPlacedHoldIds.length > 0 || isHoveringMannequin) {
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

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDraggingMannequin || isHoveringMannequin) {
        e.stopPropagation();
        return;
    }
    if (draggingId) return;
    pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (isDraggingMannequin) {
        e.stopPropagation();
        setIsDraggingMannequin(false);
        if (orbitRef.current) orbitRef.current.enabled = true;
        return;
    }

    if (!pointerDownScreenPos.current) return;
    
    const dx = e.clientX - pointerDownScreenPos.current.x;
    const dy = e.clientY - pointerDownScreenPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      pointerDownScreenPos.current = null;
      return;
    }

    if (e.button === 2) {
      e.stopPropagation();
      const coords = calculateLocalCoords(e.point, segmentId, config);
      onContextMenu('SEGMENT', segmentId, e.clientX, e.clientY, coords?.x, coords?.y);
      pointerDownScreenPos.current = null;
      return;
    }

    if (e.button === 0) {
      if (draggingId) return;
      if (mode !== 'SET') return;

      if (selectedPlacedHoldIds.length > 0) {
        e.stopPropagation();
        onSelectPlacedHold(null);
      } else if (selectedHoldDef && !isHoveringMannequin) {
        e.stopPropagation();
        const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
        onPlaceHold(e.point.clone(), normal, segmentId);
      }
    }
    pointerDownScreenPos.current = null;
  };

  return (
    <Canvas 
      shadows 
      dpr={[1, 2]} 
      gl={{ 
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      }}
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => {
        onWallPointerUpdate?.(null);
        setHoveredHoldId(null);
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = THREE.NoToneMapping; 
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
      
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-10, 5, -10]} intensity={0.4} />
      <directionalLight position={[0, -10, 0]} intensity={0.2} color="#eef" />

      <group position={[0, 0, 0]}>
        <WallMesh 
          config={config} 
          interactive={mode === 'SET' || isDraggingMannequin} 
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredHoldId(hold.id);
                    }}
                    onPointerOut={(e) => {
                      if (hoveredHoldId === hold.id) {
                        setHoveredHoldId(null);
                      }
                    }}
                    onPointerDown={(e) => {
                      pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
                      if (e.button === 0) {
                        e.stopPropagation();
                        if (orbitRef.current) orbitRef.current.enabled = false;
                        const isMultiSelect = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
                        if (mode === 'SET' && !isMultiSelect && !isDraggingMannequin) {
                           onSelectPlacedHold(hold.id, false);
                           setDraggingId(hold.id);
                        } else {
                           onSelectPlacedHold(hold.id, isMultiSelect);
                        }
                      }
                    }}
                    onPointerUp={(e) => {
                      if (!pointerDownScreenPos.current) return;
                      const dx = e.clientX - pointerDownScreenPos.current.x;
                      const dy = e.clientY - pointerDownScreenPos.current.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      pointerDownScreenPos.current = null;
                      
                      if (dist > 5) return;
                      
                      if (e.button === 2) {
                        e.stopPropagation();
                        onContextMenu('HOLD', hold.id, e.clientX, e.clientY);
                      }
                    }}
                />
            ))}
            
            {/* MANNEQUIN RENDERING */}
            {mannequinState && mannequinConfig && (
                <Mannequin 
                    position={mannequinState.pos}
                    rotation={mannequinState.rot}
                    height={mannequinConfig.height}
                    armPosture={mannequinConfig.posture}
                    opacity={isDraggingMannequin ? 0.7 : 1}
                    transparent={isDraggingMannequin}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        setIsHoveringMannequin(true);
                    }}
                    onPointerOut={(e) => {
                        setIsHoveringMannequin(false);
                    }}
                    onPointerDown={(e) => {
                        // Démarrer le drag du mannequin
                        e.stopPropagation();
                        if (orbitRef.current) orbitRef.current.enabled = false;
                        setIsDraggingMannequin(true);
                    }}
                />
            )}

        </Suspense>

        {mode === 'SET' && selectedHoldDef && ghostPos && ghostRot && selectedPlacedHoldIds.length === 0 && !draggingId && !isDraggingMannequin && !isHoveringMannequin && (
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

      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellColor="#333" sectionColor="#444" infiniteGrid fadeDistance={20} />
      <ContactShadows opacity={0.6} scale={20} blur={2.5} far={4} resolution={512} color="#000000" />
    </Canvas>
  );
};
