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
    remixMode: null
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
            setHolds(Array.isArray(data.holds) ? data.holds.filter(h => h && h.id) : []); // Filtrage de sécurité
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
            // CORRECTION REMIX : On ne reset pas si on vient d'une action de remix (via location.state)
            const state = location.state as { fromRemix?: boolean } | null;
            if (!state?.fromRemix) {
                resetLocalState();
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
        // Lien propre sans hash
        setGeneratedLink(`${window.location.origin}/view/${cloudId}`);
        return true;
    }
    return false;
  };

  const handleRemix = (remixMode: 'structure' | 'holds') => {
      const newMetadata: WallMetadata = {
          ...metadata,
          name: `Remix de ${metadata.name}`,
          timestamp: new Date().toISOString(),
          parentId: cloudId || undefined,
          parentName: metadata.name,
          parentAuthorName: metadata.authorName,
          remixMode: remixMode,
          // On reset l'auteur pour le nouveau mur
          authorId: undefined,
          authorName: undefined,
          authorAvatarUrl: undefined
      };
      setMetadata(newMetadata);
      setCloudId(null);
      setGeneratedLink(null);
      // CORRECTION REMIX : On passe state: { fromRemix: true } pour éviter le reset dans useEffect
      navigate(remixMode === 'holds' ? '/setter' : '/builder', { state: { fromRemix: true } });
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