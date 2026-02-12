
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../utils/geometry';
import { WallConfig } from '../../types';
import { computeMannequinTransform, MannequinPhysicsState } from './useMannequinPhysics';

interface MannequinControllerProps {
    config: WallConfig;
    mannequinConfig?: { height: number; posture: number };
    mannequinState?: MannequinPhysicsState | null;
    onUpdateMannequin?: (state: MannequinPhysicsState) => void;
    placementRef?: React.MutableRefObject<any>;
    isDragging: boolean;
}

export const MannequinController: React.FC<MannequinControllerProps> = ({
    config, mannequinConfig, mannequinState, onUpdateMannequin, placementRef, isDragging
}) => {
    const { camera, scene } = useThree();
    const raycaster = new THREE.Raycaster();

    const resolvePhysics = (cumulativeY: number, xOffset: number): MannequinPhysicsState | null => {
        const h = mannequinConfig?.height || 1.75;
        const p = mannequinConfig?.posture ?? 0.5;
        return computeMannequinTransform(cumulativeY, xOffset, h, p, config);
    };

    // 1. Placement initial (Centre écran)
    useEffect(() => {
        if (placementRef) {
            placementRef.current = (height: number) => {
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.intersectObjects(scene.children, true);
                const wallHit = intersects.find(h => h.object.name === 'climbing-wall-panel');
                
                if (wallHit && wallHit.point && wallHit.object.userData.segmentId) {
                    const cursorLocal = calculateLocalCoords(wallHit.point, wallHit.object.userData.segmentId, config);
                    if (!cursorLocal) return null;

                    let cumulativeY = 0;
                    for(const seg of config.segments) {
                        if (seg.id === wallHit.object.userData.segmentId) {
                            cumulativeY += cursorLocal.y;
                            break;
                        }
                        cumulativeY += seg.height;
                    }

                    return computeMannequinTransform(cumulativeY, cursorLocal.x, height, 0.5, config);
                }
                
                return { 
                    pos: new THREE.Vector3(0,0,0), 
                    rot: new THREE.Euler(0,0,0), 
                    anchor: { cumulativeY: height/2, xOffset: 0 },
                    ik: { hipFlexion: 0, spineFlexion: 0, kneeFlexion: 0 }
                };
            };
        }
    }, [camera, scene, config, mannequinConfig]);

    // 2. MISE À JOUR TEMPS RÉEL
    useEffect(() => {
        if (mannequinState && mannequinState.anchor && onUpdateMannequin && !isDragging) {
            const { cumulativeY, xOffset } = mannequinState.anchor;
            const newTransform = resolvePhysics(cumulativeY, xOffset);
            
            if (newTransform) {
                const oldPos = new THREE.Vector3(mannequinState.pos.x, mannequinState.pos.y, mannequinState.pos.z);
                // On check aussi si l'IK a changé significativement
                const ikChanged = Math.abs(newTransform.ik.hipFlexion - mannequinState.ik.hipFlexion) > 0.01;
                
                if (oldPos.distanceTo(newTransform.pos) > 0.0001 || ikChanged) { 
                    onUpdateMannequin(newTransform);
                }
            }
        }
    }, [config, mannequinConfig, isDragging]); 

    return null;
};
