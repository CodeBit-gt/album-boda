import { useCallback, useEffect, useState } from 'react';
import { listarFotos, obtenerArchivo, urlDescarga, urlFoto, urlVideo } from '../lib/api';

export default function GalleryView({ refrescarClave }) {
  const [fotos, setFotos] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);
  const [archivo, setArchivo] = useState(null); // File listo para guardar
  const [preparando, setPreparando] = useState(false);
  const [nota, setNota] = useState('');

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
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar, refrescarClave]);

  useEffect(() => {
    if (!abierta) return;
    const onKey = (e) => e.key === 'Escape' && setAbierta(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierta]);

  // Al abrir una foto o video se deja listo el archivo, para que "Guardar" funcione con un solo toque
  useEffect(() => {
    setArchivo(null);
    setNota('');
    if (!abierta) return;
    let vivo = true;
    obtenerArchivo(abierta.id, `boda-${abierta.id.slice(0, 6)}`)
      .then((f) => vivo && setArchivo(f))
      .catch(() => {});
    return () => { vivo = false; };
  }, [abierta]);

  const guardar = async () => {
    let f = archivo;
    if (!f) {
      setPreparando(true);
      try { f = await obtenerArchivo(abierta.id, `boda-${abierta.id.slice(0, 6)}`); } catch { f = null; }
      setPreparando(false);
    }
    if (!f) {
      // Archivos muy pesados: descarga directa desde Google Drive
      setNota(abierta.v ? 'El video se descargará en su celular (en iPhone queda en la app Archivos).' : '');
      window.open(urlDescarga(abierta.id), '_blank');
      return;
    }
    // Menú de compartir del celular: ahí aparece "Guardar imagen" / "Guardar video"
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f] }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setNota('Se guardó en la carpeta de descargas de su celular.');
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-3 pb-8 pt-8">
      <div className="mb-5 flex items-end justify-between px-2">
        <h2 className="font-display text-4xl font-medium">Galería</h2>
        <button type="button" onClick={cargar} className="text-sm text-ocre underline underline-offset-4">Actualizar</button>
      </div>

      {error && <p className="px-2 text-sm text-papel-2">{error}</p>}
      {fotos === null && <p className="px-2 text-papel-2">Cargando…</p>}
      {fotos && fotos.length === 0 && !error && (
        <p className="px-2 font-display text-xl italic text-papel-2">Aún no hay fotos. ¡Sé la primera persona en subir una!</p>
      )}

      {/* Masonry con columnas CSS */}
      <div className="columns-2 gap-2 sm:columns-3">
        {fotos?.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAbierta(f)}
            aria-label={f.v ? 'Abrir video' : 'Abrir foto'}
            className="relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-md bg-roble-2"
          >
            <img
              src={urlFoto(f.id, 500)}
              alt={f.v ? 'Video de la boda' : 'Foto de la boda'}
              loading="lazy"
              className={`block w-full object-cover ${f.v ? 'min-h-40' : 'min-h-24'}`}
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
            {f.v ? (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-black/55 text-2xl">▶</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {abierta && (
        <div role="dialog" aria-modal="true" aria-label="Ampliado" className="fixed inset-0 z-50 flex flex-col items-center bg-roble/95 p-3">
          <button
            type="button"
            className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-roble-2 text-2xl"
            aria-label="Cerrar"
            onClick={() => setAbierta(null)}
          >
            ×
          </button>

          <div className="flex min-h-0 w-full flex-1 items-center justify-center pt-12">
            {abierta.v ? (
              <iframe
                src={urlVideo(abierta.id)}
                title="Video de la boda"
                allow="autoplay; fullscreen"
                className="aspect-video w-full max-w-3xl rounded-md bg-black"
              />
            ) : (
              <img src={urlFoto(abierta.id, 1600)} alt="Foto de la boda" className="max-h-full max-w-full rounded-md object-contain" />
            )}
          </div>

          <div className="w-full max-w-sm pb-3 pt-4 text-center" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={guardar}
              disabled={preparando}
              className="w-full rounded-full bg-ocre py-4 text-lg font-medium text-roble transition active:scale-[.98] disabled:opacity-60"
            >
              {preparando ? 'Preparando…' : abierta.v ? 'Guardar video en mi celular' : 'Guardar foto en mi celular'}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-papel-2">
              {nota || (abierta.v
                ? 'En el menú que se abre, elija “Guardar video”.'
                : 'En el menú que se abre, elija “Guardar imagen”. También puede mantener presionada la foto.')}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
