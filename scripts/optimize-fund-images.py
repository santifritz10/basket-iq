#!/usr/bin/env python3
"""
Optimiza las fotos de la academia de Fundamentos (herramienta local y gratuita: Pillow).

    python3 scripts/optimize-fund-images.py <carpeta-con-originales>

- Busca en la carpeta un archivo por clave (el nombre debe contener la palabra clave,
  por ejemplo "dribbling.png").
- Genera WebP sin metadatos en public/images/academy/fundamentals/ con un sufijo de
  contenido (cacheable para siempre) y reescribe el bloque <manifest> de
  js/fundamentos-media.js.
- Los originales NO se copian al repositorio.
"""
import hashlib, io, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images", "academy", "fundamentals")
MEDIA_JS = os.path.join(ROOT, "js", "fundamentos-media.js")

# clave -> palabra a buscar en el nombre del original
SOURCES = {
    "dribbling": "dribbling",
    "pase": "pase",
    "lanzamiento": "lanzamiento",
    "finalizacion": "finalizacion",
    "juego-pies": "juego_de_pies",
    "poste": "postebajo",
    "defensa": "defensa_individual",
    "rebote": "rebote",
    "portada": "portada",
}
# ancho x alto, calidad
SIZES = {"480": (480, 270, 80), "800": (800, 450, 82), "960": (960, 540, 82)}
HERO = {"1440": (1440, 600, 80), "800": (800, 560, 80)}
# punto de interés horizontal para recortes más angostos (la portada tiene al jugador a la derecha)
FOCUS_X = {"portada": 0.74}


def crop_to(im, w, h, fx=0.5, fy=0.5):
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = round(sw * scale), round(sh * scale)
    im = im.resize((nw, nh), Image.LANCZOS)
    left = min(max(round(nw * fx - w / 2), 0), nw - w)
    top = min(max(round(nh * fy - h / 2), 0), nh - h)
    return im.crop((left, top, left + w, top + h))


def save(im, key, size, q):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=q, method=6)  # sin exif/icc: no se pasan
    data = buf.getvalue()
    h = hashlib.sha1(data).hexdigest()[:8]
    name = f"{key}-{size}.{h}.webp"
    for old in os.listdir(OUT):
        if old.startswith(f"{key}-{size}.") and old != name:
            os.remove(os.path.join(OUT, old))
    with open(os.path.join(OUT, name), "wb") as f:
        f.write(data)
    return name, len(data)


def main(src):
    os.makedirs(OUT, exist_ok=True)
    files = os.listdir(src)
    manifest, report = {}, []
    for key, word in SOURCES.items():
        match = [f for f in files if word in f.lower()]
        if not match:
            continue
        path = os.path.join(src, match[0])
        im = Image.open(path).convert("RGB")
        entry = {"w": im.size[0], "h": im.size[1], "orig": os.path.getsize(path), "files": {}}
        sizes = HERO if key == "portada" else SIZES
        for size, (w, h, q) in sizes.items():
            name, b = save(crop_to(im, w, h, FOCUS_X.get(key, 0.5)), key, size, q)
            entry["files"][size] = [name, b]
        manifest[key] = entry
        report.append((key, match[0], entry))
    with open(MEDIA_JS, encoding="utf-8") as f:
        js = f.read()
    block = "// <manifest>\n    var MANIFEST = " + json.dumps(manifest, indent=1).replace("\n", "\n    ") + ";\n    // </manifest>"
    js = re.sub(r"// <manifest>.*?// </manifest>", lambda m: block, js, flags=re.S)
    with open(MEDIA_JS, "w", encoding="utf-8") as f:
        f.write(js)
    total = 0
    for key, orig, e in report:
        sz = ", ".join(f"{s}: {b/1024:.0f} KB" for s, (n, b) in e["files"].items())
        total += sum(b for n, b in e["files"].values())
        print(f"{key:13} {orig:32} {e['w']}x{e['h']} {e['orig']/1024:.0f} KB -> {sz}")
    print(f"Total optimizado: {total/1024:.0f} KB")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
