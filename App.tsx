
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';

// Core imports
import { api } from './core/api'; 
import { auth } from './core/auth';

// Feature Components
import { WallEditor } from './features/editor/WallEditorPage'; // Nouveau composant extrait
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';

// Custom Hooks
import { useHistory } from './hooks/useHistory';

// Types
import { WallConfig, AppMode, PlacedHold, BetaBlockFile, WallMetadata } from './types';
import './types';

const APP_VERSION = "1.1";

const INITIAL_CONFIG: WallConfig = {
  width: 4.5,
  segments: [
    { id: '1', height: 2.2, angle: 0 },
    { id: '2', height: 2.0, angle: 30 },
    { id: '3', height: 1.5, angle: 15 },
  ],
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('BUILD');
  const [config, setConfig] = useState<WallConfig>(INITIAL_CONFIG);
  const [holds, setHolds] = useState<PlacedHold[]>([]);
  const [metadata, setMetadata] = useState<WallMetadata>({
    name: "Nouveau Mur",
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    remixMode: null
  });
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const screenshotRef = useRef<(() => Promise<string | null>) | null>(null);
  const history = useHistory({ config, holds });
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
        const { data, error } = await api.getWall(id);
        if (data) {
            setConfig(data.config);
            setHolds(data.holds);
            setMetadata(data.metadata);
            setMode(targetMode);
        }
        setIsLoadingCloud(false);
    };

    if (path.startsWith('/view/')) {
        const id = path.split('/').pop();
        if (id) {
            loadWallData(id, 'VIEW');
        }
    } else if (path === '/builder') {
        if (queryId) {
            // Si on a un ID dans l'URL (via le bouton stylo), on charge ce mur
            loadWallData(queryId, 'BUILD');
        } else {
            // Sinon on reste sur le state actuel (ou nouveau mur si reset)
            setMode('BUILD');
        }
    } else if (path === '/setter') {
        if (queryId) {
             loadWallData(queryId, 'SET');
        } else {
             setMode('SET');
        }
    }
  }, [location.pathname, location.search]);

  const handleSaveCloud = async (): Promise<boolean> => {
    if (!user) return false;
    setIsSavingCloud(true);
    let screenshot = null;
    try {
        if (screenshotRef.current) {
            screenshot = await screenshotRef.current();
        }
    } catch(e) { console.error("Screenshot failed during save", e); }
    
    const dataToSave: BetaBlockFile = {
      version: APP_VERSION,
      metadata: { 
          ...metadata, 
          timestamp: new Date().toISOString(),
          thumbnail: screenshot || undefined,
          authorName: user.user_metadata?.display_name || user.email?.split('@')[0]
      },
      config,
      holds
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
        setGeneratedLink(`${window.location.origin}/#/view/${cloudId}`);
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
          remixMode: remixMode
      };
      setMetadata(newMetadata);
      setCloudId(null);
      setGeneratedLink(null);
      navigate(remixMode === 'holds' ? '/setter' : '/builder');
  };

  const resetToNew = () => {
    setConfig(INITIAL_CONFIG);
    setHolds([]);
    setMetadata({
        name: "Nouveau Mur",
        timestamp: new Date().toISOString(),
        appVersion: APP_VERSION,
        remixMode: null
    });
    setCloudId(null);
    setGeneratedLink(null);
    navigate('/builder');
  };

  return (
    <Routes>
      <Route path="/" element={<GalleryPage onResetState={resetToNew} />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/builder" element={
        <WallEditor 
          mode="BUILD" user={user}
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          {...history} onSaveCloud={handleSaveCloud} isSavingCloud={isSavingCloud} 
          generatedLink={generatedLink} onHome={() => navigate('/')} 
          onNewWall={resetToNew} isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/setter" element={
        <WallEditor 
          mode="SET" user={user}
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          {...history} onSaveCloud={handleSaveCloud} isSavingCloud={isSavingCloud} 
          generatedLink={generatedLink} onHome={() => navigate('/')} 
          onNewWall={resetToNew}
          onRemoveAllHolds={() => { history.recordAction({ config, holds }); setHolds([]); }}
          onChangeAllHoldsColor={(color: string) => { history.recordAction({ config, holds }); setHolds(prev => prev.map(h => ({ ...h, color }))); }}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="/view/:id" element={
        <WallEditor 
          mode="VIEW" user={user}
          config={config} setConfig={setConfig} 
          holds={holds} setHolds={setHolds} 
          metadata={metadata} setMetadata={setMetadata}
          {...history} onSaveCloud={handleSaveCloud} isSavingCloud={isSavingCloud} 
          generatedLink={generatedLink} onHome={() => navigate('/')} 
          onNewWall={resetToNew} onRemix={handleRemix}
          isLoadingCloud={isLoadingCloud} cloudId={cloudId} screenshotRef={screenshotRef}
        />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
