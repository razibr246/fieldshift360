import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import AppError from './components/AppError';
import { StoreProvider, bootClimate } from './store';
// Self-hosted variable fonts: Inter for Latin, Noto Sans Bengali for Bangla (only the alphabets a page uses download).
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/noto-sans-bengali/index.css';
import './index.css';

// Hash routing works on any static host (and offline from a single file) without server rewrites.
// The default farmer's NASA climate (Godagari) arrives first; other upazilas load when they are needed.
const render = () => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppError>
      <HashRouter>
        <StoreProvider>
          <App />
        </StoreProvider>
      </HashRouter>
    </AppError>
  </StrictMode>,
);
bootClimate().then(render, render);

// Offline support for the built site (not in development, and not when opened as a single file from disk).
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
