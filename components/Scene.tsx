
import React, { useState, Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';
import '../types'; 

// Utility function for coordinate calculation
const calculateLocalCoords = (point: THREE.Vector3, segmentId: string, config: WallConfig) => {
    const segmentIndex = config.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return null;
    
    let startY = 0; 
    let startZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i]; 
        const r = (s.angle * Math.PI) / 180;
        startY += s.height * Math.cos(r); 
        startZ += s.height * Math.sin(r);
    }

    const localX = point.x;
    const dy = point.y - startY;
    const dz = point.z - startZ;
    const localY = Math.sqrt(dy * dy + dz * dz);

    return { x: localX, y: localY };
};

// Internal component to handle global drag logic via manual raycasting
const DragController: React.FC<{
  draggingId: string | null;
  config: WallConfig;
  onHoldDrag?: (id: string, x: number, y: number, segmentId: string) => void;
  onDragEnd: () => void;
  setDraggingId: (id: string | null) => void;
  orbitRef: React.MutableRefObject<any>;
}> = ({ draggingId, config, onHoldDrag, onDragEnd, setDraggingId, orbitRef }) => {
  const { camera, scene, gl } = useThree();

  useEffect(() => {
    if (!draggingId) return;
    console.log('[DragController] Activated for hold:', draggingId);

    const onPointerMove = (e: PointerEvent) => {
       const rect = gl.domElement.getBoundingClientRect();
       // Normalized device coordinates
       const mouse = new THREE.Vector2(
         ((e.clientX - rect.left) / rect.width) * 2 - 1,
         -((e.clientY - rect.top) / rect.height) * 2 + 1
       );

       const raycaster = new THREE.Raycaster();
       raycaster.setFromCamera(mouse, camera);
       
       // Intersect recursively with the scene
       const intersects = raycaster.intersectObjects(scene.children, true);
       // Find the wall panel
       const wallHit = intersects.find(hit => hit.object.name === 'climbing-wall-panel');

       if (wallHit && onHoldDrag) {
          const segmentId = wallHit.object.userData.segmentId;
          const coords = calculateLocalCoords(wallHit.point, segmentId, config);
          
          if (coords) {
             const segment = config.segments.find(s => s.id === segmentId);
             if (segment) {
                const clampedY = Math.max(0, Math.min(segment.height, coords.y));
                const clampedX = Math.max(-config.width/2, Math.min(config.width/2, coords.x));
                onHoldDrag(draggingId, clampedX, clampedY, segmentId);
             }
          }
       }
    };

    const onPointerUp = () => {
       console.log('[DragController] Global Pointer Up/Cancel detected');
       setDraggingId(null);
       if (orbitRef.current) orbitRef.current.enabled = true;
       onDragEnd();
    };

    // Attach to window to catch events even if they leave the canvas or element is captured
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
       window.removeEventListener('pointermove', onPointerMove);
       window.removeEventListener('pointerup', onPointerUp);
       window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [draggingId, camera, scene, gl, config, onHoldDrag, onDragEnd, setDraggingId, orbitRef]);

  return null;
};

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
  const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
  
  const orbitRef = useRef<any>(null);
  const pointerDownScreenPos = useRef<{x: number, y: number} | null>(null);

  // Strategy: Disable orbit controls when hovering a selected hold to prioritize interaction
  const isHoveringSelected = hoveredHoldId && selectedPlacedHoldIds.includes(hoveredHoldId);
  const orbitEnabled = !draggingId && !isHoveringSelected;

  // Cursor management
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
    // Note: Actual dragging logic is now handled by DragController
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
    // Record for left (0) and right (2) clicks
    if (e.button === 0 || e.button === 2) {
      pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (!pointerDownScreenPos.current) return;
    if (draggingId) return;
    if (mode !== 'SET') return;
    if (e.button !== 0) return;

    // Calcul du delta de mouvement
    const dx = e.clientX - pointerDownScreenPos.current.x;
    const dy = e.clientY - pointerDownScreenPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // On ne réinitialise pas encore pointerDownScreenPos car le menu contextuel (right click)
    // peut se déclencher juste après si c'est le bouton droit.

    // Seuil de 5 pixels : si plus, c'est un mouvement de caméra (Orbit)
    if (dist > 5) {
      pointerDownScreenPos.current = null;
      return;
    }

    // Validation de l'action de pose ou de désélection (Bouton Gauche)
    if (selectedPlacedHoldIds.length > 0) {
      e.stopPropagation();
      onSelectPlacedHold(null);
    } else if (selectedHoldDef) {
      e.stopPropagation();
      const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
      onPlaceHold(e.point.clone(), normal, segmentId);
    }
    pointerDownScreenPos.current = null;
  };

  const handleWallContextMenu = (e: ThreeEvent<MouseEvent>, segmentId: string) => {
    e.nativeEvent.preventDefault();
    if (!pointerDownScreenPos.current) return;

    const dx = e.clientX - pointerDownScreenPos.current.x;
    const dy = e.clientY - pointerDownScreenPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    pointerDownScreenPos.current = null;

    if (dist > 5) return; // C'était un mouvement de caméra (Pan)

    e.stopPropagation();
    const coords = calculateLocalCoords(e.point, segmentId, config);
    onContextMenu('SEGMENT', segmentId, e.nativeEvent.clientX, e.nativeEvent.clientY, coords?.x, coords?.y);
  };

  return (
    <Canvas 
      shadows 
      camera={{ position: [8, 5, 12], fov: 40 }}
      onPointerLeave={() => {
        onWallPointerUpdate?.(null);
        setHoveredHoldId(null);
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      
      <OrbitControls 
        ref={orbitRef}
        makeDefault 
        target={[0, 2, 0]} 
        minDistance={1} 
        maxDistance={40} 
        enabled={orbitEnabled} 
      />
      
      {/* Fix: Replaced handleHoldDrag and handleHoldDragEnd with onHoldDrag and onHoldDragEnd props */}
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

      <group position={[0, 0, 0]}>
        <WallMesh 
          config={config} 
          interactive={mode === 'SET'}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
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
                      // Record position for right-click delta check
                      pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };

                      if (e.button === 0) {
                        e.stopPropagation();
                        // Verrouillage immédiat pour éviter tout conflit avec Orbit
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
                    onContextMenu={(e) => {
                      e.nativeEvent.preventDefault();
                      if (!pointerDownScreenPos.current) return;
                      
                      const dx = e.clientX - pointerDownScreenPos.current.x;
                      const dy = e.clientY - pointerDownScreenPos.current.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      pointerDownScreenPos.current = null;

                      if (dist > 5) return; // Ignore menu if we panned

                      e.stopPropagation();
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
