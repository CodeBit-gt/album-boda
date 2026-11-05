import { API_URL } from '../config';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sube una foto (base64 JPEG) a Apps Script. Reintenta 3 veces con espera creciente. */
export async function enviarFoto({ nombre, mime, base64 }) {
  if (!API_URL) throw new Error('Falta configurar VITE_APPS_SCRIPT_URL');

  let ultimoError;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        // text/plain evita el preflight CORS que Apps Script no soporta
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ nombre, mime, data: base64 }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al guardar la foto');
      return json;
    } catch (err) {
      ultimoError = err;
      if (intento < 3) await esperar(1500 * intento);
    }
  }
  throw ultimoError;
}

/** Lista de fotos más recientes: [{ id, t }] */
export async function listarFotos(limite = 200) {
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}?limit=${limite}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'No se pudo cargar la galería');
  return json.files;
}

export const urlFoto = (id, ancho = 600) =>
  `https://lh3.googleusercontent.com/d/${id}=w${ancho}`;
