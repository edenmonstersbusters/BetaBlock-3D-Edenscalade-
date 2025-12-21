
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';

interface HoldModelProps {
  modelFilename: string;
  baseScale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  color?: string;
  preview?: boolean;
  isSelected?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  baseRotation?: [number, number, number]; 
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';

export const HoldModel: React.FC<HoldModelProps> = ({ 
  modelFilename, 
  baseScale = 0.002,
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1],
  opacity = 1,
  color,
  preview = false,
  isSelected = false,
  onClick,
  baseRotation = [0, 0, 0]
}) => {
  const url = `${BASE_URL}${encodeURIComponent(modelFilename)}`;
  const { scene } = useGLTF(url);

  const { clonedScene, offset } = useMemo(() => {
    const clone = scene.clone(true);
    
    clone.position.set(0, 0, 0);
    // On applique la rotation de calibration (tranches de 90°)
    clone.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;

    if (!box.isEmpty() && Number.isFinite(box.min.x)) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        offsetX = -center.x;
        offsetY = -center.y;
        
        // CORRECTION : On aligne le MINIMUM Z de l'objet sur Z=0.
        // Dans Three.js, si le mur est à Z=0 et que le grimpeur est vers Z+, 
        // l'objet doit avoir ses coordonnées Z >= 0 pour être visible devant le mur.
        offsetZ = -box.min.z + 0.005; // Petit offset pour éviter le z-fighting
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = new THREE.MeshStandardMaterial({
          color: color || '#ff4400',
          roughness: 0.5, // Équilibre pour voir les reflets et le relief
          metalness: 0.1,
          transparent: opacity < 1 || isSelected,
          opacity: isSelected ? 0.7 : opacity,
          side: THREE.DoubleSide
        });

        if (preview || isSelected) {
           material.emissive = new THREE.Color(isSelected ? '#3b82f6' : (color || '#ff4400'));
           material.emissiveIntensity = isSelected ? 0.4 : 0.2;
        }

        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return { 
        clonedScene: clone, 
        offset: [offsetX, offsetY, offsetZ] as [number, number, number] 
    };
  }, [scene, opacity, color, preview, isSelected, baseRotation]);

  return (
    <group 
      position={position} 
      rotation={rotation} 
      scale={[scale[0] * baseScale, scale[1] * baseScale, scale[2] * baseScale]}
      onPointerDown={(e) => {
        if (!preview) e.stopPropagation();
      }}
      onClick={preview ? undefined : onClick}
    >
        <primitive 
          object={clonedScene} 
          position={offset}
        />
    </group>
  );
};
