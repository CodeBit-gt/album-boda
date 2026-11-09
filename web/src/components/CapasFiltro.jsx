/** Capas que reproducen el filtro sobre el video (fade + tinte + viñeta). Mismo orden que la foto final. */
export default function CapasFiltro({ filtro }) {
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

