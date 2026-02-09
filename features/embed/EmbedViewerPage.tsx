
import React, { useMemo, useEffect, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Scene } from '../../core/Scene';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { useWallData } from '../../hooks/useWallData';
import { resolveHoldWorldData } from '../../utils/geometry';
import { SEO } from '../../components/SEO';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Stage } from '@react-three/drei';
import { HoldModel } from '../../core/HoldModel';
import { Loader2 } from 'lucide-react';

interface EmbedViewerPageProps {
    type?: 'wall' | 'hold';
}

const CATALOGUE_URL = 'https://raw.githubusercontent.com/edenmonstersbusters/climbing-holds-library/main/catalogue.json';

export const EmbedViewerPage: React.FC<EmbedViewerPageProps> = ({ type = 'wall' }) => {
    const { id } = useParams();
    
    // --- LOGIQUE MUR ---
    const { config, holds, metadata, isLoadingCloud } = useWallData();

    // --- LOGIQUE PRISE ---
    const [holdDef, setHoldDef] = useState<any>(null);
    const [loadingHold, setLoadingHold] = useState(false);

    useEffect(() => {
        if (type === 'hold' && id) {
            setLoadingHold(true);
            fetch(CATALOGUE_URL)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        // Recherche par ID ou par Nom de fichier (avec ou sans .glb)
                        const found = data.find((h: any) => 
                            String(h.id) === id || 
                            h.filename === id || 
                            h.filename === `${id}.glb` ||
                            h.nom_du_fichier === id
                        );
                        
                        if (found) {
                            setHoldDef({
                                ...found,
                                filename: (found.filename || found.nom_du_fichier).endsWith('.glb') 
                                    ? (found.filename || found.nom_du_fichier) 
                                    : `${found.filename || found.nom_du_fichier}.glb`
                            });
                        }
                    }
                    setLoadingHold(false);
                })
                .catch(() => setLoadingHold(false));
        }
    }, [type, id]);

    // Calcul des positions des prises pour le rendu 3D (Mode Mur)
    const renderableHolds = useMemo(() => holds.map((h) => {
        if (!h) return null;
        const world = resolveHoldWorldData(h, config); 
        return world ? { ...h, ...world } : null;
    }).filter((h) => h !== null), [holds, config]);

    // --- RENDER : MODE PRISE UNIQUE ---
    if (type === 'hold') {
        return (
            <div className="w-full h-screen bg-transparent relative overflow-hidden">
                <LoadingOverlay isVisible={loadingHold} message="Chargement de la prise..." />
                
                {holdDef ? (
                    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 0.3], fov: 50 }} gl={{ alpha: true, antialias: true }}>
                        <ambientLight intensity={0.5} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                        <pointLight position={[-10, -10, -10]} intensity={0.5} />
                        
                        <Suspense fallback={null}>
                            <Center>
                                <HoldModel 
                                    modelFilename={holdDef.filename}
                                    baseScale={0.02} // Échelle fixe pour la vue isolée
                                    scale={[1, 1, 1]}
                                    color="#dddddd" // Gris neutre par défaut pour bien voir la forme
                                    preview={true}
                                />
                            </Center>
                        </Suspense>
                        
                        <OrbitControls makeDefault autoRotate autoRotateSpeed={2} minPolarAngle={0} maxPolarAngle={Math.PI} />
                    </Canvas>
                ) : (
                    !loadingHold && <div className="flex items-center justify-center h-full text-white text-xs font-mono opacity-50">Prise introuvable</div>
                )}

                {/* Watermark Discret */}
                <a 
                    href="https://betablock-3d.fr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 opacity-30 hover:opacity-100 transition-opacity"
                >
                    <img src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" alt="BetaBlock" className="w-6 h-6 grayscale hover:grayscale-0 transition-all" />
                </a>
            </div>
        );
    }

    // --- RENDER : MODE MUR COMPLET ---
    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            <SEO 
                title={metadata.name || "Mur Embed"} 
                description="Visualisation 3D interactive d'un mur d'escalade BetaBlock."
                image={metadata.thumbnail}
            />

            <LoadingOverlay isVisible={isLoadingCloud} message="Chargement..." />

            <Scene 
                config={config} 
                mode="VIEW"
                holds={renderableHolds as any}
                onPlaceHold={() => {}}
                selectedHoldDef={null}
                holdSettings={{ scale: 1, rotation: 0, color: '#fff' }}
                selectedPlacedHoldIds={[]}
                onSelectPlacedHold={() => {}}
                onContextMenu={() => {}}
            />

            {/* Watermark Discret */}
            <a 
                href={`https://betablock-3d.fr/view/${id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/50 hover:bg-black/80 rounded-full transition-all group backdrop-blur-sm border border-white/10"
            >
                <img 
                    src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" 
                    alt="Logo" 
                    className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100"
                />
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">BetaBlock 3D</span>
            </a>
        </div>
    );
};
