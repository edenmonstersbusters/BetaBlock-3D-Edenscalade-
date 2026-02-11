
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

// Extension du type pour stocker l'ancrage logique du mannequin
type MannequinAnchor = {
    cumulativeY: number; // Distance depuis le bas du mur (odomètre)
    xOffset: number;     // Position latérale
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
  screenshotRef?: React.MutableRefObject<(() => Promise<string | null>) | null>;
  
  mannequinConfig?: { height: number; posture: number };
  // Mise à jour du state pour inclure l'ancre logique
  mannequinState?: { 
      pos: [number,number,number], 
      rot: [number,number,number],
      anchor?: MannequinAnchor 
  } | null;
  onUpdateMannequin?: (state: { 
      pos: [number,number,number], 
      rot: [number,number,number],
      anchor?: MannequinAnchor 
  }) => void;
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

  // --- MOTEUR PHYSIQUE DU MANNEQUIN ---

  // Fonction utilitaire : Convertit une distance cumulée (odomètre) en Point 3D + Normale
  const getPointFromOdometer = (targetY: number, xOffset: number, currentConfig: WallConfig) => {
      let currentY = 0;
      let segmentBasePos = new THREE.Vector3(0, 0, 0);
      const totalHeight = currentConfig.segments.reduce((acc, s) => acc + s.height, 0);
      const safeY = Math.max(0.01, Math.min(totalHeight - 0.01, targetY));

      for (const seg of currentConfig.segments) {
          if (safeY <= currentY + seg.height) {
              const localY = safeY - currentY;
              const rad = (seg.angle * Math.PI) / 180;
              const slopeVec = new THREE.Vector3(0, Math.cos(rad), Math.sin(rad));
              const point = segmentBasePos.clone().add(slopeVec.multiplyScalar(localY));
              point.x = xOffset;
              const normal = new THREE.Vector3(0, -Math.sin(rad), Math.cos(rad));
              return { pos: point, normal: normal };
          }
          const rad = (seg.angle * Math.PI) / 180;
          segmentBasePos.y += seg.height * Math.cos(rad);
          segmentBasePos.z += seg.height * Math.sin(rad);
          currentY += seg.height;
      }
      return null;
  };

  // Coeur du calcul de positionnement (Analytique)
  const computeMannequinTransform = (
      centerCumulativeY: number,
      xOffset: number,
      height: number,
      posture: number,
      currentConfig: WallConfig
  ) => {
      // 1. Définir les points cibles Pieds et Tête/Mains
      let topExtension = 0;
      if (posture > 0.5) {
          const factor = (posture - 0.5) * 2;
          topExtension = height * 0.30 * factor;
      }

      const feetTargetY = centerCumulativeY - (height * 0.5);
      const topTargetY = centerCumulativeY + (height * 0.5) + topExtension;

      // 2. Récupérer les coords 3D
      const feetData = getPointFromOdometer(feetTargetY, xOffset, currentConfig);
      const topData = getPointFromOdometer(topTargetY, xOffset, currentConfig);

      if (!feetData || !topData) return null;

      // 3. Vecteurs de base
      const upVec = new THREE.Vector3().subVectors(topData.pos, feetData.pos).normalize();
      const rawCenterPos = new THREE.Vector3().addVectors(feetData.pos, topData.pos).multiplyScalar(0.5);
      const avgNormal = new THREE.Vector3().addVectors(feetData.normal, topData.normal).normalize();

      // 4. --- ANTI-COLLISION & HEAD SAFETY ---
      let maxPenetration = 0;
      
      // A. Collision Arêtes (Thorax/Ventre)
      const BODY_RADIUS = 0.18; 
      let currentSegY = 0;
      let segBasePos = new THREE.Vector3(0, 0, 0);
      const bodyLine = new THREE.Line3(feetData.pos, topData.pos);
      const closestPointOnBody = new THREE.Vector3();

      for (const seg of currentConfig.segments) {
          // Si le coin est entre pieds et tête
          if (currentSegY > feetTargetY && currentSegY < topTargetY) {
              const jointPos = segBasePos.clone();
              jointPos.x = xOffset;
              bodyLine.closestPointToPoint(jointPos, true, closestPointOnBody);
              const dist = jointPos.distanceTo(closestPointOnBody);
              if (dist < BODY_RADIUS) {
                  const penetration = BODY_RADIUS - dist;
                  if (penetration > maxPenetration) maxPenetration = penetration;
              }
          }
          const rad = (seg.angle * Math.PI) / 180;
          segBasePos.y += seg.height * Math.cos(rad);
          segBasePos.z += seg.height * Math.sin(rad);
          currentSegY += seg.height;
      }

      // B. Collision Tête (Head Probe)
      // La tête est à une position fixe par rapport aux pieds, peu importe où sont les mains.
      // Position théorique de la tête le long du vecteur corps
      const headHeightRatio = 0.9; // Tête à ~90% de la hauteur du corps (sans les bras)
      const theoreticalHeadPos = feetData.pos.clone().add(upVec.clone().multiplyScalar(height * headHeightRatio));
      
      // Point du mur correspondant à la hauteur de la tête
      const wallHeadY = feetTargetY + (height * headHeightRatio);
      const wallHeadData = getPointFromOdometer(wallHeadY, xOffset, currentConfig);

      if (wallHeadData) {
          // Vecteur allant du Mur vers la Tête Théorique
          const wallToHead = new THREE.Vector3().subVectors(theoreticalHeadPos, wallHeadData.pos);
          
          // On projette ce vecteur sur la normale du mur pour voir la distance "sortante"
          const distanceOut = wallToHead.dot(wallHeadData.normal);
          
          // Marge de sécurité pour la tête (plus large que le corps car le modèle 3D a du volume en haut)
          const HEAD_SAFETY_MARGIN = 0.05; // 5cm

          if (distanceOut < HEAD_SAFETY_MARGIN) {
              // Si la tête est "dans" le mur (distanceOut négatif) ou trop près (< 22cm)
              // On ajoute le manque à la pénétration globale pour repousser tout le corps
              const neededPush = HEAD_SAFETY_MARGIN - distanceOut;
              if (neededPush > maxPenetration) {
                  maxPenetration = neededPush;
              }
          }
      }

      // 5. Offset Final
      // Base offset (3cm) + Pénétration détectée (Corps ou Tête)
      const baseOffset = 0.03;
      const totalOffset = baseOffset + maxPenetration;
      
      const adjustedCenter = rawCenterPos.add(avgNormal.multiplyScalar(totalOffset));

      // 6. Orientation
      const forwardVec = avgNormal.clone().negate();
      const rightVec = new THREE.Vector3().crossVectors(upVec, forwardVec).normalize();
      const trueForwardVec = new THREE.Vector3().crossVectors(rightVec, upVec).normalize();
      const rotationMatrix = new THREE.Matrix4().makeBasis(rightVec, upVec, trueForwardVec);
      const finalRot = new THREE.Euler().setFromRotationMatrix(rotationMatrix);

      // 7. Origine (Pieds)
      const bridgeLength = feetData.pos.distanceTo(topData.pos);
      const feetOriginPos = adjustedCenter.clone().add(upVec.clone().multiplyScalar(-bridgeLength * 0.5));

      return {
          pos: feetOriginPos,
          rot: finalRot,
          anchor: {
              cumulativeY: centerCumulativeY,
              xOffset: xOffset
          }
      };
  };

  // Wrapper pour l'interaction Souris -> Calcul
  const calculateTransformFromCursor = (cursorPoint: THREE.Vector3, segmentId: string) => {
      const cursorLocal = calculateLocalCoords(cursorPoint, segmentId, config);
      if (!cursorLocal) return null;

      let cumulativeY = 0;
      for(const seg of config.segments) {
          if (seg.id === segmentId) {
              cumulativeY += cursorLocal.y;
              break;
          }
          cumulativeY += seg.height;
      }

      // Utilisation de la config actuelle ou d'une config T-Pose si nécessaire
      const h = mannequinConfig?.height || 1.75;
      const p = mannequinConfig?.posture ?? 0.5;

      return computeMannequinTransform(cumulativeY, cursorLocal.x, h, p, config);
  };

  // --- CONTROLLEUR LOGIQUE ---
  const MannequinController = () => {
      const { camera, scene } = useThree();
      const raycaster = new THREE.Raycaster();

      // 1. Placement initial (Centre écran)
      useEffect(() => {
          if (placementRef) {
              placementRef.current = (height: number) => {
                  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                  const intersects = raycaster.intersectObjects(scene.children, true);
                  const wallHit = intersects.find(h => h.object.name === 'climbing-wall-panel');
                  
                  if (wallHit && wallHit.point && wallHit.object.userData.segmentId) {
                      const res = calculateTransformFromCursor(wallHit.point, wallHit.object.userData.segmentId);
                      if (res) return { pos: [res.pos.x, res.pos.y, res.pos.z], rot: [res.rot.x, res.rot.y, res.rot.z], anchor: res.anchor };
                  }
                  return null;
              };
          }
      }, [camera, scene, config, mannequinConfig]);

      // 2. MISE À JOUR TEMPS RÉEL (Réactivité aux changements de mur)
      useEffect(() => {
          // Si le mannequin est placé et qu'il possède une ancre
          if (mannequinState && mannequinState.anchor && onUpdateMannequin && !isDraggingMannequin) {
              const { cumulativeY, xOffset } = mannequinState.anchor;
              const h = mannequinConfig?.height || 1.75;
              const p = mannequinConfig?.posture ?? 0.5;

              // Recalcul pur basé sur l'odomètre et la nouvelle config
              const newTransform = computeMannequinTransform(cumulativeY, xOffset, h, p, config);
              
              if (newTransform) {
                  // On vérifie si la position a changé significativement pour éviter les boucles
                  const oldPos = new THREE.Vector3(...mannequinState.pos);
                  if (oldPos.distanceTo(newTransform.pos) > 0.001) { // 1mm tolérance
                      onUpdateMannequin({
                          pos: [newTransform.pos.x, newTransform.pos.y, newTransform.pos.z],
                          rot: [newTransform.rot.x, newTransform.rot.y, newTransform.rot.z],
                          anchor: newTransform.anchor
                      });
                  }
              }
          }
      }, [config, mannequinConfig]); // Se déclenche quand la géométrie ou la config du mannequin change

      return null;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
    if (draggingId) return;

    if (isDraggingMannequin && onUpdateMannequin) {
        e.stopPropagation();
        const transform = calculateTransformFromCursor(e.point.clone(), segmentId);
        
        if (transform) {
            onUpdateMannequin({
                pos: [transform.pos.x, transform.pos.y, transform.pos.z],
                rot: [transform.rot.x, transform.rot.y, transform.rot.z],
                anchor: transform.anchor
            });
        }
        return; 
    }

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
