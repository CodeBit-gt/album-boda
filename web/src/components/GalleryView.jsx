import { useCallback, useEffect, useState } from 'react';
import { listarFotos, urlFoto } from '../lib/api';

export default function GalleryView({ refrescarClave }) {
  const [fotos, setFotos] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError('');
      setFotos(await listarFotos(200));
    } catch (e) {
      setError('No se pudo cargar la galería. Revisa tu conexión.');
      setFotos((f) => f ?? []);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000); // se actualiza sola cada 30 s
    return () => clearInterval(t);
  }, [cargar, refrescarClave]);

  useEffect(() => {
    if (!abierta) return;
    const onKey = (e) => e.key === 'Escape' && setAbierta(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierta]);

  return (
    <section className="mx-auto w-full max-w-3xl px-3 pb-8 pt-8">
      <div className="mb-5 flex items-end justify-between px-2">
        <h2 className="font-display text-4xl font-medium">Galería</h2>
        <button type="button" onClick={cargar} className="text-sm text-ocre underline underline-offset-4">
          Actualizar
        </button>
      </div>

      {error && <p className="px-2 text-sm text-papel-2">{error}</p>}
      {fotos === null && <p className="px-2 text-papel-2">Cargando fotos…</p>}
      {fotos && fotos.length === 0 && !error && (
        <p className="px-2 font-display text-xl italic text-papel-2">
          Aún no hay fotos. ¡Sé la primera persona en subir una!
        </p>
      )}

      {/* Masonry con columnas CSS */}
      <div className="columns-2 gap-2 sm:columns-3">
        {fotos?.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAbierta(f)}
            className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-md bg-roble-2"
          >
            <img
              src={urlFoto(f.id, 500)}
              alt="Foto de la boda"
              loading="lazy"
              className="block w-full min-h-24 object-cover"
            />
          </button>
        ))}
      </div>

      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          className="fixed inset-0 z-50 grid place-items-center bg-roble/95 p-3"
          onClick={() => setAbierta(null)}
        >
          <img src={urlFoto(abierta.id, 1600)} alt="Foto de la boda" className="max-h-[88vh] max-w-full rounded-md object-contain" />
          <button
            type="button"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-roble-2 text-2xl"
            aria-label="Cerrar"
            onClick={() => setAbierta(null)}
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
}
