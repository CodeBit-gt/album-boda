import { useEffect, useRef, useState } from 'react';
import { BODA } from '../config';
import { enviarFoto } from '../lib/api';
import { blobABase64, comprimirImagen } from '../lib/imagen';
import Hoja from './Hoja';
import Camara from './Camara';
import Editor from './Editor';

let contador = 0;
const nuevoId = () => `${Date.now()}-${contador++}`;

// La cámara propia necesita HTTPS (o localhost). Si no está disponible se usa la cámara del sistema.
const camaraDisponible = () =>
  typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

export default function UploadView({ onSubida }) {
  const galeriaRef = useRef(null);
  const capturaRef = useRef(null);
  const [items, setItems] = useState([]); // { id, file, url, estado, lista }
  const [panel, setPanel] = useState(null); // null | {tipo:'camara'} | {tipo:'editor', fuente, filtro, id?, desdeCamara?}
  const [enviando, setEnviando] = useState(false);
  const [terminado, setTerminado] = useState(false);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line

  const agregar = (file, lista) => {
    setTerminado(false);
    setItems((prev) => [...prev, { id: nuevoId(), file, url: URL.createObjectURL(file), estado: 'listo', lista }]);
  };

  const reemplazar = (id, blob) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        URL.revokeObjectURL(i.url);
        return { ...i, file: blob, url: URL.createObjectURL(blob), estado: 'listo', lista: true };
      })
    );

  const quitar = (id) =>
    setItems((prev) => {
      const x = prev.find((i) => i.id === id);
      if (x) URL.revokeObjectURL(x.url);
      return prev.filter((i) => i.id !== id);
    });

  const marcar = (id, estado) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));

  // ── Entradas ────────────────────────────────────────────────
  const abrirCamara = () => {
    if (camaraDisponible()) setPanel({ tipo: 'camara' });
    else capturaRef.current?.click(); // respaldo: cámara del sistema
  };

  const alElegirGaleria = (e) => {
    const archivos = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    e.target.value = '';
    if (panel?.tipo === 'camara') setPanel(null);
    archivos.forEach((f) => agregar(f, false));
  };

  const alCapturarConSistema = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setPanel({ tipo: 'editor', fuente: f, filtro: 'original', desdeCamara: false });
  };

  // ── Envío ───────────────────────────────────────────────────
  const enviar = async () => {
    setEnviando(true);
    let subidas = 0;
    for (const item of items.filter((i) => i.estado !== 'ok')) {
      marcar(item.id, 'enviando');
      try {
        const blob = item.lista ? item.file : await comprimirImagen(item.file);
        const base64 = await blobABase64(blob);
        await enviarFoto({ nombre: `${Date.now()}.jpg`, mime: 'image/jpeg', base64 });
        marcar(item.id, 'ok');
        subidas++;
      } catch (err) {
        console.error(err);
        marcar(item.id, 'error');
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

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center px-6 pb-8 pt-10 text-center">
      <img
        src={`${import.meta.env.BASE_URL}sello.png`}
        alt="Sello de la boda"
        width="112"
        className="mb-5 h-auto w-28 drop-shadow-[0_6px_14px_rgba(0,0,0,.55)]"
      />
      <p className="font-display text-lg italic text-ocre">{BODA.fecha}</p>
      <h1 className="mt-1 font-display text-5xl font-medium leading-tight sm:text-6xl">{BODA.novios}</h1>
      <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-papel-2">{BODA.mensaje}</p>

      {/* Botón principal */}
      <div className="relative mt-10">
        <span className="absolute inset-0 rounded-full border border-ocre" style={{ animation: 'latido 3.2s ease-in-out infinite' }} aria-hidden="true" />
        <button
          type="button"
          onClick={abrirCamara}
          disabled={enviando}
          className="relative flex size-60 flex-col items-center justify-center gap-3 rounded-full border-2 border-ocre bg-vino text-papel shadow-[0_0_0_10px_var(--color-roble),0_0_0_11px_rgba(217,164,65,.45)] transition active:scale-95 disabled:opacity-60"
        >
          <Hoja className="size-14 text-ocre" />
          <span className="font-display text-3xl font-medium leading-none">Tomar foto</span>
          <span className="text-sm text-papel-2">con filtros y marcos</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => galeriaRef.current?.click()}
        disabled={enviando}
        className="mt-8 text-[15px] text-ocre underline underline-offset-4 disabled:opacity-60"
      >
        o elige fotos de tu galería
      </button>

      <input ref={galeriaRef} type="file" accept="image/*" multiple onChange={alElegirGaleria} className="hidden" />
      <input ref={capturaRef} type="file" accept="image/*" capture="environment" onChange={alCapturarConSistema} className="hidden" />

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
                <img src={i.url} alt="Vista previa" className="size-full object-cover" />
                {i.estado === 'enviando' && <div className="absolute inset-0 grid place-items-center bg-roble/70 text-sm">Subiendo…</div>}
                {i.estado === 'ok' && <div className="absolute inset-0 grid place-items-center bg-hoja/70 text-2xl" aria-label="Enviada">✓</div>}
                {i.estado === 'error' && <div className="absolute inset-0 grid place-items-center bg-vino/80 px-1 text-xs">No se envió</div>}
                {!enviando && i.estado !== 'ok' && (
                  <>
                    <button type="button" onClick={() => quitar(i.id)} aria-label="Quitar foto" className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-roble/85 text-papel">×</button>
                    <button
                      type="button"
                      onClick={() => setPanel({ tipo: 'editor', fuente: i.file, filtro: 'original', id: i.id })}
                      className="absolute bottom-1 left-1 rounded-full bg-roble/85 px-2.5 py-1 text-xs text-ocre"
                    >
                      Editar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="mt-6 w-full rounded-full bg-ocre py-4 text-lg font-medium text-roble transition active:scale-[.98] disabled:opacity-60"
          >
            {enviando ? `Enviando ${hechas + 1} de ${total}…` : hayErrores ? 'Reintentar envío' : total === 1 ? 'Enviar foto' : `Enviar ${total} fotos`}
          </button>
        </div>
      )}

      {/* Pantallas a pantalla completa */}
      {panel?.tipo === 'camara' && (
        <Camara
          onCerrar={() => setPanel(null)}
          onGaleria={() => galeriaRef.current?.click()}
          onFoto={(blob, filtro) => setPanel({ tipo: 'editor', fuente: blob, filtro, desdeCamara: true })}
        />
      )}
      {panel?.tipo === 'editor' && (
        <Editor
          fuente={panel.fuente}
          filtroInicial={panel.filtro}
          textoCancelar={panel.desdeCamara ? 'Repetir' : 'Cancelar'}
          onCancelar={() => setPanel(panel.desdeCamara ? { tipo: 'camara' } : null)}
          onListo={(blob) => {
            if (panel.id) reemplazar(panel.id, blob);
            else agregar(blob, true);
            setPanel(null);
          }}
        />
      )}
    </section>
  );
}
