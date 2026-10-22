"""API de Chavales Legales: registro por caso que alimenta /informe.

Arrancar con: python -m uvicorn main:app --app-dir backend
(los imports son planos a propósito; ver CLAUDE.md §4)

Toda la telemetría pasa por `casos`: cada evento de la novela (progreso, decisión,
minijuego, dibujo) es una fila de `eventos`, y /informe/[caso] es su única vista.

No hay middleware CORS: el navegador solo habla con Next, que reescribe /api/* al
backend, así que todo es mismo origen. La novela va en un iframe del mismo origen.
"""
from typing import Any, Dict

from fastapi import Body, FastAPI, HTTPException

from casos import caso_store, es_id_valido

app = FastAPI(title="Chavales Legales API")


@app.get("/")
def root():
    return {"status": "ok", "message": "Chavales Legales API is running"}


# =============================================================================
# CASOS · el caso es el agregado: metadatos de la sesión + registro de eventos
# =============================================================================


def validar_id(caso_id: str) -> str:
    """El id se usa como nombre de archivo: sin esto hay path traversal."""
    if not es_id_valido(caso_id):
        raise HTTPException(
            status_code=400,
            detail="Identificador de caso no válido (letras, números, guion y guion bajo, máx. 64)",
        )
    return caso_id


@app.get("/api/casos")
def listar_casos():
    return caso_store.listar()


@app.get("/api/casos/{caso_id}/resumen")
def resumen_caso(caso_id: str):
    """Versión ligera para que el informe sondee sin bajarse las imágenes del dibujo."""
    resumen = caso_store.resumen(validar_id(caso_id))
    if not resumen:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return resumen


@app.get("/api/casos/{caso_id}")
def obtener_caso(caso_id: str):
    caso = caso_store.get(validar_id(caso_id))
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@app.post("/api/casos/{caso_id}/meta")
def guardar_meta_caso(caso_id: str, meta: Dict[str, Any] = Body(...)):
    """Crea o actualiza el caso. El educador no reparte un código hasta que esto responde."""
    return caso_store.set_meta(validar_id(caso_id), meta)


@app.post("/api/casos/{caso_id}/eventos")
def registrar_evento_caso(caso_id: str, evento: Dict[str, Any] = Body(...)):
    try:
        return {"total": caso_store.add_evento(validar_id(caso_id), evento)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
