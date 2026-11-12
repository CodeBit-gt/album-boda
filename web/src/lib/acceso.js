import { useCallback, useState } from 'react';
import { listarFotos } from './api';

const CLAVE_LS = 'boda-clave-novios';
const leer = () => { try { return localStorage.getItem(CLAVE_LS) || ''; } catch { return ''; } };

/**
 * Acceso de los novios a la galería. La clave se comprueba en el servidor (Apps Script);
 * se guarda solo en el celular de los novios, nunca en el código de la web.
 */
export function useAccesoNovios() {
  const [clave, setClave] = useState(leer);

  const entrar = useCallback(async (intento) => {
    const c = intento.trim();
    if (!c) throw new Error('Escribe la clave');
    const r = await listarFotos(1, c);
    if (!r.novios) throw new Error('clave');
    try { localStorage.setItem(CLAVE_LS, c); } catch { /* modo privado */ }
    setClave(c);
  }, []);

  const salir = useCallback(() => {
    try { localStorage.removeItem(CLAVE_LS); } catch { /* nada */ }
    setClave('');
  }, []);

  return { clave, esNovios: !!clave, entrar, salir };
}
