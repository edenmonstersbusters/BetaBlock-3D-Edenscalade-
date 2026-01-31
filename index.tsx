
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './types';
import './core/i18n'; // Initialisation i18n

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 1. Détection de l'environnement
const isBlob = window.location.protocol === 'blob:';
const isProduction = window.location.hostname === 'betablock-3d.fr' || window.location.hostname === 'www.betablock-3d.fr';

/**
 * LOGIQUE DE ROUTAGE ET REDIRECTION UNIFIÉE
 */
if (isProduction) {
    // EN PRODUCTION : On veut des URLs propres.
    // Si l'utilisateur arrive avec un "#", on le redirige vers l'URL propre.
    if (window.location.hash.startsWith('#/')) {
        const cleanPath = window.location.hash.substring(2); // Enlever "#/"
        window.location.replace(window.location.origin + '/' + cleanPath);
    }
} else if (!isBlob && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    // EN PREVIEW/DEV : On force le "#" pour éviter les 404 au refresh (car pas de config serveur)
    const targetPath = window.location.pathname;
    const targetSearch = window.location.search;
    window.location.replace(window.location.origin + '/#' + targetPath + targetSearch);
}

// 3. Choix du Routeur
const Router = isBlob ? MemoryRouter : (isProduction ? BrowserRouter : HashRouter);
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
