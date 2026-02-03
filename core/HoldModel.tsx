
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import '../types';

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
  isDragging?: boolean;
  showDimensions?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>) => void;
  onDimensionsCalculated?: (dims: { width: number; height: number; depth: number }) => void;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
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
  isDragging = false,
  showDimensions = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
  onContextMenu,
  onDimensionsCalculated
}) => {
  const url = `${BASE_URL}${encodeURIComponent(modelFilename)}`;
  const { scene } = useGLTF(url, DRACO_DECODER_URL);

  const { clonedScene, offset, size } = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    
    const box = new THREE.Box3().setFromObject(clone);
    let offsetX = 0; let offsetY = 0; let offsetZ = 0;
    const sizeVec = new THREE.Vector3();
    
    if (!box.isEmpty() && Number.isFinite(box.min.x)) {
        box.getSize(sizeVec);
        const center = new THREE.Vector3();
        box.getCenter(center);
        offsetX = -center.x; 
        offsetY = -center.y; 
        offsetZ = -box.min.z + 0.001; 
    }
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.computeVertexNormals();
        
        // AMÉLIORATION DU MATÉRIAU
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color || '#111111'), 
          roughness: 0.7, // Réduit de 1.0 à 0.7 pour permettre des reflets spéculaires (volume)
          metalness: 0.1, // Légère touche métallique pour accrocher la lumière
          flatShading: false,
          transparent: opacity < 1 || isSelected,
          opacity: isSelected ? 0.7 : opacity,
          side: THREE.DoubleSide,
        });
        
        // FORCE UPDATE pour garantir que la lumière est bien recalculée
        mesh.material.needsUpdate = true;
        
        if (preview || isSelected) {
           (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(isSelected ? '#3b82f6' : (color || '#111111'));
           (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isSelected ? 0.3 : 0.1;
        }
        
        mesh.castShadow = true; 
        mesh.receiveShadow = true;

        if (isDragging) {
            mesh.raycast = () => null; // Ignore raycast to allow wall detection behind
        }
      }
    });
    return { clonedScene: clone, offset: [offsetX, offsetY, offsetZ] as [number, number, number], size: sizeVec };
  }, [scene, opacity, color, preview, isSelected, isDragging]);

  // Remonter les dimensions calculées au parent
  useEffect(() => {
    if (onDimensionsCalculated && size) {
        onDimensionsCalculated({
            width: size.x * scale[0] * baseScale * 100,
            height: size.y * scale[1] * baseScale * 100,
            depth: size.z * scale[2] * baseScale * 100
        });
    }
  }, [size, scale, baseScale, onDimensionsCalculated]);

  return (
    <group 
      position={position} rotation={rotation} 
      scale={[scale[0] * baseScale, scale[1] * baseScale, scale[2] * baseScale]}
      onPointerDown={preview ? undefined : onPointerDown}
      onPointerUp={preview ? undefined : onPointerUp}
      onPointerOver={preview ? undefined : onPointerOver}
      onPointerOut={preview ? undefined : onPointerOut}
      onClick={preview ? undefined : onClick}
      onContextMenu={preview ? undefined : onContextMenu}
    >
        <primitive object={clonedScene} position={offset} />
        {showDimensions && size && (
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[size.x, size.y, size.z]} />
                <meshBasicMaterial color="#3b82f6" wireframe opacity={0.3} transparent />
            </mesh>
        )}
    </group>
  );
};
