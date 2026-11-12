/**
 * Backend gratuito para el álbum de la boda (Google Apps Script + Google Drive).
 *
 * Despliegue: Implementar > Nueva implementación > Aplicación web
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 *
 * Si cambias este código después: Implementar > Administrar implementaciones > (lápiz) > Versión: Nueva versión.
 */

// 1) Pega aquí el ID de tu carpeta de Drive (lo que va después de /folders/ en su URL)
const FOLDER_ID = 'PEGA_AQUI_EL_ID_DE_LA_CARPETA';

// 2) Clave de los novios: con ella ven TODO desde antes (fotos nítidas, descargas). Solo la saben los novios.
const CLAVE_NOVIOS = 'CAMBIAR_ESTA_CLAVE';

// 3) Cuándo se "revelan" las fotos para los invitados (hora de Guatemala = -06:00).
//    Formato: 'AAAA-MM-DDTHH:MM:SS-06:00'. Ejemplo: el día siguiente a las 8 de la mañana.
//    Mientras no sea esa hora, los invitados solo reciben un "mosaico" borroso de 6x6 colores, SIN enlaces a las fotos.
const REVELA_EN = 'CAMBIAR_FECHA';  // ej: '2026-11-15T08:00:00-06:00'

// Cambia este texto cada vez que modifiques el código: sirve para comprobar qué versión está publicada
// (abre TU_URL/exec?accion=version en el navegador).
const VERSION = 'v5-revelado';

const MAX_FOTO_BYTES = 15 * 1024 * 1024;   // el frontend envía ~0,5 MB
const MAX_VIDEO_BYTES = 26 * 1024 * 1024;  // el frontend limita a ~20 MB
const MAX_DESCARGA_BYTES = 12 * 1024 * 1024; // tamaño máximo que se entrega para "guardar en el celular"

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esNovios_(p) {
  return String(p.clave || '') === CLAVE_NOVIOS && CLAVE_NOVIOS !== 'CAMBIAR_ESTA_CLAVE';
}

function revelaMs_() {
  const ms = Date.parse(REVELA_EN);
  return isNaN(ms) ? 0 : ms;
}

function revelado_() {
  const ms = revelaMs_();
  return ms > 0 && Date.now() >= ms;
}

function extension_(mime) {
  if (mime === 'image/png') return 'png';
  if (mime.indexOf('image/') === 0) return 'jpg';
  if (mime.indexOf('webm') > -1) return 'webm';
  if (mime.indexOf('quicktime') > -1) return 'mov';
  if (mime.indexOf('3gpp') > -1) return '3gp';
  return 'mp4';
}

/**
 * Guarda el archivo. El nombre lleva la hora y, en las fotos, el "mosaico" borroso:
 *   <hora>_<azar>_<orientación p/l/s><mosaico 6x6 en base64>.<ext>
 * Así la lista de fotos se arma sin abrir cada archivo (rápido) y los invitados reciben solo el mosaico antes de la hora de revelado.
 */
function guardar_(bytes, mime, o, mosaico) {
  const sufijo = (/^[pls]$/.test(o || '') && /^[A-Za-z0-9_-]{0,160}$/.test(mosaico || '')) ? '_' + o + mosaico : '';
  const nombre = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + sufijo + '.' + extension_(mime);
  const archivo = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, mime, nombre));
  try { CacheService.getScriptCache().removeAll(['lista_200_n', 'lista_200_g']); } catch (e) { /* sin caché: no pasa nada */ }
  return archivo.getId();
}

/**
 * Recibe fotos, videos y mensajes.
 *  - Foto:    cuerpo JSON { mime, data (base64), o, mini }
 *  - Video:   ?accion=video&mime=video/mp4  con el cuerpo = base64 puro (sin JSON, para gastar menos memoria)
 *  - Mensaje: cuerpo JSON { accion: 'mensaje', nombre, texto }
 */
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    if (p.accion === 'video') {
      const mime = String(p.mime || 'video/mp4');
      if (mime.indexOf('video/') !== 0) return respuesta_({ ok: false, error: 'Solo se permiten videos' });
      const bytes = Utilities.base64Decode(e.postData.contents);
      if (bytes.length > MAX_VIDEO_BYTES) return respuesta_({ ok: false, error: 'El video es demasiado grande' });
      return respuesta_({ ok: true, id: guardar_(bytes, mime, '', '') });
    }

    const body = JSON.parse(e.postData.contents);

    // Mensaje de un invitado para los novios: se guarda como archivo de texto (no aparece en la galería)
    if (body.accion === 'mensaje') {
      const texto = String(body.texto || '').trim().slice(0, 600);
      if (!texto) return respuesta_({ ok: false, error: 'Mensaje vacío' });
      const de = String(body.nombre || 'Anónimo').trim().slice(0, 60) || 'Anónimo';
      const nombre = 'mensaje_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.txt';
      DriveApp.getFolderById(FOLDER_ID).createFile(nombre, 'De: ' + de + '\n\n' + texto + '\n', 'text/plain');
      return respuesta_({ ok: true });
    }

    const mime = String(body.mime || '');
    if (mime.indexOf('image/') !== 0) return respuesta_({ ok: false, error: 'Solo se permiten imágenes' });
    const bytes = Utilities.base64Decode(body.data);
    if (bytes.length > MAX_FOTO_BYTES) return respuesta_({ ok: false, error: 'La foto es demasiado grande' });
    return respuesta_({ ok: true, id: guardar_(bytes, mime, body.o, body.mini) });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}

