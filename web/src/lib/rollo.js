import { useCallback, useRef, useState } from 'react';
import { ROLLO } from '../config';

const leer = () => {
  try {
    const v = localStorage.getItem(ROLLO.clave);
    if (v === null) return ROLLO.fotos;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), ROLLO.fotos) : ROLLO.fotos;
  } catch {
    return ROLLO.fotos;
  }
};
const guardar = (n) => {
  try { localStorage.setItem(ROLLO.clave, String(n)); } catch { /* modo privado: no se guarda */ }
};

/** Contador de fotos restantes (como una cámara desechable). Se guarda en el celular de cada invitado. */
export function useRollo() {
  const ref = useRef(leer());
  const [restantes, setRestantes] = useState(ref.current);

  const consumir = useCallback((n = 1) => {
    if (ref.current < n) return false;
    ref.current -= n;
    guardar(ref.current);
    setRestantes(ref.current);
    return true;
  }, []);

  const devolver = useCallback((n = 1) => {
    ref.current = Math.min(ROLLO.fotos, ref.current + n);
    guardar(ref.current);
    setRestantes(ref.current);
  }, []);

  return { restantes, total: ROLLO.fotos, consumir, devolver };
}
