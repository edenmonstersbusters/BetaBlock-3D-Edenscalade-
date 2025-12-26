
import React, { useState, Suspense, useCallback, useEffect } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WallMesh } from './WallMesh';
import { HoldModel } from './HoldModel';
import { WallConfig, PlacedHold, AppMode, HoldDefinition } from '../types';
// Import types to ensure global JSX intrinsic element extensions are loaded
import '../types'; 

interface SceneProps {
  config: WallConfig;
  mode: AppMode;
  holds: (PlacedHold & { position: [number, number, number], rotation: [number, number, number] })[];
  onPlaceHold: (position: THREE.Vector3, normal: THREE.Vector3, faceIndex?: number) => void;
  selectedHoldDef: HoldDefinition | null;
  holdSettings: { scale: number; rotation: number; color: string };
  selectedPlacedHoldIds: string[];
  onSelectPlacedHold: (id: string | null, multi?: boolean) => void;
  onContextMenu: (type: 'HOLD' | 'SEGMENT', id: string, x: number, y: number) => void;
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
}) => {
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'SET') return;

    if (!selectedHoldDef || selectedPlacedHoldIds.length > 0) {
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
    if (e.button !== 0) return;

    if (e.face && e.object.name === 'climbing-wall') {
       if (selectedPlacedHoldIds.length > 0) {
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
      camera={{ position: [10, 8, 15], fov: 35 }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0; 
      }}
    >
      <color attach="background" args={['#111111']} />
      
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 1.8} 
        target={[0, 2.5, 0]} 
      />
      
      <directionalLight 
        position={[10, 15, 10]} 
        intensity={0.8} 
        color="#ffffff"
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001} // Bias fin pour éviter le détachement de l'ombre
        shadow-normalBias={0.02} // Élimination radicale du shadow acne le long des normales
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.5, 50]} />
      </directionalLight>

      <ambientLight intensity={0.4} />
      
      <hemisphereLight 
        intensity={0.4} 
        color="#ffffff" 
        groundColor="#000000" 
      />

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
                        const isMulti = e.nativeEvent.ctrlKey || e.metaKey;
                        onSelectPlacedHold(hold.id, isMulti);
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
                    opacity={0.6}
                    color={holdSettings.color}
                    preview={true}
                />
            </Suspense>
        )}
      </group>

      <Grid 
        position={[0, -0.01, 0]} 
        args={[40, 40]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#2a2a2a" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#333" 
        fadeDistance={50} 
        fadeStrength={1} 
        infiniteGrid 
      />
      
      <ContactShadows 
        opacity={0.6} 
        scale={40} 
        blur={2.5} 
        far={10} 
        resolution={1024} 
        color="#000000" 
      />
      
      <Environment preset="studio" />
    </Canvas>
  );
};
