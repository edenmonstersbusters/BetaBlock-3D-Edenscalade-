
import React, { useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
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
  showDimensions?: boolean; // NOUVEAU
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>) => void;
}

const BASE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/';
const DRACO_DECODER_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Composant interne pour afficher les dimensions
const DimensionHelper: React.FC<{ size: THREE.Vector3; scale: number[]; baseScale: number }> = ({ size, scale, baseScale }) => {
    // Calcul des dimensions réelles en mètres
    const realW = size.x * scale[0] * baseScale;
    const realH = size.y * scale[1] * baseScale;
    
    // Demi-dimensions locales
    const hX = size.x / 2;
    const hY = size.y / 2;

    // Padding dynamique (20% de la taille max) pour éloigner les traits
    const padding = Math.max(size.x, size.y) * 0.05; 

    const lineMaterial = new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.5, transparent: true });

    // Géométrie pour la largeur (en bas)
    const widthGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-hX, -hY - padding, 0), new THREE.Vector3(hX, -hY - padding, 0)
    ]), [hX, hY, padding]);

    // Géométrie pour la hauteur (à droite)
    const heightGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(hX + padding, -hY, 0), new THREE.Vector3(hX + padding, hY, 0)
    ]), [hX, hY, padding]);

    return (
        <group>
            {/* Lignes */}
            <primitive object={new THREE.Line(widthGeo, lineMaterial)} />
            <primitive object={new THREE.Line(heightGeo, lineMaterial)} />

            {/* Labels */}
            <Html position={[0, -hY - padding - (padding * 0.5), 0]} center zIndexRange={[50, 0]}>
                <div className="bg-black/80 px-1 py-0.5 rounded text-[8px] text-white font-mono whitespace-nowrap border border-white/20">
                    L: {realW.toFixed(2)}m
                </div>
            </Html>
            <Html position={[hX + padding + (padding * 0.5), 0, 0]} center zIndexRange={[50, 0]}>
                <div className="bg-black/80 px-1 py-0.5 rounded text-[8px] text-white font-mono whitespace-nowrap border border-white/20">
                    H: {realH.toFixed(2)}m
                </div>
            </Html>
        </group>
    );
};

export const HoldModel: React.FC<HoldModelProps> = ({ 
  modelFilename, 
  baseScale = 0.002,
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = [1, 1, 1],
  opacity = 1,
  color,
  preview = false,
  showDimensions = false,
  isSelected = false,
  isDragging = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
  onContextMenu
}) => {
  const url = `${BASE_URL}${encodeURIComponent(modelFilename)}`;
  const { scene } = useGLTF(url, DRACO_DECODER_URL);

  const { clonedScene, offset, size } = useMemo(() => {
    const clone = scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    
    const box = new THREE.Box3().setFromObject(clone);
    const boxSize = new THREE.Vector3();
    let offsetX = 0; let offsetY = 0; let offsetZ = 0;
    
    if (!box.isEmpty() && Number.isFinite(box.min.x)) {
        box.getSize(boxSize);
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
        
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color || '#ff8800'), 
          roughness: 1.0, 
          metalness: 0.0, 
          flatShading: false,
          transparent: opacity < 1 || isSelected,
          opacity: isSelected ? 0.7 : opacity,
          side: THREE.DoubleSide,
        });
        
        if (preview || isSelected) {
           (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(isSelected ? '#3b82f6' : (color || '#ff8800'));
           (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isSelected ? 0.3 : 0.1;
        }
        
        mesh.castShadow = true; 
        mesh.receiveShadow = true;

        if (isDragging) {
            mesh.raycast = () => null; 
        }
      }
    });
    return { 
        clonedScene: clone, 
        offset: [offsetX, offsetY, offsetZ] as [number, number, number],
        size: boxSize
    };
  }, [scene, opacity, color, preview, isSelected, isDragging]);

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
            <DimensionHelper size={size} scale={scale} baseScale={baseScale} />
        )}
    </group>
  );
};
