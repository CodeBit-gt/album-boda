// Edita estos datos con los de la boda.
export const BODA = {
  novios: 'Ana & Luis',
  fecha: '14 de noviembre de 2026',
  fechaCorta: '14 · 11 · 2026',   // se usa en los marcos de las fotos
  sello: "’26 11 14",             // sello de fecha estilo cámara antigua (año mes día)
  lema: 'Otoño 2026',
  zona: 'America/Guatemala',      // zona horaria para mostrar la hora de revelado de las fotos
  foto: '',                        // foto de los novios: copia el archivo a web/public y escribe su nombre, p. ej. 'novios.jpg'
  mensaje: 'Cada foto cuenta una parte de este día. Súbelas aquí y todas quedarán en el mismo álbum.',
};

// Cámara desechable: cuántas fotos puede tomar cada invitado (el contador se guarda en su celular)
export const ROLLO = {
  fotos: 36,
  clave: 'boda-rollo-v1', // si cambias esto, todos los contadores vuelven a empezar
  costoVideo: 1,          // cuántas fotos del rollo gasta grabar un video
};

// Videos: se graban comprimidos y cortos para que quepan en el plan gratuito de Google
export const VIDEO = {
  segundos: 15,   // duración máxima al grabar con la cámara del álbum
  kbps: 2500,     // calidad al grabar (≈ 5 MB por 15 s)
  maxMB: 20,      // tamaño máximo de un video elegido de la galería
};

// Marca de quien desarrolló el álbum. Si dejas `url` vacío, el texto se muestra sin enlace y no aparece la invitación final.
export const MARCA = {
  texto: 'Desarrollado por',
  nombre: 'CodeBit',
  url: '', // pega aquí la dirección de tu página, por ejemplo 'https://tu-pagina.com'
};

// URL de Apps Script (variable de entorno VITE_APPS_SCRIPT_URL)
export const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
