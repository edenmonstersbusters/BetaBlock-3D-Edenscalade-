
import * as THREE from 'three';
import { WallConfig } from '../../types';

// ==========================================
// TYPES & CONSTANTES
// ==========================================

const TARGET_OFFSET = 0.03; // 3cm de distance constante
const BODY_THICKNESS_ALLOWANCE = 0.15; // Profondeur du corps à prendre en compte pour les collisions

interface WallPoint {
    pos: THREE.Vector3;
    normal: THREE.Vector3;
    cumulativeY: number; // Distance depuis le sol le long du mur
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
// HELPER : PROJECTION SUR LE MUR
// ==========================================

/**
 * Trouve un point 3D et sa normale sur le mur à une distance "déroulée" précise (cumulativeY).
 */
const getPointAtCumulativeY = (targetY: number, xOffset: number, config: WallConfig): WallPoint | null => {
    let currentBaseY = 0;
    let currentY3D = 0;
    let currentZ3D = 0;

    for (const seg of config.segments) {
        // Si le point cible est dans ce segment
        if (targetY <= currentBaseY + seg.height + 0.0001) { // 0.0001 pour tolérance float
            const localY = Math.max(0, targetY - currentBaseY);
            
            const rad = (seg.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Position 3D
            const pos = new THREE.Vector3(
                xOffset,
                currentY3D + (localY * cos),
                currentZ3D + (localY * sin)
            );

            // Normale du segment
            const normal = new THREE.Vector3(0, -sin, cos).normalize();

            return { pos, normal, cumulativeY: targetY };
        }

        // Avancer au prochain segment
        const rad = (seg.angle * Math.PI) / 180;
        currentY3D += seg.height * Math.cos(rad);
        currentZ3D += seg.height * Math.sin(rad);
        currentBaseY += seg.height;
    }

    // Si on dépasse le mur (cas rare/erreur), on retourne le haut du dernier segment
    return null;
};

// ==========================================
// COEUR DU CALCUL
// ==========================================

export const computeMannequinTransform = (
    centerCumulativeY: number,
    xOffset: number,
    height: number,
    posture: number, // 0 to 1
    config: WallConfig
): MannequinTransform | null => {
    
    // 1. Calcul des points d'ancrage (Pieds et Tête)
    // On considère que le "centerCumulativeY" est le centre de gravité du grimpeur.
    
    // Extension dynamique selon la posture (bras levés = grimpeur plus grand virtuellement)
    const armExtension = (posture > 0.5) ? (height * 0.25 * (posture - 0.5) * 2) : 0;
    
    // Le mannequin a son origine aux PIEDS dans le GLB, mais on raisonne par rapport au centre pour le placement
    const halfHeight = height / 2;
    
    const feetOdometer = centerCumulativeY - halfHeight;
    const headOdometer = centerCumulativeY + halfHeight + armExtension;

    // Clamp pour ne pas sortir du mur (optionnel, évite les crashs)
    const totalWallHeight = config.segments.reduce((acc, s) => acc + s.height, 0);
    const safeFeetY = Math.max(0, Math.min(totalWallHeight - 0.01, feetOdometer));
    const safeHeadY = Math.max(0.01, Math.min(totalWallHeight, headOdometer));

    // 2. Récupération des données 3D
    const feetPoint = getPointAtCumulativeY(safeFeetY, xOffset, config);
    const headPoint = getPointAtCumulativeY(safeHeadY, xOffset, config);

    if (!feetPoint || !headPoint) return null;

    // 3. Vecteur "Colonne Vertébrale" (Chord Vector)
    const spineVector = new THREE.Vector3().subVectors(headPoint.pos, feetPoint.pos);
    const currentHeight3D = spineVector.length(); // La hauteur réelle "à vol d'oiseau" peut être < height si concave
    const upDir = spineVector.clone().normalize();

    // 4. Calcul de la Normale Moyenne (Orientation face au mur)
    // On moyenne la normale des pieds et de la tête pour une transition douce
    const avgNormal = new THREE.Vector3().addVectors(feetPoint.normal, headPoint.normal).normalize();

    // 5. ANTI-COLLISION / OFFSET INTELLIGENT
    // On vérifie si une arête du mur (jointure de segments) traverse le corps du mannequin.
    
    let maxProtrusion = 0;
    
    // On parcourt les segments pour trouver les jointures qui sont ENTRE les pieds et la tête
    let currentY = 0;
    let currentY3D = 0;
    let currentZ3D = 0;

    const bodySegmentLine = new THREE.Line3(feetPoint.pos, headPoint.pos);
    const closestPointOnBody = new THREE.Vector3();

    for (const seg of config.segments) {
        // Position 3D de la base du segment (Jointure potentielle)
        // On ignore la base du tout premier segment (le sol)
        if (currentY > 0.01) {
            // Est-ce que cette jointure est dans la zone du corps ?
            if (currentY > safeFeetY && currentY < safeHeadY) {
                const jointPos = new THREE.Vector3(xOffset, currentY3D, currentZ3D);
                
                // Calcul de la distance entre la jointure et la ligne du corps
                bodySegmentLine.closestPointToPoint(jointPos, true, closestPointOnBody);
                
                // Vecteur allant du corps vers le mur à cet endroit
                const bodyToWall = new THREE.Vector3().subVectors(jointPos, closestPointOnBody);
                
                // On projette ce vecteur sur la normale moyenne pour savoir si ça rentre ou ça sort
                // Produit scalaire positif = Le mur est "devant" le corps (Convexe/Dévers qui s'accentue) -> Risque de collision
                // Produit scalaire négatif = Le mur s'éloigne (Concave) -> Pas de collision, c'est un pont.
                const protrusion = bodyToWall.dot(avgNormal);

                if (protrusion > maxProtrusion) {
                    maxProtrusion = protrusion;
                }
            }
        }

        // Avancer
        const rad = (seg.angle * Math.PI) / 180;
        currentY3D += seg.height * Math.cos(rad);
        currentZ3D += seg.height * Math.sin(rad);
        currentY += seg.height;
    }

    // 6. Calcul de la Position Finale
    // Offset final = Distance standard (3cm) + La plus grosse bosse rencontrée (si elle existe)
    const finalOffset = TARGET_OFFSET + maxProtrusion;

    // Le point de référence (Pivot) du mannequin est souvent aux pieds ou au centre.
    // Ici, on va placer le centre géométrique du corps, puis reculer pour trouver le pivot des pieds.
    
    const geometricCenter = new THREE.Vector3().addVectors(feetPoint.pos, headPoint.pos).multiplyScalar(0.5);
    
    // On pousse le centre vers l'extérieur selon la normale calculée
    const adjustedCenter = geometricCenter.add(avgNormal.clone().multiplyScalar(finalOffset));

    // Pour trouver la position du pivot (les pieds), on redescend le long du vecteur UP
    // On utilise la moitié de la hauteur 3D réelle calculée (pour que les pieds restent visuellement proches de feetPoint)
    const feetOriginPos = adjustedCenter.clone().add(upDir.clone().multiplyScalar(-currentHeight3D * 0.5));

    // 7. Calcul de la Rotation (Matrice)
    // Z = Forward (regarde le mur, donc -Normal) -> Non, ThreeJS regarde souvent vers +Z.
    // Convention standard : Y=Up, Z=Forward.
    // Pour le grimpeur : Y=Up (Tête), -Z=Mur (Il regarde le mur).
    
    const matrix = new THREE.Matrix4();
    const forward = avgNormal.clone().negate(); // Regarde le mur
    const right = new THREE.Vector3().crossVectors(upDir, forward).normalize(); // Axe X
    const correctedForward = new THREE.Vector3().crossVectors(right, upDir).normalize(); // Axe Z corrigé orthogonal

    matrix.makeBasis(right, upDir, correctedForward);
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix);

    return {
        pos: feetOriginPos,
        rot: rotation,
        anchor: {
            cumulativeY: centerCumulativeY,
            xOffset: xOffset
        }
    };
};
