"""Convierte las ilustraciones de la novela a WebP: de ~23 MB a ~2 MB sin diferencia visible.

    pip install pillow
    python scripts/optimizar-imagenes.py

- images/*.png (personajes): MISMAS dimensiones en píxeles. `characterImages.js` encuadra
  cada retrato con coordenadas en píxeles de la imagen original, así que no se reescalan.
- fotoss/* y LegalinStory/public/assets/backgrounds/photos/* (fondos): se limitan a 1920 px
  de ancho, que es el escenario de la novela (1920x1080, fit cover).

Los originales se quedan donde están como fuente; el código solo referencia los .webp.
Es idempotente: no vuelve a convertir lo que ya tiene un .webp más nuevo.
"""
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ANCHO_FONDO = 1920


def convertir(origen: Path, ancho_max=None, calidad=82):
    destino = origen.with_suffix(".webp")
    if destino.exists() and destino.stat().st_mtime >= origen.stat().st_mtime:
        return None
    with Image.open(origen) as im:
        if ancho_max and im.width > ancho_max:
            alto = round(im.height * ancho_max / im.width)
            im = im.resize((ancho_max, alto), Image.LANCZOS)
        tiene_alfa = im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode == "RGBA"
        im = im.convert("RGBA" if tiene_alfa else "RGB")
        im.save(destino, "WEBP", quality=calidad, alpha_quality=95, method=6)
    return origen.stat().st_size, destino.stat().st_size


def main():
    trabajos = [(p, None, 84) for p in sorted((RAIZ / "images").glob("*.png"))]
    fondos = sorted((RAIZ / "fotoss").glob("*")) + sorted((RAIZ / "LegalinStory/public/assets/backgrounds/photos").glob("*.jpg"))
    trabajos += [(p, ANCHO_FONDO, 78) for p in fondos if p.suffix.lower() in (".jpg", ".png")]
    antes = despues = 0
    for ruta, ancho, calidad in trabajos:
        r = convertir(ruta, ancho, calidad)
        if r:
            antes += r[0]
            despues += r[1]
            print(f"{ruta.relative_to(RAIZ)}: {r[0] // 1024} KB -> {r[1] // 1024} KB")
    print(f"Total: {antes // 1024} KB -> {despues // 1024} KB")


if __name__ == "__main__":
    main()
