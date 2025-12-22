
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
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
// URL vers les décodeurs Draco versionnés pour assurer la compatibilité
const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

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
  onClick
}) => {
  const url = `${BASE_URL}${encodeURIComponent(modelFilename)}`;
  
  // useGLTF accepte l'URL du décodeur Draco en second argument
  const { scene } = useGLTF(url, DRACO_DECODER_URL);

  const { clonedScene, offset } = useMemo(() => {
    const clone = scene.clone(true);
    
    clone.position.set(0, 0, 0);
    // Suppression de la logique de calibration, on utilise l'orientation native du fichier
    clone.rotation.set(0, 0, 0);
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
        offsetZ = -box.min.z + 0.005; // Petit offset pour éviter le z-fighting
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Force le recalcul des normales pour un relief précis
        mesh.geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: color || '#ff4400',
          roughness: 0.7, 
          metalness: 0.2,
          flatShading: false, 
          transparent: opacity < 1 || isSelected,
          opacity: isSelected ? 0.7 : opacity,
          side: THREE.DoubleSide
        });

        if (preview || isSelected) {
           material.emissive = new THREE.Color(isSelected ? '#3b82f6' : (color || '#ff4400'));
           material.emissiveIntensity = isSelected ? 0.4 : 0.2;
        }

        mesh.material = material;
        
        // ACTIVER LES OMBRES POUR LE RELIEF
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return { 
        clonedScene: clone, 
        offset: [offsetX, offsetY, offsetZ] as [number, number, number] 
    };
  }, [scene, opacity, color, preview, isSelected]);

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
