"""API de Chavales Legales: sirve el contenido de los juegos y gestiona salas multijugador estilo Kahoot."""
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from contenido import COOPERATIVO, HISTORIA, HISTORIETA, JUICIO, PREGUNTAS
from models import (
    CreateRoomRequest,
    CreateRoomResponse,
    JoinRoomRequest,
    JoinRoomResponse,
    RoomState,
)
from rooms import room_manager
from telemetry import telemetry_store, DecisionRecord, ProjectiveDrawingRecord

app = FastAPI(title="Chavales Legales API")

# Orígenes CORS configurables por variable de entorno para producción
ALLOWED_ORIGINS_ENV = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JUEGOS = {
    "historia": HISTORIA,
    "historieta": HISTORIETA,
    "preguntas": PREGUNTAS,
    "cooperativo": COOPERATIVO,
    "juicio": JUICIO,
}


@app.get("/")
def root():
    return {"status": "ok", "message": "Chavales Legales API is running"}


@app.get("/api/juegos/{modo}")
def juego(modo: str):
    if modo not in JUEGOS:
        raise HTTPException(404, "Modo no encontrado")
    return JUEGOS[modo]


# =============================================================================
# ENDPOINTS REST DE SALAS
# =============================================================================

@app.post("/api/salas", response_model=CreateRoomResponse)
async def crear_sala(req: Optional[CreateRoomRequest] = None):
    """Crea una sala de clase con PIN único de 6 dígitos."""
    modo = req.modo if req else "general"
    tiempo = req.tiempo_pregunta if req else 30
    room = await room_manager.create_room(modo=modo, question_duration=tiempo)
    return CreateRoomResponse(
        pin=room.pin,
        host_token=room.host_token,
        modo=room.modo,
        total_preguntas=len(room.items),
    )


@app.get("/api/salas/{pin}")
def info_sala(pin: str):
    """Consulta el estado de una sala y si admite nuevos alumnos."""
    room = room_manager.get_room(pin)
    if not room:
        raise HTTPException(404, "Sala no encontrada")
    return {
        "pin": room.pin,
        "modo": room.modo,
        "state": room.state.value,
        "total_players": len(room.players),
        "is_open": room.state == RoomState.LOBBY,
    }


@app.post("/api/salas/{pin}/join", response_model=JoinRoomResponse)
async def unirse_a_sala(pin: str, req: JoinRoomRequest):
    """Permite a un alumno registrarse en la sala con su apodo."""
    room = room_manager.get_room(pin)
    if not room:
        raise HTTPException(404, "Sala no encontrada. Revisa el PIN.")
    if room.state != RoomState.LOBBY:
        raise HTTPException(400, "La partida ya ha comenzado en esta sala.")

    base_type = req.base_type if req.base_type is not None else req.baseType
    color_pelo = req.color_pelo if req.color_pelo is not None else req.colorPelo
    color_ropa = req.color_ropa if req.color_ropa is not None else req.colorRopa
    tiene_gorro = req.tiene_gorro if req.tiene_gorro is not None else req.tieneGorro

    player = await room_manager.join_player(
        pin,
        req.nickname,
        base_type=base_type,
        color_pelo=color_pelo,
        color_ropa=color_ropa,
        tiene_gorro=tiene_gorro,
    )
    if not player:
        raise HTTPException(500, "No se pudo unir a la sala.")

    return JoinRoomResponse(
        pin=room.pin,
        player_id=player.id,
        nickname=player.nickname,
        seat_index=player.seat_index,
        avatar_tipo=player.avatar_tipo,
        base_type=player.base_type,
        color_pelo=player.color_pelo,
        color_ropa=player.color_ropa,
        tiene_gorro=player.tiene_gorro,
        modo=room.modo,
        capacidad_aula=room.capacidad_aula,
        modo_infinito=room.modo_infinito,
    )


# =============================================================================
# ENDPOINTS DE TELEMETRÍA Y TIEMPOS DE DECISIÓN (PARA ASISTENTES SOCIALES)
# =============================================================================

@app.post("/api/telemetria/decision")
async def registrar_decision(record: DecisionRecord):
    """Registra el tiempo y la opción elegida por un niño en una pregunta de la novela."""
    created = telemetry_store.add_decision(record)
    return {"status": "ok", "record": created}


