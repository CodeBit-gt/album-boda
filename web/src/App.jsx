import { useState } from 'react';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';

export default function App() {
  const [vista, setVista] = useState('subir');
  const [clave, setClave] = useState(0); // fuerza recargar la galería tras subir

  const tab = (id, texto) => (
    <button
      type="button"
      onClick={() => setVista(id)}
      aria-current={vista === id ? 'page' : undefined}
      className={`flex-1 py-4 font-display text-xl transition ${
        vista === id ? 'text-ocre' : 'text-papel-2'
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-24">
        {vista === 'subir' ? (
          <UploadView onSubida={() => setClave((c) => c + 1)} />
        ) : (
          <GalleryView refrescarClave={clave} />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ocre/30 bg-roble-2/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tab('subir', 'Subir foto')}
        {tab('galeria', 'Galería')}
      </nav>
    </div>
  );
}
