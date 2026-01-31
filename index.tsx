
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 1. Détection de l'environnement
const isBlob = window.location.protocol === 'blob:';
const isProduction = window.location.hostname === 'betablock-3d.fr' || window.location.hostname === 'www.betablock-3d.fr';

/**
 * LOGIQUE DE REDIRECTION INTELLIGENTE (Fix 404 / Deep Linking)
 * 
 * Si un utilisateur accède à une URL "propre" (ex: /gallery) dans un environnement 
 * qui ne supporte pas le rafraîchissement côté serveur (AI Studio, Localhost...), 
 * on le redirige vers la version "hashée" correspondante (/#/gallery).
 */
if (!isProduction && !isBlob && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    const targetPath = window.location.pathname;
    const targetSearch = window.location.search;
    // On utilise replace pour ne pas polluer l'historique de navigation
    window.location.replace(window.location.origin + '/#' + targetPath + targetSearch);
}

// 3. Choix Stratégique du Routeur
const Router = isBlob ? MemoryRouter : (isProduction ? BrowserRouter : HashRouter);

// Pour MemoryRouter uniquement (Sandboxes strictes)
const initialEntry = isBlob ? (window.location.hash.slice(1) || '/') : undefined;

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <Router {...(isBlob ? { initialEntries: [initialEntry] } : {})}>
        <App />
      </Router>
    </HelmetProvider>
  </React.StrictMode>
);
