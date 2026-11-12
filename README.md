# Álbum de la boda (PWA, costo $0)

```
album-boda/
├── backend/Code.gs            # Google Apps Script (recibe y lista fotos en Drive)
├── video/
│   ├── generar_video.py       # descarga + redimensiona + FFmpeg
│   └── requirements.txt
└── web/                       # React + Vite + Tailwind v4 + PWA
```

## 1. Backend (Google Drive + Apps Script)
1. En Drive crea la carpeta **"Fotos boda"** → clic derecho → Compartir → *Cualquier persona con el enlace* → **Lector**.
2. Copia el ID de la carpeta (lo que va después de `/folders/` en la URL).
3. Entra a https://script.google.com → Nuevo proyecto → pega `backend/Code.gs` y cambia `FOLDER_ID`.
4. Implementar → Nueva implementación → tipo **Aplicación web** → Ejecutar como: **Yo** · Acceso: **Cualquier persona** → Implementar. Acepta los permisos (Advanced → Go to project).
5. Copia la URL que termina en `/exec`.
6. Si cambias el código más adelante: Implementar → *Administrar implementaciones* → editar → **Nueva versión** (la URL se conserva).

## 2. Web
```bash
cd web
cp .env.example .env        # pega tu URL /exec en VITE_APPS_SCRIPT_URL
npm install
npm run dev                 # prueba local
npm run build               # genera dist/
```
Edita nombres y fecha en `web/src/config.js`.

### Cámara desechable
- Cada invitado tiene un rollo de **36 fotos** (cámbialo en `web/src/config.js` → `ROLLO.fotos`). El contador se guarda en su celular; si borra los datos del navegador o usa otro, vuelve a empezar (no hay forma de impedirlo sin pedir cuentas a los invitados).
- Cada foto sale con el look de película (tonos cálidos, grano, viñeta) y el sello de fecha, y se envía sola, sin vista previa.
- Si el invitado abre la web desde el ícono de la pantalla de inicio, entra directo a la cámara.
- Las fotos de la galería no gastan del rollo y conservan los filtros y marcos (botón "Editar").

### Galería "revelada" al día siguiente, acceso de los novios y mensajes
- **Todos ven la galería**, pero hasta la hora de revelado los invitados solo ven **manchas de color borrosas** (un mosaico de 6x6 colores por foto). No es un efecto visual: el servidor **no les entrega** las fotos ni sus enlaces antes de esa hora, así que no hay forma de abrirlas.
- En `backend/Code.gs` pon **`REVELA_EN`** (por ejemplo `'2026-11-15T08:00:00-06:00'`: el día siguiente a las 8 a. m., hora de Guatemala) y tu **`CLAVE_NOVIOS`**. Despliega una **Nueva versión**. A la hora indicada la galería se aclara sola (se actualiza cada 30 s) y los invitados ya pueden abrir y guardar las fotos.
- Los novios entran con la dirección del álbum terminada en **`#novios`** y su clave: ven todo nítido desde el principio. El celular recuerda la clave; **Salir** la borra.
- Las fotos subidas antes de esta versión no traen mosaico: se ven como un recuadro oscuro hasta la hora de revelado.
- Cada invitado puede **dejar un mensaje** para los novios; se guarda como archivo de texto en la carpeta de Drive (`mensaje_….txt`), sin aparecer en la galería.
- Para bajar **todo de una vez**: en Drive, clic derecho sobre la carpeta → Descargar (genera un ZIP).
- Para comprobar la versión publicada y la hora de revelado: abre `TU_URL/exec?accion=version`.
- El script de video pide la clave: `python generar_video.py --url "…/exec" --clave "TU_CLAVE" --audio musica.mp3`.
- La cámara funciona en horizontal: el visor ocupa casi toda la pantalla y los controles pasan a la derecha.

