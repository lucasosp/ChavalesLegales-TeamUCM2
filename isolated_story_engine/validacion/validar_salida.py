"""Valida la salida del prototipo con el VALIDADOR REAL del motor (solo lectura).

Escribe las historias en una raíz temporal DENTRO de isolated_story_engine/ (.validacion_tmp/, no se
versiona), copia allí los recursos del motor (public/assets, solo lectura) y ejecuta
LegalinStory/scripts/validate-content.mjs contra esa raíz. No modifica nada de LegalinStory.
"""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
PROTOTIPO = CARPETA.parent
REPO = PROTOTIPO.parent
VALIDADOR = REPO / "LegalinStory" / "scripts" / "validate-content.mjs"
ASSETS_DEL_MOTOR = REPO / "LegalinStory" / "public" / "assets"
TMP = PROTOTIPO / ".validacion_tmp"


def disponible() -> bool:
    return bool(shutil.which("node")) and VALIDADOR.exists() and ASSETS_DEL_MOTOR.exists()


def validar_con_motor(salidas: list) -> dict:
    """`salidas`: lista de resultados de `exportar`. Devuelve {ok, errores, avisos, stats}."""
    if not disponible():
        raise RuntimeError("No hay node o no se encuentra LegalinStory: no se puede usar el validador del motor")
    TMP.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=TMP) as tmp:
        raiz = Path(tmp)
        shutil.copytree(ASSETS_DEL_MOTOR, raiz / "public" / "assets", ignore=shutil.ignore_patterns("photos"))
        contenido = raiz / "public" / "content"
        for salida in salidas:
            carpeta = contenido / "stories" / salida["story_id"]
            carpeta.mkdir(parents=True)
            for nombre, datos in salida["archivos"].items():
                (carpeta / nombre).write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
        (contenido / "index.json").write_text(
            json.dumps({"version": 1, "stories": [s["indice"] for s in salidas]}, ensure_ascii=False), encoding="utf-8")
        proceso = subprocess.run(["node", str(CARPETA / "validar.mjs"), str(raiz)],
                                 capture_output=True, text=True, encoding="utf-8", timeout=120)
        lineas = [l for l in proceso.stdout.strip().splitlines() if l.startswith("{")]
        if not lineas:
            raise RuntimeError(f"El validador no respondió: {proceso.stderr[-500:]}")
        return json.loads(lineas[-1])
