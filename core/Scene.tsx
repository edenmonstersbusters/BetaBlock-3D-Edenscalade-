
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { Mannequin } from './Mannequin'; 
import { DragController } from './DragController';
import { ScreenshotHandler } from './ScreenshotHandler';
import { MannequinController } from './scene/MannequinController';
import { SceneEnvironment } from './scene/SceneEnvironment';
import { useSceneInteraction } from './scene/useSceneInteraction';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';
import { MannequinPhysicsState } from './scene/useMannequinPhysics';
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
  mannequinState?: MannequinPhysicsState | null;
  onUpdateMannequin?: (state: MannequinPhysicsState) => void;
  placementRef?: React.MutableRefObject<any>;
}

export const Scene: React.FC<SceneProps> = ({ 
  config, mode, holds, onPlaceHold, selectedHoldDef, holdSettings,
  selectedPlacedHoldIds, onSelectPlacedHold, onContextMenu, onWallPointerUpdate,
  onHoldDrag, onHoldDragEnd, screenshotRef,
  mannequinConfig, mannequinState, onUpdateMannequin, placementRef
}) => {
  
  const [isDraggingMannequin, setIsDraggingMannequin] = React.useState(false);

  const interaction = useSceneInteraction({
      config, mode, selectedHoldDef, holdSettings, selectedPlacedHoldIds,
      onSelectPlacedHold, onPlaceHold, onContextMenu, onWallPointerUpdate,
      isDraggingMannequin, setIsDraggingMannequin, onUpdateMannequin, mannequinConfig
  });

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
        interaction.setHoveredHoldId(null);
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
      
      <MannequinController 
          config={config} 
          mannequinConfig={mannequinConfig}
          mannequinState={mannequinState}
          onUpdateMannequin={onUpdateMannequin}
          placementRef={placementRef}
          isDragging={isDraggingMannequin}
      />

      <OrbitControls 
        ref={interaction.orbitRef}
        makeDefault 
        target={[0, 2, 0]} 
        minDistance={1} 
        maxDistance={40} 
        enabled={interaction.orbitEnabled} 
      />
      
      <DragController 
        draggingId={interaction.draggingId}
        config={config}
        onHoldDrag={onHoldDrag}
        onDragEnd={() => onHoldDragEnd?.()}
        setDraggingId={interaction.setDraggingId}
        orbitRef={interaction.orbitRef}
      />
      
      <SceneEnvironment />

      <group position={[0, 0, 0]}>
        <WallMesh 
          config={config} 
          interactive={mode === 'SET' || isDraggingMannequin} 
          onPointerMove={interaction.handlePointerMove}
          onPointerDown={interaction.handlePointerDown}
          onPointerUp={interaction.handlePointerUp}
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
                    isDragging={interaction.draggingId === hold.id}
                    onPointerOver={(e) => { e.stopPropagation(); interaction.setHoveredHoldId(hold.id); }}
                    onPointerOut={() => { if (interaction.hoveredHoldId === hold.id) interaction.setHoveredHoldId(null); }}
                    onPointerDown={(e) => {
                      interaction.pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
                      if (e.button === 0) {
                        e.stopPropagation();
                        if (interaction.orbitRef.current) interaction.orbitRef.current.enabled = false;
                        const isMulti = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;
                        if (mode === 'SET' && !isMulti && !isDraggingMannequin) {
                           onSelectPlacedHold(hold.id, false);
                           interaction.setDraggingId(hold.id);
                        } else {
                           onSelectPlacedHold(hold.id, isMulti);
                        }
                      }
                    }}
                    onPointerUp={(e) => {
                      if (!interaction.pointerDownScreenPos.current) return;
                      const dx = e.clientX - interaction.pointerDownScreenPos.current.x;
                      const dy = e.clientY - interaction.pointerDownScreenPos.current.y;
                      if (Math.sqrt(dx * dx + dy * dy) > 5) return;
                      
                      interaction.pointerDownScreenPos.current = null;
                      if (e.button === 2) {
                        e.stopPropagation();
                        onContextMenu('HOLD', hold.id, e.clientX, e.clientY);
                      }
                    }}
                />
            ))}
            
            {mannequinState && mannequinConfig && (
                <Mannequin 
                    position={[mannequinState.pos.x, mannequinState.pos.y, mannequinState.pos.z]}
                    rotation={[mannequinState.rot.x, mannequinState.rot.y, mannequinState.rot.z]}
                    height={mannequinConfig.height}
                    armPosture={mannequinConfig.posture}
                    
                    // NOUVEAU : Transmission des angles IK
                    ikFlexion={mannequinState.ik ? {
                        hip: mannequinState.ik.hipFlexion,
                        spine: mannequinState.ik.spineFlexion,
                        knee: mannequinState.ik.kneeFlexion
                    } : undefined}

                    opacity={isDraggingMannequin ? 0.7 : 1}
                    transparent={isDraggingMannequin}
                    onPointerOver={(e) => { e.stopPropagation(); interaction.setIsHoveringMannequin(true); }}
                    onPointerOut={() => { interaction.setIsHoveringMannequin(false); }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        if (interaction.orbitRef.current) interaction.orbitRef.current.enabled = false;
                        setIsDraggingMannequin(true);
                    }}
                />
            )}
        </Suspense>

        {mode === 'SET' && selectedHoldDef && interaction.ghostPos && interaction.ghostRot && selectedPlacedHoldIds.length === 0 && !interaction.draggingId && !isDraggingMannequin && !interaction.isHoveringMannequin && (
            <Suspense fallback={null}>
                <HoldModel 
                    modelFilename={selectedHoldDef.filename}
                    baseScale={selectedHoldDef.baseScale}
                    position={[interaction.ghostPos.x, interaction.ghostPos.y, interaction.ghostPos.z]}
                    rotation={[interaction.ghostRot.x, interaction.ghostRot.y, interaction.ghostRot.z]}
                    scale={[holdSettings.scale, holdSettings.scale, holdSettings.scale]}
                    opacity={0.5}
                    color={holdSettings.color}
                    preview={true}
                />
            </Suspense>
        )}
      </group>
    </Canvas>
  );
};
