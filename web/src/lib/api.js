import { API_URL } from '../config';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function conReintentos(fn) {
  let ultimoError;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (intento < 3) await esperar(1500 * intento);
    }
  }
  throw ultimoError;
}

/** Lee la respuesta del servidor; si Google devuelve una página HTML de error (p. ej. archivo demasiado pesado), lo dice claro. */
async function leerJson(res) {
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(texto.trim().startsWith('<') ? 'PAGINA_HTML' : 'RESPUESTA_INVALIDA');
  }
}

function comprobar() {
  if (!API_URL) throw new Error('Falta configurar VITE_APPS_SCRIPT_URL');
}

/** Sube una foto (base64 JPEG). */
export function enviarFoto({ nombre, mime, base64 }) {
  comprobar();
  return conReintentos(async () => {
    const res = await fetch(API_URL, {
      method: 'POST',
      // text/plain evita el preflight CORS que Apps Script no soporta
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ nombre, mime, data: base64 }),
    });
    const json = await leerJson(res);
    if (!json.ok) throw new Error(json.error || 'Error al guardar la foto');
    return json;
  });
}

/** Sube un video: el tipo va en la dirección y el cuerpo es el base64 solo (menos memoria en Apps Script). */
export function enviarVideo({ mime, base64 }) {
  comprobar();
  return conReintentos(async () => {
    const res = await fetch(`${API_URL}?accion=video&mime=${encodeURIComponent(mime)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: base64,
    });
    const json = await leerJson(res);
    if (!json.ok) throw new Error(json.error || 'Error al guardar el video');
    return json;
  });
}

/** Lista de fotos y videos más recientes: [{ id, t, v? }] (v = 1 si es video) */
export async function listarFotos(limite = 200, clave = '') {
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}?limit=${limite}&clave=${encodeURIComponent(clave)}`);
  const json = await leerJson(res);
  if (!json.ok) throw new Error(json.error || 'No se pudo cargar la galería'); // error === 'clave': clave incorrecta
  return json.files;
}

/** Mensaje de un invitado para los novios (se guarda como archivo de texto en Drive). */
export function enviarMensaje({ nombre, texto }) {
  comprobar();
  return conReintentos(async () => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'mensaje', nombre, texto }),
    });
    const json = await leerJson(res);
    if (!json.ok) throw new Error(json.error || 'No se pudo enviar el mensaje');
    return json;
  });
}

/** Descarga un archivo del álbum como File (para guardarlo en el celular). Falla con 'grande' si es muy pesado. */
export async function obtenerArchivo(id, nombreBase, clave = '') {
  comprobar();
  const res = await fetch(`${API_URL}?accion=obtener&id=${encodeURIComponent(id)}&clave=${encodeURIComponent(clave)}`);
  const json = await leerJson(res);
  if (!json.ok) throw new Error(json.error || 'No se pudo descargar');
  const bin = atob(json.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = json.mime.includes('png') ? 'png' : json.mime.startsWith('image/') ? 'jpg' : json.mime.includes('webm') ? 'webm' : json.mime.includes('quicktime') ? 'mov' : 'mp4';
  return new File([bytes], `${nombreBase}.${ext}`, { type: json.mime });
}

/** Traduce el error técnico a algo que el invitado (o tú) pueda entender. */
export function motivoError(err) {
  const m = String(err?.message || err || '');
  if (m === 'PAGINA_HTML')
    return 'Google respondió con una página de error: el archivo suele ser demasiado pesado. Pruebe con un video más corto';
  if (m === 'RESPUESTA_INVALIDA') return 'El servidor respondió algo inesperado. Reintente en unos minutos';
  if (/SyntaxError|Unexpected token|not valid JSON/i.test(m))
    return 'El servidor no reconoce el envío: falta actualizar Apps Script (nueva versión)';
  if (/Failed to fetch|Load failed|NetworkError|network/i.test(m))
    return 'Sin conexión, o el archivo es muy pesado';
  if (/demasiado grande/i.test(m)) return 'El archivo es demasiado grande';
  return m.slice(0, 90) || 'Error desconocido';
}

export const urlFoto = (id, ancho = 600) => `https://lh3.googleusercontent.com/d/${id}=w${ancho}`;
export const urlVideo = (id) => `https://drive.google.com/file/d/${id}/preview`;
export const urlDescarga = (id) => `https://drive.google.com/uc?export=download&id=${id}`;
