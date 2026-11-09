import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { enviarFoto, enviarVideo } from './api';
import { blobABase64 } from './imagen';

let n = 0;
const nuevoId = () => `e${Date.now()}-${n++}`;

/** Cola de envío en segundo plano: cada foto o video se sube solo, de uno en uno, con reintentos. */
export function useEnvios(onSubida) {
  const [envios, setEnvios] = useState([]); // { id, blob, meta, estado: 'enviando' | 'ok' | 'error' }
  const cola = useRef(Promise.resolve());

  const marcar = (id, estado, borrarBlob = false) =>
    setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, estado, blob: borrarBlob ? null : e.blob } : e)));

  const subir = useCallback(async (id, blob, meta) => {
    try {
      const base64 = await blobABase64(blob);
      if (meta.tipo === 'video') await enviarVideo({ mime: meta.mime, base64 });
      else await enviarFoto({ nombre: `${Date.now()}.jpg`, mime: 'image/jpeg', base64 });
      marcar(id, 'ok', true);
      onSubida?.();
    } catch (err) {
      console.error(err);
      marcar(id, 'error');
    }
  }, [onSubida]);

  /** meta: { tipo: 'foto' | 'video', mime } */
  const agregar = useCallback((blob, meta = { tipo: 'foto', mime: 'image/jpeg' }) => {
    const id = nuevoId();
    setEnvios((prev) => [...prev, { id, blob, meta, estado: 'enviando' }]);
    cola.current = cola.current.then(() => subir(id, blob, meta));
  }, [subir]);

  const reintentar = useCallback(() => {
    setEnvios((prev) => {
      prev.filter((e) => e.estado === 'error').forEach((e) => {
        cola.current = cola.current.then(() => subir(e.id, e.blob, e.meta));
      });
      return prev.map((e) => (e.estado === 'error' ? { ...e, estado: 'enviando' } : e));
    });
  }, [subir]);

  const estado = useMemo(() => ({
    pendientes: envios.filter((e) => e.estado === 'enviando').length,
    errores: envios.filter((e) => e.estado === 'error').length,
    ok: envios.filter((e) => e.estado === 'ok').length,
  }), [envios]);

  useEffect(() => {
    if (!estado.pendientes && !estado.errores) return;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [estado.pendientes, estado.errores]);

  return { agregar, reintentar, estado };
}
