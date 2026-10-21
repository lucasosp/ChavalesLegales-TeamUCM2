"""Gestor de salas multijugador estilo Kahoot con WebSockets."""
import asyncio
import random
import secrets
import time
from typing import Dict, List, Optional, Any
from fastapi import WebSocket

from contenido import HISTORIETA, JUICIO, PREGUNTAS
from models import Player, RoomState

TOTAL_SEATS = 12


class Room:
    def __init__(self, pin: str, host_token: str, modo: str, items: List[Dict[str, Any]], question_duration: int = 30):
        self.pin = pin
        self.host_token = host_token
        self.modo = modo
        self.items = items
        self.question_duration = question_duration
        self.state = RoomState.LOBBY
        self.current_index = 0
        self.question_start_epoch: float = 0.0

        self.players: Dict[str, Player] = {}
        self.host_ws: Optional[WebSocket] = None
        self.player_ws: Dict[str, WebSocket] = {}
        self.active_game: Optional[Dict[str, str]] = None
        self.capacidad_aula: int = 12
        self.modo_infinito: bool = False

    @property
    def current_item(self) -> Optional[Dict[str, Any]]:
        if 0 <= self.current_index < len(self.items):
            return self.items[self.current_index]
        return None

    def get_public_players(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": p.id,
                "nombre": p.nickname,
                "seatIndex": p.seat_index,
                "seat_index": p.seat_index,
                "avatarTipo": p.avatar_tipo,
                "avatar_tipo": p.avatar_tipo,
                "baseType": p.base_type,
                "base_type": p.base_type,
                "colorPelo": p.color_pelo,
                "color_pelo": p.color_pelo,
                "colorRopa": p.color_ropa,
                "color_ropa": p.color_ropa,
                "tieneGorro": p.tiene_gorro,
                "tiene_gorro": p.tiene_gorro,
                "score": p.score,
                "hasAnswered": p.current_answer is not None,
                "isConnected": p.is_connected,
            }
            for p in self.players.values()
        ]

    def get_leaderboard(self) -> List[Dict[str, Any]]:
        sorted_players = sorted(self.players.values(), key=lambda p: p.score, reverse=True)
        return [
            {
                "id": p.id,
                "nombre": p.nickname,
                "score": p.score,
                "streak": p.streak,
                "avatarTipo": p.avatar_tipo,
                "baseType": p.base_type,
                "colorPelo": p.color_pelo,
                "colorRopa": p.color_ropa,
                "tieneGorro": p.tiene_gorro,
                "seatIndex": p.seat_index,
                "rank": idx + 1,
            }
            for idx, p in enumerate(sorted_players)
        ]

    def get_answer_stats(self) -> Dict[int, int]:
        """Cuenta votos por opción para la pregunta actual."""
        stats: Dict[int, int] = {}
        item = self.current_item
        if item and "opciones" in item:
            for i in range(len(item["opciones"])):
                stats[i] = 0
        for p in self.players.values():
            if p.current_answer is not None:
                stats[p.current_answer] = stats.get(p.current_answer, 0) + 1
        return stats


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.lock = asyncio.Lock()

    def generate_pin(self) -> str:
        for _ in range(100):
            pin = f"{random.randint(100000, 999999)}"
            if pin not in self.rooms:
                return pin
        # Fallback
        return f"{secrets.randbelow(900000) + 100000}"

    async def create_room(self, modo: str = "general", question_duration: int = 30) -> Room:
        async with self.lock:
            pin = self.generate_pin()
            host_token = secrets.token_urlsafe(16)
            if modo in ("historia", "historieta"):
                raw_items = HISTORIETA
            elif modo == "preguntas":
                raw_items = PREGUNTAS
            elif modo == "juicio":
                raw_items = JUICIO
            else:
                raw_items = JUICIO  # Por defecto casos de juicio listos para jugar
            items = [dict(item) for item in raw_items]
            room = Room(pin, host_token, modo, items, question_duration)
            self.rooms[pin] = room
            return room

    def get_room(self, pin: str) -> Optional[Room]:
        # Formato flexible para admitir "734 912" o "734912"
        clean_pin = pin.replace(" ", "").strip()
        return self.rooms.get(clean_pin)

    async def join_player(
        self,
        pin: str,
        nickname: str,
        base_type: Optional[int] = None,
        color_pelo: Optional[str] = None,
        color_ropa: Optional[str] = None,
        tiene_gorro: Optional[bool] = None,
    ) -> Optional[Player]:
        room = self.get_room(pin)
        if not room:
            return None

        clean_name = nickname.strip()[:20]
        if not clean_name:
            clean_name = "Alumno"

        async with self.lock:
            player_id = secrets.token_hex(8)
            existing_seats = {p.seat_index for p in room.players.values()}
            if room.modo_infinito and len(existing_seats) >= room.capacidad_aula:
                room.capacidad_aula += 4
            # Buscar el primer pupitre libre entre 0 y capacidad_aula - 1
            seat_index = next((s for s in range(room.capacidad_aula) if s not in existing_seats), len(room.players))
            avatar_tipo = len(room.players) % 6

            player = Player(
                id=player_id,
                nickname=clean_name,
                seat_index=seat_index,
                avatar_tipo=avatar_tipo,
                base_type=int(base_type) if base_type is not None else 1,
                color_pelo=str(color_pelo) if color_pelo is not None else "#4A2810",
                color_ropa=str(color_ropa) if color_ropa is not None else "#4A1A1C",
                tiene_gorro=bool(tiene_gorro) if tiene_gorro is not None else False,
            )
            room.players[player_id] = player

        # Notificar al host y a la sala del nuevo alumno
        await self.broadcast_room_state(room)
        return player

    async def connect_host(self, room: Room, ws: WebSocket):
        room.host_ws = ws
        await self.send_host_state(room)

    async def disconnect_host(self, room: Room):
        if room.host_ws:
            room.host_ws = None

    async def connect_player(self, room: Room, player_id: str, ws: WebSocket):
        if player_id in room.players:
            room.players[player_id].is_connected = True
            room.player_ws[player_id] = ws
            if room.active_game:
                try:
                    await ws.send_json({
                        "event": "LAUNCH_GAME",
                        **room.active_game,
                    })
                except Exception:
                    pass
            await self.broadcast_room_state(room)

    async def disconnect_player(self, room: Room, player_id: str):
        if player_id in room.players:
            room.players[player_id].is_connected = False
        if player_id in room.player_ws:
            del room.player_ws[player_id]
        await self.broadcast_room_state(room)

    async def launch_game(self, room: Room, url: str, game: str):
        room.active_game = {"url": url, "game": game}
        payload = {
            "event": "LAUNCH_GAME",
            "url": url,
            "game": game,
        }
        for ws in list(room.player_ws.values()):
            try:
                await ws.send_json(payload)
            except Exception:
                pass
        if room.host_ws:
            try:
                await room.host_ws.send_json(payload)
            except Exception:
                pass

    # =========================================================================
    # LÓGICA DE JUEGO (MÁQUINA DE ESTADOS)
    # =========================================================================

    async def start_game(self, room: Room, modo: Optional[str] = None):
        if modo:
            room.modo = modo
            if modo in ("historia", "historieta"):
                raw_items = HISTORIETA
            elif modo == "preguntas":
                raw_items = PREGUNTAS
            else:
                raw_items = JUICIO
            room.items = [dict(item) for item in raw_items]

        if not room.items:
            room.items = [dict(item) for item in JUICIO]

        room.current_index = 0
        await self._start_question(room)

    async def return_to_lobby(self, room: Room):
        room.state = RoomState.LOBBY
        for p in room.players.values():
            p.current_answer = None
            p.answer_time_ms = None
        await self.broadcast_room_state(room)

    async def _start_question(self, room: Room):
        room.state = RoomState.QUESTION
        room.question_start_epoch = time.time()
        # Resetear respuestas de la ronda
        for p in room.players.values():
            p.current_answer = None
            p.answer_time_ms = None

        await self.broadcast_room_state(room)

    async def submit_answer(self, room: Room, player_id: str, answer_index: int) -> bool:
        if room.state != RoomState.QUESTION:
            return False

        player = room.players.get(player_id)
        if not player or player.current_answer is not None:
            return False

        now = time.time()
        elapsed_sec = max(0.0, now - room.question_start_epoch)
        player.current_answer = answer_index
        player.answer_time_ms = int(elapsed_sec * 1000)

        # Cálculo de puntos en backend
        item = room.current_item
        if item and answer_index == item.get("correcta"):
            duration = max(1.0, float(room.question_duration))
            ratio = min(1.0, elapsed_sec / duration)
            # Fórmula Kahoot: entre 500 y 1000 puntos
            earned = round(1000 * (1 - ratio * 0.5))
            player.score += earned
            player.streak += 1
        else:
            player.streak = 0

        # Enviar confirmación al alumno inmediatamente
        ws = room.player_ws.get(player_id)
        if ws:
            try:
                await ws.send_json({
                    "event": "ANSWER_CONFIRMED",
                    "answer_index": answer_index,
                })
            except Exception:
                pass

        # Si todos los jugadores conectados han respondido, podemos revelar o notificar al host
        connected_players = [p for p in room.players.values() if p.is_connected]
        all_answered = connected_players and all(p.current_answer is not None for p in connected_players)

        await self.broadcast_room_state(room)

        if all_answered:
            # Notificar al host que todos han respondido
            if room.host_ws:
                try:
                    await room.host_ws.send_json({
                        "event": "ALL_PLAYERS_ANSWERED",
                    })
                except Exception:
                    pass

        return True

    async def update_player_avatar(
        self,
        room: Room,
        player_id: str,
        base_type: Optional[int] = None,
        color_pelo: Optional[str] = None,
        color_ropa: Optional[str] = None,
        tiene_gorro: Optional[bool] = None,
    ):
        async with self.lock:
            if player_id not in room.players:
                return
            player = room.players[player_id]
            if base_type is not None:
                try:
                    player.base_type = int(base_type)
                except (ValueError, TypeError):
                    pass
            if color_pelo is not None:
                player.color_pelo = str(color_pelo)
            if color_ropa is not None:
                player.color_ropa = str(color_ropa)
            if tiene_gorro is not None:
                player.tiene_gorro = bool(tiene_gorro)

        await self.broadcast_room_state(room)

    async def update_room_capacity(
        self,
        room: Room,
        capacidad: Optional[int] = None,
        modo_infinito: Optional[bool] = None,
    ):
        async with self.lock:
            if capacidad is not None:
                try:
                    room.capacidad_aula = max(4, int(capacidad))
                except (ValueError, TypeError):
                    pass
            if modo_infinito is not None:
                room.modo_infinito = bool(modo_infinito)

        await self.broadcast_room_state(room)

    async def reveal_question(self, room: Room):
        if room.state != RoomState.QUESTION:
            return
        room.state = RoomState.REVEAL
        await self.broadcast_room_state(room)

    async def show_leaderboard(self, room: Room):
        room.state = RoomState.LEADERBOARD
        await self.broadcast_room_state(room)

    async def next_question(self, room: Room):
        if room.current_index + 1 < len(room.items):
            room.current_index += 1
            await self._start_question(room)
        else:
            room.state = RoomState.FINISHED
            await self.broadcast_room_state(room)

    # =========================================================================
    # ENVÍO Y BROADCAST DE MENSAJES SEGUROS
    # =========================================================================

    def _build_host_payload(self, room: Room) -> Dict[str, Any]:
        item = room.current_item
        answered_count = sum(1 for p in room.players.values() if p.current_answer is not None)

        base_item = None
        if item:
            base_item = {
                "titulo": item.get("titulo", f"Pregunta {room.current_index + 1}"),
                "hechos": item.get("hechos", ""),
                "pregunta": item.get("pregunta", ""),
                "opciones": item.get("opciones", []),
                "articulo": item.get("articulo", ""),
            }
            if room.state in (RoomState.REVEAL, RoomState.LEADERBOARD, RoomState.FINISHED):
                base_item["correcta"] = item.get("correcta")
                base_item["sentencia"] = item.get("sentencia") or item.get("explica", "")

        return {
            "event": "ROOM_STATE",
            "state": room.state.value,
            "pin": room.pin,
            "modo": room.modo,
            "active_game": room.active_game,
            "current_index": room.current_index,
            "total_items": len(room.items),
            "question_duration": room.question_duration,
            "question_start_epoch": room.question_start_epoch,
            "item": base_item,
            "players": room.get_public_players(),
            "leaderboard": room.get_leaderboard(),
            "answer_stats": room.get_answer_stats() if room.state != RoomState.LOBBY else {},
            "answered_count": answered_count,
            "total_players": len(room.players),
            "capacidad_aula": room.capacidad_aula,
            "modo_infinito": room.modo_infinito,
        }

    def _build_player_payload(self, room: Room, player_id: str) -> Dict[str, Any]:
        player = room.players.get(player_id)
        item = room.current_item
        leaderboard = room.get_leaderboard()
        player_rank = next((p["rank"] for p in leaderboard if p["id"] == player_id), 1)

        base_item = None
        if item and room.state in (RoomState.QUESTION, RoomState.REVEAL, RoomState.LEADERBOARD):
            # En QUESTION: nunca enviar 'correcta' ni 'sentencia'
            base_item = {
                "titulo": item.get("titulo", f"Pregunta {room.current_index + 1}"),
                "pregunta": item.get("pregunta", ""),
                "opciones": item.get("opciones", []),
            }
            if room.state in (RoomState.REVEAL, RoomState.LEADERBOARD):
                base_item["correcta"] = item.get("correcta")
                base_item["sentencia"] = item.get("sentencia") or item.get("explica", "")

        has_answered = player.current_answer is not None if player else False
        is_correct = None
        if has_answered and item and room.state in (RoomState.REVEAL, RoomState.LEADERBOARD):
            is_correct = (player.current_answer == item.get("correcta"))

        return {
            "event": "ROOM_STATE",
            "state": room.state.value,
            "pin": room.pin,
            "modo": room.modo,
            "active_game": room.active_game,
            "current_index": room.current_index,
            "total_items": len(room.items),
            "item": base_item,
            "players": room.get_public_players(),
            "player": {
                "id": player_id,
                "nickname": player.nickname if player else "",
                "seat_index": player.seat_index if player else 0,
                "avatar_tipo": player.avatar_tipo if player else 0,
                "base_type": player.base_type if player else 1,
                "color_pelo": player.color_pelo if player else None,
                "color_ropa": player.color_ropa if player else None,
                "tiene_gorro": player.tiene_gorro if player else False,
                "score": player.score if player else 0,
                "rank": player_rank,
                "current_answer": player.current_answer if player else None,
                "is_correct": is_correct,
            } if player else None,
            "leaderboard_preview": leaderboard[:5],
            "capacidad_aula": room.capacidad_aula,
            "modo_infinito": room.modo_infinito,
        }

    async def send_host_state(self, room: Room):
        if room.host_ws:
            try:
                await room.host_ws.send_json(self._build_host_payload(room))
            except Exception:
                pass

    async def send_player_state(self, room: Room, player_id: str):
        ws = room.player_ws.get(player_id)
        if ws:
            try:
                await ws.send_json(self._build_player_payload(room, player_id))
            except Exception:
                pass

    async def broadcast_room_state(self, room: Room):
        # 1. Enviar al host
        await self.send_host_state(room)

        # 2. Enviar a cada alumno su estado personalizado y seguro
        dead_players = []
        for pid, ws in list(room.player_ws.items()):
            try:
                await ws.send_json(self._build_player_payload(room, pid))
            except Exception:
                dead_players.append(pid)

        for pid in dead_players:
            if pid in room.player_ws:
                del room.player_ws[pid]


# Instancia global compartida
room_manager = RoomManager()
