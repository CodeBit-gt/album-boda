import { useEffect, useRef, useState } from 'react';
import { FILTROS } from '../lib/filtros';
import { MARCOS } from '../lib/marcos';
import { blobACanvas, canvasABlob } from '../lib/imagen';
import { prepararFuentes, renderizar } from '../lib/render';

const aUrl = (canvas) => canvas.toDataURL('image/jpeg', 0.7);

export default function Editor({ fuente, filtroInicial = 'original', textoCancelar = 'Cancelar', onCancelar, onListo }) {
  const lienzoRef = useRef(null);
  const [origen, setOrigen] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState(filtroInicial);
  const [marco, setMarco] = useState('ninguno');
  const [pestana, setPestana] = useState('filtros');
  const [miniF, setMiniF] = useState({});
  const [miniM, setMiniM] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Cargar la foto y las tipografías de los marcos
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [c] = await Promise.all([blobACanvas(fuente, 2200), prepararFuentes()]);
        if (vivo) setOrigen(c);
      } catch (e) {
        if (vivo) setError('No se pudo abrir esta foto.');
      }
    })();
    return () => { vivo = false; };
  }, [fuente]);

  // Miniaturas de filtros (una sola vez)
  useEffect(() => {
    if (!origen) return;
    const t = setTimeout(() => {
      const m = {};
      for (const f of FILTROS) m[f.id] = aUrl(renderizar(origen, f.id, 'ninguno', 120));
      setMiniF(m);
    }, 30);
    return () => clearTimeout(t);
  }, [origen]);

  // Miniaturas de marcos (se rehacen al cambiar de filtro)
  useEffect(() => {
    if (!origen) return;
    const t = setTimeout(() => {
      const m = {};
      for (const k of MARCOS) m[k.id] = aUrl(renderizar(origen, filtro, k.id, 130));
      setMiniM(m);
    }, 30);
    return () => clearTimeout(t);
  }, [origen, filtro]);

  // Vista principal
  useEffect(() => {
    if (!origen || !lienzoRef.current) return;
    const r = renderizar(origen, filtro, marco, 1000);
    const l = lienzoRef.current;
    l.width = r.width;
    l.height = r.height;
    l.getContext('2d').drawImage(r, 0, 0);
  }, [origen, filtro, marco]);

  const aceptar = async () => {
    setGuardando(true);
    try {
      await new Promise((r) => setTimeout(r, 20)); // deja pintar el estado "Guardando…"
      const blob = await canvasABlob(renderizar(origen, filtro, marco, 1800), 0.88);
      onListo(blob);
    } catch {
      setError('No se pudo guardar la foto. Inténtalo otra vez.');
      setGuardando(false);
    }
  };

  const chip = (activo, onClick, etiqueta, mini) => (
    <li key={etiqueta} className="shrink-0">
      <button type="button" onClick={onClick} aria-pressed={activo} className="flex w-24 flex-col items-center gap-1.5">
        <span className={`grid size-24 place-items-center overflow-hidden rounded-lg bg-roble-2 ring-2 ${activo ? 'ring-ocre' : 'ring-transparent'}`}>
          {mini ? <img src={mini} alt="" className="max-h-full max-w-full" /> : null}
        </span>
        <span className={`text-xs leading-tight ${activo ? 'text-ocre' : 'text-papel-2'}`}>{etiqueta}</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-roble text-papel" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="grid min-h-0 flex-1 place-items-center p-4">
        {error ? (
          <p className="max-w-xs text-center text-papel-2">{error}</p>
        ) : !origen ? (
          <p className="text-papel-2">Preparando foto…</p>
        ) : (
          <canvas ref={lienzoRef} className="rounded-sm shadow-2xl" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        )}
      </div>

      <div className="border-t border-ocre/20 bg-roble-2/80">
        <div className="flex">
          {[['filtros', 'Filtros'], ['marcos', 'Marcos']].map(([id, t]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              aria-pressed={pestana === id}
              className={`flex-1 py-3 font-display text-xl ${pestana === id ? 'text-ocre' : 'text-papel-2'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <ul className="sin-barra flex gap-3 overflow-x-auto px-4 pb-3">
          {pestana === 'filtros'
            ? FILTROS.map((f) => chip(f.id === filtro, () => setFiltro(f.id), f.nombre, miniF[f.id]))
            : MARCOS.map((m) => chip(m.id === marco, () => setMarco(m.id), m.nombre, miniM[m.id]))}
        </ul>

        <div className="flex gap-3 px-4 pt-1" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onCancelar} disabled={guardando} className="flex-1 rounded-full border border-white/25 py-3.5 text-papel disabled:opacity-50">
            {textoCancelar}
          </button>
          <button type="button" onClick={aceptar} disabled={!origen || guardando} className="flex-[1.6] rounded-full bg-ocre py-3.5 text-lg font-medium text-roble disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Usar foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
