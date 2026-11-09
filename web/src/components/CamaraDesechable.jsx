import { useEffect, useRef, useState } from 'react';
import { BODA, ROLLO, VIDEO } from '../config';
import { cssFiltro, filtroPorId } from '../lib/filtros';
import CapasFiltro from './CapasFiltro';
import { InvitacionMarca } from './Marca';

const filtro = filtroPorId('desechable');

function mensajeError(e) {
  if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError')
    return 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador y vuelve a abrir la cámara.';
  if (e?.name === 'NotFoundError') return 'Este dispositivo no tiene cámara disponible.';
  return 'No se pudo abrir la cámara.';
}

const soportaGrabar = () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
const elegirMime = () =>
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
const mmss = (s) => `0:${String(s).padStart(2, '0')}`;

export default function CamaraDesechable({ restantes, estado, onDisparo, onVideo, onReintentar, onCerrar, onVerGaleria }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const areaRef = useRef(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const [lado, setLado] = useState('environment');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [listo, setListo] = useState(false);
  const [aspecto, setAspecto] = useState(3 / 4);
  const [caja, setCaja] = useState({ w: 0, h: 0 });
  const [flash, setFlash] = useState(false);
  const [modo, setModo] = useState('foto'); // 'foto' | 'video'
  const [grabando, setGrabando] = useState(false);
  const [seg, setSeg] = useState(0);

  const costo = ROLLO.costoVideo;
  const puedeVideo = soportaGrabar();
  const enVideo = modo === 'video';

  const detener = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

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
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      } catch (e) {
        if (!cancelado) setError(mensajeError(e));
      }
    })();
    return () => { cancelado = true; detener(); };
  }, [lado]);

  // Al cerrar la cámara se corta cualquier grabación en curso
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recRef.current?.state === 'recording') {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
  }, []);

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

  const disparar = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || restantes < 1) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    navigator.vibrate?.(25);
    onDisparo(c);
  };

  // ── Video ──────────────────────────────────────────────────
  const parar = () => {
    if (recRef.current?.state === 'recording') recRef.current.stop();
  };

  const empezar = async () => {
    if (restantes < costo || !streamRef.current) return;
    setAviso('');
    try {
      // El micrófono se pide solo al grabar; si no lo dan, el video sale sin sonido
      let audio = null;
      try { audio = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setAviso('Sin micrófono: el video saldrá sin sonido.'); }
      const pistas = [...streamRef.current.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])];
      const mime = elegirMime();
      const rec = new MediaRecorder(new MediaStream(pistas), {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: VIDEO.kbps * 1000,
        audioBitsPerSecond: 96000,
      });
      const partes = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
      rec.onstop = () => {
        audio?.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setGrabando(false);
        const tipo = (rec.mimeType || mime || 'video/mp4').split(';')[0];
        const blob = new Blob(partes, { type: tipo });
        if (blob.size > 0) onVideo(blob, tipo);
      };
      rec.start(1000);
      recRef.current = rec;
      setSeg(0);
      setGrabando(true);
      navigator.vibrate?.(25);
      const t0 = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setSeg(Math.min(s, VIDEO.segundos));
        if (s >= VIDEO.segundos) parar();
      }, 250);
    } catch (e) {
      console.error(e);
      setAviso('Este celular no permite grabar video desde el álbum. Puede subir uno de su galería.');
    }
  };

  const alTocarDisparador = () => {
    if (!enVideo) return disparar();
    return grabando ? parar() : empezar();
  };

  const s = Math.min(caja.w, caja.h);
  const pocas = restantes > 0 && restantes <= 5;
  const bloqueado = enVideo ? restantes < costo : restantes < 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-papel" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCerrar} disabled={grabando} aria-label="Cerrar cámara" className="grid size-11 place-items-center rounded-full bg-white/10 text-2xl disabled:opacity-40">×</button>
        <p className="font-display text-lg italic text-ocre">{BODA.novios}</p>
        <button
          type="button"
          onClick={() => setLado((l) => (l === 'user' ? 'environment' : 'user'))}
          disabled={grabando}
          aria-label="Cambiar de cámara"
          className="grid size-11 place-items-center rounded-full bg-white/10 disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
            <path d="M9 12a3 3 0 0 1 5.2-2M15 12a3 3 0 0 1-5.2 2" />
          </svg>
        </button>
      </div>

      {/* Visor */}
      <div ref={areaRef} className="relative grid min-h-0 flex-1 place-items-center overflow-hidden px-2">
        {error ? (
          <p className="mx-auto max-w-xs px-6 text-center text-papel-2">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-md bg-roble-2" style={{ width: caja.w, height: caja.h, isolation: 'isolate' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={alCargar}
              className="absolute inset-0 size-full object-cover"
              style={{ filter: enVideo ? undefined : cssFiltro(filtro), transform: lado === 'user' ? 'scaleX(-1)' : undefined }}
            />
            {/* El look de película y el sello de fecha son solo para fotos; los videos salen tal cual */}
            {!enVideo && <CapasFiltro filtro={filtro} />}
            {!enVideo && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute font-mono font-bold italic"
                style={{ right: s * 0.05, bottom: s * 0.04, fontSize: s * 0.058, color: '#ff9a2e', textShadow: `0 0 ${s * 0.018}px #ff5a00` }}
              >
                {BODA.sello}
              </span>
            )}
            {grabando && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm" role="timer">
                <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
                {mmss(seg)} / {mmss(VIDEO.segundos)}
              </div>
            )}
            {!listo && <div className="absolute inset-0 grid place-items-center text-papel-2">Abriendo cámara…</div>}
            <div className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-150" style={{ opacity: flash ? 0.85 : 0 }} />
          </div>
        )}
      </div>

      {/* Contador y disparador */}
      <div className="px-6 pt-3" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="mb-3 min-h-6 text-center text-sm">
          {aviso ? (
            <span className="text-ocre">{aviso}</span>
          ) : estado.pendientes > 0 ? (
            <span className="text-papel-2">Enviando {estado.pendientes} al álbum…</span>
          ) : estado.errores > 0 ? (
            <button type="button" onClick={onReintentar} className="text-ocre underline underline-offset-4">
              {estado.errores} sin enviar · Reintentar
            </button>
          ) : estado.ok > 0 ? (
            <span className="text-papel-2">✓ {estado.ok} {estado.ok === 1 ? 'enviado' : 'enviados'}</span>
          ) : null}
        </div>

        {restantes > 0 ? (
          <>
            {puedeVideo && !grabando && (
              <div className="mb-4 flex justify-center gap-2" role="group" aria-label="Foto o video">
                {[['foto', 'Foto'], ['video', 'Video']].map(([id, t]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModo(id)}
                    aria-pressed={modo === id}
                    className={`rounded-full border px-5 py-1.5 text-sm uppercase tracking-[0.14em] ${modo === id ? 'border-ocre bg-ocre text-roble' : 'border-white/25 text-papel'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3" aria-live="polite">
                <span
                  key={restantes}
                  className={`text-6xl font-medium leading-none tabular-nums ${pocas ? 'text-ocre' : 'text-papel'}`}
                  style={{ animation: 'sube .35s ease-out' }}
                >
                  {restantes}
                </span>
                <span className="text-left text-[12px] font-medium uppercase leading-tight tracking-[0.16em] text-papel-2">
                  fotos<br />restantes
                </span>
              </div>
              <button
                type="button"
                onClick={alTocarDisparador}
                disabled={!listo || !!error || bloqueado}
                aria-label={enVideo ? (grabando ? 'Detener video' : 'Grabar video') : 'Tomar foto'}
                className="grid size-20 place-items-center rounded-full border-4 border-papel disabled:opacity-40"
              >
                {enVideo ? (
                  <span className={`bg-red-600 transition-all active:scale-90 ${grabando ? 'size-8 rounded-md' : 'size-14 rounded-full'}`} />
                ) : (
                  <span className="size-14 rounded-full bg-papel transition active:scale-90" />
                )}
              </button>
            </div>
            {enVideo && !grabando && (
              <p className="mt-3 text-center text-xs text-papel-2">
                Videos de hasta {VIDEO.segundos} segundos · cada video gasta {costo} {costo === 1 ? 'foto' : 'fotos'}
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="font-display text-2xl italic">Se acabó tu rollo</p>
            <p className="mt-1 text-sm text-papel-2">Gracias por compartir tus fotos de la boda.</p>
            <button type="button" onClick={onVerGaleria} className="mt-4 rounded-full bg-ocre px-8 py-3 font-medium text-roble">
              Ver la galería
            </button>
            <InvitacionMarca />
          </div>
        )}
      </div>
    </div>
  );
}
