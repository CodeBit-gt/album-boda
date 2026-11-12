import { useState } from 'react';
import { enviarMensaje, motivoError } from '../lib/api';

/** Caja para que cada invitado deje unas palabras a los novios (se guardan en Drive, solo ellos las leen). */
export default function MensajeNovios({ abierto, onAbrir }) {
  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('listo'); // listo | enviando | ok | error
  const [motivo, setMotivo] = useState('');

  const enviar = async () => {
    if (!texto.trim()) return;
    setEstado('enviando');
    setMotivo('');
    try {
      await enviarMensaje({ nombre: nombre.trim(), texto: texto.trim() });
      setEstado('ok');
      setTexto('');
    } catch (e) {
      setMotivo(motivoError(e));
      setEstado('error');
    }
  };

  if (!abierto) {
    return (
      <button type="button" onClick={onAbrir} className="mt-4 text-[15px] text-ocre underline underline-offset-4">
        Dejar un mensaje para los novios
      </button>
    );
  }

  if (estado === 'ok') {
    return (
      <p role="status" className="mt-6 max-w-xs font-display text-2xl italic">
        ¡Gracias! Los novios leerán su mensaje.
      </p>
    );
  }

  return (
    <div className="mt-6 w-full max-w-sm rounded-2xl border border-ocre/30 bg-roble-2/60 p-4 text-left">
      <label htmlFor="msg-nombre" className="text-sm text-papel-2">Su nombre (opcional)</label>
      <input
        id="msg-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={60}
        className="mt-1 w-full rounded-lg border border-ocre/30 bg-white/35 px-3 py-3 text-papel outline-none focus:border-ocre"
      />
      <label htmlFor="msg-texto" className="mt-4 block text-sm text-papel-2">Su mensaje para los novios</label>
      <textarea
        id="msg-texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={600}
        rows={5}
        className="mt-1 w-full resize-none rounded-lg border border-ocre/30 bg-white/35 px-3 py-3 text-papel outline-none focus:border-ocre"
      />
      {estado === 'error' && <p role="alert" className="mt-2 text-xs text-ocre">{motivo}</p>}
      <button
        type="button"
        onClick={enviar}
        disabled={!texto.trim() || estado === 'enviando'}
        className="mt-4 w-full rounded-full bg-ocre py-3.5 text-lg font-medium text-claro disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Enviando…' : estado === 'error' ? 'Reintentar' : 'Enviar mensaje'}
      </button>
    </div>
  );
}
