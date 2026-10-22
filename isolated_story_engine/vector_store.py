"""Recuperación semántica (ChromaDB) y caché del estado del DAG (Redis).

Los dos servicios son opcionales: con USE_CHROMA=0 / USE_REDIS=0 (por defecto) se usan
alternativas en memoria, sin red y sin dependencias extra. Los imports de chromadb y redis son
perezosos para que el prototipo arranque aunque no estén instaladas.

PRIVACIDAD: ni el índice ni la caché guardan nunca el nombre del menor. La caché guarda la
historia con el marcador {nombre}; el nombre se sustituye solo al responder.
"""
import json
import re
import time
import unicodedata
from typing import Optional

import config
from dag_swarm.node_catalog import catalogo
from dag_swarm.phrasing_db import PHRASING_DB


def _tokens(texto: str) -> set:
    plano = unicodedata.normalize("NFD", texto.lower())
    plano = "".join(c for c in plano if unicodedata.category(c) != "Mn")
    return {t for t in re.findall(r"[a-z0-9_]+", plano) if len(t) > 2}


class _IndiceMemoria:
    """Alternativa sin dependencias: coincidencia de palabras normalizada por longitud."""

    def __init__(self):
        self._docs = []

    def add(self, doc_id: str, texto: str, meta: dict):
        self._docs.append((doc_id, texto, meta, _tokens(texto)))

    def query(self, consulta: str, donde: dict, k: int) -> list:
        q = _tokens(consulta)
        puntuados = []
        for doc_id, texto, meta, toks in self._docs:
            if any(meta.get(clave) != valor for clave, valor in donde.items()):
                continue
            comunes = len(q & toks)
            if comunes:
                puntuados.append({"id": doc_id, "texto": texto, "meta": meta, "score": comunes / (len(toks) ** 0.5)})
        return sorted(puntuados, key=lambda r: -r["score"])[:k]


class _IndiceChroma:
    def __init__(self):
        import chromadb  # perezoso

        cliente = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        self._col = cliente.get_or_create_collection(config.CHROMA_COLLECTION)

    def add(self, doc_id: str, texto: str, meta: dict):
        self._col.upsert(ids=[doc_id], documents=[texto], metadatas=[meta])

    def query(self, consulta: str, donde: dict, k: int) -> list:
        if not self._col.count():
            return []
        clausulas = [{clave: valor} for clave, valor in donde.items()]
        filtro = None if not clausulas else (clausulas[0] if len(clausulas) == 1 else {"$and": clausulas})
        res = self._col.query(query_texts=[consulta], n_results=k, where=filtro)
        return [
            {"id": i, "texto": d, "meta": m, "score": 1 - dist}
            for i, d, m, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0])
        ]


class PhraseStore:
    """Índice de nodos y frases por franja de edad."""

    def __init__(self, usar_chroma: Optional[bool] = None):
        usar = config.USE_CHROMA if usar_chroma is None else usar_chroma
        self._indice = _IndiceChroma() if usar else _IndiceMemoria()
        self.backend = "chroma" if usar else "memoria"
        self._indexar()

    def _indexar(self):
        for nodo in catalogo():
            for banda, texto in nodo.texto.items():
                meta = {"kind": "nodo", "age_band": banda, "grupo": str(nodo.grupo), "node_id": nodo.id}
                self._indice.add(f"{nodo.id}:{banda}", f"{texto} {' '.join(nodo.tags + nodo.fase_tags)}", meta)
        for banda, intenciones in PHRASING_DB.items():
            for intencion, frases in intenciones.items():
                for i, frase in enumerate(frases):
                    self._indice.add(f"frase:{banda}:{intencion}:{i}", frase,
                                     {"kind": "frase", "age_band": banda, "intencion": intencion})

    def retrieve(self, consulta: str, age_band: str, k: int = 5, kind: Optional[str] = None) -> list:
        donde = {"age_band": age_band, **({"kind": kind} if kind else {})}
        return self._indice.query(consulta, donde, k)


class _CacheMemoria:
    def __init__(self):
        self._datos = {}

    def set(self, clave: str, valor: dict, ttl: int):
        self._datos[clave] = (time.time() + ttl, json.dumps(valor))

    def get(self, clave: str) -> Optional[dict]:
        caduca, bruto = self._datos.get(clave, (0, None))
        if bruto is None or caduca < time.time():
            self._datos.pop(clave, None)
            return None
        return json.loads(bruto)


class StateCache:
    """Caché del estado del DAG (Redis, o memoria si no está activado)."""

    def __init__(self, usar_redis: Optional[bool] = None):
        usar = config.USE_REDIS if usar_redis is None else usar_redis
        self.backend = "redis" if usar else "memoria"
        if usar:
            import redis  # perezoso

            self._redis = redis.Redis.from_url(config.REDIS_URL, decode_responses=True)
        else:
            self._mem = _CacheMemoria()

    def set(self, story_id: str, estado: dict, ttl: int = config.STATE_TTL_SECONDS):
        if self.backend == "redis":
            self._redis.setex(f"historia:{story_id}", ttl, json.dumps(estado))
        else:
            self._mem.set(story_id, estado, ttl)

    def get(self, story_id: str) -> Optional[dict]:
        if self.backend == "redis":
            bruto = self._redis.get(f"historia:{story_id}")
            return json.loads(bruto) if bruto else None
        return self._mem.get(story_id)


_store: Optional[PhraseStore] = None
_cache: Optional[StateCache] = None


def get_store() -> PhraseStore:
    global _store
    if _store is None:
        _store = PhraseStore()
    return _store


def get_cache() -> StateCache:
    global _cache
    if _cache is None:
        _cache = StateCache()
    return _cache
