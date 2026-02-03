
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Html } from '@react-three/drei';
import { Eye, Ruler, Loader2 } from 'lucide-react';
import { HoldModel } from '../../../core/HoldModel';
import { HoldDefinition } from '../../../types';

interface HoldPreviewProps {
    hold: HoldDefinition;
    settings: { scale: number; rotation: number; color: string };
}

export const HoldPreview: React.FC<HoldPreviewProps> = ({ hold, settings }) => {
    const [showPreviewDimensions, setShowPreviewDimensions] = useState(false);
    const [calculatedDims, setCalculatedDims] = useState<{ width: number, height: number } | null>(null);

    return (
        <section className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  <Eye size={12} /><span>Rendu 3D Temps Réel</span>
                </div>
                <button 
                  onClick={() => setShowPreviewDimensions(!showPreviewDimensions)}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${showPreviewDimensions ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500'}`}
                  title="Afficher les dimensions"
                >
                    <Ruler size={14} />
                </button>
            </div>
            <div className="bg-gray-950/50 rounded-2xl border-2 border-blue-500/20 relative overflow-hidden h-56 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
              
              {/* Overlay des dimensions plus gros et lisible */}
              {showPreviewDimensions && calculatedDims && (
                  <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur-md border border-blue-500/50 rounded-xl p-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black text-gray-500 uppercase">Largeur</span>
                              <span className="text-sm font-mono font-bold text-white">{calculatedDims.width.toFixed(1)} cm</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black text-gray-500 uppercase">Hauteur</span>
                              <span className="text-sm font-mono font-bold text-white">{calculatedDims.height.toFixed(1)} cm</span>
                          </div>
                      </div>
                  </div>
              )}

              <div className="absolute inset-0">
                  <Canvas camera={{ position: [0, 0, 0.4], fov: 45 }}>
                      <ambientLight intensity={0.8} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                      <pointLight position={[-10, -10, -10]} intensity={0.8} />
                      <Suspense fallback={<Html center><Loader2 className="animate-spin text-blue-500" size={32} /></Html>}>
                          <Center>
                              <HoldModel 
                                modelFilename={hold.filename} baseScale={hold.baseScale} 
                                rotation={[0, 0, (settings.rotation * Math.PI) / 180]} 
                                scale={[settings.scale, settings.scale, settings.scale]} 
                                color={settings.color} preview={true} showDimensions={showPreviewDimensions}
                                onDimensionsCalculated={(dims) => setCalculatedDims(dims)}
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
