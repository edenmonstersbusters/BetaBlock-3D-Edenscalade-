import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Detection for sandboxed/blob environments where history API is restricted
const isBlob = window.location.protocol === 'blob:';
const Router = isBlob ? MemoryRouter : HashRouter;

// Construct initial entry for MemoryRouter from hash if present
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