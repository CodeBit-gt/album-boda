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

### Cámara con filtros y marcos
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
