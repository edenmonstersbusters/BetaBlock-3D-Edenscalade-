
import { useState, useRef, useEffect } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../utils/geometry';
import { WallConfig, AppMode, HoldDefinition } from '../../types';
import { computeMannequinTransform, MannequinPhysicsState } from './useMannequinPhysics';

interface SceneInteractionProps {
    config: WallConfig;
    mode: AppMode;
    selectedHoldDef: HoldDefinition | null;
    holdSettings: { scale: number; rotation: number; color: string };
    selectedPlacedHoldIds: string[];
    onSelectPlacedHold: (id: string | null, multi?: boolean) => void;
    onPlaceHold: (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => void;
    onContextMenu: (type: 'HOLD' | 'SEGMENT', id: string, x: number, y: number, wallX?: number, wallY?: number) => void;
    onWallPointerUpdate?: (info: { x: number, y: number, segmentId: string } | null) => void;
    
    // Mannequin interactif
    isDraggingMannequin: boolean;
    setIsDraggingMannequin: (v: boolean) => void;
    onUpdateMannequin?: (state: MannequinPhysicsState) => void;
    mannequinConfig?: { height: number; posture: number };
}

export const useSceneInteraction = ({
    config, mode, selectedHoldDef, holdSettings, selectedPlacedHoldIds,
    onSelectPlacedHold, onPlaceHold, onContextMenu, onWallPointerUpdate,
    isDraggingMannequin, setIsDraggingMannequin, onUpdateMannequin, mannequinConfig
}: SceneInteractionProps) => {
    
    const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
    const [ghostRot, setGhostRot] = useState<THREE.Euler | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [hoveredHoldId, setHoveredHoldId] = useState<string | null>(null);
    const [isHoveringMannequin, setIsHoveringMannequin] = useState(false);
    
    const pointerDownScreenPos = useRef<{x: number, y: number} | null>(null);
    const orbitRef = useRef<any>(null);

    const isHoveringSelected = hoveredHoldId && selectedPlacedHoldIds.includes(hoveredHoldId);
    const orbitEnabled = !draggingId && !isHoveringSelected && !isDraggingMannequin;

    useEffect(() => {
        if (draggingId || isDraggingMannequin) {
          document.body.style.cursor = 'grabbing';
        } else if (isHoveringSelected || isHoveringMannequin) {
          document.body.style.cursor = 'grab';
        } else {
          document.body.style.cursor = 'auto';
        }
        return () => { document.body.style.cursor = 'auto'; };
    }, [draggingId, isHoveringSelected, isDraggingMannequin, isHoveringMannequin]);

    const handlePointerMove = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
        if (draggingId) return;
    
        // Logique Drag Mannequin
        if (isDraggingMannequin && onUpdateMannequin) {
            e.stopPropagation();
            const cursorLocal = calculateLocalCoords(e.point.clone(), segmentId, config);
            if (cursorLocal) {
                let cumulativeY = 0;
                for(const seg of config.segments) {
                    if (seg.id === segmentId) {
                        cumulativeY += cursorLocal.y;
                        break;
                    }
                    cumulativeY += seg.height;
                }
                
                const transform = computeMannequinTransform(
                    cumulativeY, cursorLocal.x, 
                    mannequinConfig?.height || 1.75, 
                    mannequinConfig?.posture ?? 0.5, 
                    config
                );
                
                if (transform) {
                    onUpdateMannequin(transform);
                }
            }
            return; 
        }
    
        const coords = calculateLocalCoords(e.point, segmentId, config);
        if (coords) {
          onWallPointerUpdate?.({ ...coords, segmentId });
        }
    
        if (mode !== 'SET') return;
        if (!selectedHoldDef || selectedPlacedHoldIds.length > 0 || isHoveringMannequin) {
          if (ghostPos) setGhostPos(null);
          return;
        }
        
        setGhostPos(e.point.clone());
        const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        const spinQ = new THREE.Quaternion();
        spinQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), (holdSettings.rotation * Math.PI) / 180);
        quaternion.multiply(spinQ);
        setGhostRot(new THREE.Euler().setFromQuaternion(quaternion));
    };

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (isDraggingMannequin || isHoveringMannequin) {
            e.stopPropagation();
            return;
        }
        if (draggingId) return;
        pointerDownScreenPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>, segmentId: string) => {
        if (isDraggingMannequin) {
            e.stopPropagation();
            setIsDraggingMannequin(false);
            if (orbitRef.current) orbitRef.current.enabled = true;
            return;
        }
    
        if (!pointerDownScreenPos.current) return;
        
        const dx = e.clientX - pointerDownScreenPos.current.x;
        const dy = e.clientY - pointerDownScreenPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          pointerDownScreenPos.current = null;
          return;
        }
    
        if (e.button === 2) {
          e.stopPropagation();
          const coords = calculateLocalCoords(e.point, segmentId, config);
          onContextMenu('SEGMENT', segmentId, e.clientX, e.clientY, coords?.x, coords?.y);
          pointerDownScreenPos.current = null;
          return;
        }
    
        if (e.button === 0) {
          if (draggingId) return;
          if (mode !== 'SET') return;
    
          if (selectedPlacedHoldIds.length > 0) {
            e.stopPropagation();
            onSelectPlacedHold(null);
          } else if (selectedHoldDef && !isHoveringMannequin) {
            e.stopPropagation();
            const normal = e.face!.normal.clone().transformDirection(e.object.matrixWorld).normalize();
            onPlaceHold(e.point.clone(), normal, segmentId);
          }
        }
        pointerDownScreenPos.current = null;
    };

    return {
        ghostPos, ghostRot, draggingId, setDraggingId,
        hoveredHoldId, setHoveredHoldId,
        isHoveringMannequin, setIsHoveringMannequin,
        orbitRef, orbitEnabled, pointerDownScreenPos,
        handlePointerMove, handlePointerDown, handlePointerUp
    };
};
