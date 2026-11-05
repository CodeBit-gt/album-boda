import { useEffect, useRef, useState } from 'react';
import { FILTROS, cssFiltro, filtroPorId } from '../lib/filtros';
import { canvasABlob } from '../lib/imagen';

function mensajeError(e) {
  if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError')
    return 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador o elige una foto de tu galería.';
  if (e?.name === 'NotFoundError') return 'Este dispositivo no tiene cámara disponible.';
  return 'No se pudo abrir la cámara. Puedes elegir una foto de tu galería.';
}

/** Capas que reproducen el filtro sobre el video (fade + tinte + viñeta). Mismo orden que la foto final. */
export function CapasFiltro({ filtro }) {
  return (
    <>
      {filtro.fade > 0 && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'rgb(38,38,38)', opacity: filtro.fade }} />
      )}
      {filtro.tinte && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: filtro.tinte.color, opacity: filtro.tinte.alpha, mixBlendMode: filtro.tinte.mezcla }}
        />
      )}
      {filtro.vineta > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle farthest-corner at 50% 50%, transparent 55%, rgba(0,0,0,${filtro.vineta * 0.8}) 100%)` }}
        />
      )}
    </>
  );
}

export default function Camara({ filtroInicial = 'original', onFoto, onCerrar, onGaleria }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const areaRef = useRef(null);
  const [lado, setLado] = useState('environment'); // environment = trasera, user = frontal
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [aspecto, setAspecto] = useState(3 / 4);
  const [caja, setCaja] = useState({ w: 0, h: 0 });
  const [filtroId, setFiltroId] = useState(filtroInicial);
  const filtro = filtroPorId(filtroId);

  const detener = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Abrir la cámara (y reabrirla al cambiar de lado)
  useEffect(() => {
    let cancelado = false;
    setListo(false);
    setError('');
    (async () => {
      try {
        detener();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: lado }, width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play().catch(() => {});
      } catch (e) {
        if (!cancelado) setError(mensajeError(e));
      }
    })();
    return () => { cancelado = true; detener(); };
  }, [lado]);

  // Calcular la caja más grande con la proporción real del video que cabe en pantalla
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      let w = width, h = width / aspecto;
      if (h > height) { h = height; w = h * aspecto; }
      setCaja({ w: Math.floor(w), h: Math.floor(h) });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspecto]);

  const alCargar = () => {
    const v = videoRef.current;
    if (v.videoWidth && v.videoHeight) setAspecto(v.videoWidth / v.videoHeight);
    setListo(true);
  };

  const disparar = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    navigator.vibrate?.(25);
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const blob = await canvasABlob(c, 0.95);
    onFoto(blob, filtroId);
  };

  const espejo = lado === 'user';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-papel" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCerrar} aria-label="Cerrar cámara" className="grid size-11 place-items-center rounded-full bg-white/10 text-2xl">×</button>
        <p className="font-display text-lg italic text-ocre">{filtro.nombre}</p>
        <button
          type="button"
          onClick={() => setLado((l) => (l === 'user' ? 'environment' : 'user'))}
          aria-label="Cambiar de cámara"
          className="grid size-11 place-items-center rounded-full bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
            <path d="M9 12a3 3 0 0 1 5.2-2M15 12a3 3 0 0 1-5.2 2" />
          </svg>
        </button>
      </div>

      <div ref={areaRef} className="relative grid min-h-0 flex-1 place-items-center overflow-hidden">
        {error ? (
          <div className="mx-auto max-w-xs px-6 text-center">
            <p className="text-papel-2">{error}</p>
            <button type="button" onClick={onGaleria} className="mt-5 rounded-full bg-ocre px-6 py-3 font-medium text-roble">
              Elegir de la galería
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden bg-roble-2" style={{ width: caja.w, height: caja.h, isolation: 'isolate' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={alCargar}
              className="absolute inset-0 size-full object-cover"
              style={{ filter: cssFiltro(filtro), transform: espejo ? 'scaleX(-1)' : undefined }}
            />
            <CapasFiltro filtro={filtro} />
            {!listo && <div className="absolute inset-0 grid place-items-center text-papel-2">Abriendo cámara…</div>}
          </div>
        )}
      </div>

      {/* Filtros en vivo */}
      <ul className="sin-barra flex gap-2 overflow-x-auto px-4 py-3" aria-label="Filtros">
        {FILTROS.map((f) => (
          <li key={f.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setFiltroId(f.id)}
              aria-pressed={f.id === filtroId}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                f.id === filtroId ? 'border-ocre bg-ocre text-roble' : 'border-white/20 text-papel'
              }`}
            >
              {f.nombre}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-8 pb-6 pt-2" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={onGaleria} aria-label="Elegir de la galería" className="grid size-14 place-items-center rounded-xl bg-white/10">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" />
          </svg>
        </button>
        <button
          type="button"
          onClick={disparar}
          disabled={!listo || !!error}
          aria-label="Tomar foto"
          className="grid size-20 place-items-center rounded-full border-4 border-papel disabled:opacity-40"
        >
          <span className="size-14 rounded-full bg-papel transition active:scale-90" />
        </button>
        <span className="size-14" aria-hidden="true" />
      </div>
    </div>
  );
}
