
import * as THREE from 'three';
import { WallConfig } from '../../types';

// ==========================================
// CONSTANTES PHYSIQUES
// ==========================================

const WALL_GAP_TARGET = 0.03; // Distance stricte entre la peau et le mur (3cm)
const REFERENCE_HEIGHT = 1.75; // Hauteur de référence du modèle 3D brut
const BASE_BODY_DEPTH = 0.22;  // Profondeur du torse (Dos <-> Pectoraux) à l'échelle 1

interface WallPoint {
    pos: THREE.Vector3;
    normal: THREE.Vector3;
    cumulativeY: number; 
}

interface MannequinTransform {
    pos: THREE.Vector3;
    rot: THREE.Euler;
    anchor: {
        cumulativeY: number;
        xOffset: number;
    };
}

// ==========================================
// HELPER : PROJECTION
// ==========================================

const getPointAtCumulativeY = (targetY: number, xOffset: number, config: WallConfig): WallPoint | null => {
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
    return null;
};

// ==========================================
// COEUR DU CALCUL
// ==========================================

export const computeMannequinTransform = (
    centerCumulativeY: number,
    xOffset: number,
    height: number,
    posture: number,
    config: WallConfig
): MannequinTransform | null => {
    
    // 1. SCALING DU CORPS
    // On calcule l'épaisseur réelle du mannequin en fonction de sa taille actuelle.
    const scaleRatio = height / REFERENCE_HEIGHT;
    const currentBodyDepth = BASE_BODY_DEPTH * scaleRatio;
    
    // Le pivot du modèle 3D est souvent au centre géométrique (colonne vertébrale).
    // Pour que le torse soit à `WALL_GAP_TARGET` du mur, on doit décaler le centre de moitié.
    const centerToSkinOffset = currentBodyDepth / 2;

    // 2. POINTS D'ANCRAGE
    // Extension dynamique des bras
    const armExtension = (posture > 0.5) ? (height * 0.25 * (posture - 0.5) * 2) : 0;
    const halfHeight = height / 2;
    
    const feetOdometer = centerCumulativeY - halfHeight;
    const headOdometer = centerCumulativeY + halfHeight + armExtension;

    const totalWallHeight = config.segments.reduce((acc, s) => acc + s.height, 0);
    const safeFeetY = Math.max(0, Math.min(totalWallHeight - 0.01, feetOdometer));
    const safeHeadY = Math.max(0.01, Math.min(totalWallHeight, headOdometer));

    const feetPoint = getPointAtCumulativeY(safeFeetY, xOffset, config);
    const headPoint = getPointAtCumulativeY(safeHeadY, xOffset, config);

    if (!feetPoint || !headPoint) return null;

    // 3. VECTEURS DE BASE (CORDE)
    const spineVector = new THREE.Vector3().subVectors(headPoint.pos, feetPoint.pos);
    const chordLength = spineVector.length();
    const upDir = spineVector.clone().normalize();
    
    // Normale lissée pour l'orientation globale
    const avgNormal = new THREE.Vector3().addVectors(feetPoint.normal, headPoint.normal).normalize();

    // 4. DÉTECTION DE COLLISION (BUMP SCAN)
    // On cherche si le mur "sort" (convexe) et rentre dans la ligne droite reliant les pieds à la tête.
    
    let maxProtrusion = 0;
    let currentY = 0;
    let currentY3D = 0;
    let currentZ3D = 0;

    const chordLine = new THREE.Line3(feetPoint.pos, headPoint.pos);
    const tempVec = new THREE.Vector3();

    for (const seg of config.segments) {
        // Vérification des jointures de segments
        if (currentY > 0.01) {
            if (currentY > safeFeetY && currentY < safeHeadY) {
                const jointPos = new THREE.Vector3(xOffset, currentY3D, currentZ3D);
                
                // Point le plus proche sur la corde (ligne virtuelle du corps)
                chordLine.closestPointToPoint(jointPos, true, tempVec);
                
                // Vecteur allant du corps virtuel vers le joint du mur
                const bodyToWallVec = new THREE.Vector3().subVectors(jointPos, tempVec);
                
                // Projection sur la normale : 
                // Positif = Le mur est devant la corde (il faut reculer le bonhomme)
                // Négatif = Le mur est derrière la corde (c'est un creux, on ne fait rien, on fait le pont)
                const protrusion = bodyToWallVec.dot(avgNormal);

                if (protrusion > maxProtrusion) {
                    maxProtrusion = protrusion;
                }
            }
        }
        const rad = (seg.angle * Math.PI) / 180;
        currentY3D += seg.height * Math.cos(rad);
        currentZ3D += seg.height * Math.sin(rad);
        currentY += seg.height;
    }

    // 5. CALCUL POSITION FINALE
    // Offset Total = (Bosse maximale du mur) + (Écart de sécurité 3cm) + (Demi-épaisseur du corps pour aller au centre)
    const totalOffset = maxProtrusion + WALL_GAP_TARGET + centerToSkinOffset;

    // Positionnement du centre de la corde
    const chordCenter = new THREE.Vector3().addVectors(feetPoint.pos, headPoint.pos).multiplyScalar(0.5);
    
    // Application de l'offset le long de la normale
    const adjustedCenter = chordCenter.add(avgNormal.clone().multiplyScalar(totalOffset));

    // Retour aux pieds (Pivot du modèle 3D) en descendant le long du vecteur UP
    // On utilise la longueur réelle de la corde pour rester cohérent géométriquement
    const feetOriginPos = adjustedCenter.clone().add(upDir.clone().multiplyScalar(-chordLength * 0.5));

    // 6. ROTATION
    const matrix = new THREE.Matrix4();
    const forward = avgNormal.clone().negate(); 
    const right = new THREE.Vector3().crossVectors(upDir, forward).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(right, upDir).normalize();

    matrix.makeBasis(right, upDir, correctedForward);
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix);

    return {
        pos: feetOriginPos,
        rot: rotation,
        anchor: { cumulativeY: centerCumulativeY, xOffset: xOffset }
    };
};
