
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

    // Fonction centralisée pour appeler la physique
    const resolvePhysics = (cumulativeY: number, xOffset: number) => {
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

                    const res = computeMannequinTransform(cumulativeY, cursorLocal.x, height, 0.5, config);
                    if (res) return { pos: [res.pos.x, res.pos.y, res.pos.z], rot: [res.rot.x, res.rot.y, res.rot.z], anchor: res.anchor };
                }
                
                // Fallback si pas de mur touché : on place au sol au centre
                return { pos: [0, 0, 0], rot: [0, 0, 0], anchor: { cumulativeY: height/2, xOffset: 0 } };
            };
        }
    }, [camera, scene, config, mannequinConfig]);

    // 2. MISE À JOUR TEMPS RÉEL (Réactivité aux changements de mur ou de config mannequin)
    useEffect(() => {
        if (mannequinState && mannequinState.anchor && onUpdateMannequin && !isDragging) {
            const { cumulativeY, xOffset } = mannequinState.anchor;
            const newTransform = resolvePhysics(cumulativeY, xOffset);
            
            if (newTransform) {
                // On vérifie si ça a bougé significativement pour éviter les loops infinis
                const oldPos = new THREE.Vector3(...mannequinState.pos);
                if (oldPos.distanceTo(newTransform.pos) > 0.0001) { 
                    onUpdateMannequin({
                        pos: [newTransform.pos.x, newTransform.pos.y, newTransform.pos.z],
                        rot: [newTransform.rot.x, newTransform.rot.y, newTransform.rot.z],
                        anchor: newTransform.anchor
                    });
                }
            }
        }
    }, [config, mannequinConfig, isDragging]); // On enlève mannequinState des deps pour éviter le spam, on se fie au config

    return null;
};
