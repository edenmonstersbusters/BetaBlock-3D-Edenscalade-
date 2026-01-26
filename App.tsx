import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WallEditor } from './features/editor/WallEditorPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { useHistory } from './hooks/useHistory';
import { useWallData } from './hooks/useWallData';
import './types';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    mode, config, setConfig, holds, setHolds, metadata, setMetadata,
    isLoadingCloud, isSavingCloud, cloudId, generatedLink, user,
    screenshotRef, handleSaveCloud, handleRemix, resetToNew
  } = useWallData();
  
  const history = useHistory({ config, holds });

  // Props communes pour WallEditor pour réduire la duplication
  const editorProps = {
    user, config, setConfig, holds, setHolds, metadata, setMetadata,
    ...history, onSaveCloud: handleSaveCloud, isSavingCloud,
    generatedLink, onHome: () => navigate('/gallery'), onNewWall: resetToNew,
    isLoadingCloud, cloudId, screenshotRef
  };

  return (
    <Routes>
      {/* Route par défaut : La Galerie (Page d'accueil) */}
      <Route path="/" element={<GalleryPage onResetState={resetToNew} />} />
      
      {/* Alias pour la galerie */}
      <Route path="/gallery" element={<GalleryPage onResetState={resetToNew} />} />

      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      
      <Route path="/builder" element={
        <WallEditor mode="BUILD" {...editorProps} />
      } />
      
      <Route path="/setter" element={
        <WallEditor 
          mode="SET" {...editorProps}
          onRemoveAllHolds={() => { history.recordAction({ config, holds }); setHolds([]); }}
          onChangeAllHoldsColor={(color: string) => { history.recordAction({ config, holds }); setHolds(prev => prev.map(h => ({ ...h, color }))); }}
        />
      } />
      
      <Route path="/view/:id" element={
        <WallEditor mode="VIEW" {...editorProps} onRemix={handleRemix} />
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}