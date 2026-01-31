
import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WallEditor } from './features/editor/WallEditorPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { useHistory } from './hooks/useHistory';
import { useWallData } from './hooks/useWallData';
import { NotificationsProvider, useNotifications } from './core/NotificationsContext';
import { ToastNotification } from './components/ui/ToastNotification';
import { AuthModal } from './components/auth/AuthModal';
import './types';

// Composant interne pour afficher les Toasts
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
  const location = useLocation();
  const [showAuthFromRoute, setShowAuthFromRoute] = useState(false);

  const {
    mode, config, setConfig, holds, setHolds, metadata, setMetadata,
    isLoadingCloud, isSavingCloud, cloudId, generatedLink, user,
    screenshotRef, handleSaveCloud, handleRemix, resetToNew
  } = useWallData();
  
  const history = useHistory({ config, holds });

  // Détection des routes d'authentification directes
  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/signup') {
        setShowAuthFromRoute(true);
    }
  }, [location.pathname]);

  const handleAuthClose = () => {
      setShowAuthFromRoute(false);
      // On retourne à l'accueil ou la galerie si on était sur une page d'auth pure
      if (location.pathname === '/login' || location.pathname === '/signup') {
          navigate('/');
      }
  };

  const editorProps = {
    user, config, setConfig, holds, setHolds, metadata, setMetadata,
    ...history, onSaveCloud: handleSaveCloud, isSavingCloud,
    generatedLink, onHome: () => navigate('/gallery'), onNewWall: resetToNew,
    isLoadingCloud, cloudId, screenshotRef
  };

  return (
    <NotificationsProvider>
      <Routes>
        {/* Routes du Sitemap Static */}
        <Route path="/" element={<GalleryPage onResetState={resetToNew} />} />
        <Route path="/gallery" element={<GalleryPage onResetState={resetToNew} />} />
        
        {/* Nouvelles routes d'authentification */}
        <Route path="/login" element={<GalleryPage onResetState={resetToNew} />} />
        <Route path="/signup" element={<GalleryPage onResetState={resetToNew} />} />

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
        
        {/* Redirection fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showAuthFromRoute && (
          <AuthModal 
            onClose={handleAuthClose} 
            onSuccess={handleAuthClose} 
            isSignUpDefault={location.pathname === '/signup'}
          />
      )}

      <GlobalToastContainer />
    </NotificationsProvider>
  );
}
