import { BODA } from '../config';

const COLORES = { papel: '#f6f0e3', roble: '#2b1b16', vino: '#52192a', ocre: '#d9a441', hoja: '#7b8159', ladrillo: '#a4502a', rojo: '#8e2f2f' };

// Hoja de otoño dibujada con curvas. (x, y) = centro, t = tamaño, ang = giro en radianes.
function hoja(ctx, x, y, t, ang, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, -t);
  ctx.bezierCurveTo(t * 0.95, -t * 0.4, t * 0.75, t * 0.6, 0, t * 0.95);
  ctx.bezierCurveTo(-t * 0.75, t * 0.6, -t * 0.95, -t * 0.4, 0, -t);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.28)';
  ctx.lineWidth = Math.max(1, t * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -t * 0.9);
  ctx.lineTo(0, t * 1.25);
  ctx.moveTo(0, t * 0.1); ctx.lineTo(t * 0.38, -t * 0.22);
  ctx.moveTo(0, t * 0.1); ctx.lineTo(-t * 0.38, -t * 0.22);
  ctx.moveTo(0, t * 0.5); ctx.lineTo(t * 0.3, t * 0.2);
  ctx.moveTo(0, t * 0.5); ctx.lineTo(-t * 0.3, t * 0.2);
  ctx.stroke();
  ctx.restore();
}

