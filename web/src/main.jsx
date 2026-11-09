import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/caveat/500.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import './index.css';
import App from './App.jsx';
import { paleta } from './temas';

// Aplica la paleta elegida en temas.js antes de pintar la pantalla
for (const [clave, valor] of Object.entries(paleta)) {
  if (clave !== 'nombre' && clave !== 'acentos') document.documentElement.style.setProperty(`--color-${clave}`, valor);
}
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paleta.roble);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
