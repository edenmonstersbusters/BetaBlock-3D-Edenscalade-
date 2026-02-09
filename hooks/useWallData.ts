
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../core/api';
import { auth } from '../core/auth';
import { WallConfig, AppMode, PlacedHold, WallMetadata, WallSegment } from '../types';

const APP_VERSION = "1.1";

const INITIAL_CONFIG: WallConfig = {
  width: 4.5,
  segments: [
    { id: '1', height: 2.2, angle: 0 },
    { id: '2', height: 2.0, angle: 30 },
    { id: '3', height: 1.5, angle: 15 },
  ],
};

const INITIAL_METADATA: WallMetadata = {
    name: "Nouveau Mur",
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    remixMode: null
};

// --- MOTEUR DE TEMPLATES URL ---
const applyUrlTemplate = (searchParams: URLSearchParams): WallConfig | null => {
    let hasTemplate = false;
    let newConfig: WallConfig = JSON.parse(JSON.stringify(INITIAL_CONFIG));

    // 1. Presets (Configurations pré-définies)
    const preset = searchParams.get('preset');
    if (preset) {
        hasTemplate = true;
        switch (preset.toLowerCase()) {
            case 'moonboard': // Style MoonBoard (standard 2024: 40°)
                newConfig.width = 3.15;
                newConfig.segments = [{ id: crypto.randomUUID(), height: 3.6, angle: 40 }];
                break;
            case 'kilter': // Style Kilter (Ajustable, défaut 30°)
                newConfig.width = 3.66; // 12x12
                newConfig.segments = [{ id: crypto.randomUUID(), height: 3.66, angle: 30 }];
                break;
            case 'spraywall': // Grand Pan Classique
                newConfig.width = 4.0;
                newConfig.segments = [{ id: crypto.randomUUID(), height: 3.5, angle: 35 }];
                break;
            case 'comp': // Mur de Compétition (Vertical + Dévers + Toit)
                newConfig.width = 5.0;
                newConfig.segments = [
                    { id: crypto.randomUUID(), height: 1.5, angle: 0 },
                    { id: crypto.randomUUID(), height: 2.5, angle: 25 },
                    { id: crypto.randomUUID(), height: 1.0, angle: 45 }
                ];
                break;
        }
    }

    // 2. Paramètres Unitaires (écrasent les presets)
    const width = parseFloat(searchParams.get('width') || '');
    if (!isNaN(width) && width > 0) {
        newConfig.width = Math.min(20, Math.max(1, width));
        hasTemplate = true;
    }

    const angle = parseFloat(searchParams.get('angle') || '');
    const height = parseFloat(searchParams.get('height') || '');
    
    // Si Angle ou Hauteur spécifié, on réinitialise à 1 seul segment (mode simple)
    if (!isNaN(angle) || !isNaN(height)) {
        hasTemplate = true;
        newConfig.segments = [{
            id: crypto.randomUUID(),
            height: !isNaN(height) && height > 0 ? height : 3.0,
            angle: !isNaN(angle) ? angle : 0
        }];
    }

    // 3. Syntaxe Complexe Multi-Segments
    // Format: ?s=height,angle;height,angle
    // Exemple: ?s=2,0;1.5,30 (2m à 0°, puis 1.5m à 30°)
    const segmentsParam = searchParams.get('s');
    if (segmentsParam) {
        try {
            const segDefs = segmentsParam.split(';');
            const newSegments: WallSegment[] = [];
            
            segDefs.forEach(def => {
                const [hStr, aStr] = def.split(',');
                const h = parseFloat(hStr);
                const a = parseFloat(aStr);
                
                if (!isNaN(h) && !isNaN(a)) {
                    newSegments.push({
                        id: crypto.randomUUID(),
                        height: Math.max(0.5, Math.min(10, h)),
                        angle: Math.max(-20, Math.min(90, a))
                    });
                }
            });

            if (newSegments.length > 0) {
                newConfig.segments = newSegments;
                hasTemplate = true;
            }
        } catch (e) {
            console.warn("Erreur parsing segments URL", e);
        }
    }

    return hasTemplate ? newConfig : null;
};

