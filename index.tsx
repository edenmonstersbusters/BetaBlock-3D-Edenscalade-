
import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Import MemoryRouter from 'react-router' instead of 'react-router-dom' to resolve export issues in some environments.
import { MemoryRouter } from 'react-router';
import App from './App';
import './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Try to retrieve the current hash to initialize the router correctly.
// This allows shared links (e.g. /#/view/...) to work on initial load
// even if we use MemoryRouter to prevent runtime location crashes.
const getInitialRoute = () => {
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      return hash.substring(1);
    }
    return '/';
  } catch (e) {
    console.warn("Could not read location hash", e);
    return '/';
  }
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[getInitialRoute()]}>
      <App />
    </MemoryRouter>
  </React.StrictMode>
);