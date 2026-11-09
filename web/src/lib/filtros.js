/**
 * Filtros de color. Cada filtro se describe con parámetros que sirven para dos cosas:
 *  - vista previa en vivo (CSS `filter` + capas superpuestas)
 *  - foto final (mismas operaciones aplicadas píxel a píxel en un canvas)
 * Así se ve casi igual en todos los navegadores, incluido Safari de iPhone.
 */
export const FILTROS = [
  { id: 'original', nombre: 'Original', css: {} },
  {
    id: 'desechable', nombre: 'Desechable',
    css: { sepia: 0.14, saturate: 1.28, contrast: 1.12, brightness: 1.05 },
    tinte: { color: '#e8a23a', alpha: 0.2, mezcla: 'soft-light' },
    fade: 0.07, grano: 0.55, vineta: 0.45,
  },
  {
    id: 'cosecha', nombre: 'Cosecha',
    css: { sepia: 0.25, saturate: 1.3, contrast: 1.05, brightness: 1.05 },
    tinte: { color: '#e2902b', alpha: 0.22, mezcla: 'soft-light' },
    vineta: 0.25,
  },
  {
    id: 'hojarasca', nombre: 'Cámara antigua',
    css: { sepia: 0.45, saturate: 0.85, contrast: 0.92, brightness: 1.08 },
    tinte: { color: '#b8742a', alpha: 0.18, mezcla: 'soft-light' },
    fade: 0.16, grano: 0.5, vineta: 0.55,
  },
  {
    id: 'polaroid', nombre: 'Polaroid',
    css: { sepia: 0.15, saturate: 0.95, contrast: 0.9, brightness: 1.12 },
    tinte: { color: '#3fa0a6', alpha: 0.22, mezcla: 'soft-light' },
    fade: 0.3, grano: 0.3, vineta: 0.3,
  },
  {
    id: 'sepia', nombre: 'Sepia',
    css: { sepia: 0.95, saturate: 1.0, contrast: 1.08, brightness: 1.02 },
    grano: 0.2, vineta: 0.45,
  },
  {
    id: 'bn', nombre: 'Blanco y negro',
    css: { grayscale: 1, contrast: 1.25, brightness: 1.02 },
    grano: 0.45, vineta: 0.4,
  },
  {
    id: 'atardecer', nombre: 'Atardecer',
    css: { saturate: 1.35, contrast: 1.08, brightness: 1.04 },
    tinte: { color: '#ff7a3d', alpha: 0.3, mezcla: 'soft-light' },
    vineta: 0.3,
  },
  {
    id: 'bosque', nombre: 'Bosque',
    css: { saturate: 0.7, contrast: 1.18, brightness: 0.95 },
    tinte: { color: '#3f6a2c', alpha: 0.42, mezcla: 'soft-light' },
    fade: 0.06, vineta: 0.45,
  },
];

export const filtroPorId = (id) => FILTROS.find((f) => f.id === id) || FILTROS[0];

/** Cadena para la propiedad CSS `filter` (vista previa en vivo). Orden fijo = orden del cálculo final. */
export function cssFiltro(f) {
  const c = f.css || {};
  const partes = [];
  if (c.sepia) partes.push(`sepia(${c.sepia})`);
  if (c.grayscale) partes.push(`grayscale(${c.grayscale})`);
  if (c.saturate != null) partes.push(`saturate(${c.saturate})`);
  if (c.contrast != null) partes.push(`contrast(${c.contrast})`);
  if (c.brightness != null) partes.push(`brightness(${c.brightness})`);
  return partes.join(' ') || 'none';
}

const mult = (A, B) => {
  const R = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) R[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return R;
};

// Matrices definidas en la especificación de CSS Filter Effects
const matSepia = (a) => {
  const s = 1 - a;
  return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s,
          0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s,
          0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s];
};
const matGris = (g) => {
  const s = 1 - g;
  return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s,
          0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s,
          0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s];
};
const matSat = (s) => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
                       0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
                       0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];

/** Aplica color, contraste, brillo, "desvanecido" y grano directamente a los píxeles. */
export function aplicarPixeles(imageData, f) {
  const c = f.css || {};
  let M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (c.sepia) M = mult(matSepia(c.sepia), M);
  if (c.grayscale) M = mult(matGris(c.grayscale), M);
  if (c.saturate != null) M = mult(matSat(c.saturate), M);
  const k = c.contrast ?? 1;
  const b = c.brightness ?? 1;
  const fade = f.fade || 0;
  const lift = 38; // nivel al que se "levantan" los negros
  const grano = (f.grano || 0) * 46;
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], bl = d[i + 2];
    let R = M[0] * r + M[1] * g + M[2] * bl;
    let G = M[3] * r + M[4] * g + M[5] * bl;
    let B = M[6] * r + M[7] * g + M[8] * bl;
    R = ((R - 128) * k + 128) * b;
    G = ((G - 128) * k + 128) * b;
    B = ((B - 128) * k + 128) * b;
    if (fade) {
      R = R * (1 - fade) + lift * fade;
      G = G * (1 - fade) + lift * fade;
      B = B * (1 - fade) + lift * fade;
    }
    if (grano) {
      const n = (Math.random() - 0.5) * grano;
      R += n; G += n; B += n;
    }
    d[i] = R < 0 ? 0 : R > 255 ? 255 : R;
    d[i + 1] = G < 0 ? 0 : G > 255 ? 255 : G;
    d[i + 2] = B < 0 ? 0 : B > 255 ? 255 : B;
  }
  return imageData;
}
