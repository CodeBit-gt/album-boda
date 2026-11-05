#!/usr/bin/env python3
"""
Genera un video slideshow (.mp4) con las fotos del álbum de la boda.

Pasos: descarga las fotos -> las deja todas del mismo tamaño (con fondo desenfocado,
sin recortar a nadie) -> FFmpeg las une con fundido cruzado -> añade música de fondo.

Uso rápido:
    python generar_video.py --url "https://script.google.com/macros/s/XXXX/exec" --audio musica.mp3

Requisitos: FFmpeg instalado (sudo apt install ffmpeg) y `pip install -r requirements.txt`.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import requests
from PIL import Image, ImageFilter, ImageOps
from tqdm import tqdm

EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp"}


# ───────────────────────────── Descarga ─────────────────────────────
def listar_fotos(url: str) -> list[dict]:
    r = requests.get(url, params={"all": "1"}, timeout=180)
    r.raise_for_status()
    datos = r.json()
    if not datos.get("ok"):
        sys.exit(f"Apps Script respondió con error: {datos.get('error')}")
    return datos["files"]  # ya vienen ordenadas de la más antigua a la más nueva


def descargar_foto(file_id: str, destino: Path, sesion: requests.Session) -> bool:
    """Intenta primero el servidor de imágenes de Google (rápido) y luego la descarga directa."""
    urls = [
        f"https://lh3.googleusercontent.com/d/{file_id}=w2400",
        f"https://drive.google.com/uc?export=download&id={file_id}",
    ]
    for u in urls:
        for _ in range(3):
            try:
                r = sesion.get(u, timeout=60)
                if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/"):
                    destino.write_bytes(r.content)
                    Image.open(destino).verify()  # comprueba que no esté corrupta
                    return True
            except Exception:
                pass
    destino.unlink(missing_ok=True)
    return False


def descargar_todas(url: str, carpeta: Path) -> list[Path]:
    carpeta.mkdir(parents=True, exist_ok=True)
    fotos = listar_fotos(url)
    print(f"Fotos en el álbum: {len(fotos)}")
    rutas, fallidas = [], 0
    with requests.Session() as sesion:
        for i, f in enumerate(tqdm(fotos, desc="Descargando", unit="foto")):
            ruta = carpeta / f"{i:05d}_{f['id']}.jpg"
            if ruta.exists() or descargar_foto(f["id"], ruta, sesion):
                rutas.append(ruta)
            else:
                fallidas += 1
    if fallidas:
        print(f"Aviso: {fallidas} foto(s) no se pudieron descargar y se omiten.")
    return rutas


# ───────────────────────── Tamaño uniforme ─────────────────────────
def normalizar(origen: Path, destino: Path, ancho: int, alto: int) -> None:
    """Pone la foto completa centrada sobre un fondo con la misma foto desenfocada."""
    if destino.exists():
        return
    with Image.open(origen) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        fondo = ImageOps.fit(im, (ancho, alto), Image.LANCZOS)
        fondo = fondo.filter(ImageFilter.GaussianBlur(35)).point(lambda p: int(p * 0.55))
        frente = ImageOps.contain(im, (ancho, alto), Image.LANCZOS)
        fondo.paste(frente, ((ancho - frente.width) // 2, (alto - frente.height) // 2))
        fondo.save(destino, "JPEG", quality=92)


def normalizar_todas(rutas: list[Path], carpeta: Path, ancho: int, alto: int) -> list[Path]:
    carpeta.mkdir(parents=True, exist_ok=True)
    salida = []
    for r in tqdm(rutas, desc="Redimensionando", unit="foto"):
        destino = carpeta / (r.stem + ".jpg")
        try:
            normalizar(r, destino, ancho, alto)
            salida.append(destino)
        except Exception as e:
            print(f"Se omite {r.name}: {e}")
    return salida


# ─────────────────────────────── FFmpeg ───────────────────────────────
def ejecutar(cmd: list[str]) -> None:
    resultado = subprocess.run(cmd, stdin=subprocess.DEVNULL)
    if resultado.returncode != 0:
        sys.exit("FFmpeg falló. Revisa el mensaje de arriba.")


def renderizar_lote(fotos: list[Path], salida: Path, *, dur: float, fade: float, fps: int,
                    primera_dur: float, recorte_frames: int | None, fade_in: bool,
                    fade_out: bool, preset: str, crf: int) -> None:
    """
    Una sola llamada a FFmpeg con una cadena de `xfade` (fundido cruzado) entre las fotos del lote.
    La foto i (i>=1) empieza a aparecer en: offset_i = (primera_dur - fade) + (i-1) * (dur - fade)
    """
    cmd = ["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-stats"]
    for i, f in enumerate(fotos):
        d = primera_dur if i == 0 else dur
        cmd += ["-loop", "1", "-framerate", str(fps), "-t", f"{d:.3f}", "-i", str(f)]

    partes = [f"[{i}:v]format=yuv420p,setsar=1[v{i}]" for i in range(len(fotos))]
    ultimo = "v0"
    for i in range(1, len(fotos)):
        offset = (primera_dur - fade) + (i - 1) * (dur - fade)
        destino = f"x{i}"
        partes.append(f"[{ultimo}][v{i}]xfade=transition=fade:duration={fade}:offset={offset:.3f}[{destino}]")
        ultimo = destino

    extra = []
    total = primera_dur + (len(fotos) - 1) * (dur - fade)
    if fade_in:
        extra.append(f"fade=t=in:st=0:d={fade}")
    if fade_out:
        extra.append(f"fade=t=out:st={total - fade:.3f}:d={fade}")
    if extra:
        partes.append(f"[{ultimo}]{','.join(extra)}[vout]")
        ultimo = "vout"

    cmd += ["-filter_complex", ";".join(partes), "-map", f"[{ultimo}]"]
    if recorte_frames:
        cmd += ["-frames:v", str(recorte_frames)]
    cmd += ["-r", str(fps), "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-an", str(salida)]
    ejecutar(cmd)


def crear_video_sin_audio(fotos: list[Path], salida: Path, tmp: Path, args) -> float:
    dur, fade, fps = args.duracion, args.fade, args.fps
    n = len(fotos)
    lote = max(2, args.lote)
    clips: list[Path] = []
    inicios = list(range(0, n, lote))

    for k, ini in enumerate(tqdm(inicios, desc="Renderizando lotes", unit="lote")):
        propias = fotos[ini:ini + lote]
        hay_siguiente = ini + lote < n
        grupo = propias + ([fotos[ini + lote]] if hay_siguiente else [])
        es_primero, es_ultimo = k == 0, not hay_siguiente

        # El primer lote muestra su primera foto completa; los demás empiezan ya "dentro" de la foto
        # (el fundido de entrada se hizo en el lote anterior) y la acortan para no alargarla.
        primera_dur = dur if es_primero else dur - fade
        recorte = None
        if hay_siguiente:
            # La foto extra termina de aparecer en offset_{m-1} + fade; ahí cortamos el lote.
            m = len(grupo)
            t_corte = (primera_dur - fade) + (m - 2) * (dur - fade) + fade
            recorte = round(t_corte * fps)

        clip = tmp / f"lote_{k:04d}.mp4"
        renderizar_lote(grupo, clip, dur=dur, fade=fade, fps=fps, primera_dur=primera_dur,
                        recorte_frames=recorte, fade_in=es_primero, fade_out=es_ultimo,
                        preset=args.preset, crf=args.crf)
        clips.append(clip)

    lista = tmp / "lotes.txt"
    lista.write_text("".join(f"file '{c.resolve()}'\n" for c in clips), encoding="utf-8")
    ejecutar(["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-f", "concat", "-safe", "0",
              "-i", str(lista), "-c", "copy", str(salida)])
    return dur + (n - 1) * (dur - fade)


def agregar_audio(video: Path, audio: Path, salida: Path, duracion: float) -> None:
    """Repite la música si es más corta que el video y la apaga con fundido al final."""
    fade_audio = min(3.0, duracion / 4)
    af = f"afade=t=in:st=0:d=2,afade=t=out:st={max(0, duracion - fade_audio):.2f}:d={fade_audio:.2f}"
    ejecutar(["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-i", str(video),
              "-stream_loop", "-1", "-i", str(audio),
              "-map", "0:v", "-map", "1:a", "-af", af, "-t", f"{duracion:.2f}",
              "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(salida)])


# ──────────────────────────────── Main ────────────────────────────────
def main() -> None:
    p = argparse.ArgumentParser(description="Video slideshow del álbum de la boda")
    fuente = p.add_mutually_exclusive_group(required=True)
    fuente.add_argument("--url", help="URL /exec de Apps Script (descarga las fotos del álbum)")
    fuente.add_argument("--local", type=Path, help="Carpeta con fotos ya descargadas (omite la descarga)")
    p.add_argument("--audio", type=Path, help="Pista de fondo (mp3, m4a, wav…)")
    p.add_argument("--salida", type=Path, default=Path("boda_slideshow.mp4"))
    p.add_argument("--trabajo", type=Path, default=Path("trabajo"), help="Carpeta temporal (permite reanudar)")
    p.add_argument("--resolucion", default="1920x1080", help="Ancho x alto, p. ej. 1280x720")
    p.add_argument("--duracion", type=float, default=4.0, help="Segundos por foto (incluye el fundido)")
    p.add_argument("--fade", type=float, default=1.0, help="Segundos de fundido entre fotos")
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--lote", type=int, default=30, help="Fotos por llamada a FFmpeg (memoria)")
    p.add_argument("--preset", default="medium", help="Velocidad de x264: ultrafast…veryslow")
    p.add_argument("--crf", type=int, default=20, help="Calidad: menor = mejor (18–23)")
    args = p.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("No se encontró FFmpeg. Instálalo con: sudo apt install ffmpeg")
    if args.fade * 2 >= args.duracion:
        sys.exit("--duracion debe ser mayor que el doble de --fade")
    try:
        ancho, alto = (int(x) for x in args.resolucion.lower().split("x"))
    except ValueError:
        sys.exit("--resolucion debe tener el formato 1920x1080")
    if ancho % 2 or alto % 2:
        sys.exit("Ancho y alto deben ser pares")
    if args.audio and not args.audio.is_file():
        sys.exit(f"No existe el archivo de audio: {args.audio}")

    if args.local:
        originales = sorted(f for f in args.local.iterdir() if f.suffix.lower() in EXTENSIONES)
    else:
        originales = descargar_todas(args.url, args.trabajo / "originales")
    if not originales:
        sys.exit("No hay fotos para procesar.")

    fotos = normalizar_todas(originales, args.trabajo / f"{ancho}x{alto}", ancho, alto)
    sin_audio = args.trabajo / "video_sin_audio.mp4"
    duracion = crear_video_sin_audio(fotos, sin_audio, args.trabajo, args)

    if args.audio:
        agregar_audio(sin_audio, args.audio, args.salida, duracion)
    else:
        print("Sin --audio: el video queda sin música.")
        shutil.copyfile(sin_audio, args.salida)

    print(f"\n✔ Listo: {args.salida}  ({len(fotos)} fotos, {duracion/60:.1f} min)")


if __name__ == "__main__":
    main()
