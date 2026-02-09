
import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WallEditor } from './features/editor/WallEditorPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AuthCallbackPage } from './features/auth/AuthCallbackPage'; 
import { OnboardingWizard } from './features/onboarding/OnboardingWizard'; // Nouvelle Importation
import { useHistory } from './hooks/useHistory';
import { useWallData } from './hooks/useWallData';
import { NotificationsProvider, useNotifications } from './core/NotificationsContext';
import { ToastNotification } from './components/ui/ToastNotification';
import { AuthModal } from './components/auth/AuthModal';
import { auth } from './core/auth';
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    mode, config, setConfig, holds, setHolds, metadata, setMetadata,
    isLoadingCloud, isSavingCloud, cloudId, generatedLink, user,
    screenshotRef, handleSaveCloud, handleRemix, resetToNew
  } = useWallData();
  
  const history = useHistory({ config, holds });

  // 1. Détection Auth & Routes
  useEffect(() => {
    // Initial fetch
    auth.getUser().then(u => {
        setCurrentUser(u);
        setShowOnboarding(!!u); // On tente d'afficher l'onboarding si user connecté (le composant vérifiera lui-même s'il doit s'afficher)
    });

    const { data: { subscription } } = auth.onAuthStateChange((eventUser, event) => {
        setCurrentUser(eventUser);
        if (event === 'SIGNED_IN') {
             setShowOnboarding(true);
        }
        if (event === 'SIGNED_OUT') {
             setShowOnboarding(false);
        }
        
        if (event === 'PASSWORD_RECOVERY') {
            if (!location.pathname.includes('/settings')) {
                navigate('/settings?type=recovery');
            }
        }
    });

    if (location.pathname === '/login' || location.pathname === '/signup') {
        setShowAuthFromRoute(true);
    } else {
        setShowAuthFromRoute(false);
    }

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleAuthClose = () => {
      setShowAuthFromRoute(false);
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
      {/* ONBOARDING WIZARD : S'affiche par dessus tout si nécessaire */}
      {showOnboarding && currentUser && (
          <OnboardingWizard 
              user={currentUser} 
              onComplete={() => setShowOnboarding(false)} 
          />
      )}

      <Routes>
        <Route path="/" element={<GalleryPage onResetState={resetToNew} />} />
        <Route path="/gallery" element={<GalleryPage onResetState={resetToNew} />} />
        
        <Route path="/login" element={<GalleryPage onResetState={resetToNew} />} />
        <Route path="/signup" element={<GalleryPage onResetState={resetToNew} />} />

        {/* Route dédiée aux retours d'emails */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        
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
