
import * as THREE from 'three';
import { WallConfig } from '../../types';

// Fonction utilitaire : Convertit une distance cumulée (odomètre) en Point 3D + Normale
const getPointFromOdometer = (targetY: number, xOffset: number, currentConfig: WallConfig) => {
    let currentY = 0;
    let segmentBasePos = new THREE.Vector3(0, 0, 0);
    const totalHeight = currentConfig.segments.reduce((acc, s) => acc + s.height, 0);
    const safeY = Math.max(0.01, Math.min(totalHeight - 0.01, targetY));

    for (const seg of currentConfig.segments) {
        if (safeY <= currentY + seg.height) {
            const localY = safeY - currentY;
            const rad = (seg.angle * Math.PI) / 180;
            const slopeVec = new THREE.Vector3(0, Math.cos(rad), Math.sin(rad));
            const point = segmentBasePos.clone().add(slopeVec.multiplyScalar(localY));
            point.x = xOffset;
            const normal = new THREE.Vector3(0, -Math.sin(rad), Math.cos(rad));
            return { pos: point, normal: normal };
        }
        const rad = (seg.angle * Math.PI) / 180;
        segmentBasePos.y += seg.height * Math.cos(rad);
        segmentBasePos.z += seg.height * Math.sin(rad);
        currentY += seg.height;
    }
    return null;
};

// Coeur du calcul de positionnement (Analytique)
export const computeMannequinTransform = (
    centerCumulativeY: number,
    xOffset: number,
    height: number,
    posture: number,
    currentConfig: WallConfig
) => {
    // 1. Définir les points cibles Pieds et Tête/Mains
    let topExtension = 0;
    if (posture > 0.5) {
        const factor = (posture - 0.5) * 2;
        topExtension = height * 0.30 * factor;
    }

    const feetTargetY = centerCumulativeY - (height * 0.5);
    const topTargetY = centerCumulativeY + (height * 0.5) + topExtension;

    // 2. Récupérer les coords 3D
    const feetData = getPointFromOdometer(feetTargetY, xOffset, currentConfig);
    const topData = getPointFromOdometer(topTargetY, xOffset, currentConfig);

    if (!feetData || !topData) return null;

    // 3. Vecteurs de base
    const upVec = new THREE.Vector3().subVectors(topData.pos, feetData.pos).normalize();
    const rawCenterPos = new THREE.Vector3().addVectors(feetData.pos, topData.pos).multiplyScalar(0.5);
    const avgNormal = new THREE.Vector3().addVectors(feetData.normal, topData.normal).normalize();

    // 4. --- ANTI-COLLISION & HEAD SAFETY ---
    let maxPenetration = 0;
    
    // A. Collision Arêtes (Thorax/Ventre)
    const BODY_RADIUS = 0.18; 
    let currentSegY = 0;
    let segBasePos = new THREE.Vector3(0, 0, 0);
    const bodyLine = new THREE.Line3(feetData.pos, topData.pos);
    const closestPointOnBody = new THREE.Vector3();

    for (const seg of currentConfig.segments) {
        // Si le coin est entre pieds et tête
        if (currentSegY > feetTargetY && currentSegY < topTargetY) {
            const jointPos = segBasePos.clone();
            jointPos.x = xOffset;
            bodyLine.closestPointToPoint(jointPos, true, closestPointOnBody);
            const dist = jointPos.distanceTo(closestPointOnBody);
            if (dist < BODY_RADIUS) {
                const penetration = BODY_RADIUS - dist;
                if (penetration > maxPenetration) maxPenetration = penetration;
            }
        }
        const rad = (seg.angle * Math.PI) / 180;
        segBasePos.y += seg.height * Math.cos(rad);
        segBasePos.z += seg.height * Math.sin(rad);
        currentSegY += seg.height;
    }

    // B. Collision Tête (Head Probe)
    const headHeightRatio = 0.9;
    const theoreticalHeadPos = feetData.pos.clone().add(upVec.clone().multiplyScalar(height * headHeightRatio));
    
    const wallHeadY = feetTargetY + (height * headHeightRatio);
    const wallHeadData = getPointFromOdometer(wallHeadY, xOffset, currentConfig);

    if (wallHeadData) {
        const wallToHead = new THREE.Vector3().subVectors(theoreticalHeadPos, wallHeadData.pos);
        const distanceOut = wallToHead.dot(wallHeadData.normal);
        const HEAD_SAFETY_MARGIN = 0.05; 

        if (distanceOut < HEAD_SAFETY_MARGIN) {
            const neededPush = HEAD_SAFETY_MARGIN - distanceOut;
            if (neededPush > maxPenetration) {
                maxPenetration = neededPush;
            }
        }
    }

    // 5. Offset Final
    const baseOffset = 0.03;
    const totalOffset = baseOffset + maxPenetration;
    
    const adjustedCenter = rawCenterPos.add(avgNormal.multiplyScalar(totalOffset));

    // 6. Orientation
    const forwardVec = avgNormal.clone().negate();
    const rightVec = new THREE.Vector3().crossVectors(upVec, forwardVec).normalize();
    const trueForwardVec = new THREE.Vector3().crossVectors(rightVec, upVec).normalize();
    const rotationMatrix = new THREE.Matrix4().makeBasis(rightVec, upVec, trueForwardVec);
    const finalRot = new THREE.Euler().setFromRotationMatrix(rotationMatrix);

    // 7. Origine (Pieds)
    const bridgeLength = feetData.pos.distanceTo(topData.pos);
    const feetOriginPos = adjustedCenter.clone().add(upVec.clone().multiplyScalar(-bridgeLength * 0.5));

    return {
        pos: feetOriginPos,
        rot: finalRot,
        anchor: {
            cumulativeY: centerCumulativeY,
            xOffset: xOffset
        }
    };
};
