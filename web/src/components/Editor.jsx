import { useEffect, useRef, useState } from 'react';
import { FILTROS } from '../lib/filtros';
import { MARCOS } from '../lib/marcos';
import { blobACanvas, canvasABlob } from '../lib/imagen';
import { prepararFuentes, renderizar } from '../lib/render';
import { estiloOscuro } from '../temas';

const aUrl = (canvas) => canvas.toDataURL('image/jpeg', 0.82);

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
  const areaRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [dim, setDim] = useState(null); // tamaño real del resultado (con marco)

  // Medir el espacio libre para la foto (lo que queda entre arriba y el panel de filtros)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setArea({ w: Math.max(0, r.width - 32), h: Math.max(0, r.height - 32) });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      for (const f of FILTROS) m[f.id] = aUrl(renderizar(origen, f.id, 'ninguno', 260));
      setMiniF(m);
    }, 30);
    return () => clearTimeout(t);
  }, [origen]);

  // Miniaturas de marcos (se rehacen al cambiar de filtro)
  useEffect(() => {
    if (!origen) return;
    const t = setTimeout(() => {
      const m = {};
      for (const k of MARCOS) m[k.id] = aUrl(renderizar(origen, filtro, k.id, 300));
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
    setDim({ w: r.width, h: r.height });
  }, [origen, filtro, marco]);

  // Tamaño en pantalla: la foto completa (con marco) cabe en el espacio libre, sin desbordar
  const caja = (() => {
    if (!dim || !area.w || !area.h) return { w: 0, h: 0 };
    const k = Math.min(area.w / dim.w, area.h / dim.h);
    return { w: Math.floor(dim.w * k), h: Math.floor(dim.h * k) };
  })();

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
        <span className={`block size-24 overflow-hidden rounded-lg bg-roble-2 p-1 ring-2 ${activo ? 'ring-ocre' : 'ring-transparent'}`}>
          {mini ? <img src={mini} alt="" className="size-full object-contain" /> : null}
        </span>
        <span className={`text-xs leading-tight ${activo ? 'text-ocre' : 'text-papel-2'}`}>{etiqueta}</span>
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-roble text-papel landscape:flex-row" style={{ ...estiloOscuro, paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      {/* Zona de la foto: ocupa lo que sobra y la imagen se ajusta dentro sin desbordar */}
      <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 grid place-items-center">
          {error ? (
            <p className="max-w-xs text-center text-papel-2">{error}</p>
          ) : !origen ? (
            <p className="text-papel-2">Preparando foto…</p>
          ) : (
            <canvas ref={lienzoRef} style={{ width: caja.w, height: caja.h }} className="block shadow-2xl" />
          )}
        </div>
      </div>

      <div className="border-t border-ocre/20 bg-roble-2/80 landscape:flex landscape:w-80 landscape:shrink-0 landscape:flex-col landscape:justify-center landscape:overflow-y-auto landscape:border-l landscape:border-t-0">
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
