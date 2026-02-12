
import * as THREE from 'three';
import { WallConfig } from '../../types';
import { scanWallTopology } from './physics/WallGeometer';
import { solveClimberIK } from './physics/IKSolver';

// ==========================================
// CONSTANTES & TYPES
// ==========================================

const WALL_GAP_TARGET = 0.03; // Distance peau-mur
const REFERENCE_HEIGHT = 1.75;
const BASE_BODY_DEPTH = 0.22;

export interface MannequinPhysicsState {
    pos: THREE.Vector3;
    rot: THREE.Euler;
    anchor: {
        cumulativeY: number;
        xOffset: number;
    };
    ik: {
        hipFlexion: number;
        spineFlexion: number;
        kneeFlexion: number;
    };
}

// ==========================================
// ORCHESTRATEUR
// ==========================================

export const computeMannequinTransform = (
    centerCumulativeY: number,
    xOffset: number,
    height: number,
    posture: number,
    config: WallConfig
): MannequinPhysicsState | null => {
    
    // 1. PRÉPARATION
    const scaleRatio = height / REFERENCE_HEIGHT;
    const currentBodyDepth = BASE_BODY_DEPTH * scaleRatio;
    const centerToSkinOffset = currentBodyDepth / 2;

    // Extension bras
    const armExtension = (posture > 0.5) ? (height * 0.25 * (posture - 0.5) * 2) : 0;
    const halfHeight = height / 2;
    
    const feetOdometer = centerCumulativeY - halfHeight;
    const headOdometer = centerCumulativeY + halfHeight + armExtension;

    // 2. ANALYSE GÉOMÉTRIQUE (SCANNER)
    const topology = scanWallTopology(feetOdometer, headOdometer, xOffset, config);
    
    if (!topology) return null;

    // 3. RÉSOLUTION IK (BIOMÉCANIQUE)
    const ikResult = solveClimberIK(topology, height);

    // 4. CALCUL POSITION & ROTATION GLOBALE
    const { feetPoint, headPoint, avgNormal, maxProtrusion } = topology;

    // Vecteur directeur global (Pieds -> Tête)
    const spineVector = new THREE.Vector3().subVectors(headPoint.pos, feetPoint.pos);
    const upDir = spineVector.clone().normalize();

    // Offset global par rapport à la corde (Ligne droite Pieds-Tête)
    // Si il y a une bosse (maxProtrusion > 0), on doit reculer le bassin d'autant pour être "posé" sur la bosse.
    // L'IK s'occupe ensuite d'enrouler le corps autour de ce point de pivot.
    
    // Calcul de l'écartement nécessaire :
    // On veut que le torse (skin) touche la bosse la plus saillante + gap.
    const protrusionOffset = maxProtrusion + WALL_GAP_TARGET + centerToSkinOffset;
    
    // On s'assure d'avoir au minimum le gap standard (si le mur est creux/plat)
    const finalOffset = Math.max(protrusionOffset, WALL_GAP_TARGET + centerToSkinOffset);

    // Centre géométrique de la corde
    const chordCenter = new THREE.Vector3().addVectors(feetPoint.pos, headPoint.pos).multiplyScalar(0.5);
    
    // Position finale du Centre de Gravité (Hips)
    // On part du centre de la corde et on pousse selon la normale moyenne
    const finalCenterPos = chordCenter.add(avgNormal.clone().multiplyScalar(finalOffset));

    // Pour l'origine du modèle 3D (qui est souvent aux pieds/sol dans le repère local),
    // on doit calculer la position relative.
    // Attention : Le modèle pivote autour de ses pieds (0,0,0).
    // Mais ici on a positionné le CENTRE (Hips).
    // Il faut donc trouver où placer l'origine (Feet) pour que le centre tombe au bon endroit.
    
    // On redescend le long du vecteur UP depuis le centre ajusté.
    // On utilise la demi-longueur de corde pour rester cohérent avec l'écartement réel des appuis.
    const feetOriginPos = finalCenterPos.clone().add(upDir.clone().multiplyScalar(-topology.chordLength * 0.5));

    // Matrice de Rotation
    const matrix = new THREE.Matrix4();
    const forward = avgNormal.clone().negate(); 
    const right = new THREE.Vector3().crossVectors(upDir, forward).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(right, upDir).normalize();

    matrix.makeBasis(right, upDir, correctedForward);
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix);

    return {
        pos: feetOriginPos,
        rot: rotation,
        anchor: { cumulativeY: centerCumulativeY, xOffset },
        ik: {
            hipFlexion: ikResult.hipFlexion,
            spineFlexion: ikResult.spineFlexion,
            kneeFlexion: ikResult.kneeFlexion
        }
    };
};
