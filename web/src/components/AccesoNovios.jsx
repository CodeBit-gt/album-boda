import { useState } from 'react';

/** Pantalla de entrada para los novios (se abre con la dirección del álbum + #novios). */
export default function AccesoNovios({ onEntrar, onCancelar }) {
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async () => {
    setCargando(true);
    setError('');
    try {
      await onEntrar(valor);
    } catch (e) {
      setError(e.message === 'clave' ? 'Clave incorrecta.' : e.message === 'Escribe la clave' ? 'Escribe la clave.' : 'No se pudo comprobar la clave. Revisa tu conexión.');
      setCargando(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl font-medium">Acceso de los novios</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-papel-2">Escriba la clave para ver y guardar todas las fotos y videos.</p>
      <label htmlFor="clave" className="sr-only">Clave</label>
      <input
        id="clave"
        type="password"
        autoComplete="current-password"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && entrar()}
        className="mt-6 w-full rounded-full border border-ocre/50 bg-roble-2 px-5 py-4 text-center text-lg text-papel outline-none focus:border-ocre"
        placeholder="Clave"
      />
      {error && <p role="alert" className="mt-3 text-sm text-ocre">{error}</p>}
      <button type="button" onClick={entrar} disabled={cargando} className="mt-5 w-full rounded-full bg-ocre py-4 text-lg font-medium text-claro disabled:opacity-60">
        {cargando ? 'Comprobando…' : 'Entrar'}
      </button>
      <button type="button" onClick={onCancelar} className="mt-4 text-sm text-papel-2 underline underline-offset-4">Volver al álbum</button>
    </main>
  );
}
