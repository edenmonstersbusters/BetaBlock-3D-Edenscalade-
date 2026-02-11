
import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';

interface MannequinProps {
  position: [number, number, number];
  rotation: [number, number, number];
  height: number;
  armPosture: number;
  opacity?: number;
  transparent?: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

const MANNEQUIN_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/mannequin.glb';
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export const Mannequin: React.FC<MannequinProps> = ({ 
  position, rotation, height, armPosture, opacity = 1, transparent = false,
  onPointerDown, onPointerOver, onPointerOut
}) => {
  const { scene } = useGLTF(MANNEQUIN_URL, DRACO_URL);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  
  const whiteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.8,
    metalness: 0.1,
    transparent: transparent || opacity < 1,
    opacity: opacity
  }), [opacity, transparent]);

  const enableShadows = !transparent;

  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = whiteMaterial;
        mesh.castShadow = enableShadows;
        mesh.receiveShadow = enableShadows;
        
        // CRUCIAL POUR LA FLUIDITÉ :
        // Si 'transparent' est vrai (donc en cours de déplacement), on désactive le raycast.
        // Cela permet à la souris de "traverser" le mannequin pour détecter le mur derrière.
        mesh.raycast = transparent ? () => null : THREE.Mesh.prototype.raycast;
      }
    });
  }, [clone, whiteMaterial, enableShadows, transparent]);

  // Calcul de l'échelle
  const baseScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const naturalHeight = Math.max(size.y, size.z); 
    return naturalHeight > 0 ? (1 / naturalHeight) : 1; 
  }, [clone]);

  const finalScale = baseScale * height;

  // --- LOGIQUE DE MOUVEMENT DES BRAS (Axe Corrigé : X) ---
  useEffect(() => {
    const findBoneLike = (root: THREE.Object3D, exactNamePart: string): THREE.Bone | null => {
        let result: THREE.Bone | null = null;
        root.traverse((child) => {
            if (result) return;
            if (child instanceof THREE.Bone) {
                // Recherche partielle mais spécifique (ex: "L_Upper_Arm")
                if (child.name.includes(exactNamePart)) {
                    result = child;
                }
            }
        });
        return result;
    };

    // Noms basés sur votre liste fournie
    const leftArm = findBoneLike(clone, 'L_Upper_Arm');
    const rightArm = findBoneLike(clone, 'R_Upper_Arm');

    if (leftArm && rightArm) {
      // Rotation : Bas (1.3) -> T-Pose (0) -> Haut (-2.5)
      // TENTATIVE 3 : AXE X
      // Z = Zombie (Avant/Arrière)
      // Y = Twist (Rotation sur l'os)
      // X = Abduction (Levée latérale)
      
      const startAngle = 1.3; 
      const tPoseAngle = 0;   
      const upAngle = -2.5;   

      let targetAngle = 0;
      if (armPosture <= 0.5) {
         const t = armPosture * 2;
         targetAngle = startAngle * (1 - t) + tPoseAngle * t;
      } else {
         const t = (armPosture - 0.5) * 2;
         targetAngle = tPoseAngle * (1 - t) + upAngle * t;
      }

      // Application sur l'axe X (Le vrai axe de levée pour ce rig)
      // On remet Y et Z à 0 pour nettoyer les rotations parasites
      
      leftArm.rotation.x = targetAngle;
      leftArm.rotation.y = 0; 
      leftArm.rotation.z = 0; 
      
      rightArm.rotation.x = targetAngle; // Souvent symétrique sur X pour les rigs, sinon tenter -targetAngle
      rightArm.rotation.y = 0;
      rightArm.rotation.z = 0;
      
      leftArm.updateMatrixWorld(true);
      rightArm.updateMatrixWorld(true);
    }
  }, [clone, armPosture]);

  return (
    <primitive 
      object={clone} 
      position={position} 
      rotation={rotation} 
      scale={[finalScale, finalScale, finalScale]}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  );
};

useGLTF.preload(MANNEQUIN_URL, DRACO_URL);