export const useWallData = () => {
  const [mode, setMode] = useState<AppMode>('BUILD');
  const [config, setConfig] = useState<WallConfig>(INITIAL_CONFIG);
  const [holds, setHolds] = useState<PlacedHold[]>([]);
  const [metadata, setMetadata] = useState<WallMetadata>(INITIAL_METADATA);
  
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const screenshotRef = useRef<(() => Promise<string | null>) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const queryId = searchParams.get('id');

    const loadWallData = async (id: string, targetMode: AppMode) => {
        setCloudId(id);
        setIsLoadingCloud(true);
        const { data } = await api.getWall(id);
        if (data) {
            setConfig(data.config);
            setHolds(Array.isArray(data.holds) ? data.holds.filter(h => h && h.id) : []);
            setMetadata(data.metadata);
            setMode(targetMode);
        }
        setIsLoadingCloud(false);
    };

    if (path.startsWith('/view/')) {
        const id = path.split('/').pop();
        if (id) loadWallData(id, 'VIEW');
    } else if (path === '/builder') {
        if (queryId) {
            loadWallData(queryId, 'BUILD');
        } else {
            const state = location.state as { fromRemix?: boolean } | null;
            
            // PRIORITY CHECK: URL Templates (Point 3)
            // Si pas d'ID et pas de Remix, on vérifie si l'URL contient un template
            if (!state?.fromRemix && !queryId) {
                const templateConfig = applyUrlTemplate(searchParams);
                if (templateConfig) {
                    resetLocalState();
                    setConfig(templateConfig);
                    // On peut aussi définir un nom par défaut basé sur le template
                    const presetName = searchParams.get('preset');
                    if (presetName) {
                        setMetadata(prev => ({ ...prev, name: `Projet ${presetName.charAt(0).toUpperCase() + presetName.slice(1)}` }));
                    }
                } else {
                    resetLocalState();
                }
                setMode('BUILD');
            }
        }
    } else if (path === '/setter') {
        if (queryId) {
             loadWallData(queryId, 'SET');
        } else {
             const state = location.state as { fromRemix?: boolean } | null;
             if (!state?.fromRemix) {
                setMode('SET');
             }
        }
    }
  }, [location.pathname, location.search]);

  const resetLocalState = () => {
    setConfig(INITIAL_CONFIG);
    setHolds([]);
    setMetadata(INITIAL_METADATA);
    setCloudId(null);
    setGeneratedLink(null);
  };

  const handleSaveCloud = async (): Promise<boolean> => {
    if (!user) return false;
    setIsSavingCloud(true);
    let screenshot = null;
    try {
        if (screenshotRef.current) screenshot = await screenshotRef.current();
    } catch(e) { console.error("Screenshot failed", e); }
    
    const dataToSave = {
      version: APP_VERSION,
      metadata: { 
          ...metadata, 
          timestamp: new Date().toISOString(),
          thumbnail: screenshot || undefined,
          authorName: user.user_metadata?.display_name || user.email?.split('@')[0]
      },
      config, holds
    };

    let result;
    if (cloudId) {
        result = await api.updateWall(cloudId, dataToSave);
    } else {
        const saveRes = await api.saveWall(dataToSave);
        result = { error: saveRes.error };
        if (saveRes.id) setCloudId(saveRes.id);
    }
    
    setIsSavingCloud(false);
    if (!result.error) {
        const targetId = cloudId || result.id;
        const isProduction = window.location.hostname === 'betablock-3d.fr';
        
        let shareUrl = '';
        if (isProduction) {
            shareUrl = `https://betablock-3d.fr/view/${targetId}`;
        } else {
            const origin = window.location.protocol === 'blob:' ? 'https://betablock-3d.fr' : window.location.origin;
            // En preview on garde le hash pour éviter les erreurs de refresh
            shareUrl = `${origin.replace(/\/$/, '')}/#/view/${targetId}`;
        }
          
        setGeneratedLink(shareUrl);
        return true;
    }
    return false;
  };

  const handleRemix = () => {
      const newMetadata: WallMetadata = {
          ...metadata,
          name: `Remix de ${metadata.name}`,
          timestamp: new Date().toISOString(),
          parentId: cloudId || undefined,
          parentName: metadata.name,
          parentAuthorName: metadata.authorName,
          remixMode: null,
          authorId: undefined,
          authorName: undefined,
          authorAvatarUrl: undefined
      };
      setMetadata(newMetadata);
      setCloudId(null);
      setGeneratedLink(null);
      navigate('/builder', { state: { fromRemix: true } });
  };

  const resetToNew = () => {
    resetLocalState();
    navigate('/builder');
  };

  return {
      mode, config, setConfig, holds, setHolds, metadata, setMetadata,
      isLoadingCloud, isSavingCloud, cloudId, generatedLink, user,
      screenshotRef, handleSaveCloud, handleRemix, resetToNew
  };
};
