"""Registro por caso para el informe de servicios sociales: metadatos y eventos de la sesión del menor."""
import json
import os
import threading
from typing import Any, Dict, Optional

DATA_FILE = os.path.join(os.path.dirname(__file__), "casos_data.json")
MAX_EVENTOS = 5000


class CasoStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._casos: Dict[str, Dict[str, Any]] = {}
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, encoding="utf-8") as f:
                    self._casos = json.load(f)
            except (OSError, ValueError):
                self._casos = {}

    def _save(self) -> None:
        tmp = f"{DATA_FILE}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._casos, f, ensure_ascii=False)
        os.replace(tmp, DATA_FILE)

    def _get(self, caso_id: str) -> Dict[str, Any]:
        return self._casos.setdefault(caso_id, {"id": caso_id, "meta": {}, "eventos": []})

    def set_meta(self, caso_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            caso = self._get(caso_id)
            caso["meta"] = {**caso["meta"], **meta}
            self._save()
            return caso

    def add_evento(self, caso_id: str, evento: Dict[str, Any]) -> int:
        with self._lock:
            caso = self._get(caso_id)
            # El dibujo se guarda como última instantánea: evita duplicar imágenes en cada sincronización
            if evento.get("kind") == "dibujo":
                caso["eventos"] = [e for e in caso["eventos"] if e.get("kind") != "dibujo"]
            caso["eventos"].append(evento)
            caso["eventos"] = caso["eventos"][-MAX_EVENTOS:]
            self._save()
            return len(caso["eventos"])

    def get(self, caso_id: str) -> Optional[Dict[str, Any]]:
        return self._casos.get(caso_id)

    def listar(self):
        return [{"id": c["id"], "meta": c["meta"], "eventos": len(c["eventos"])} for c in self._casos.values()]


caso_store = CasoStore()
