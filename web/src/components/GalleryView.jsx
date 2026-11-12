import { useCallback, useEffect, useMemo, useState } from 'react';
import { BODA } from '../config';
import { listarFotos, obtenerArchivo, urlDescarga, urlFoto, urlVideo } from '../lib/api';
import { mosaicoADataUrl } from '../lib/imagen';

const textoRevela = (ms) => {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: BODA.zona }).format(new Date(ms));
  } catch { return ''; }
};

/** Foto que todavía "se está revelando": solo manchas de color, sin ninguna foto detrás. */
function Borrosa({ f }) {
  const src = useMemo(() => (f.m ? mosaicoADataUrl(f.m) : ''), [f.m]);
  const aspecto = f.v ? '16 / 9' : f.o === 'l' ? '4 / 3' : f.o === 's' ? '1 / 1' : '3 / 4';
  return (
    <div className="relative mb-2 break-inside-avoid overflow-hidden rounded-md bg-roble-2" style={{ aspectRatio: aspecto }} aria-hidden="true">
      {src && <img src={src} alt="" className="absolute inset-0 size-full scale-125 object-cover blur-2xl" />}
      <span className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[0.18em] text-papel/70">
        {f.v ? '▶ Video' : 'Revelando'}
      </span>
    </div>
  );
}

export default function GalleryView({ refrescarClave, clave, onSalir }) {
  const [datos, setDatos] = useState(null); // { files, novios, bloqueado, revela } · null = cargando
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);
  const [archivo, setArchivo] = useState(null); // File listo para guardar
  const [preparando, setPreparando] = useState(false);
  const [nota, setNota] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError('');
      const r = await listarFotos(200, clave);
      if (clave && !r.novios) { onSalir?.(); return; } // la clave dejó de valer
      setDatos(r);
    } catch (e) {
      setError('No se pudo cargar la galería. Revisa tu conexión.');
      setDatos((d) => d ?? { files: [], bloqueado: false, revela: 0 });
    }
  }, [clave]); // eslint-disable-line

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000); // cuando llega la hora de revelado, se actualiza sola
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
    obtenerArchivo(abierta.id, `boda-${abierta.id.slice(0, 6)}`, clave)
      .then((f) => vivo && setArchivo(f))
      .catch(() => {});
    return () => { vivo = false; };
  }, [abierta, clave]);

  const guardar = async () => {
    let f = archivo;
    if (!f) {
      setPreparando(true);
      try { f = await obtenerArchivo(abierta.id, `boda-${abierta.id.slice(0, 6)}`, clave); } catch { f = null; }
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

  const fotos = datos?.files ?? [];
  const bloqueado = !!datos?.bloqueado;
  const cuando = textoRevela(datos?.revela);

  return (
    <section className="mx-auto w-full max-w-3xl px-3 pb-8 pt-8">
      <div className="mb-3 flex items-end justify-between px-2">
        <h2 className="font-display text-4xl font-medium">Galería</h2>
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={cargar} className="text-ocre underline underline-offset-4">Actualizar</button>
          {clave && <button type="button" onClick={onSalir} className="text-papel-2 underline underline-offset-4">Salir</button>}
        </div>
      </div>

      {datos?.novios && (
        <p className="mb-3 px-2 text-xs uppercase tracking-[0.16em] text-ocre">Modo novios · ve todo sin esperar</p>
      )}

      {bloqueado && (
        <div className="mx-2 mb-5 rounded-2xl border border-ocre/30 bg-roble-2/60 px-5 py-4 text-center">
          <p className="font-display text-2xl italic">Las fotos se están revelando</p>
          <p className="mt-1 text-[15px] leading-relaxed text-papel-2">
            {cuando ? `Podrá verlas con claridad el ${cuando}.` : 'Podrá verlas con claridad a partir de las 8 de la mañana.'}
          </p>
          <p className="mt-1 text-sm text-papel-2">
            {fotos.length === 0 ? '' : `Ya hay ${fotos.length} ${fotos.length === 1 ? 'foto o video esperando' : 'fotos y videos esperando'}.`}
          </p>
        </div>
      )}

      {error && <p className="px-2 text-sm text-papel-2">{error}</p>}
      {datos === null && <p className="px-2 text-papel-2">Cargando…</p>}
      {datos && fotos.length === 0 && !error && (
        <p className="px-2 font-display text-xl italic text-papel-2">
          Aún no hay fotos. Aparecerán aquí cuando los invitados empiecen a enviarlas.
        </p>
      )}

      {/* Masonry con columnas CSS */}
      <div className="columns-2 gap-2 sm:columns-3">
        {bloqueado
          ? fotos.map((f, i) => <Borrosa key={`${f.t}-${i}`} f={f} />)
          : fotos.map((f) => (
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