@app.get("/api/telemetria/decisiones")
def obtener_decisiones(story_id: Optional[str] = None, limit: int = 500):
    """Obtiene el listado individual de decisiones registradas."""
    return telemetry_store.get_all(story_id=story_id, limit=limit)


@app.get("/api/telemetria/resumen")
def obtener_resumen_telemetria(story_id: Optional[str] = None):
    """Devuelve el resumen estadístico con tiempos por pregunta y opción para el dashboard."""
    return telemetry_store.get_summary(story_id=story_id)


@app.post("/api/telemetria/reset")
def reiniciar_telemetria():
    """Reinicia el almacén con el conjunto de datos de muestra enriquecido."""
    return telemetry_store.reset_to_seed()


@app.post("/api/telemetria/dibujo")
async def registrar_dibujo(record: ProjectiveDrawingRecord):
    """Registra la telemetría grafométrica y psicomotora de un dibujo en la novela."""
    created = telemetry_store.add_drawing_record(record)
    return {"status": "ok", "record": created}


@app.get("/api/telemetria/dibujos")
def obtener_dibujos(limit: int = 50):
    """Obtiene el listado de evaluaciones proyectivas y grafometría registradas."""
    return telemetry_store.get_drawing_records(limit=limit)


@app.get("/api/telemetria/dibujos/resumen")
def obtener_resumen_dibujos():
    """Devuelve el resumen estadístico y alertas psicológicas de los dibujos infantiles."""
    return telemetry_store.get_drawing_summary()


# =============================================================================
# ENDPOINTS WEBSOCKET EN TIEMPO REAL
# =============================================================================

@app.websocket("/ws/host/{pin}")
async def ws_host(websocket: WebSocket, pin: str, token: str = Query(...)):
    """Canal WebSocket para la pantalla de proyección del docente."""
    room = room_manager.get_room(pin)
    if not room or room.host_token != token:
        await websocket.close(code=4003, reason="Token de anfitrión inválido")
        return

    await websocket.accept()
    await room_manager.connect_host(room, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "PING":
                await websocket.send_json({"event": "PONG"})
            elif action == "LAUNCH_GAME":
                url = data.get("url", "/novela")
                game = data.get("game", "novela")
                await room_manager.launch_game(room, url=url, game=game)
            elif action == "START_GAME":
                modo = data.get("modo")
                await room_manager.start_game(room, modo=modo)
            elif action == "UPDATE_CAPACITY":
                capacidad = data.get("capacidad") or data.get("capacidad_aula")
                modo_infinito = data.get("modo_infinito")
                await room_manager.update_room_capacity(room, capacidad=capacidad, modo_infinito=modo_infinito)
            elif action == "RETURN_TO_LOBBY":
                room.active_game = None
                await room_manager.return_to_lobby(room)
    except WebSocketDisconnect:
        await room_manager.disconnect_host(room)
    except Exception:
        await room_manager.disconnect_host(room)


@app.websocket("/ws/player/{pin}")
async def ws_player(websocket: WebSocket, pin: str, player_id: str = Query(...)):
    """Canal WebSocket para el mando / dispositivo del alumno."""
    room = room_manager.get_room(pin)
    if not room or player_id not in room.players:
        await websocket.close(code=4004, reason="Jugador no encontrado en la sala")
        return

    await websocket.accept()
    await room_manager.connect_player(room, player_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "PING":
                await websocket.send_json({"event": "PONG"})
            elif action == "SUBMIT_ANSWER":
                answer_index = data.get("answer_index")
                if answer_index is not None and isinstance(answer_index, int):
                    await room_manager.submit_answer(room, player_id, answer_index)
            elif action == "UPDATE_AVATAR":
                base_type = data.get("baseType") if data.get("baseType") is not None else data.get("base_type")
                color_pelo = data.get("colorPelo") if data.get("colorPelo") is not None else data.get("color_pelo")
                color_ropa = data.get("colorRopa") if data.get("colorRopa") is not None else data.get("color_ropa")
                tiene_gorro = data.get("tieneGorro") if data.get("tieneGorro") is not None else data.get("tiene_gorro")
                await room_manager.update_player_avatar(
                    room,
                    player_id,
                    base_type=base_type,
                    color_pelo=color_pelo,
                    color_ropa=color_ropa,
                    tiene_gorro=tiene_gorro,
                )
    except WebSocketDisconnect:
        await room_manager.disconnect_player(room, player_id)
    except Exception:
        await room_manager.disconnect_player(room, player_id)
