
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
  placementRef?: React.MutableRefObject<((height: number) => { pos: [number,number,number], rot: [number,number,number] } | null) | null>;
}

export const Scene: React.FC<SceneProps> = ({ 
  config, mode, holds, onPlaceHold, selectedHoldDef, holdSettings,
  selectedPlacedHoldIds, onSelectPlacedHold, onContextMenu, onWallPointerUpdate,
  onHoldDrag, onHoldDragEnd, screenshotRef,
  mannequinConfig, mannequinState, onUpdateMannequin, placementRef
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

  // --- ALGORITHME DE PLACEMENT "PONT" DU MANNEQUIN ---
  const calculateMannequinTransform = (
      cursorPoint: THREE.Vector3, 
      segmentId: string, 
      mannequinHeight: number,
      config: WallConfig
  ) => {
      // 1. Trouver la position métrique (odomètre) du curseur sur le mur
      const cursorLocal = calculateLocalCoords(cursorPoint, segmentId, config);
      if (!cursorLocal) return null;

      // On calcule la distance cumulée (Y global déroulé) du curseur
      let cursorCumulativeY = 0;
      let foundCursor = false;
      
      for(const seg of config.segments) {
          if (seg.id === segmentId) {
              cursorCumulativeY += cursorLocal.y;
              foundCursor = true;
              break;
          }
          cursorCumulativeY += seg.height;
      }
      if (!foundCursor) return null;

      // 2. Définir les points cibles Pieds et Tête en distance déroulée
      // UPDATE : Le curseur est maintenant le VENTRE (centre).
      const feetTargetY = cursorCumulativeY - (mannequinHeight * 0.5);
      const headTargetY = cursorCumulativeY + (mannequinHeight * 0.5);

      // Helper pour trouver la Pos 3D et la Normale à partir d'une distance déroulée
      const resolvePointOnWall = (targetY: number, xOffset: number): { pos: THREE.Vector3, normal: THREE.Vector3 } | null => {
          let currentY = 0;
          let segmentBasePos = new THREE.Vector3(0, 0, 0);

          // On clamp targetY pour rester dans les limites du mur
          const totalHeight = config.segments.reduce((acc, s) => acc + s.height, 0);
          const safeY = Math.max(0.01, Math.min(totalHeight - 0.01, targetY));

          for (const seg of config.segments) {
              // Si le point est dans ce segment (ou si c'est le dernier et qu'on dépasse)
              if (safeY <= currentY + seg.height) {
                  const localY = safeY - currentY;
                  const rad = (seg.angle * Math.PI) / 180;
                  
                  // Calcul Position
                  // On part de la base du segment
                  // On avance selon la pente (localY)
                  // On décale selon X (xOffset)
                  
                  // Vecteur Pente (Montée)
                  const slopeVec = new THREE.Vector3(0, Math.cos(rad), Math.sin(rad));
                  
                  const point = segmentBasePos.clone()
                      .add(slopeVec.multiplyScalar(localY));
                  point.x = xOffset; // L'axe X est simple (tout droit)

                  // Calcul Normale (Sortante)
                  // Rotation de -90deg sur X par rapport à la pente
                  const normal = new THREE.Vector3(0, -Math.sin(rad), Math.cos(rad));
                  
                  return { pos: point, normal: normal };
              }

              // Avancer au prochain segment
              const rad = (seg.angle * Math.PI) / 180;
              segmentBasePos.y += seg.height * Math.cos(rad);
              segmentBasePos.z += seg.height * Math.sin(rad);
              currentY += seg.height;
          }
          return null;
      };

      // 3. Raycast Analytique (Calcul géométrique)
      const feetData = resolvePointOnWall(feetTargetY, cursorLocal.x);
      const headData = resolvePointOnWall(headTargetY, cursorLocal.x);

      if (!feetData || !headData) return null;

      // 4. Calcul de la Position Moyenne (Centre du corps / Pont géométrique)
      const centerPos = new THREE.Vector3().addVectors(feetData.pos, headData.pos).multiplyScalar(0.5);

      // 5. Calcul des Vecteurs d'Orientation
      // Y Local (Vecteur colonne vertébrale) : Des pieds vers la tête
      const upVec = new THREE.Vector3().subVectors(headData.pos, feetData.pos).normalize();

      // Normale Moyenne (Direction du regard inversée / Dos au vide)
      const avgNormal = new THREE.Vector3().addVectors(feetData.normal, headData.normal).normalize();

      // Z Local (Vers le mur) = Opposé de la normale moyenne (car la normale sort du mur)
      const forwardVec = avgNormal.clone().negate();

      // 6. Construction de la Matrice de Rotation (LookAt amélioré avec Up vector forcé)
      // On veut : Y = upVec, Z = -avgNormal (approx).
      // On recalcul X pour être orthogonal.
      const rightVec = new THREE.Vector3().crossVectors(upVec, forwardVec).normalize();
      // On recalcule le vrai Forward orthogonal
      const trueForwardVec = new THREE.Vector3().crossVectors(rightVec, upVec).normalize();

      const rotationMatrix = new THREE.Matrix4().makeBasis(rightVec, upVec, trueForwardVec);
      const finalRot = new THREE.Euler().setFromRotationMatrix(rotationMatrix);

      // 7. Offset et Placement final
      // UPDATE : Offset de 3cm (quasi collé)
      const offsetDistance = 0.03;
      
      // On pousse le centre géométrique vers le vide
      const adjustedCenter = centerPos.add(avgNormal.multiplyScalar(offsetDistance));
      
      // UPDATE ALIGNEMENT VENTRE :
      // Le composant Mannequin a son origine (0,0,0) aux PIEDS.
      // Si on lui passe 'adjustedCenter' comme position, ses pieds seront au centre (ventre), et sa tête à +height.
      // Il faut donc décaler la position finale vers le bas, le long de la colonne vertébrale (-upVec), de height/2.
      const feetOriginPos = adjustedCenter.clone().add(upVec.clone().multiplyScalar(-mannequinHeight * 0.5));

      return {
          pos: feetOriginPos,
          rot: finalRot
      };
  };

  const MannequinController = () => {
      const { camera, scene } = useThree();
      const raycaster = new THREE.Raycaster();

      // Hook pour exposer la logique de placement au parent
      useEffect(() => {
          if (placementRef) {
              placementRef.current = (height: number) => {
                  // Raycast depuis le centre de l'écran (0,0 en coords normalisées)
                  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                  const intersects = raycaster.intersectObjects(scene.children, true);
                  // On cherche le premier mur touché
                  const wallHit = intersects.find(h => h.object.name === 'climbing-wall-panel');
                  
                  if (wallHit && wallHit.point && wallHit.object.userData.segmentId) {
                      // On calcule directement le pont
                      const transform = calculateMannequinTransform(
                          wallHit.point,
                          wallHit.object.userData.segmentId,
                          height,
                          config
                      );
                      
                      if (transform) {
                          return {
                              pos: [transform.pos.x, transform.pos.y, transform.pos.z],
                              rot: [transform.rot.x, transform.rot.y, transform.rot.z]
                          };
                      }
                  }
                  return null;
              };
          }
      }, [camera, scene, config]); // Dépendances pour mettre à jour la ref si la config change

      return null;
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
      
      {/* Composant logique invisible pour le placement du mannequin */}
      <MannequinController />

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
