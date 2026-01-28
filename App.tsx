
import React from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { WallEditor } from './features/editor/WallEditorPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { useHistory } from './hooks/useHistory';
import { useWallData } from './hooks/useWallData';
import { NotificationsProvider, useNotifications } from './core/NotificationsContext';
import { ToastNotification } from './components/ui/ToastNotification';
import './types';

// Composant interne pour afficher les Toasts (doit être sous le Provider)
const GlobalToastContainer = () => {
    const { activeToasts, dismissToast } = useNotifications();
    
    return (
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex flex-col gap-2 items-end">
          {activeToasts.map((notif) => (
              <div key={notif.id} className="pointer-events-auto">
                  <ToastNotification 
                      notification={notif} 
                      onDismiss={dismissToast} 
                  />
              </div>
          ))}
      </div>
    );
};

export default function App() {
  const navigate = useNavigate();
  const {
    mode, config, setConfig, holds, setHolds, metadata, setMetadata,
    isLoadingCloud, isSavingCloud, cloudId, generatedLink, user,
    screenshotRef, handleSaveCloud, handleRemix, resetToNew
  } = useWallData();
  
  const history = useHistory({ config, holds });

  const editorProps = {
    user, config, setConfig, holds, setHolds, metadata, setMetadata,
    ...history, onSaveCloud: handleSaveCloud, isSavingCloud,
    generatedLink, onHome: () => navigate('/gallery'), onNewWall: resetToNew,
    isLoadingCloud, cloudId, screenshotRef
  };

  return (
    <NotificationsProvider>
      <Routes>
        <Route path="/" element={<GalleryPage onResetState={resetToNew} />} />
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

      <GlobalToastContainer />
    </NotificationsProvider>
  );
}
