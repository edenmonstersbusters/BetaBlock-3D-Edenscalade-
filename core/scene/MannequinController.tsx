
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../utils/geometry';
import { WallConfig } from '../../types';
import { computeMannequinTransform } from './useMannequinPhysics';

interface MannequinControllerProps {
    config: WallConfig;
    mannequinConfig?: { height: number; posture: number };
    mannequinState?: { 
        pos: [number,number,number], 
        rot: [number,number,number],
        anchor?: { cumulativeY: number; xOffset: number } 
    } | null;
    onUpdateMannequin?: (state: any) => void;
    placementRef?: React.MutableRefObject<any>;
    isDragging: boolean;
}

export const MannequinController: React.FC<MannequinControllerProps> = ({
    config, mannequinConfig, mannequinState, onUpdateMannequin, placementRef, isDragging
}) => {
    const { camera, scene } = useThree();
    const raycaster = new THREE.Raycaster();

    // Helper: Calcul depuis curseur
    const calculateTransformFromCursor = (cursorPoint: THREE.Vector3, segmentId: string) => {
        const cursorLocal = calculateLocalCoords(cursorPoint, segmentId, config);
        if (!cursorLocal) return null;

        let cumulativeY = 0;
        for(const seg of config.segments) {
            if (seg.id === segmentId) {
                cumulativeY += cursorLocal.y;
                break;
            }
            cumulativeY += seg.height;
        }

        const h = mannequinConfig?.height || 1.75;
        const p = mannequinConfig?.posture ?? 0.5;

        return computeMannequinTransform(cumulativeY, cursorLocal.x, h, p, config);
    };

    // 1. Placement initial (Centre écran)
    useEffect(() => {
        if (placementRef) {
            placementRef.current = (height: number) => {
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.intersectObjects(scene.children, true);
                const wallHit = intersects.find(h => h.object.name === 'climbing-wall-panel');
                
                if (wallHit && wallHit.point && wallHit.object.userData.segmentId) {
                    const res = calculateTransformFromCursor(wallHit.point, wallHit.object.userData.segmentId);
                    if (res) return { pos: [res.pos.x, res.pos.y, res.pos.z], rot: [res.rot.x, res.rot.y, res.rot.z], anchor: res.anchor };
                }
                return null;
            };
        }
    }, [camera, scene, config, mannequinConfig]);

    // 2. MISE À JOUR TEMPS RÉEL (Réactivité aux changements de mur)
    useEffect(() => {
        if (mannequinState && mannequinState.anchor && onUpdateMannequin && !isDragging) {
            const { cumulativeY, xOffset } = mannequinState.anchor;
            const h = mannequinConfig?.height || 1.75;
            const p = mannequinConfig?.posture ?? 0.5;

            const newTransform = computeMannequinTransform(cumulativeY, xOffset, h, p, config);
            
            if (newTransform) {
                const oldPos = new THREE.Vector3(...mannequinState.pos);
                if (oldPos.distanceTo(newTransform.pos) > 0.001) { 
                    onUpdateMannequin({
                        pos: [newTransform.pos.x, newTransform.pos.y, newTransform.pos.z],
                        rot: [newTransform.rot.x, newTransform.rot.y, newTransform.rot.z],
                        anchor: newTransform.anchor
                    });
                }
            }
        }
    }, [config, mannequinConfig]); 

    return null;
};
