
import React from 'react';
import { Grid, ContactShadows } from '@react-three/drei';

export const SceneEnvironment: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-10, 5, -10]} intensity={0.4} />
      <directionalLight position={[0, -10, 0]} intensity={0.2} color="#eef" />

      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellColor="#333" sectionColor="#444" infiniteGrid fadeDistance={20} />
      <ContactShadows opacity={0.6} scale={20} blur={2.5} far={4} resolution={512} color="#000000" />
    </>
  );
};