/** ¿El archivo está dentro de la carpeta del álbum? (el script corre con TUS permisos: nunca entregar otros archivos) */
function enAlbum_(archivo) {
  const padres = archivo.getParents();
  while (padres.hasNext()) if (padres.next().getId() === FOLDER_ID) return true;
  return false;
}

const EXT_IMG = { jpg: 1, jpeg: 1, png: 1, webp: 1 };
const EXT_VID = { mp4: 1, webm: 1, mov: 1, '3gp': 1, m4v: 1 };

/** Datos de un archivo a partir de su nombre (rápido). Devuelve null si no es foto ni video. */
function info_(f) {
  const nombre = f.getName();
  let t = 0, o = '', m = '', ext = '';
  let r = /^(\d{10,})_([a-z0-9]+)_([pls])([A-Za-z0-9_-]*)\.(\w+)$/.exec(nombre);
  if (r) { t = Number(r[1]); o = r[3]; m = r[4]; ext = r[5].toLowerCase(); }
  else {
    r = /^(\d{10,})_([a-z0-9]+)\.(\w+)$/.exec(nombre);
    if (r) { t = Number(r[1]); ext = r[3].toLowerCase(); }
  }
  let video;
  if (EXT_IMG[ext]) video = false;
  else if (EXT_VID[ext]) video = true;
  else {
    const mime = f.getMimeType();
    if (mime.indexOf('image/') === 0) video = false;
    else if (mime.indexOf('video/') === 0) video = true;
    else return null;
  }
  if (!t) t = f.getDateCreated().getTime();
  return { id: f.getId(), t: t, v: video ? 1 : 0, o: o, m: m };
}

/**
 * ?accion=version             muestra la versión publicada y la hora de revelado
 * ?limit=200                  lista de fotos (más recientes primero)
 *                               - invitados ANTES de la hora: solo mosaicos borrosos, sin enlaces
 *                               - invitados DESPUÉS, o novios (con &clave=…): fotos completas
 * ?clave=…&all=1              todas, de la más antigua a la más nueva (script de video) [solo novios]
 * ?accion=obtener&id=…        entrega una foto/video pequeño en base64 para "Guardar en mi celular"
 *                               [novios siempre; invitados solo después de la hora de revelado]
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};

    if (p.accion === 'version') {
      return respuesta_({ ok: true, version: VERSION, revela: revelaMs_(), ahora: Date.now(), revelado: revelado_() });
    }

    const novios = esNovios_(p);
    const revelado = revelado_();

    if (p.accion === 'obtener') {
      if (!novios && !revelado) return respuesta_({ ok: false, error: 'bloqueado' });
      const f = DriveApp.getFileById(String(p.id || ''));
      if (!enAlbum_(f)) return respuesta_({ ok: false, error: 'No encontrado' });
      const mime = f.getMimeType();
      if (mime.indexOf('image/') !== 0 && mime.indexOf('video/') !== 0) return respuesta_({ ok: false, error: 'No permitido' });
      if (f.getSize() > MAX_DESCARGA_BYTES) return respuesta_({ ok: false, error: 'grande' });
      return respuesta_({ ok: true, mime: mime, data: Utilities.base64Encode(f.getBlob().getBytes()) });
    }

    const todas = p.all === '1';
    if (todas && !novios) return respuesta_({ ok: false, error: 'clave' });

    const limite = Math.min(parseInt(p.limit, 10) || 200, 1000);
    const cache = CacheService.getScriptCache();
    const claveCache = 'lista_' + limite + (novios ? '_n' : '_g');

    if (!todas) {
      const hit = cache.get(claveCache);
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    }

    const it = DriveApp.getFolderById(FOLDER_ID).getFiles();
    const lista = [];
    while (it.hasNext()) {
      const d = info_(it.next());
      if (d) lista.push(d);
    }

    const ordenadas = todas
      ? lista.sort(function (a, b) { return a.t - b.t; })
      : lista.sort(function (a, b) { return b.t - a.t; }).slice(0, limite);

    const bloqueado = !novios && !revelado;
    const files = ordenadas.map(function (d) {
      if (bloqueado) return { t: d.t, v: d.v, o: d.o, m: d.m };   // sin id: no hay forma de llegar a la foto
      return todas ? { id: d.id, t: d.t, v: d.v } : { id: d.id, t: d.t, v: d.v, o: d.o };
    });

    const json = JSON.stringify({ ok: true, files: files, novios: novios, bloqueado: bloqueado, revela: revelaMs_() });
    if (!todas) { try { cache.put(claveCache, json, 15); } catch (err) { /* demasiado grande para la caché */ } }
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}
