
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Html } from '@react-three/drei';
import { Eye, Loader2 } from 'lucide-react';
import { HoldModel } from '../../../core/HoldModel';
import { HoldDefinition } from '../../../types';

interface Hold3DPreviewProps {
  holdDef: HoldDefinition;
  settings: { scale: number; rotation: number; color: string };
}

export const Hold3DPreview: React.FC<Hold3DPreviewProps> = ({ holdDef, settings }) => {
  return (
    <section className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest px-1">
        <Eye size={12} />
        <span>Rendu 3D Temps Réel</span>
      </div>
      <div className="bg-gray-950/50 rounded-2xl border-2 border-blue-500/20 relative overflow-hidden h-56 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0, 0.4], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
            <Suspense fallback={<Html center><Loader2 className="animate-spin text-blue-500" size={32} /></Html>}>
              <Center>
                <HoldModel 
                  modelFilename={holdDef.filename} 
                  baseScale={holdDef.baseScale} 
                  rotation={[0, 0, (settings.rotation * Math.PI) / 180]} 
                  scale={[settings.scale, settings.scale, settings.scale]} 
                  color={settings.color} 
                  preview={true}
                  showDimensions={true} 
                />
              </Center>
            </Suspense>
            <OrbitControls makeDefault enableZoom={false} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI} />
          </Canvas>
        </div>
      </div>
    </section>
  );
};
