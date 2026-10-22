"""API del prototipo aislado. NO está conectada a la aplicación principal.

    cd isolated_story_engine
    python -m uvicorn api:app --host 127.0.0.1 --port 8100

Sin autenticación: es un prototipo local. No exponerlo a Internet tal cual.

Entrada: nombre, edad, contexto (texto libre) y tipo de riesgo (los 5 del selector de la aplicación).
Salida: el DAG, las decisiones del umbral y los archivos que entiende el motor (`salida`).
El resultado lleva el nombre del menor incrustado y NO se guarda: la caché solo tiene la plantilla.
"""
import uuid
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

import config
from dag_swarm import desde_json, exportar, generar_historia, renderizar
from llm_generator import extraer_etiquetas
from vector_store import get_cache, get_store

app = FastAPI(title="Motor de historias (prototipo aislado)")


class SolicitudHistoria(BaseModel):
    nombre: str = Field(min_length=1, max_length=40)
    edad: int = Field(ge=config.EDAD_MIN, le=config.EDAD_MAX)
    contexto: str = Field(default="", max_length=1500)
    tipo_riesgo: Literal["ciberacoso", "suplantacion", "grooming", "control_pareja", "privacidad"]
    semilla: Optional[int] = None  # misma semilla + mismos datos = misma historia


def _recuperar(consulta: str, banda: str, k: int, kind: Optional[str] = None) -> list:
    return get_store().retrieve(consulta, banda, k, kind)


def _respuesta(story_id: str, plantilla: dict, nombre: str) -> dict:
    historia = plantilla["historia"]
    return {
        "id": story_id,
        "etiquetas": plantilla["etiquetas"],            # lo que clasificó el LLM (o las reglas locales)
        "decisiones": historia["decisiones"],           # qué etiquetas superaron la franja límite
        "forzados": historia["forzados"],               # nodos que entraron por una etiqueta, no por azar
        "prototipo": historia["prototipo"],             # personaje elegido por el sexo detectado (o null)
        "grupos": historia["grupos"],
        "sobreescritas": historia["sobreescritas"],
        "dag": {"nodos": historia["nodos"], "aristas": historia["aristas"]},
        "historia": renderizar(historia, nombre),       # vista para que el profesional la revise
        "salida": exportar(historia, nombre, story_id),  # índice + story/novel/scene/assets.json
    }


@app.get("/salud")
def salud():
    return {"ok": True, "indice": get_store().backend, "cache": get_cache().backend, "gemini": config.USE_GEMINI,
            "umbral": config.UMBRAL_CONFIANZA}


@app.post("/historias")
def crear_historia(solicitud: SolicitudHistoria):
    etiquetas = extraer_etiquetas(solicitud.nombre, solicitud.edad, solicitud.contexto, solicitud.tipo_riesgo)
    historia = generar_historia(etiquetas, solicitud.edad, solicitud.tipo_riesgo, _recuperar, solicitud.semilla)
    story_id = f"historia-{uuid.uuid4().hex[:12]}"
    # La caché guarda la plantilla con {nombre}: el nombre del menor no se almacena en ningún sitio.
    get_cache().set(story_id, {"etiquetas": etiquetas, "historia": historia})
    return _respuesta(story_id, {"etiquetas": etiquetas, "historia": historia}, solicitud.nombre)


@app.get("/historias/{story_id}")
def leer_historia(story_id: str, nombre: str = Query(min_length=1, max_length=40)):
    """Recupera una historia ya generada. El nombre se vuelve a pasar: no se guarda."""
    plantilla = get_cache().get(story_id)
    if plantilla is None:
        raise HTTPException(status_code=404, detail="Historia no encontrada o caducada")
    return _respuesta(story_id, {**plantilla, "historia": desde_json(plantilla["historia"])}, nombre)
