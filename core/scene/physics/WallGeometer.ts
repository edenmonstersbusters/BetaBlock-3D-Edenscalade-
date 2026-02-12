
import * as THREE from 'three';
import { WallConfig } from '../../../types';

export interface WallPoint {
    pos: THREE.Vector3;
    normal: THREE.Vector3;
    cumulativeY: number; 
}

export interface SurfaceTopology {
    feetPoint: WallPoint;
    headPoint: WallPoint;
    chordLength: number; // Distance vol d'oiseau
    surfaceLength: number; // Distance le long du mur
    maxProtrusion: number; // Bosse maximale (Convexe)
    maxDepression: number; // Creux maximal (Concave)
    avgNormal: THREE.Vector3; // Orientation moyenne
}

/**
 * Projette une distance cumulée (odomètre) sur une coordonnée 3D réelle du mur.
 */
export const getPointAtCumulativeY = (targetY: number, xOffset: number, config: WallConfig): WallPoint | null => {
    let currentBaseY = 0;
    let currentY3D = 0;
    let currentZ3D = 0;

    for (const seg of config.segments) {
        if (targetY <= currentBaseY + seg.height + 0.0001) {
            const localY = Math.max(0, targetY - currentBaseY);
            const rad = (seg.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            return {
                pos: new THREE.Vector3(xOffset, currentY3D + (localY * cos), currentZ3D + (localY * sin)),
                normal: new THREE.Vector3(0, -sin, cos).normalize(),
                cumulativeY: targetY
            };
        }
        const rad = (seg.angle * Math.PI) / 180;
        currentY3D += seg.height * Math.cos(rad);
        currentZ3D += seg.height * Math.sin(rad);
        currentBaseY += seg.height;
    }
    return null; // Hors mur
};

/**
 * Analyse le relief du mur entre deux points (Pieds et Tête).
 * Détecte si le mur est plat, bombé (convexe) ou creux (concave).
 */
export const scanWallTopology = (
    feetOdometer: number, 
    headOdometer: number, 
    xOffset: number, 
    config: WallConfig
): SurfaceTopology | null => {
    
    // 1. Obtenir les extrémités
    const totalWallHeight = config.segments.reduce((acc, s) => acc + s.height, 0);
    const safeFeetY = Math.max(0, Math.min(totalWallHeight - 0.01, feetOdometer));
    const safeHeadY = Math.max(0.01, Math.min(totalWallHeight, headOdometer));

    const feetPoint = getPointAtCumulativeY(safeFeetY, xOffset, config);
    const headPoint = getPointAtCumulativeY(safeHeadY, xOffset, config);

    if (!feetPoint || !headPoint) return null;

    const chordLine = new THREE.Line3(feetPoint.pos, headPoint.pos);
    const chordVector = new THREE.Vector3().subVectors(headPoint.pos, feetPoint.pos);
    const chordLength = chordVector.length();
    const avgNormal = new THREE.Vector3().addVectors(feetPoint.normal, headPoint.normal).normalize();

    // 2. Scanner les segments intermédiaires
    let maxProtrusion = 0; // Mur qui sort (Bosse) -> Risque collision
    let maxDepression = 0; // Mur qui rentre (Creux) -> Besoin flexion

    let currentY = 0;
    let currentY3D = 0;
    let currentZ3D = 0;
    const tempVec = new THREE.Vector3();

    for (const seg of config.segments) {
        // On check chaque jointure de segment
        if (currentY > 0.01) {
            // Si la jointure est strictement entre les pieds et la tête
            if (currentY > safeFeetY && currentY < safeHeadY) {
                const jointPos = new THREE.Vector3(xOffset, currentY3D, currentZ3D);
                
                // Point le plus proche sur la corde virtuelle
                chordLine.closestPointToPoint(jointPos, true, tempVec);
                
                // Vecteur du Joint vers la Corde
                const wallToChord = new THREE.Vector3().subVectors(tempVec, jointPos);
                
                // Produit scalaire avec la normale pour savoir si c'est devant ou derrière
                // Note: avgNormal pointe hors du mur.
                // Vector Joint->Chord pointe aussi hors du mur si le mur est creux.
                
                const distance = jointPos.distanceTo(tempVec);
                
                // On détermine le sens via un Dot Product simple avec la normale moyenne
                // Vecteur Corde -> Joint
                const chordToJoint = new THREE.Vector3().subVectors(jointPos, tempVec);
                const projection = chordToJoint.dot(avgNormal);

                if (projection > 0) {
                    // Le mur avance vers nous (Convexe/Bosse)
                    if (distance > maxProtrusion) maxProtrusion = distance;
                } else {
                    // Le mur recule (Concave/Creux)
                    if (distance > maxDepression) maxDepression = distance;
                }
            }
        }
        
        // Avancer
        const rad = (seg.angle * Math.PI) / 180;
        currentY3D += seg.height * Math.cos(rad);
        currentZ3D += seg.height * Math.sin(rad);
        currentY += seg.height;
    }

    return {
        feetPoint,
        headPoint,
        chordLength,
        surfaceLength: Math.abs(safeHeadY - safeFeetY),
        maxProtrusion,
        maxDepression,
        avgNormal
    };
};
