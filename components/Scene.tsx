
import React, { useState, Suspense } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
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
      setGhostRot(new THREE.Euler().setFromQuaternion(quaternion));
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
      const y = e.point.y;
      let cumulativeHeight = 0;
      let foundId = config.segments[0].id;
      for (const seg of config.segments) {
        const rad = (seg.angle * Math.PI) / 180;
        cumulativeHeight += seg.height * Math.cos(rad);
        if (y <= cumulativeHeight) {
          foundId = seg.id;
          break;
        }
      }
      onContextMenu('SEGMENT', foundId, e.nativeEvent.clientX, e.nativeEvent.clientY);
    }
  };

  return (
    <Canvas 
      shadows 
      camera={{ position: [8, 5, 12], fov: 40 }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        // Augmentation de l'exposition globale pour éclaircir le mur
        gl.toneMappingExposure = 1.2;
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      
      <OrbitControls makeDefault target={[0, 2, 0]} />
      
      {/* LUMIERE AMBIANTE FORTE POUR DEBOUCHER LES OMBRES */}
      <ambientLight intensity={1.0} />
      
      {/* DIRECTIONNELLE MODEREE POUR LE RELIEF SANS BRULER LES COULEURS */}
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={0.3} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />

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
                    onClick={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        onSelectPlacedHold(hold.id, e.nativeEvent.ctrlKey || e.nativeEvent.metaKey);
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
                    opacity={0.5}
                    color={holdSettings.color}
                    preview={true}
                />
            </Suspense>
        )}
      </group>

      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellColor="#222" sectionColor="#333" infiniteGrid />
      
      <ContactShadows opacity={0.4} scale={20} blur={2} far={10} resolution={512} color="#000000" />
      
      <Environment preset="city" />
    </Canvas>
  );
};
