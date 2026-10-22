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
import time
from typing import Any, Dict, Optional

logger = logging.getLogger("chavales.casos")

# Ids que llegan por la URL. Deliberadamente estrecho: es un nombre de archivo.
PATRON_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

MAX_EVENTOS = 5000

# Casos de ejemplo: se pueden leer pero nunca se modifican. El informe de DEMO se enseña tal
# cual, y quien juegue sin código lo hace en un caso nuevo (lo decide la web: ver casoDesdeUrl).
# Se compara en mayúsculas porque en Windows `demo.json` y `DEMO.json` son el mismo archivo.
CASOS_SOLO_LECTURA = frozenset({"DEMO"})


def es_solo_lectura(caso_id: str) -> bool:
    return isinstance(caso_id, str) and caso_id.upper() in CASOS_SOLO_LECTURA


# El DEMO que ven todos los usuarios vive en el repo (backend/demo/DEMO.json) y se siembra al
# arrancar: casos_data/ es estado de runtime (en producción, un volumen) y no se versiona.
DEMO_ID = "DEMO"
DEMO_FIXTURE = os.environ.get("CASOS_DEMO_FILE") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "demo", "DEMO.json"
)
# Las partidas sin código se juegan en casos `PRUEBA-<dígitos>` (lo decide la web: casoDesdeUrl).
PREFIJO_PRUEBA = "PRUEBA-"

# Version del esquema del caso. Se escribe en cada caso; los antiguos se marcan como 1 al leerlos.
# 2 = los eventos llevan 't_servidor' (reloj del servidor) y el caso lleva 'schemaVersion'.
ESQUEMA_VERSION = 2

# Tipos de evento que entiende el informe. Un 'kind' desconocido no se rechaza (la novela
# podria emitir uno nuevo antes de que el informe lo entienda) pero se registra en el log.
KINDS_CONOCIDOS = frozenset({
    "inicio", "salida", "progreso", "decision",
    "minijuego-inicio", "minijuego", "dibujo",
})


def es_id_valido(caso_id: object) -> bool:
    return isinstance(caso_id, str) and bool(PATRON_ID.match(caso_id))


def ahora_ms() -> int:
    return time.time_ns() // 1_000_000