### Colores y foto de los novios
- **Colores:** la web usa la paleta de la boda (`TEMA = 'boda'` en `web/src/temas.js`: café claro #B88C64, vino #7A3045, terracota #B75D3E, mostaza #C7943D, verde oliva #556B2F, verde oscuro #2F4F2F). Para probar otras, cambia `TEMA` por `'otono'`, `'bosque'`, `'burdeos'` o `'noche'`. Para colores propios edita `personalizado` y pon `TEMA = 'personalizado'`. Cambian toda la web, el ícono instalado y la barra del navegador. Los marcos de las fotos de la galería conservan sus colores otoñales.
- **Foto de los novios:** copia una foto (JPG, idealmente vertical y de menos de 300 KB) a `web/public/novios.jpg` y en `web/src/config.js` escribe `foto: 'novios.jpg'`. Se muestra en arco arriba, con el sello de cera abajo.

### Marca "Desarrollado por CodeBit"
Pega la dirección de tu página en `web/src/config.js` → `MARCA.url`. Aparece en dos lugares: una línea pequeña al pie de las pantallas "Subir foto" y "Galería", y una invitación ("¿Quiere un álbum así para su evento?") cuando el invitado termina su rollo. Los enlaces llevan parámetros UTM (`utm_source=album-boda`) para medir visitas.

### Videos y guardar en el celular
- En la cámara hay un interruptor **Foto / Video**. Se graban hasta 15 s comprimidos (≈ 5 MB) y cada video gasta 1 foto del rollo (`ROLLO.costoVideo` y `VIDEO` en `web/src/config.js`). Los videos no llevan el look de película.
- De la galería se aceptan videos de hasta 20 MB (`VIDEO.maxMB`); los más pesados se rechazan con un aviso. Es un límite del plan gratuito de Google Apps Script.
- En la **Galería**, al abrir una foto o video aparece **"Guardar en mi celular"** (abre el menú de compartir: "Guardar imagen/video").
- **Si los videos no se envían:** casi siempre es que Apps Script no tiene el código nuevo. Pega `backend/Code.gs` (conservando tu `FOLDER_ID`) y despliega una **Nueva versión**. La app ahora muestra debajo de "sin enviar" el motivo del error, y en Apps Script (menú **Ejecuciones**) se ve cada intento con su error.
- Si cambias `backend/Code.gs`: *Implementar → Administrar implementaciones → lápiz → Nueva versión*.
- El script `generar_video.py` solo usa las fotos; los videos del álbum se quedan en Drive.

### Cámara con filtros y marcos (solo para fotos de la galería)
- La cámara propia **solo funciona en HTTPS** (o en `localhost`). En la laptop usa `npm run dev`; para probarla desde el celular en tu Wi-Fi usa `npm run dev:https` y abre la dirección `https://192.168.x.x:5173` (el navegador avisará que el certificado no es de confianza: *Avanzado → Continuar*). Con Netlify ya es HTTPS.
- Filtros: `web/src/lib/filtros.js` · Marcos: `web/src/lib/marcos.js` · Textos de los marcos: `web/src/config.js`.

## 3. Despliegue en GitHub Pages
El repositorio incluye `.github/workflows/deploy.yml`: cada `git push` a `main` compila `web/` y lo publica.
1. Crea un repositorio **público** en GitHub y sube **toda** la carpeta `album-boda` (la carpeta `.github` debe quedar en la raíz del repo).
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. *Settings → Secrets and variables → Actions → pestaña Variables → New repository variable*:
   nombre `VITE_APPS_SCRIPT_URL`, valor tu URL `/exec`.
4. *Actions → Desplegar en GitHub Pages → Run workflow* (o haz un nuevo push).
5. La web queda en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/` (ya con HTTPS, necesario para la cámara).

## 4. QR / NFC
Genera un QR con la URL final (por ejemplo en qr-code-generator.com, gratis) y escribe la misma URL en una
etiqueta NFC con la app gratuita *NFC Tools*.

## 5. Video final
```bash
sudo apt install ffmpeg python3-venv
cd video && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python generar_video.py --url "https://script.google.com/macros/s/XXXX/exec" --audio musica.mp3
```
Opciones útiles: `--duracion 5 --fade 1.5 --resolucion 1280x720 --preset veryfast`.
Si prefieres, descarga la carpeta de Drive a mano y usa `--local ./fotos`.
