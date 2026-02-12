
import * as THREE from 'three';
import { SurfaceTopology } from './WallGeometer';

export interface IKResult {
    hipFlexion: number;   // Rotation du bassin (X axis)
    spineFlexion: number; // Courbure colonne (X axis)
    kneeFlexion: number;  // Pliage genoux (X axis)
    // hipOffset supprimé car géré par le positionnement global sur la bosse
}

/**
 * Calcule la posture du mannequin en fonction de la topologie du mur.
 */
export const solveClimberIK = (
    topology: SurfaceTopology, 
    mannequinHeight: number
): IKResult => {
    
    // Valeurs par défaut (Planche droite)
    const result: IKResult = {
        hipFlexion: 0,
        spineFlexion: 0,
        kneeFlexion: 0
    };

    // 1. ANALYSE DE LA SITUATION
    // On regarde si on a une bosse (Convexe) ou un creux (Concave).
    // topology.maxProtrusion > 0 => Le mur rentre dans le corps (Bosse/Sortie de dévers).
    // topology.maxDepression > 0 => Le mur s'éloigne (Creux/Entrée de dévers).

    // 2. CAS CONVEXE (BOSSE) -> FLEXION DU BASSIN REQUISE
    // L'utilisateur veut que le mannequin plie les jambes pour passer une sortie de toit ou un angle sortant.
    if (topology.maxProtrusion > 0.02) {
        
        // On modélise un triangle : Pieds -> Bosse -> Tête.
        // La hauteur du triangle est la bosse (maxProtrusion).
        // La base est la longueur de la corde.
        
        const halfChord = topology.chordLength / 2;
        
        // Angle d'ouverture nécessaire pour contourner la bosse
        // Plus la bosse est grande, plus l'angle est grand.
        const bendAngleRad = Math.atan2(topology.maxProtrusion, halfChord);

        // Application des rotations (Heuristique artistique)
        // Pour "enrouler" la bosse, on se met en position assise/grenouille.
        
        // Le bassin bascule en avant pour rapprocher le buste du mur supérieur
        result.hipFlexion = bendAngleRad * 1.8; 
        
        // Les genoux remontent fort pour éviter que les pieds ne décrochent
        // (Signe négatif = lever les genoux dans le rig Mixamo standard)
        result.kneeFlexion = -bendAngleRad * 2.2; 
        
        // La colonne se redresse un peu pour garder la tête face au mur et pas dans le mur
        result.spineFlexion = -bendAngleRad * 0.8; 

    } 
    // 3. CAS CONCAVE (CREUX) -> PAS DE FLEXION
    // "Ne doit pas s'activer". On laisse le mannequin faire le "Pont" (Planche).
    // On pourrait ajouter une micro-flexion pour le réalisme si c'est très compressé,
    // mais pour respecter la consigne stricte, on reste à 0 ou très faible.
    else {
        // Pas de flexion majeure
        // Juste un petit relax naturel si les prises sont proches
        const naturalHeight = mannequinHeight * 0.98;
        const compressionRatio = Math.min(1, topology.chordLength / naturalHeight);
        
        if (compressionRatio < 0.90) {
             const compression = 1 - compressionRatio;
             result.kneeFlexion = -compression * 1.5; // Légère montée de genoux
             result.hipFlexion = compression * 0.3;
        }
    }

    return result;
};
