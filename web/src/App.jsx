import { useEffect, useState } from 'react';
import UploadView from './components/UploadView';
import GalleryView from './components/GalleryView';
import Marca from './components/Marca';
import AccesoNovios from './components/AccesoNovios';
import { useAccesoNovios } from './lib/acceso';

// Los invitados solo ven la cámara. Los novios entran con la dirección del álbum terminada en #novios
// y su clave; después ven también la pestaña "Galería".
export default function App() {
  const acceso = useAccesoNovios();
  const [vista, setVista] = useState('subir');
  const [clave, setClave] = useState(0); // fuerza recargar la galería tras subir
  const [pidiendo, setPidiendo] = useState(() => window.location.hash === '#novios');

  useEffect(() => {
    const alCambiar = () => setPidiendo(window.location.hash === '#novios');
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const cerrarPeticion = () => {
    setPidiendo(false);
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  if (pidiendo && !acceso.esNovios) {
    return (
      <AccesoNovios
        onEntrar={async (c) => { await acceso.entrar(c); setVista('galeria'); cerrarPeticion(); }}
        onCancelar={cerrarPeticion}
      />
    );
  }

  const tab = (id, texto) => (
    <button
      type="button"
      onClick={() => setVista(id)}
      aria-current={vista === id ? 'page' : undefined}
      className={`flex-1 py-4 font-display text-xl transition ${vista === id ? 'text-ocre' : 'text-papel-2'}`}
    >
      {texto}
    </button>
  );

  const verGaleria = acceso.esNovios && vista === 'galeria';

  return (
    <div className="flex min-h-dvh flex-col">
      <main className={`flex-1 ${acceso.esNovios ? 'pb-24' : 'pb-6'}`}>
        {verGaleria ? (
          <GalleryView refrescarClave={clave} clave={acceso.clave} onSalir={() => { acceso.salir(); setVista('subir'); }} />
        ) : (
          <UploadView
            onSubida={() => setClave((c) => c + 1)}
            puedeVerGaleria={acceso.esNovios}
            onIrAGaleria={() => setVista('galeria')}
          />
        )}
        <footer className="px-6 pb-2 text-center">
          <Marca origen="pie" />
        </footer>
      </main>

      {acceso.esNovios && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ocre/30 bg-roble-2/95 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {tab('subir', 'Subir foto')}
          {tab('galeria', 'Galería')}
        </nav>
      )}
    </div>
  );
}
