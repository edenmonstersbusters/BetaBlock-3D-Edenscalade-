
import React, { useState, Suspense } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';

interface SceneProps {
  config: WallConfig;
  mode: AppMode;
  holds: (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  onPlaceHold: (position: THREE.Vector3, normal: THREE.Vector3, faceIndex?: number) => void;
  selectedHoldDef: HoldDefinition | null;
  holdSettings: { scale: number; rotation: number; color: string };
  selectedPlacedHoldId: string | null;
  onSelectPlacedHold: (id: string | null) => void;
  onContextMenu: (type: 'HOLD' | 'SEGMENT', id: string, x: number, y: number) => void;
}

export const Scene: React.FC<SceneProps> = ({ 
  config, 
  mode, 
  holds, 
  onPlaceHold, 
  selectedHoldDef,
  holdSettings,
  selectedPlacedHoldId,
  onSelectPlacedHold,
  onContextMenu
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'SET' || !selectedHoldDef || selectedPlacedHoldId) {
      if (ghostPos) setGhostPos(null);
      return;
    }
    
    if (e.face && e.object.name === 'climbing-wall') {
      e.stopPropagation();
      setGhostPos(e.point.clone());
      const normal = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize();
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const spinQ = new THREE.Quaternion();
      spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (holdSettings.rotation * Math.PI) / 180);
      quaternion.multiply(spinQ);
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      setGhostRot(euler);
    } else {
        setGhostPos(null);
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'SET') return;
    
    // BLOQUER TOUTE ACTION SI CE N'EST PAS UN CLIC GAUCHE
    if (e.button !== 0) return;

    if (e.face && e.object.name === 'climbing-wall') {
       if (selectedPlacedHoldId) {
         e.stopPropagation();
         onSelectPlacedHold(null);
       } else if (selectedHoldDef) {
         e.stopPropagation();
         const normal = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize();
         onPlaceHold(e.point.clone(), normal, e.faceIndex);
       }
    } else {
      onSelectPlacedHold(null);
    }
  };

  const handleWallContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Bloquer le menu par défaut du navigateur
    e.nativeEvent.preventDefault();
    if (e.faceIndex !== undefined) {
      const segmentIndex = Math.floor(e.faceIndex / 2);
      if (segmentIndex < config.segments.length) {
        onContextMenu('SEGMENT', config.segments[segmentIndex].id, e.nativeEvent.clientX, e.nativeEvent.clientY);
      }
    }
  };
  
  return (
    <Canvas 
      shadows 
      camera={{ position: [5, 5, 8], fov: 45 }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={['#1a1a1a']} />
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.8} target={[0, 2, 0]} enabled={true} />
      <ambientLight intensity={0.2} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#444444" />
      <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005}>
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.5, 50]} />
      </directionalLight>

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
                    isSelected={selectedPlacedHoldId === hold.id}
                    onClick={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        onSelectPlacedHold(hold.id);
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

        {mode === 'SET' && selectedHoldDef && ghostPos && ghostRot && !selectedPlacedHoldId && (
            <Suspense fallback={null}>
                <HoldModel 
                    modelFilename={selectedHoldDef.filename}
                    baseScale={selectedHoldDef.baseScale}
                    position={[ghostPos.x, ghostPos.y, ghostPos.z]}
                    rotation={[ghostRot.x, ghostRot.y, ghostRot.z]}
                    scale={[holdSettings.scale, holdSettings.scale, holdSettings.scale]}
                    opacity={0.6}
                    color={holdSettings.color}
                    preview={true}
                />
            </Suspense>
        )}
      </group>

      <Grid position={[0, -0.01, 0]} args={[20, 20]} cellSize={1} cellThickness={1} cellColor="#444" sectionSize={5} sectionThickness={1.5} sectionColor="#666" fadeDistance={30} fadeStrength={1} infiniteGrid />
      <ContactShadows opacity={0.4} scale={20} blur={2} far={4} resolution={256} color="#000000" />
      <Environment preset="city" />
    </Canvas>
  );
};
