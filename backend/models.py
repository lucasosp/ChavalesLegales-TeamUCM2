"""Modelos de datos y estados para la lógica multijugador estilo Kahoot."""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class RoomState(str, Enum):
    LOBBY = "LOBBY"
    QUESTION = "QUESTION"
    REVEAL = "REVEAL"
    LEADERBOARD = "LEADERBOARD"
    FINISHED = "FINISHED"


class Player(BaseModel):
    id: str
    nickname: str
    seat_index: int
    avatar_tipo: int
    base_type: Optional[int] = 1
    color_pelo: Optional[str] = "#4A2810"
    color_ropa: Optional[str] = "#4A1A1C"
    tiene_gorro: Optional[bool] = False
    score: int = 0
    streak: int = 0
    current_answer: Optional[int] = None
    answer_time_ms: Optional[int] = None
    is_connected: bool = True


class CreateRoomRequest(BaseModel):
    modo: str = "general"  # 'general', 'juicio' o 'preguntas'
    tiempo_pregunta: int = 30  # segundos por defecto


class CreateRoomResponse(BaseModel):
    pin: str
    host_token: str
    modo: str
    total_preguntas: int = 0


class JoinRoomRequest(BaseModel):
    nickname: str
    base_type: Optional[int] = None
    baseType: Optional[int] = None
    color_pelo: Optional[str] = None
    colorPelo: Optional[str] = None
    color_ropa: Optional[str] = None
    colorRopa: Optional[str] = None
    tiene_gorro: Optional[bool] = None
    tieneGorro: Optional[bool] = None


class JoinRoomResponse(BaseModel):
    pin: str
    player_id: str
    nickname: str
    seat_index: int
    avatar_tipo: int
    base_type: Optional[int] = 1
    color_pelo: Optional[str] = "#4A2810"
    color_ropa: Optional[str] = "#4A1A1C"
    tiene_gorro: Optional[bool] = False
    modo: str
    capacidad_aula: Optional[int] = 12
    modo_infinito: Optional[bool] = False
