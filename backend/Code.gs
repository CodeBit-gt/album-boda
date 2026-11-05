/**
 * Backend gratuito para el álbum de la boda (Google Apps Script + Google Drive).
 *
 * Despliegue: Implementar > Nueva implementación > Aplicación web
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 */

// 1) Pega aquí el ID de tu carpeta de Drive (lo que va después de /folders/ en su URL)
const FOLDER_ID = 'PEGA_AQUI_EL_ID_DE_LA_CARPETA';

const MAX_BYTES = 15 * 1024 * 1024; // máx. 15 MB por foto (el frontend envía ~0,5 MB)

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Recibe una foto: { nombre, mime, data (base64) } */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const mime = String(body.mime || '');
    if (mime.indexOf('image/') !== 0) return respuesta_({ ok: false, error: 'Solo se permiten imágenes' });

    const bytes = Utilities.base64Decode(body.data);
    if (bytes.length > MAX_BYTES) return respuesta_({ ok: false, error: 'La foto es demasiado grande' });

    const ext = mime === 'image/png' ? 'png' : 'jpg';
    const nombre = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const blob = Utilities.newBlob(bytes, mime, nombre);

    const archivo = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    CacheService.getScriptCache().removeAll(['lista_200']); // refresca la galería
    return respuesta_({ ok: true, id: archivo.getId() });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}

/**
 * Lista las fotos:  ?limit=200  (más recientes primero, con caché de 15 s)
 *                   ?all=1      (todas, de la más antigua a la más nueva; lo usa el script de video)
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
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
      if (f.getMimeType().indexOf('image/') === 0) lista.push({ id: f.getId(), t: f.getDateCreated().getTime() });
    }

    let files;
    if (todas) {
      files = lista.sort(function (a, b) { return a.t - b.t; });
    } else {
      files = lista.sort(function (a, b) { return b.t - a.t; }).slice(0, limite);
    }

    const json = JSON.stringify({ ok: true, files: files });
    if (!todas) cache.put(clave, json, 15);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}
