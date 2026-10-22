"""Registro por caso para el informe de servicios sociales: metadatos y eventos de la sesión del menor.

Un archivo JSON por caso (`casos_data/<id>.json`) en lugar de un único blob:

- Cada evento reescribe **solo su caso**. Antes se reserializaba el diccionario completo,
  y un caso con dibujos pesa ~50 KB (las imágenes van en base64).
- El caso es el agregado: `GET /api/casos/{id}` es la lectura de un archivo.

`caso_id` llega del query string (`?caso=`), así que se valida antes de usarlo como nombre de
archivo: sin eso es path traversal (`../../etc/passwd`).

El proceso es único (uvicorn sin --workers) pero FastAPI atiende en un pool de hilos, así que
todo acceso al diccionario va bajo el mismo lock, incluidas las lecturas: `get()` devuelve una
copia, porque serializar el dict vivo mientras otro hilo lo muta revienta con
"dictionary changed size during iteration".
"""
import copy
import json
import logging
import os
import re
import threading
from typing import Any, Dict, Optional

logger = logging.getLogger("chavales.casos")

# Ids que llegan por la URL. Deliberadamente estrecho: es un nombre de archivo.
PATRON_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

MAX_EVENTOS = 5000


def es_id_valido(caso_id: object) -> bool:
    return isinstance(caso_id, str) and bool(PATRON_ID.match(caso_id))


def _data_dir_por_defecto() -> str:
    # CASOS_DIR permite apuntar al volumen sin symlinks (ver deploy/backend-entrypoint.sh)
    return os.environ.get("CASOS_DIR") or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "casos_data"
    )


DATA_DIR = _data_dir_por_defecto()
# Store monolítico anterior. Solo se lee una vez, para migrar, y se renombra.
LEGACY_FILE = os.environ.get("CASOS_LEGACY_FILE") or os.path.join(
    os.path.dirname(DATA_DIR.rstrip(os.sep)), "casos_data.json"
)


class CasoStore:
    def __init__(self, data_dir: Optional[str] = None, legacy_file: Optional[str] = None) -> None:
        self._lock = threading.Lock()
        self._dir = data_dir or DATA_DIR
        self._legacy = legacy_file if legacy_file is not None else LEGACY_FILE
        self._casos: Dict[str, Dict[str, Any]] = {}
        os.makedirs(self._dir, exist_ok=True)
        with self._lock:
            self._migrar_legacy()
            self._cargar()

    # -- rutas ----------------------------------------------------------------

    def _ruta(self, caso_id: str) -> str:
        if not es_id_valido(caso_id):
            raise ValueError(f"Identificador de caso no válido: {caso_id!r}")
        return os.path.join(self._dir, f"{caso_id}.json")

    # -- internos: se llaman siempre con el lock tomado ------------------------

    def _cargar(self) -> None:
        for nombre in sorted(os.listdir(self._dir)):
            if not nombre.endswith(".json"):
                continue
            caso_id = nombre[: -len(".json")]
            if not es_id_valido(caso_id):
                logger.warning("Ignorando archivo con id no válido: %s", nombre)
                continue
            ruta = os.path.join(self._dir, nombre)
            try:
                with open(ruta, encoding="utf-8") as f:
                    caso = json.load(f)
            except (OSError, ValueError) as exc:
                logger.warning("No se pudo leer %s: %s", ruta, exc)
                continue
            if isinstance(caso, dict) and "eventos" in caso:
                self._casos[caso_id] = caso
            else:
                logger.warning("Ignorando %s: no tiene forma de caso", ruta)

    def _migrar_legacy(self) -> None:
        """Importa casos_data.json una sola vez y lo renombra a .migrado."""
        if not self._legacy or not os.path.exists(self._legacy):
            return
        try:
            with open(self._legacy, encoding="utf-8") as f:
                datos = json.load(f)
        except (OSError, ValueError) as exc:
            logger.error("No se pudo migrar %s: %s", self._legacy, exc)
            return
        if not isinstance(datos, dict):
            logger.error("No se migra %s: no es un objeto", self._legacy)
            return

        migrados = omitidos = 0
        for caso_id, caso in datos.items():
            if not es_id_valido(caso_id) or not isinstance(caso, dict):
                omitidos += 1
                continue
            ruta = self._ruta(caso_id)
            if os.path.exists(ruta):
                omitidos += 1  # ya existe uno más nuevo: no se pisa
                continue
            self._escribir(caso_id, caso)
            migrados += 1

        os.replace(self._legacy, f"{self._legacy}.migrado")
        logger.info(
            "Migrados %s casos a %s (%s omitidos); %s renombrado a .migrado",
            migrados, self._dir, omitidos, self._legacy,
        )

    def _escribir(self, caso_id: str, caso: Dict[str, Any]) -> None:
        ruta = self._ruta(caso_id)
        tmp = f"{ruta}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(caso, f, ensure_ascii=False)
        os.replace(tmp, ruta)

    def _caso(self, caso_id: str) -> Dict[str, Any]:
        return self._casos.setdefault(caso_id, {"id": caso_id, "meta": {}, "eventos": []})

    # -- API pública ----------------------------------------------------------

    def set_meta(self, caso_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        self._ruta(caso_id)  # valida el id antes de tocar nada
        with self._lock:
            caso = self._caso(caso_id)
            caso["meta"] = {**caso["meta"], **meta}
            self._escribir(caso_id, caso)
            return copy.deepcopy(caso)

    def add_evento(self, caso_id: str, evento: Dict[str, Any]) -> int:
        self._ruta(caso_id)
        with self._lock:
            caso = self._caso(caso_id)
            # El dibujo se guarda como última instantánea: evita duplicar imágenes en cada sincronización
            if evento.get("kind") == "dibujo":
                caso["eventos"] = [e for e in caso["eventos"] if e.get("kind") != "dibujo"]
            caso["eventos"].append(evento)
            caso["eventos"] = caso["eventos"][-MAX_EVENTOS:]
            self._escribir(caso_id, caso)
            return len(caso["eventos"])

    def get(self, caso_id: str) -> Optional[Dict[str, Any]]:
        if not es_id_valido(caso_id):
            return None
        with self._lock:
            caso = self._casos.get(caso_id)
            return copy.deepcopy(caso) if caso is not None else None

    def listar(self) -> list:
        with self._lock:
            return [
                {"id": c["id"], "meta": dict(c["meta"]), "eventos": len(c["eventos"])}
                for c in self._casos.values()
            ]


caso_store = CasoStore()