def validar_evento(evento: object) -> Dict[str, Any]:
    """Comprueba la forma del evento. Lanza ValueError si no es un evento.

    No se valida el contenido de 'data': cambia por tipo y lo define la novela. Lo que si se
    garantiza es la forma, para que analisis.js nunca reciba algo que no sabe leer.
    """
    if not isinstance(evento, dict):
        raise ValueError("El evento debe ser un objeto")
    kind = evento.get("kind")
    if not isinstance(kind, str) or not kind:
        raise ValueError("El evento necesita un 'kind' de texto")
    data = evento.get("data", {})
    if not isinstance(data, dict):
        raise ValueError("El campo 'data' del evento debe ser un objeto")
    t = evento.get("t")
    if t is not None and not isinstance(t, (int, float)):
        raise ValueError("El campo 't' del evento debe ser numerico")
    if kind not in KINDS_CONOCIDOS:
        logger.warning("Evento con kind desconocido: %r", kind)
    return {
        **evento,
        "data": data,
        # Reloj del servidor: las duraciones del informe no pueden depender del reloj del
        # navegador del menor (reloj mal puesto, pestaña suspendida).
        "t_servidor": evento.get("t_servidor") or ahora_ms(),
    }


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
    def __init__(
        self,
        data_dir: Optional[str] = None,
        legacy_file: Optional[str] = None,
        demo_file: Optional[str] = None,
    ) -> None:
        self._lock = threading.Lock()
        self._dir = data_dir or DATA_DIR
        self._legacy = legacy_file if legacy_file is not None else LEGACY_FILE
        self._casos: Dict[str, Dict[str, Any]] = {}
        os.makedirs(self._dir, exist_ok=True)
        with self._lock:
            self._migrar_legacy()
            self._cargar()
            self._sembrar_demo(demo_file)

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
                caso.setdefault("schemaVersion", 1)  # anterior a t_servidor
                self._casos[caso_id] = caso
            else:
                logger.warning("Ignorando %s: no tiene forma de caso", ruta)

    def _sembrar_demo(self, ruta: Optional[str]) -> None:
        """Deja el caso DEMO igual que el archivo versionado.

        Se reemplaza cuando falta o cuando no coincide con el archivo (distinta `meta.semilla` o
        distinto número de eventos). Al sembrar una versión nueva también se vacían las partidas
        de prueba (`PRUEBA-*`): eran partidas contra la versión anterior. Los casos reales
        (`CL-*`) no se tocan nunca.
        """
        if not ruta or not os.path.exists(ruta):
            return
        try:
            with open(ruta, encoding="utf-8") as f:
                demo = json.load(f)
        except (OSError, ValueError) as exc:
            logger.warning("No se pudo leer el caso de ejemplo %s: %s", ruta, exc)
            return
        if not isinstance(demo, dict) or not isinstance(demo.get("eventos"), list):
            logger.warning("Ignorando %s: no tiene forma de caso", ruta)
            return

        actual = self._casos.get(DEMO_ID)
        if (
            actual is not None
            and actual.get("meta", {}).get("semilla") == demo.get("meta", {}).get("semilla")
            and len(actual.get("eventos", [])) == len(demo["eventos"])
        ):
            return

        demo["id"] = DEMO_ID
        demo.setdefault("meta", {})
        demo.setdefault("schemaVersion", ESQUEMA_VERSION)
        self._casos[DEMO_ID] = demo
        self._escribir(DEMO_ID, demo)

        borradas = 0
        for caso_id in [c for c in self._casos if c.startswith(PREFIJO_PRUEBA)]:
            del self._casos[caso_id]
            try:
                os.remove(self._ruta(caso_id))
            except FileNotFoundError:
                pass
            borradas += 1
        logger.info(
            "Caso de ejemplo %s sembrado desde %s (%s eventos); %s partidas de prueba vaciadas",
            DEMO_ID, ruta, len(demo["eventos"]), borradas,
        )

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

    @staticmethod
    def _rechazar_si_solo_lectura(caso_id: str) -> None:
        if es_solo_lectura(caso_id):
            raise PermissionError(f"El caso {caso_id} es un ejemplo de solo lectura")

    def _caso(self, caso_id: str) -> Dict[str, Any]:
        return self._casos.setdefault(
            caso_id,
            {"id": caso_id, "meta": {}, "eventos": [], "schemaVersion": ESQUEMA_VERSION},
        )

    # -- API pública ----------------------------------------------------------

    def set_meta(self, caso_id: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        self._ruta(caso_id)  # valida el id antes de tocar nada
        self._rechazar_si_solo_lectura(caso_id)
        # Filtrar datos de carácter personal directo del menor (nombre de pila)
        datos_meta = {k: v for k, v in meta.items() if k != "nombreJoven"}
        with self._lock:
            caso = self._caso(caso_id)
            caso["meta"] = {**caso["meta"], **datos_meta}
            caso["schemaVersion"] = ESQUEMA_VERSION
            self._escribir(caso_id, caso)
            return copy.deepcopy(caso)

    def add_evento(self, caso_id: str, evento: Dict[str, Any]) -> int:
        self._ruta(caso_id)
        self._rechazar_si_solo_lectura(caso_id)
        evento = validar_evento(evento)
        with self._lock:
            caso = self._caso(caso_id)
            caso["schemaVersion"] = ESQUEMA_VERSION
            # El dibujo se guarda como última instantánea: evita duplicar imágenes en cada sincronización
            if evento.get("kind") == "dibujo":
                caso["eventos"] = [e for e in caso["eventos"] if e.get("kind") != "dibujo"]
            caso["eventos"].append(evento)
            caso["eventos"] = caso["eventos"][-MAX_EVENTOS:]
            self._escribir(caso_id, caso)
            return len(caso["eventos"])

    def resumen(self, caso_id: str) -> Optional[Dict[str, Any]]:
        """Version ligera para el sondeo del informe: no copia los eventos ni las imagenes."""
        if not es_id_valido(caso_id):
            return None
        with self._lock:
            caso = self._casos.get(caso_id)
            if caso is None:
                return None
            eventos = caso["eventos"]
            ultimo = None
            for e in reversed(eventos):
                ultimo = e.get("t_servidor", e.get("t"))
                if ultimo is not None:
                    break
            return {
                "id": caso_id,
                "eventos": len(eventos),
                "ultimo": ultimo,
                "schemaVersion": caso.get("schemaVersion", 1),
            }

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


caso_store = CasoStore(demo_file=DEMO_FIXTURE)
