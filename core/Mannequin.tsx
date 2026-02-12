
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
  // Nouvelles props IK optionnelles
  ikFlexion?: {
      hip: number;
      spine: number;
      knee: number;
  };
  opacity?: number;
  transparent?: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

const MANNEQUIN_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/mannequin.glb';
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export const Mannequin: React.FC<MannequinProps> = ({ 
  position, rotation, height, armPosture, ikFlexion, opacity = 1, transparent = false,
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

  // Configuration initiale des matériaux et ombres
  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = whiteMaterial;
        mesh.castShadow = enableShadows;
        mesh.receiveShadow = enableShadows;
        mesh.raycast = transparent ? () => null : THREE.Mesh.prototype.raycast;
      }
    });
  }, [clone, whiteMaterial, enableShadows, transparent]);

  // Calcul de l'échelle
  const finalScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const naturalHeight = Math.max(size.y, size.z); 
    const baseScale = naturalHeight > 0 ? (1 / naturalHeight) : 1; 
    return baseScale * height;
  }, [clone, height]);

  // --- GESTION DES OS (ARMATURE) ---
  useEffect(() => {
    // Helper pour trouver les os de manière flexible
    const getBone = (namePart: string) => {
        let bone: THREE.Bone | null = null;
        clone.traverse((child) => {
            if (bone) return;
            if (child instanceof THREE.Bone && child.name.includes(namePart)) {
                bone = child;
            }
        });
        return bone;
    };

    const leftArm = getBone('L_Upper_Arm');
    const rightArm = getBone('R_Upper_Arm');
    const hips = getBone('Hips'); // Racine du mouvement
    const spine = getBone('Spine');
    const leftUpLeg = getBone('L_Upper_Leg');
    const rightUpLeg = getBone('R_Upper_Leg');

    // 1. POSTURE DES BRAS
    if (leftArm && rightArm) {
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
      
      leftArm.rotation.x = targetAngle;
      rightArm.rotation.x = targetAngle;
    }

    // 2. FLEXION DU CORPS (IK)
    if (ikFlexion && hips && spine && leftUpLeg && rightUpLeg) {
        // Réinitialisation prudente (pour éviter l'accumulation si le composant ne remonte pas)
        hips.rotation.x = 0;
        spine.rotation.x = 0;
        leftUpLeg.rotation.x = 0;
        rightUpLeg.rotation.x = 0;

        // Application
        // Note: Les axes peuvent varier selon le Rigging (Mixamo est souvent standard)
        // Hips X+ = Penche en avant
        // Legs X- = Lève les genoux
        
        // Application douce
        hips.rotation.x = ikFlexion.hip;
        
        // Les jambes doivent compenser la rotation du bassin + ajouter leur propre flexion
        // Si le bassin tourne de 20°, les jambes tournent de 20° pour rester droites, + X° pour plier.
        leftUpLeg.rotation.x = -ikFlexion.hip + ikFlexion.knee;
        rightUpLeg.rotation.x = -ikFlexion.hip + ikFlexion.knee;

        spine.rotation.x = ikFlexion.spine;
    }

    // Force update
    clone.traverse((obj) => obj.updateMatrixWorld(true));

  }, [clone, armPosture, ikFlexion]);

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
