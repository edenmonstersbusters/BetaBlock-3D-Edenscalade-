
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
// Import types at the very top of the entry point to ensure global JSX extensions are registered
import './types';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Derive initial entry from hash to support deep linking on initial load
const hashPath = window.location.hash.replace(/^#/, '') || '/';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[hashPath]}>
      <App />
    </MemoryRouter>
  </React.StrictMode>
);
