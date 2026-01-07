
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WallConfig } from '../types';
import { calculateLocalCoords } from '../utils/geometry';

interface DragControllerProps {
  draggingId: string | null;
  config: WallConfig;
  onHoldDrag?: (id: string, x: number, y: number, segmentId: string) => void;
  onDragEnd: () => void;
  setDraggingId: (id: string | null) => void;
  orbitRef: React.MutableRefObject<any>;
}

export const DragController: React.FC<DragControllerProps> = ({ 
  draggingId, config, onHoldDrag, onDragEnd, setDraggingId, orbitRef 
}) => {
  const { camera, scene, gl } = useThree();

  useEffect(() => {
    if (!draggingId) return;

    const onPointerMove = (e: PointerEvent) => {
       const rect = gl.domElement.getBoundingClientRect();
       const mouse = new THREE.Vector2(
         ((e.clientX - rect.left) / rect.width) * 2 - 1,
         -((e.clientY - rect.top) / rect.height) * 2 + 1
       );

       const raycaster = new THREE.Raycaster();
       raycaster.setFromCamera(mouse, camera);
       
       const intersects = raycaster.intersectObjects(scene.children, true);
       const wallHit = intersects.find(hit => hit.object.name === 'climbing-wall-panel');

       if (wallHit && onHoldDrag) {
          const segmentId = wallHit.object.userData.segmentId;
          const coords = calculateLocalCoords(wallHit.point, segmentId, config);
          
          if (coords) {
             const segment = config.segments.find(s => s.id === segmentId);
             if (segment) {
                const clampedY = Math.max(0, Math.min(segment.height, coords.y));
                const clampedX = Math.max(-config.width/2, Math.min(config.width/2, coords.x));
                onHoldDrag(draggingId, clampedX, clampedY, segmentId);
             }
          }
       }
    };

    const onPointerUp = () => {
       setDraggingId(null);
       if (orbitRef.current) orbitRef.current.enabled = true;
       onDragEnd();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
       window.removeEventListener('pointermove', onPointerMove);
       window.removeEventListener('pointerup', onPointerUp);
       window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [draggingId, camera, scene, gl, config, onHoldDrag, onDragEnd, setDraggingId, orbitRef]);

  return null;
};
