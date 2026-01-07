
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ScreenshotHandlerProps {
  onScreenshotRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
}

export const ScreenshotHandler: React.FC<ScreenshotHandlerProps> = ({ onScreenshotRef }) => {
  const { gl, scene, camera, controls } = useThree();
  
  useEffect(() => {
    // Cette fonction devient asynchrone pour gérer le mouvement de caméra et le rendu
    onScreenshotRef.current = async () => {
      try {
        const originalPos = camera.position.clone();
        const originalRot = camera.rotation.clone();
        const originalControlsTarget = (controls as any)?.target?.clone() || new THREE.Vector3(0, 0, 0);

        // --- 1. CONFIGURATION OPTIMALE ---
        // On vise le centre approximatif du mur (supposé vertical autour de 0,0,0)
        // Pour être plus précis, on pourrait calculer la BoundingBox de la scène, 
        // mais pour l'instant une heuristique basée sur la position standard suffit.
        const target = new THREE.Vector3(0, 2.5, 0); 
        
        // --- 2. PRISE DE VUE 1 : ISO 45° (Héroïque) ---
        // On place la caméra à 45 degrés pour donner du volume
        const isoDistance = 10;
        const isoPos = new THREE.Vector3(isoDistance * 0.7, 5, isoDistance * 0.7); // x=z pour 45deg
        
        camera.position.copy(isoPos);
        camera.lookAt(target);
        if (controls) (controls as any).target.copy(target);
        if (controls) (controls as any).update();
        
        // Rendu forcé
        gl.render(scene, camera);
        const isoScreenshot = gl.domElement.toDataURL('image/jpeg', 0.85);

        // --- RESTAURATION ---
        camera.position.copy(originalPos);
        camera.rotation.copy(originalRot);
        if (controls) (controls as any).target.copy(originalControlsTarget);
        if (controls) (controls as any).update();
        gl.render(scene, camera); // Rendu final pour éviter le saut visuel

        return isoScreenshot;

      } catch (e) {
        console.error("Smart Screenshot failed", e);
        return null;
      }
    };
  }, [gl, scene, camera, controls, onScreenshotRef]);

  return null;
};
