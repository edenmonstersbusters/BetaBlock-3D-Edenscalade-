
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const FloatingWall = () => {
    const meshRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Rotation très lente et hypnotique
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
            meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.15) * 0.05;
        }
    });

    return (
        <group ref={meshRef} rotation={[0.2, 0, 0]}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Structure Mur Abstraite */}
                <mesh position={[0, 0, 0]} receiveShadow castShadow>
                    <boxGeometry args={[6, 8, 0.5]} />
                    <meshStandardMaterial 
                        color="#1e293b" 
                        roughness={0.8} 
                        metalness={0.2} 
                        envMapIntensity={0.5}
                    />
                </mesh>

                {/* Quelques "Prises" Stylisées (Cubes Colorés) */}
                <mesh position={[-1, 2, 0.3]} castShadow>
                    <boxGeometry args={[0.3, 0.3, 0.2]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[1.5, 0, 0.3]} castShadow>
                    <boxGeometry args={[0.4, 0.2, 0.2]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[0, -2, 0.3]} castShadow>
                    <boxGeometry args={[0.3, 0.3, 0.3]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
                </mesh>
                 <mesh position={[-2, -1, 0.3]} castShadow>
                    <boxGeometry args={[0.2, 0.5, 0.2]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
                </mesh>
            </Float>
        </group>
    );
};

export const SceneBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen">
      <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
        
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} color="#3b82f6" />
        <spotLight position={[-10, 0, 5]} angle={0.5} penumbra={1} intensity={1} color="#a855f7" />
        
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <FloatingWall />
        
        <fog attach="fog" args={['#020617', 5, 25]} />
      </Canvas>
    </div>
  );
};
