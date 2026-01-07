
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface ScreenshotHandlerProps {
  onScreenshotRef: React.MutableRefObject<(() => string | null) | null>;
}

export const ScreenshotHandler: React.FC<ScreenshotHandlerProps> = ({ onScreenshotRef }) => {
  const { gl, scene, camera } = useThree();
  
  useEffect(() => {
    onScreenshotRef.current = () => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/jpeg', 0.5); // Quality 0.5 to keep JSON size manageable
      } catch (e) {
        console.error("Screenshot failed", e);
        return null;
      }
    };
  }, [gl, scene, camera, onScreenshotRef]);

  return null;
};
