import { useEffect, useRef, useState } from 'react';
import { BODA, ROLLO, VIDEO } from '../config';
import { paleta } from '../temas';
import { enviarFoto, enviarVideo, motivoError } from '../lib/api';
import { blobABase64, blobACanvas, canvasABlob, comprimirImagen } from '../lib/imagen';
import { renderizar } from '../lib/render';
import { useRollo } from '../lib/rollo';
import { useEnvios } from '../lib/useEnvios';
import Hoja from './Hoja';
import CamaraDesechable from './CamaraDesechable';
import Editor from './Editor';
import MensajeNovios from './MensajeNovios';

let contador = 0;
const nuevoId = () => `${Date.now()}-${contador++}`;

// La cámara propia necesita HTTPS (o localhost). Si no está disponible se usa la cámara del sistema.
const camaraDisponible = () =>
  typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

const esVideo = (f) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name);
const mb = (bytes) => Math.round(bytes / 1048576);

const abiertaComoApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export default function UploadView({ onSubida, onIrAGaleria, puedeVerGaleria = false }) {
  const galeriaRef = useRef(null);
  const capturaRef = useRef(null);
  const proceso = useRef(Promise.resolve()); // revela las fotos de una en una
  const rollo = useRollo();
  const envios = useEnvios(onSubida);

  // Fotos elegidas de la galería (se envían con el botón "Enviar")
  const [items, setItems] = useState([]); // { id, file, url, estado, lista }
  const [panel, setPanel] = useState(null); // null | {tipo:'camara'} | {tipo:'editor', fuente, filtro, id}
  const [enviando, setEnviando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [avisos, setAvisos] = useState([]); // videos rechazados por pesados
  const [mensajeAbierto, setMensajeAbierto] = useState(false);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line

  // Si se abre desde el ícono de la pantalla de inicio, entra directo a la cámara
  useEffect(() => {
    if (abiertaComoApp() && camaraDisponible() && rollo.restantes > 0) setPanel({ tipo: 'camara' });
  }, []); // eslint-disable-line

  // ── Cámara desechable ──────────────────────────────────────
  // Aplica el "look" de película con sello de fecha y manda la foto sola, sin vista previa.
  const revelar = (lienzo) => {
    if (!rollo.consumir()) return;
    proceso.current = proceso.current.then(async () => {
      await new Promise((r) => setTimeout(r, 0)); // deja pintar el destello del disparo
      try {
        const blob = await canvasABlob(renderizar(lienzo, 'desechable', 'sello', 1800), 0.88);
        envios.agregar(blob);
      } catch (e) {
        console.error(e);
        rollo.devolver(); // si falló el revelado, no se gasta la foto
      }
    });
  };

  // Video grabado con la cámara del álbum: va directo a la cola de envío
  const guardarVideo = (blob, mime) => {
    if (!rollo.consumir(ROLLO.costoVideo)) return;
    envios.agregar(blob, { tipo: 'video', mime });
  };

  const abrirCamara = () => {
    if (rollo.restantes <= 0) return;
    if (camaraDisponible()) setPanel({ tipo: 'camara' });
    else capturaRef.current?.click(); // respaldo: cámara del sistema
  };

  const alCapturarConSistema = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { revelar(await blobACanvas(f, 2200)); } catch { /* foto no legible */ }
  };

  // ── Fotos de la galería ────────────────────────────────────
  const agregar = (file, lista) => {
    setTerminado(false);
    setItems((prev) => [...prev, { id: nuevoId(), file, url: URL.createObjectURL(file), estado: 'listo', lista, video: esVideo(file) }]);
  };
  const reemplazar = (id, blob) =>
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      URL.revokeObjectURL(i.url);
      return { ...i, file: blob, url: URL.createObjectURL(blob), estado: 'listo', lista: true };
    }));
  const quitar = (id) =>
    setItems((prev) => {
      const x = prev.find((i) => i.id === id);
      if (x) URL.revokeObjectURL(x.url);
      return prev.filter((i) => i.id !== id);
    });
  const marcar = (id, estado, motivo = '') => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado, motivo } : i)));

  const alElegirGaleria = (e) => {
    const elegidos = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name) || esVideo(f));
    e.target.value = '';
    const rechazados = [];
    elegidos.forEach((f) => {
      if (esVideo(f) && f.size > VIDEO.maxMB * 1048576) rechazados.push(`Un video pesa ${mb(f.size)} MB y el máximo es ${VIDEO.maxMB} MB (unos 10 a 20 segundos). Recórtelo en su galería o grábelo con la cámara del álbum.`);
      else agregar(f, false);
    });
    setAvisos(rechazados);
  };

  const enviar = async () => {
    setEnviando(true);
    let subidas = 0;
    for (const item of items.filter((i) => i.estado !== 'ok')) {
      marcar(item.id, 'enviando');
      try {
        if (item.video) {
          await enviarVideo({ mime: item.file.type || 'video/mp4', base64: await blobABase64(item.file) });
        } else {
          const blob = item.lista ? item.file : await comprimirImagen(item.file);
          await enviarFoto({ nombre: `${Date.now()}.jpg`, mime: 'image/jpeg', base64: await blobABase64(blob) });
        }
        marcar(item.id, 'ok');
        subidas++;
      } catch (err) {
        console.error(err);
        marcar(item.id, 'error', motivoError(err));
      }
    }
    setEnviando(false);
    if (subidas) onSubida?.();
    setItems((prev) => {
      const fallidas = prev.filter((i) => i.estado === 'error');
      prev.filter((i) => i.estado === 'ok').forEach((i) => URL.revokeObjectURL(i.url));
      if (!fallidas.length) { setTerminado(true); return []; }
      return fallidas;
    });
  };

  const hayErrores = items.some((i) => i.estado === 'error');
  const total = items.length;
  const hechas = items.filter((i) => i.estado === 'ok').length;
  const sinRollo = rollo.restantes <= 0;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center px-6 pb-8 pt-10 text-center">
      {BODA.foto ? (
        // Foto de los novios en arco, con el sello de cera "estampado" abajo
        <div className="relative mb-9">
          <img
            src={`${import.meta.env.BASE_URL}${BODA.foto}`}
            alt={`Foto de ${BODA.novios}`}
            width="200"
            height="250"
            className="h-[250px] w-[200px] rounded-b-md rounded-t-[100px] border-2 border-ocre object-cover shadow-[0_12px_32px_rgba(0,0,0,.5)]"
          />
          <img
            src={`${import.meta.env.BASE_URL}sello.png`}
            alt="Sello de la boda"
            width="76"
            className="absolute -bottom-7 left-1/2 h-auto w-[76px] -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,.6)]"
          />
        </div>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}sello.png`}
          alt="Sello de la boda"
          width="112"
          className="mb-5 h-auto w-28 drop-shadow-[0_6px_14px_rgba(0,0,0,.55)]"
        />
      )}
      <p className="font-display text-lg italic text-ocre">{BODA.fecha}</p>
      <h1 className="mt-1 font-display text-5xl font-medium leading-tight sm:text-6xl">{BODA.novios}</h1>
      {paleta.acentos && (
        <div className="mt-4 flex gap-2" aria-hidden="true">
          {paleta.acentos.map((c) => <span key={c} className="size-2.5 rounded-full border border-papel/25" style={{ background: c }} />)}
        </div>
      )}
      <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-papel-2">{BODA.mensaje}</p>

      {/* Botón principal + contador de fotos, como una cámara desechable */}
      <div className="relative mt-10">
        {!sinRollo && <span className="absolute inset-0 rounded-full border border-ocre" style={{ animation: 'latido 3.2s ease-in-out infinite' }} aria-hidden="true" />}
        <button
          type="button"
          onClick={abrirCamara}
          disabled={sinRollo}
          className="relative flex size-60 flex-col items-center justify-center gap-3 rounded-full border-2 border-ocre bg-vino text-papel shadow-[0_0_0_10px_var(--color-roble),0_0_0_11px_color-mix(in_srgb,var(--color-ocre)_45%,transparent)] transition active:scale-95 disabled:opacity-70"
        >
          <Hoja className="size-14 text-ocre" />
          <span className="font-display text-3xl font-medium leading-none">{sinRollo ? 'Rollo terminado' : 'Tomar foto'}</span>
          <span className="text-sm uppercase tracking-[0.16em] text-papel-2">
            {sinRollo ? 'sin fotos' : `${rollo.restantes} de ${rollo.total} fotos`}
          </span>
        </button>
      </div>

      <p className="mt-6 max-w-xs text-sm leading-relaxed text-papel-2">
        {sinRollo
          ? 'Gracias por compartir tus fotos. Si quiere, deje unas palabras para los novios.'
          : 'Cámara desechable: cada foto se envía sola y no se puede repetir.'}
      </p>

      {(envios.estado.pendientes > 0 || envios.estado.errores > 0) && (
        <p role="status" className="mt-3 text-sm text-ocre">
          {envios.estado.pendientes > 0
            ? `Enviando ${envios.estado.pendientes} al álbum…`
            : (
              <button type="button" onClick={envios.reintentar} className="underline underline-offset-4">
                {envios.estado.errores} sin enviar · Reintentar
              </button>
            )}
        </p>
      )}

      <button
        type="button"
        onClick={() => galeriaRef.current?.click()}
        disabled={enviando}
        className="mt-8 text-[15px] text-ocre underline underline-offset-4 disabled:opacity-60"
      >
        o sube fotos y videos de tu galería
      </button>

      <input ref={galeriaRef} type="file" accept="image/*,video/*" multiple onChange={alElegirGaleria} className="hidden" />
      <input ref={capturaRef} type="file" accept="image/*" capture="environment" onChange={alCapturarConSistema} className="hidden" />

      {envios.estado.errores > 0 && envios.estado.pendientes === 0 && envios.estado.motivo && (
        <p role="alert" className="mt-2 max-w-xs text-xs leading-relaxed text-papel-2">{envios.estado.motivo}</p>
      )}

      {avisos.map((a) => (
        <p key={a} role="alert" className="mt-4 max-w-xs rounded-lg bg-vino/40 px-4 py-3 text-sm leading-relaxed">{a}</p>
      ))}

      <MensajeNovios abierto={mensajeAbierto} onAbrir={() => setMensajeAbierto(true)} />

      {terminado && (
        <p role="status" className="mt-10 font-display text-2xl italic text-papel">
          ¡Gracias! Tus fotos ya están en el álbum.
        </p>
      )}

      {total > 0 && (
        <div className="mt-10 w-full">
          <ul className="grid grid-cols-3 gap-2">
            {items.map((i) => (
              <li key={i.id} className="relative aspect-square overflow-hidden rounded-md bg-roble-2">
                {i.video ? (
                  <>
                    <video src={`${i.url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                    <span aria-label="Video" className="absolute left-1 top-1 rounded-full bg-roble/85 px-2 py-0.5 text-xs">▶ Video</span>
                  </>
                ) : (
                  <img src={i.url} alt="Vista previa" className="size-full object-cover" />
                )}
                {i.estado === 'enviando' && <div className="absolute inset-0 grid place-items-center bg-roble/70 text-sm">Subiendo…</div>}
                {i.estado === 'ok' && <div className="absolute inset-0 grid place-items-center bg-hoja/70 text-2xl" aria-label="Enviada">✓</div>}
                {i.estado === 'error' && <div className="absolute inset-0 grid place-items-center bg-vino/80 px-1 text-xs">No se envió</div>}
                {!enviando && i.estado !== 'ok' && (
                  <>
                    <button type="button" onClick={() => quitar(i.id)} aria-label="Quitar foto" className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-roble/85 text-papel">×</button>
                    {!i.video && (
                      <button
                        type="button"
                        onClick={() => setPanel({ tipo: 'editor', fuente: i.file, filtro: 'original', id: i.id })}
                        className="absolute bottom-1 left-1 rounded-full bg-roble/85 px-2.5 py-1 text-xs text-ocre"
                      >
                        Editar
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {[...new Set(items.filter((i) => i.estado === 'error' && i.motivo).map((i) => i.motivo))].map((m) => (
            <p key={m} role="alert" className="mt-3 text-xs leading-relaxed text-papel-2">{m}</p>
          ))}
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-6 w-full rounded-full bg-ocre py-4 text-lg font-medium text-roble transition active:scale-[.98] disabled:opacity-60"
          >
            {enviando ? `Enviando ${hechas + 1} de ${total}…` : hayErrores ? 'Reintentar envío' : total === 1 ? 'Enviar' : `Enviar ${total} archivos`}
          </button>
        </div>
      )}

      {panel?.tipo === 'camara' && (
        <CamaraDesechable
          restantes={rollo.restantes}
          estado={envios.estado}
          onDisparo={revelar}
          onVideo={guardarVideo}
          onReintentar={envios.reintentar}
          onCerrar={() => setPanel(null)}
          puedeVerGaleria={puedeVerGaleria}
          onVerGaleria={() => { setPanel(null); onIrAGaleria?.(); }}
          onMensaje={() => { setPanel(null); setMensajeAbierto(true); }}
        />
      )}
      {panel?.tipo === 'editor' && (
        <Editor
          fuente={panel.fuente}
          filtroInicial={panel.filtro}
          textoCancelar="Cancelar"
          onCancelar={() => setPanel(null)}
          onListo={(blob) => { reemplazar(panel.id, blob); setPanel(null); }}
        />
      )}
    </section>
  );
}
