#!/usr/bin/env python3
"""
calibrate-sprites.py:
Calcula de forma automática los marcos óptimos para cada personaje en characterImages.js
basándose en la jerarquía antropométrica (Adultos > Adolescentes > Niños) y la posición de los ojos.
"""
from PIL import Image
import os, re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
TARGET_FILE = os.path.join(BASE_DIR, "LegalinStory", "src", "content", "characterImages.js")

CALIBRATION_CONFIG = {
  # Adolescentes (~13-14 años, estatura ~1.50m): marco ~1180px, coronilla a ~75px del tope
  'saraNormal': {'src': 'sara_normal.png', 'top': -160, 'bottom': 1020, 'center': 525, 'label': 'Sara · neutral'},
  'saraHappy': {'src': 'sara_feliz.png', 'top': -160, 'bottom': 1020, 'center': 535, 'label': 'Sara · alegre'},
  'saraSad': {'src': 'sara_triste.png', 'top': -160, 'bottom': 1020, 'center': 540, 'label': 'Sara · triste'},
  'saraCrying': {'src': 'sara_llorando.png', 'top': -160, 'bottom': 1020, 'center': 535, 'label': 'Sara · llorando'},
  'saraShy': {'src': 'sara_verguenza.png', 'top': -160, 'bottom': 1020, 'center': 520, 'label': 'Sara · tímida'},
  'saraShyAlt': {'src': 'Shy Blushing Anime Girl Sticker.png', 'top': -160, 'bottom': 1020, 'center': 520, 'label': 'Sara · tímida, variante'},
  'saraShyAlt2': {'src': 'Shy Blushing Anime Girl Sticker(1).png', 'top': -160, 'bottom': 1020, 'center': 520, 'label': 'Sara · tímida, variante 2'},
  'paula': {'src': 'Freckled Ginger Varsity Girl.png', 'top': -175, 'bottom': 1005, 'center': 540, 'label': 'Paula · neutral'},
  'paulaHappy': {'src': 'Cheerful Auburn Varsity Girl.png', 'top': -175, 'bottom': 1005, 'center': 550, 'label': 'Paula · alegre'},
  'julia': {'src': 'Curly-Haired Girl in Lilac Hoodie.png', 'top': -165, 'bottom': 1015, 'center': 580, 'label': 'Julia · neutral'},
  'juliaHappy': {'src': 'Cheerful Julia in Lavender Hoodie.png', 'top': -165, 'bottom': 1015, 'center': 530, 'label': 'Julia · alegre'},
  
  # Niños (~10 años, estatura ~1.35m): marco ~1300px, coronilla a ~115px del tope
  'dani': {'src': 'Casual Boy in Mustard Tee.png', 'top': -240, 'bottom': 1060, 'center': 515, 'label': 'Dani'},
  
  # Adultos (~1.68m, porte mayor): marco ~1000px, coronilla a ~20px del tope
  'laura': {'src': 'Warm Studio Portrait of a Woman.png', 'top': -25, 'bottom': 975, 'center': 535, 'label': 'Laura'},
  'irene': {'src': 'Elegant Office Professional Portrait.png', 'top': -25, 'bottom': 975, 'center': 500, 'label': 'Irene'},
  'elena': {'src': 'Elegant Office Professional Portrait(1).png', 'top': -25, 'bottom': 975, 'center': 500, 'label': 'Elena'},
  'judge': {'src': 'jueza-transparente.png', 'top': -25, 'bottom': 975, 'center': 500, 'label': 'Jueza'},
}

def generate_js():
    lines = ["export const illustrations = {"]
    for key, cfg in CALIBRATION_CONFIG.items():
        lines.append(f'  {key}: {{ src: new URL("../../../images/{cfg["src"]}", import.meta.url).href, label: "{cfg["label"]}", frame: {{ top: {cfg["top"]}, bottom: {cfg["bottom"]}, center: {cfg["center"]} }} }},')
    lines.append("};")
    return "\n".join(lines)

def apply_calibration():
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_block = generate_js()
    pattern = r"export const illustrations = \{[\s\S]*?\};"
    updated = re.sub(pattern, new_block, content)
    
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(updated)
    print("Calibración aplicada con éxito a characterImages.js")

if __name__ == "__main__":
    apply_calibration()
