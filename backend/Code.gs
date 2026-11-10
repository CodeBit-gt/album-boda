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
const FOLDER_ID = '1GMkZq2EbTOB8eWHeMn9QtpFL04RVkSh6';

// 2) Clave de los novios: sin ella nadie puede VER la lista de fotos (los invitados solo pueden subir).
//    Cámbiala por algo que solo sepan los novios
const CLAVE_NOVIOS = 'galeriaboda';

// Cambia este texto cada vez que modifiques el código: sirve para comprobar qué versión está publicada
// (abre TU_URL/exec?accion=version en el navegador).
const VERSION = 'v4-privada-mensajes';

const MAX_FOTO_BYTES = 15 * 1024 * 1024;   // el frontend envía ~0,5 MB
const MAX_VIDEO_BYTES = 26 * 1024 * 1024;  // el frontend limita a ~20 MB
const MAX_DESCARGA_BYTES = 12 * 1024 * 1024; // tamaño máximo que se entrega para "guardar en el celular"

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function extension_(mime) {
  if (mime === 'image/png') return 'png';
  if (mime.indexOf('image/') === 0) return 'jpg';
  if (mime.indexOf('webm') > -1) return 'webm';
  if (mime.indexOf('quicktime') > -1) return 'mov';
  if (mime.indexOf('3gpp') > -1) return '3gp';
  return 'mp4';
}

function esNovios_(p) {
  return String(p.clave || '') === CLAVE_NOVIOS && CLAVE_NOVIOS !== 'CAMBIAR_ESTA_CLAVE';
}

function guardar_(bytes, mime) {
  const nombre = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + extension_(mime);
  const archivo = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, mime, nombre));
  const cache = CacheService.getScriptCache();
  cache.removeAll(['lista_200']); // refresca la galería
  return archivo.getId();
}

/**
 * Recibe fotos y videos.
 *  - Foto:  cuerpo JSON { nombre, mime, data (base64) }
 *  - Video: ?accion=video&mime=video/mp4  con el cuerpo = base64 puro (sin JSON, para gastar menos memoria)
 */
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    if (p.accion === 'video') {
      const mime = String(p.mime || 'video/mp4');
      if (mime.indexOf('video/') !== 0) return respuesta_({ ok: false, error: 'Solo se permiten videos' });
      const bytes = Utilities.base64Decode(e.postData.contents);
      if (bytes.length > MAX_VIDEO_BYTES) return respuesta_({ ok: false, error: 'El video es demasiado grande' });
      return respuesta_({ ok: true, id: guardar_(bytes, mime) });
    }

    const body = JSON.parse(e.postData.contents);

    // Mensaje de un invitado para los novios: se guarda como archivo de texto en la carpeta (no aparece en la galería)
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
    return respuesta_({ ok: true, id: guardar_(bytes, mime) });
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

/**
 * ?accion=version       muestra la versión publicada (para comprobar que desplegaste lo último)
 * ?clave=…&limit=200    lista más recientes primero (caché de 15 s)            [solo novios]
 * ?clave=…&all=1        todas, de la más antigua a la más nueva (script de video) [solo novios]
 * ?clave=…&accion=obtener&id=…  entrega una foto/video pequeño en base64 para "Guardar en mi celular" [solo novios]
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};

    if (p.accion === 'version') return respuesta_({ ok: true, version: VERSION });

    // Todo lo demás (ver la lista, descargar) es solo para los novios
    if (!esNovios_(p)) return respuesta_({ ok: false, error: 'clave' });

    if (p.accion === 'obtener') {
      const f = DriveApp.getFileById(String(p.id || ''));
      if (!enAlbum_(f)) return respuesta_({ ok: false, error: 'No encontrado' });
      const mime = f.getMimeType();
      if (mime.indexOf('image/') !== 0 && mime.indexOf('video/') !== 0) return respuesta_({ ok: false, error: 'No permitido' });
      if (f.getSize() > MAX_DESCARGA_BYTES) return respuesta_({ ok: false, error: 'grande' });
      return respuesta_({ ok: true, mime: mime, data: Utilities.base64Encode(f.getBlob().getBytes()) });
    }

    const todas = p.all === '1';
    const limite = Math.min(parseInt(p.limit, 10) || 200, 1000);
    const cache = CacheService.getScriptCache();
    const clave = 'lista_' + limite;

    if (!todas) {
      const hit = cache.get(clave);
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    }

    const it = DriveApp.getFolderById(FOLDER_ID).getFiles();
    const lista = [];
    while (it.hasNext()) {
      const f = it.next();
      const m = f.getMimeType();
      if (m.indexOf('image/') === 0) lista.push({ id: f.getId(), t: f.getDateCreated().getTime() });
      else if (m.indexOf('video/') === 0) lista.push({ id: f.getId(), t: f.getDateCreated().getTime(), v: 1 });
    }

    const files = todas
      ? lista.sort(function (a, b) { return a.t - b.t; })
      : lista.sort(function (a, b) { return b.t - a.t; }).slice(0, limite);

    const json = JSON.stringify({ ok: true, files: files });
    if (!todas) cache.put(clave, json, 15);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}
