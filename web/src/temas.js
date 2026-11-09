// Paletas de colores del álbum. Para cambiar de paleta, cambia TEMA (abajo) por: 'boda', 'otono', 'bosque', 'burdeos' o 'noche'.
// Para colores propios, edita 'personalizado' y pon TEMA = 'personalizado'.
//   roble = fondo · roble-2 = tarjetas y barras · vino = botón principal · ocre = acento dorado
//   hoja = confirmaciones · papel = texto · papel-2 = texto secundario
export const TEMAS = {
  // Paleta de la boda: café claro #B88C64 · vino #7A3045 · terracota #B75D3E · mostaza #C7943D · verde oliva #556B2F · verde oscuro #2F4F2F
  boda:    { nombre: 'Boda', roble: '#1d2e1f', 'roble-2': '#2f4f2f', vino: '#7a3045', ocre: '#c7943d', hoja: '#556b2f', papel: '#f3e9d8', 'papel-2': '#d3b995',
             acentos: ['#b88c64', '#7a3045', '#b75d3e', '#c7943d', '#556b2f', '#2f4f2f'] },
  otono:   { nombre: 'Otoño',   roble: '#2b1b16', 'roble-2': '#3a2620', vino: '#7a2a3a', ocre: '#d9a441', hoja: '#7b8159', papel: '#f1e6d3', 'papel-2': '#bfae96' },
  bosque:  { nombre: 'Bosque',  roble: '#14241c', 'roble-2': '#1f3328', vino: '#7a2a3a', ocre: '#d4b25a', hoja: '#8aa07a', papel: '#eef0e4', 'papel-2': '#aab7a4' },
  burdeos: { nombre: 'Burdeos', roble: '#2a0f18', 'roble-2': '#3b1824', vino: '#9a3350', ocre: '#e0b15a', hoja: '#8a8f5e', papel: '#f6e9df', 'papel-2': '#c3a9a3' },
  noche:   { nombre: 'Noche',   roble: '#101a2e', 'roble-2': '#19263f', vino: '#8b3a4f', ocre: '#d9b36a', hoja: '#7f9a86', papel: '#f0ece4', 'papel-2': '#aeb4c0' },
};
TEMAS.personalizado = { ...TEMAS.otono, nombre: 'Personalizado' };

export const TEMA = 'boda';

export const paleta = TEMAS[TEMA] || TEMAS.otono;
