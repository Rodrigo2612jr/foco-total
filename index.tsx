
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppMain';

// Service Worker:
// - Em DEV (vite dev): desregistrar qualquer SW antigo pra não cachear código novo.
// - Em PROD (build): registrar pra funcionar como PWA offline.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed, app works without it
      });
    });
  } else {
    // Dev: limpa SW antigos e caches pra evitar servir versões travadas
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => undefined);
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => undefined);
    }
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
