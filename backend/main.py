"""API de Chavales Legales: registro por caso que alimenta /informe.

Arrancar con: python -m uvicorn main:app --app-dir backend
(los imports son planos a propósito; ver CLAUDE.md §4)

Toda la telemetría pasa por `casos`: cada evento de la novela (progreso, decisión,
minijuego, dibujo) es una fila de `eventos`, y /informe/[caso] es su única vista.
"""
import os
from typing import Any, Dict

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from casos import caso_store

app = FastAPI(title="Chavales Legales API")

# Orígenes CORS configurables por variable de entorno para producción
ALLOWED_ORIGINS_ENV = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
# Ojo: allow_credentials=True junto con "*" lo rechazan los navegadores. Como la app
# entra por el rewrite de Next (mismo origen), no hacen falta credenciales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Chavales Legales API is running"}


# =============================================================================
# CASOS · el caso es el agregado: metadatos de la sesión + registro de eventos
# =============================================================================


@app.get("/api/casos")
def listar_casos():
    return caso_store.listar()


@app.get("/api/casos/{caso_id}")
def obtener_caso(caso_id: str):
    caso = caso_store.get(caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@app.post("/api/casos/{caso_id}/meta")
def guardar_meta_caso(caso_id: str, meta: Dict[str, Any] = Body(...)):
    """Crea o actualiza el caso. El educador no reparte un código hasta que esto responde."""
    return caso_store.set_meta(caso_id, meta)


@app.post("/api/casos/{caso_id}/eventos")
def registrar_evento_caso(caso_id: str, evento: Dict[str, Any] = Body(...)):
    return {"total": caso_store.add_evento(caso_id, evento)}
