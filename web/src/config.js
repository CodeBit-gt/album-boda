// Edita estos datos con los de la boda.
export const BODA = {
  novios: 'Valery & Alex',
  fecha: '5 de diciembre de 2026',
  fechaCorta: '5 · 12 · 2026',    // se usa en los marcos de las fotos
  sello: "’26 12 5",              // sello de fecha estilo cámara antigua (año mes día)
  lema: 'Otoño 2026',
  mensaje: 'Cada foto cuenta una parte de este día. Súbelas aquí y todas quedarán en el mismo álbum.',
};

// URL de Apps Script (variable de entorno VITE_APPS_SCRIPT_URL)
export const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
