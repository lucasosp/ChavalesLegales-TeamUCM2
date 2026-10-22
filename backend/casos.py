"""Registro por caso para el informe de servicios sociales: metadatos y eventos de la sesión del menor.

El proceso es único (uvicorn sin --workers) pero FastAPI atiende en un pool de hilos, así que
todo acceso al diccionario va bajo el mismo lock, incluidas las lecturas: `get()` devuelve una
copia, porque serializar el dict vivo mientras otro hilo lo muta revienta con
"dictionary changed size during iteration".
"""
import copy
import json
import os
import threading
from typing import Any, Dict, Optional

DATA_FILE = os.path.join(os.path.dirname(__file__), "casos_data.json")
MAX_EVENTOS = 5000


class CasoStore:
    def __init__(self, data_file: Optional[str] = None) -> None:
        self._lock = threading.Lock()
        self._data_file = data_file or DATA_FILE
        self._casos: Dict[str, Dict[str, Any]] = {}
        if os.path.exists(self._data_file):
            try:
                with open(self._data_file, encoding="utf-8") as f:
                    self._casos = json.load(f)
            except (OSError, ValueError):
                self._casos = {}

    # -- internos: se llaman siempre con el lock tomado ------------------------

    def _save(self) -> None:
        tmp = f"{self._data_file}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._casos, f, ensure_ascii=False)
        os.replace(tmp, self._data_file)

    def _caso(self, caso_id: str) -> Dict[str, Any]:
        return self._casos.setdefault(caso_id, {"id": caso_id, "meta": {}, "eventos": []})

    # -- API pública ----------------------------------------------------------

    def set_meta(self, caso_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            caso = self._caso(caso_id)
            caso["meta"] = {**caso["meta"], **meta}
            self._save()
            return copy.deepcopy(caso)

    def add_evento(self, caso_id: str, evento: Dict[str, Any]) -> int:
        with self._lock:
            caso = self._caso(caso_id)
            # El dibujo se guarda como última instantánea: evita duplicar imágenes en cada sincronización
            if evento.get("kind") == "dibujo":
                caso["eventos"] = [e for e in caso["eventos"] if e.get("kind") != "dibujo"]
            caso["eventos"].append(evento)
            caso["eventos"] = caso["eventos"][-MAX_EVENTOS:]
            self._save()
            return len(caso["eventos"])

    def get(self, caso_id: str) -> Optional[Dict[str, Any]]:
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
