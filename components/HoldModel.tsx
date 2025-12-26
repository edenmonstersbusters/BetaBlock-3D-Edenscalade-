
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
// Import types to ensure global JSX intrinsic element extensions are loaded
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
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>) => void;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Texture de bruit procédurale partagée pour simuler le grain de la résine
const createGrainTexture = () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const val = 180 + Math.random() * 75; // Variation de gris pour la roughness
        imageData.data[i] = val; imageData.data[i+1] = val; imageData.data[i+2] = val; imageData.data[i+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

const GRAIN_TEXTURE = createGrainTexture();

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
  onContextMenu
}) => {
  const url = `${BASE_URL}${encodeURIComponent(modelFilename)}`;
  const { scene } = useGLTF(url, DRACO_DECODER_URL);

  const { clonedScene, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    let offsetX = 0; let offsetY = 0; let offsetZ = 0;
    
    if (!box.isEmpty() && Number.isFinite(box.min.x)) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        offsetX = -center.x; 
        offsetY = -center.y; 
        // offsetZ réduit de 5mm à 0.5mm pour un contact bois/résine parfait
        offsetZ = -box.min.z + 0.0005; 
    }
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Forcer le recalcul des normales pour un Smooth Shading parfait
        mesh.geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color || '#ff8800'), 
          roughness: 0.8, // Ajustement à 0.8 pour un aspect résine plus doux et moins "plastique"
          roughnessMap: GRAIN_TEXTURE, 
          metalness: 0.0, 
          flatShading: false, // Smooth shading activé
          transparent: opacity < 1 || isSelected,
          opacity: isSelected ? 0.7 : opacity,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(color || '#ff8800'),
          emissiveIntensity: 0.05, // Légère émissivité pour densifier la couleur sous tous les angles
        });
        
        if (preview || isSelected) {
           material.emissive = new THREE.Color(isSelected ? '#3b82f6' : (color || '#ff8800'));
           material.emissiveIntensity = isSelected ? 0.4 : 0.2;
        }
        
        mesh.material = material;
        mesh.castShadow = true; 
        mesh.receiveShadow = true;
      }
    });
    return { clonedScene: clone, offset: [offsetX, offsetY, offsetZ] as [number, number, number] };
  }, [scene, opacity, color, preview, isSelected]);

  return (
    <group 
      position={position} rotation={rotation} 
      scale={[scale[0] * baseScale, scale[1] * baseScale, scale[2] * baseScale]}
      onPointerDown={(e) => {
        if (!preview) e.stopPropagation();
      }}
      onClick={preview ? undefined : onClick}
      onContextMenu={preview ? undefined : onContextMenu}
    >
        <primitive object={clonedScene} position={offset} />
    </group>
  );
};
