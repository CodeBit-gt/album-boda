import { aplicarPixeles, filtroPorId } from './filtros';
import { marcoPorId } from './marcos';
import { crearCanvas } from './canvas';

/** Espera a que las tipografías de los marcos estén listas antes de dibujar texto en el canvas. */
export async function prepararFuentes() {
  try {
    await Promise.all([
      document.fonts.load('500 40px Caveat', 'Valery & Alex 0123456789'),
      document.fonts.load('italic 600 40px "Cormorant Garamond"', 'Valery & Alex'),
      document.fonts.load('400 30px Jost', 'Otoño 2026'),
      document.fonts.load('500 30px Jost', 'Otoño 2026'),
    ]);
  } catch { /* si falla, se usa la tipografía de respaldo */ }
}

/**
 * Aplica filtro + marco a una imagen (canvas, bitmap o <img>) y devuelve un canvas nuevo.
 * `maxLado` limita el lado mayor de la foto (sin contar el marco).
 */
export function renderizar(origen, filtroId, marcoId, maxLado) {
  const f = filtroPorId(filtroId);
  const m = marcoPorId(marcoId);

  const esc = Math.min(1, maxLado / Math.max(origen.width, origen.height));
  const w = Math.round(origen.width * esc);
  const h = Math.round(origen.height * esc);
  const s = Math.min(w, h);

  // 1) Foto con filtro
  const foto = crearCanvas(w, h);
  const fc = foto.getContext('2d', { willReadFrequently: true });
  fc.drawImage(origen, 0, 0, w, h);

  if (f.id !== 'original') {
    const datos = fc.getImageData(0, 0, w, h);
    aplicarPixeles(datos, f);
    fc.putImageData(datos, 0, 0);

    if (f.tinte) {
      fc.globalCompositeOperation = f.tinte.mezcla;
      fc.globalAlpha = f.tinte.alpha;
      fc.fillStyle = f.tinte.color;
      fc.fillRect(0, 0, w, h);
      fc.globalCompositeOperation = 'source-over';
      fc.globalAlpha = 1;
    }
    if (f.vineta) {
      const g = fc.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0.55, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${f.vineta * 0.8})`);
      fc.fillStyle = g;
      fc.fillRect(0, 0, w, h);
    }
  }

  if (m.id === 'ninguno') return foto;

  // 2) Marco alrededor
  const p = m.pad(s);
  const W = Math.round(w + p.l + p.r);
  const H = Math.round(h + p.t + p.b);
  const salida = crearCanvas(W, H);
  const ctx = salida.getContext('2d');
  m.fondo?.(ctx, W, H, s);
  const rect = { x: Math.round(p.l), y: Math.round(p.t), w, h };
  ctx.drawImage(foto, rect.x, rect.y);
  m.deco?.(ctx, W, H, rect, s);
  return salida;
}
