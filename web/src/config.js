// Edita estos datos con los de la boda.
export const BODA = {
  novios: 'Ana & Luis',
  fecha: '14 de noviembre de 2026',
  fechaCorta: '14 · 11 · 2026',   // se usa en los marcos de las fotos
  sello: "’26 11 14",             // sello de fecha estilo cámara antigua (año mes día)
  lema: 'Otoño 2026',
  mensaje: 'Cada foto cuenta una parte de este día. Súbelas aquí y todas quedarán en el mismo álbum.',
};

// URL de Apps Script (variable de entorno VITE_APPS_SCRIPT_URL)
export const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
