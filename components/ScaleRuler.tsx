import React, { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Hud, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

export const ScaleRuler: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(new THREE.Vector3(2.5, -2, 0)); // Position par défaut relative à la caméra HUD
  const homePosition = useMemo(() => new THREE.Vector3(2.5, -2, 0), []);
  const snapDistance = 0.5;

  useFrame(() => {
    if (!isDragging && meshRef.current) {
      // Aimant vers la position de base
      meshRef.current.position.lerp(position, 0.1);
      
      const dist = meshRef.current.position.distanceTo(homePosition);
      if (dist < snapDistance && !isDragging) {
        setPosition(homePosition);
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    (e.target as any).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(false);
    (e.target as any).releasePointerCapture(e.pointerId);
    
    // Si on est proche du coin, on reset
    if (meshRef.current && meshRef.current.position.distanceTo(homePosition) < snapDistance * 2) {
        setPosition(homePosition);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging && meshRef.current) {
      e.stopPropagation();
      // On déplace l'échelle sur le plan de la caméra HUD
      const vec = new THREE.Vector3(
        (e.pointer.x * 4), 
        (e.pointer.y * 3), 
        0
      );
      setPosition(vec);
      meshRef.current.position.copy(vec);
    }
  };

  // Création des graduations pour 1 mètre
  const markings = useMemo(() => {
    const marks = [];
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) - 0.5; // Centré sur 0
        const isMajor = i === 0 || i === 5 || i === 10;
        marks.push(
            <group key={i} position={[x, 0, 0]}>
                <mesh position={[0, isMajor ? 0.05 : 0.02, 0]}>
                    <boxGeometry args={[0.005, isMajor ? 0.15 : 0.08, 0.01]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                {isMajor && (
                    <Text
                        position={[0, 0.2, 0]}
                        fontSize={0.08}
                        color="white"
                        anchorX="center"
                    >
                        {i === 0 ? "0" : i === 5 ? "0.5m" : "1m"}
                    </Text>
                )}
            </group>
        );
    }
    return marks;
  }, []);

  return (
    <Hud>
      <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={100} />
      <group
        ref={meshRef}
        position={[position.x, position.y, position.z]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        {/* Barre principale d'un mètre */}
        <mesh>
          <boxGeometry args={[1, 0.02, 0.01]} />
          <meshBasicMaterial color="white" transparent opacity={0.8} />
        </mesh>
        {markings}
        
        {/* Fond invisible pour faciliter la saisie */}
        <mesh visible={false}>
            <boxGeometry args={[1.2, 0.5, 0.1]} />
        </mesh>
      </group>
    </Hud>
  );
};