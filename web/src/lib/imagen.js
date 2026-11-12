/**
 * Reduce la foto en el teléfono antes de enviarla:
 * lado mayor máx. 2000 px, JPEG calidad 0.82 (suele quedar en 300–700 KB).
 * Respeta la orientación EXIF.
 */
export async function comprimirImagen(file, maxLado = 2000, calidad = 0.82) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await cargarConImg(file);
  }

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/jpeg', calidad)
  );
  return blob;
}

function cargarConImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Formato de imagen no compatible')); };
    img.src = url;
  });
}

export function blobABase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(blob);
  });
}

/** Carga un Blob/File como canvas (respeta EXIF, lado mayor limitado). Sirve de origen para el editor. */
export async function blobACanvas(blob, maxLado = 2200) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await cargarConImg(blob);
  }
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bitmap.width * escala);
  c.height = Math.round(bitmap.height * escala);
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close?.();
  return c;
}

export const canvasABlob = (canvas, calidad = 0.88) =>
  new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen'))), 'image/jpeg', calidad)
  );

// ── Mosaico borroso ─────────────────────────────────────────────
// Cada foto viaja con un "mosaico" de 6x6 colores (108 bytes). Antes de la hora de revelado es lo ÚNICO que reciben los
// invitados: se ven manchas de color suaves y es imposible reconstruir la foto (no hay detalle que recuperar).
const aBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Devuelve { o, m }: orientación ('p' vertical, 'l' horizontal, 's' cuadrada) y el mosaico en base64. */
export async function mosaico(blob) {
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch { bmp = await cargarConImg(blob); }
  const w = bmp.width, h = bmp.height;
  const o = Math.abs(w / h - 1) < 0.12 ? 's' : w > h ? 'l' : 'p';
  // En dos pasos para promediar bien los colores: primero 48x48, luego 6x6
  const c1 = document.createElement('canvas'); c1.width = 48; c1.height = 48;
  c1.getContext('2d').drawImage(bmp, 0, 0, 48, 48);
  const c2 = document.createElement('canvas'); c2.width = 6; c2.height = 6;
  const x2 = c2.getContext('2d');
  x2.drawImage(c1, 0, 0, 6, 6);
  bmp.close?.();
  const d = x2.getImageData(0, 0, 6, 6).data;
  const bytes = [];
  for (let i = 0; i < 36; i++) bytes.push(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  return { o, m: aBase64Url(bytes) };
}

/** Convierte un mosaico guardado en una imagen 6x6 (el navegador la agranda suavizada). */
export function mosaicoADataUrl(m) {
  try {
    const b64 = m.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    if (bin.length < 108) return '';
    const c = document.createElement('canvas'); c.width = 6; c.height = 6;
    const x = c.getContext('2d');
    const img = x.createImageData(6, 6);
    for (let i = 0; i < 36; i++) {
      img.data[i * 4] = bin.charCodeAt(i * 3);
      img.data[i * 4 + 1] = bin.charCodeAt(i * 3 + 1);
      img.data[i * 4 + 2] = bin.charCodeAt(i * 3 + 2);
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  } catch { return ''; }
}
