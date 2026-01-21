
import * as THREE from 'three';
import { WallConfig, PlacedHold } from '../types';

/**
 * Calcule les coordonnées locales (x, y) sur un segment à partir d'un point 3D dans le monde.
 * Utilisé pour le Raycasting lors du placement ou du déplacement.
 */
export const calculateLocalCoords = (point: THREE.Vector3, segmentId: string, config: WallConfig) => {
    if (!config.segments) return null;

    const segmentIndex = config.segments.findIndex(s => s && s.id === segmentId);
    if (segmentIndex === -1) return null;
    
    let startY = 0; 
    let startZ = 0;
    for(let i = 0; i < segmentIndex; i++) {
        const s = config.segments[i]; 
        if (!s) continue; // Skip null segments
        const r = (s.angle * Math.PI) / 180;
        startY += s.height * Math.cos(r); 
        startZ += s.height * Math.sin(r);
    }

    const localX = point.x;
    const dy = point.y - startY;
    const dz = point.z - startZ;
    // Pythagore pour trouver la distance le long de la pente
    const localY = Math.sqrt(dy * dy + dz * dz);

    return { x: localX, y: localY };
};

/**
 * Résout la position (Vector3) et la rotation (Euler) d'une prise dans le monde 3D
 * en fonction de sa position relative sur le mur.
 */
export const resolveHoldWorldData = (hold: PlacedHold, config: WallConfig) => {
  if (!hold || !config.segments) return null;

  const segmentIndex = config.segments.findIndex(s => s && s.id === hold.segmentId);
  if (segmentIndex === -1) return null;

  let currentY = 0;
  let currentZ = 0;
  for (let i = 0; i < segmentIndex; i++) {
    const s = config.segments[i];
    if (!s) continue;
    const rad = (s.angle * Math.PI) / 180;
    currentY += s.height * Math.cos(rad);
    currentZ += s.height * Math.sin(rad);
  }

  const segment = config.segments[segmentIndex];
  if (!segment) return null;

  const rad = (segment.angle * Math.PI) / 180;
  
  const dirY = Math.cos(rad);
  const dirZ = Math.sin(rad);

  const posX = hold.x;
  const posY = currentY + (hold.y * dirY);
  const posZ = currentZ + (hold.y * dirZ);

  // Calcul du quaternion pour aligner la prise avec la surface du mur
  const qBase = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), 
    new THREE.Vector3(0, -Math.sin(rad), Math.cos(rad))
  );
  // Ajout de la rotation propre de la prise (spin)
  const qSpin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1), 
    (hold.spin * Math.PI) / 180
  );
  qBase.multiply(qSpin);
  const euler = new THREE.Euler().setFromQuaternion(qBase);

  return {
    position: [posX, posY, posZ] as [number, number, number],
    rotation: [euler.x, euler.y, euler.z] as [number, number, number]
  };
};