function texto(ctx, str, x, y, fuente, color, align = 'center') {
  ctx.font = fuente;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/**
 * Cada marco define:
 *  pad(s)            -> márgenes alrededor de la foto (s = lado corto de la foto)
 *  fondo(ctx,W,H,s)  -> se pinta antes de colocar la foto
 *  deco(ctx,W,H,r,s) -> se pinta encima (r = rectángulo donde quedó la foto)
 */
export const MARCOS = [
  { id: 'ninguno', nombre: 'Sin marco', pad: () => ({ t: 0, r: 0, b: 0, l: 0 }) },

  {
    id: 'instax', nombre: 'Instax',
    pad: (s) => ({ t: s * 0.055, r: s * 0.055, b: s * 0.24, l: s * 0.055 }),
    fondo(ctx, W, H) {
      ctx.fillStyle = COLORES.papel;
      ctx.fillRect(0, 0, W, H);
    },
    deco(ctx, W, H, r, s) {
      ctx.strokeStyle = 'rgba(58,38,32,.22)';
      ctx.lineWidth = Math.max(1, s * 0.004);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(120,100,70,.25)';
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      const base = r.y + r.h;
      const zona = H - base;
      texto(ctx, BODA.novios, W / 2, base + zona * 0.42, `500 ${s * 0.1}px Caveat, cursive`, '#3a2620');
      texto(ctx, BODA.fechaCorta, W / 2, base + zona * 0.76, `500 ${s * 0.055}px Caveat, cursive`, '#7a2a3a');
    },
  },

  {
    id: 'pelicula', nombre: 'Película 35 mm',
    pad: (s) => ({ t: s * 0.12, r: s * 0.035, b: s * 0.15, l: s * 0.035 }),
    fondo(ctx, W, H) {
      ctx.fillStyle = '#17100d';
      ctx.fillRect(0, 0, W, H);
    },
    deco(ctx, W, H, r, s) {
      const hw = s * 0.05, hh = s * 0.032, paso = s * 0.095;
      ctx.fillStyle = 'rgba(241,230,211,.92)';
      const fila = (cy) => {
        for (let x = paso / 2; x < W; x += paso) {
          ctx.beginPath();
          ctx.roundRect(x - hw / 2, cy - hh / 2, hw, hh, hh * 0.3);
          ctx.fill();
        }
      };
      fila(r.y / 2);
      fila(H - (H - (r.y + r.h)) * 0.28);
      const cy = r.y + r.h + (H - (r.y + r.h)) * 0.42;
      texto(ctx, `▸ 14   ${BODA.novios.toUpperCase()}   ${BODA.lema.toUpperCase()}`, W / 2, cy, `500 ${s * 0.034}px Jost, sans-serif`, '#e8a13a');
      ctx.strokeStyle = 'rgba(232,161,58,.55)';
      ctx.lineWidth = Math.max(1, s * 0.003);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    },
  },

  {
    id: 'hojas', nombre: 'Hojas de otoño',
    pad: (s) => ({ t: s * 0.06, r: s * 0.06, b: s * 0.14, l: s * 0.06 }),
    fondo(ctx, W, H) {
      ctx.fillStyle = '#f3e8d4';
      ctx.fillRect(0, 0, W, H);
    },
    deco(ctx, W, H, r, s) {
      ctx.strokeStyle = COLORES.ocre;
      ctx.lineWidth = Math.max(1.5, s * 0.004);
      const o = s * 0.016;
      ctx.strokeRect(r.x - o, r.y - o, r.w + o * 2, r.h + o * 2);

      const u = s * 0.095;
      const racimo = (cx, cy, giro) => {
        const lista = [
          [0, 0, 1.0, -0.6, COLORES.ladrillo],
          [0.9, 0.5, 0.8, 0.5, COLORES.ocre],
          [-0.3, 1.0, 0.85, -1.4, COLORES.rojo],
          [1.5, -0.2, 0.65, 1.2, COLORES.hoja],
          [0.5, 1.6, 0.6, 2.3, COLORES.ocre],
        ];
        for (const [dx, dy, k, a, c] of lista) hoja(ctx, cx + dx * u * giro, cy + dy * u * giro, u * k, a * giro, c);
      };
      racimo(r.x - o * 0.4, r.y - o * 0.4, 1);
      racimo(r.x + r.w + o * 0.4, r.y + r.h + o * 0.4, -1);
      const zona = H - (r.y + r.h);
      texto(ctx, BODA.novios, W / 2, r.y + r.h + zona * 0.58, `italic 600 ${s * 0.06}px "Cormorant Garamond", serif`, COLORES.vino);
    },
  },

  {
    id: 'dorado', nombre: 'Vino y oro',
    pad: (s) => ({ t: s * 0.075, r: s * 0.075, b: s * 0.21, l: s * 0.075 }),
    fondo(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#5e1f31');
      g.addColorStop(1, '#3f1220');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    },
    deco(ctx, W, H, r, s) {
      ctx.strokeStyle = COLORES.ocre;
      ctx.lineWidth = Math.max(1.5, s * 0.005);
      const o = s * 0.02;
      ctx.strokeRect(r.x - o, r.y - o, r.w + o * 2, r.h + o * 2);
      ctx.lineWidth = Math.max(1, s * 0.0022);
      const e = s * 0.016;
      ctx.strokeRect(e, e, W - e * 2, H - e * 2);
      // rombos en las esquinas del marco interior
      const d = s * 0.016;
      ctx.fillStyle = COLORES.ocre;
      for (const [cx, cy] of [[r.x - o, r.y - o], [r.x + r.w + o, r.y - o], [r.x - o, r.y + r.h + o], [r.x + r.w + o, r.y + r.h + o]]) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy);
        ctx.closePath(); ctx.fill();
      }
      const base = r.y + r.h + o;
      const zona = H - base;
      texto(ctx, BODA.novios, W / 2, base + zona * 0.4, `italic 600 ${s * 0.08}px "Cormorant Garamond", serif`, COLORES.ocre);
      texto(ctx, BODA.fechaCorta, W / 2, base + zona * 0.68, `400 ${s * 0.032}px Jost, sans-serif`, '#e9d3a0');
    },
  },

  {
    id: 'sello', nombre: 'Sello de fecha',
    pad: () => ({ t: 0, r: 0, b: 0, l: 0 }),
    deco(ctx, W, H, r, s) {
      ctx.save();
      ctx.shadowColor = '#ff5a00';
      ctx.shadowBlur = s * 0.018;
      texto(ctx, BODA.sello, W - s * 0.05, H - s * 0.06, `italic 700 ${s * 0.058}px "Courier New", monospace`, '#ff9a2e', 'right');
      ctx.restore();
    },
  },
];

export const marcoPorId = (id) => MARCOS.find((m) => m.id === id) || MARCOS[0];
