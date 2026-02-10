
import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { DragController } from './DragController';
import { ScreenshotHandler } from './ScreenshotHandler';
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
  screenshotRef
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
  
  const orbitRef = useRef<any>(null);
  const pointerDownScreenPos = useRef<{x: number, y: number} | null>(null);

  // Strategy: Disable orbit controls when hovering a selected hold to prioritize interaction
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

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (draggingId) return;
    pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (!pointerDownScreenPos.current) return;
    
    const dx = e.clientX - pointerDownScreenPos.current.x;
    const dy = e.clientY - pointerDownScreenPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Si on a bougé (drag), on ne fait rien
    if (dist > 5) {
      pointerDownScreenPos.current = null;
      return;
    }

    // Gestion CLIC DROIT (Menu contextuel sur le mur)
    if (e.button === 2) {
      e.stopPropagation();
      const coords = calculateLocalCoords(e.point, segmentId, config);
      onContextMenu('SEGMENT', segmentId, e.clientX, e.clientY, coords?.x, coords?.y);
      pointerDownScreenPos.current = null;
      return;
    }

    // Gestion CLIC GAUCHE (Placement ou désélection)
    if (e.button === 0) {
      if (draggingId) return;
      if (mode !== 'SET') return;

      if (selectedPlacedHoldIds.length > 0) {
        e.stopPropagation();
        onSelectPlacedHold(null);
      } else if (selectedHoldDef) {
        e.stopPropagation();
        const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
        onPlaceHold(e.point.clone(), normal, segmentId);
      }
    }
    pointerDownScreenPos.current = null;
  };

  // On désactive le menu par défaut du navigateur
  const preventDefaultContextMenu = (e: any) => {
    e.preventDefault();
  };

  return (
    <Canvas 
      shadows 
      dpr={[1, 2]} // Ratio de pixels dynamique pour la netteté sur écrans Retina
      gl={{ 
        preserveDrawingBuffer: true,
        antialias: true, // Lissage des bords
        alpha: true,     // Fond transparent correct
        powerPreference: "high-performance" // Force GPU
      }}
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => {
        onWallPointerUpdate?.(null);
        setHoveredHoldId(null);
      }}
      onContextMenu={preventDefaultContextMenu}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        // On garde NoToneMapping pour avoir la couleur brute, mais on réduit l'intensité des lumières
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
      
      {/* --- ÉCLAIRAGE STUDIO CORRIGÉ (MOINS FORT POUR ÉVITER LE FLUO) --- */}
      
      {/* 1. Ambient Light : Réduite de 1.8 à 0.6 pour que les couleurs ne saturent pas vers le blanc */}
      <ambientLight intensity={0.6} />

      {/* 2. Key Light (Principal) : Réduite légèrement pour éviter de brûler les faces éclairées */}
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      />

      {/* 3. Fill Light (Remplissage) : Doux débouchage des ombres */}
      <directionalLight 
        position={[-10, 5, -10]} 
        intensity={0.4} 
      />

      {/* 4. Bounce Light (Rebond) : Trés subtil par en dessous */}
      <directionalLight 
        position={[0, -10, 0]} 
        intensity={0.2} 
        color="#eef" 
      />

      {/* --- FIN ÉCLAIRAGE --- */}

      <group position={[0, 0, 0]}>
        <WallMesh 
          config={config} 
          interactive={mode === 'SET'}
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
                        if (mode === 'SET' && !isMultiSelect) {
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

      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellColor="#333" sectionColor="#444" infiniteGrid fadeDistance={20} />
      <ContactShadows opacity={0.6} scale={20} blur={2.5} far={4} resolution={512} color="#000000" />
    </Canvas>
  );
};
