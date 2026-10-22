"""API del prototipo aislado. NO está conectada a la aplicación principal.

    cd isolated_story_engine
    python -m uvicorn api:app --host 127.0.0.1 --port 8100

Sin autenticación: es un prototipo local. No exponerlo a Internet tal cual.
"""
import uuid
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

import config
from dag_swarm import generar_historia, renderizar
from llm_generator import extraer_etiquetas
from vector_store import get_cache, get_store

app = FastAPI(title="Motor de historias (prototipo aislado)")


class SolicitudHistoria(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    edad: int = Field(ge=config.EDAD_MIN, le=config.EDAD_MAX)
    sexo: Literal["f", "m", "x"]
    contexto_legal: str = Field(default="", max_length=1500)
    semilla: Optional[int] = None  # misma semilla + mismos datos = misma historia


def _recuperar(consulta: str, banda: str, k: int) -> list:
    return get_store().retrieve(consulta, banda, k)


def _respuesta(story_id: str, plantilla: dict, nombre: str, sexo: str) -> dict:
    return {
        "id": story_id,
        "etiquetas": plantilla["etiquetas"],
        "grupos": plantilla["historia"]["grupos"],
        "sobreescritas": plantilla["historia"]["sobreescritas"],
        "dag": {"nodos": plantilla["historia"]["nodos"], "aristas": plantilla["historia"]["aristas"]},
        "historia": renderizar(plantilla["historia"], nombre, sexo),
    }


@app.get("/salud")
def salud():
    return {"ok": True, "indice": get_store().backend, "cache": get_cache().backend, "gemini": config.USE_GEMINI}


@app.post("/historias")
def crear_historia(solicitud: SolicitudHistoria):
    etiquetas = extraer_etiquetas(solicitud.nombre, solicitud.edad, solicitud.sexo, solicitud.contexto_legal)
    historia = generar_historia(etiquetas, solicitud.edad, solicitud.sexo, _recuperar, solicitud.semilla)
    story_id = uuid.uuid4().hex[:12]
    # La caché guarda la plantilla con {nombre}: el nombre del menor no se almacena en ningún sitio.
    get_cache().set(story_id, {"etiquetas": etiquetas, "historia": historia, "sexo": solicitud.sexo})
    return _respuesta(story_id, {"etiquetas": etiquetas, "historia": historia}, solicitud.nombre, solicitud.sexo)


@app.get("/historias/{story_id}")
def leer_historia(story_id: str, nombre: str = Query(min_length=1, max_length=40)):
    """Recupera una historia ya generada. El nombre se vuelve a pasar: no se guarda."""
    plantilla = get_cache().get(story_id)
    if plantilla is None:
        raise HTTPException(status_code=404, detail="Historia no encontrada o caducada")
    return _respuesta(story_id, plantilla, nombre, plantilla["sexo"])
