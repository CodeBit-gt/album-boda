import { MARCA } from '../config';

// Agrega parámetros UTM para ver en las estadísticas de tu página cuántas visitas llegan desde el álbum
function enlace(origen) {
  if (!MARCA.url) return '';
  try {
    const u = new URL(MARCA.url);
    u.searchParams.set('utm_source', 'album-boda');
    u.searchParams.set('utm_medium', 'pwa');
    u.searchParams.set('utm_campaign', origen);
    return u.toString();
  } catch {
    return MARCA.url;
  }
}

/** Línea discreta al pie: "Desarrollado por CodeBit" (con enlace si MARCA.url está configurada). */
export default function Marca({ origen = 'pie' }) {
  const href = enlace(origen);
  const contenido = (
    <>
      {MARCA.texto} <span className="font-medium text-papel/80">{MARCA.nombre}</span>
    </>
  );
  const clases = 'inline-block px-4 py-3 text-xs tracking-wide text-papel-2/70';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${clases} underline-offset-4 hover:underline`}>
      {contenido}
    </a>
  ) : (
    <span className={clases}>{contenido}</span>
  );
}

/** Invitación suave para el momento en que el invitado terminó su rollo (solo si hay enlace). */
export function InvitacionMarca() {
  const href = enlace('fin-rollo');
  if (!href) return null;
  return (
    <p className="mt-6 text-xs leading-relaxed text-papel-2">
      ¿Quiere un álbum así para su evento?{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-ocre underline underline-offset-4">
        Conozca {MARCA.nombre}
      </a>
    </p>
  );
}
