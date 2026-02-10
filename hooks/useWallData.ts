
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../core/api';
import { auth } from '../core/auth';
import { WallConfig, AppMode, PlacedHold, WallMetadata } from '../types';

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
    remixMode: null,
    isPublic: false // EXPLICIT : Privé par défaut
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
    const state = location.state as { fromRemix?: boolean; preventFetch?: boolean } | null;

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
            // On ne recharge pas si on vient de sauvegarder (preventFetch)
            if (!state?.preventFetch) {
                loadWallData(queryId, 'BUILD');
            }
        } else {
            if (!state?.fromRemix) {
                resetLocalState();
                setMode('BUILD');
            }
        }
    } else if (path === '/setter') {
        if (queryId) {
             // Idem pour le mode setter si besoin, bien que la sauvegarde se fasse en mode builder/setter sur la même URL
             if (!state?.preventFetch) {
                loadWallData(queryId, 'SET');
             }
        } else {
             const state = location.state as { fromRemix?: boolean } | null;
             if (!state?.fromRemix) {
                setMode('SET');
             }
        }
    }
  }, [location.pathname, location.search, location.state]);

  const resetLocalState = () => {
    setConfig(INITIAL_CONFIG);
    setHolds([]);
    setMetadata(INITIAL_METADATA); // Réutilise l'objet avec isPublic: false
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
    
    // On s'assure que isPublic est bien défini (false par défaut)
    const currentIsPublic = metadata.isPublic === undefined ? false : metadata.isPublic;

    // Mise à jour immédiate des métadonnées locales avec les infos user (Vital pour l'UI après save)
    const authorName = user.user_metadata?.display_name || user.email?.split('@')[0];
    const updatedMetadata = {
        ...metadata, 
        isPublic: currentIsPublic,
        timestamp: new Date().toISOString(),
        thumbnail: screenshot || undefined,
        authorId: user.id, // CRITIQUE : On force l'ID pour que isOwner fonctionne tout de suite
        authorName: authorName,
        authorAvatarUrl: user.user_metadata?.avatar_url
    };

    // On met à jour le state React tout de suite pour refléter le changement de propriété
    setMetadata(updatedMetadata);

    const dataToSave = {
      version: APP_VERSION,
      metadata: updatedMetadata,
      config, holds
    };

    let error = null;
    let finalId = cloudId;

    if (cloudId) {
        // Mise à jour d'un mur existant
        const res = await api.updateWall(cloudId, dataToSave);
        error = res.error;
    } else {
        // Création d'un nouveau mur
        const saveRes = await api.saveWall(dataToSave);
        error = saveRes.error;
        if (saveRes.id) {
            setCloudId(saveRes.id);
            finalId = saveRes.id;
            
            // Mise à jour de l'URL via le Router (et non window.history) pour éviter les erreurs Blob/Security
            // On passe preventFetch pour dire au useEffect de ne pas recharger les données qu'on a déjà
            navigate(`/builder?id=${saveRes.id}`, { replace: true, state: { preventFetch: true } });
        }
    }
    
    setIsSavingCloud(false);
    
    if (error) {
        console.error("Save Error Detail:", error);
        return false;
    }
    
    if (finalId) {
        const shareUrl = `https://betablock-3d.fr/view/${finalId}`;
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
          authorAvatarUrl: undefined,
          isPublic: false // Remix commence toujours en privé
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
