
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

// 1. Détection de l'environnement Blob (Sandboxes stricts)
const isBlob = window.location.protocol === 'blob:';

// 2. Détection de la Production (Domaine réel)
const isProduction = window.location.hostname === 'betablock-3d.fr' || window.location.hostname === 'www.betablock-3d.fr';

// 3. Choix Stratégique du Routeur
// - Blob -> MemoryRouter (Seule option viable)
// - Production -> BrowserRouter (SEO Friendly, URLs propres /view/123)
// - Preview/Local -> HashRouter (Compatible partout, supporte le refresh sans config serveur)
const Router = isBlob ? MemoryRouter : (isProduction ? BrowserRouter : HashRouter);

// Pour MemoryRouter uniquement
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
