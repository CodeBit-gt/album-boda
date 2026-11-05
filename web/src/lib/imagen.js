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
