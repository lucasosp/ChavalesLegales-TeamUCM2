"""Módulo de telemetría y análisis de tiempos de decisión para Asistentes Sociales."""
import json
import os
import random
import time
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

DATA_FILE = os.path.join(os.path.dirname(__file__), "telemetry_data.json")
DRAWING_DATA_FILE = os.path.join(os.path.dirname(__file__), "telemetry_drawings.json")

class ProjectiveDrawingRecord(BaseModel):
    id: Optional[str] = None
    phase: str
    student_nickname: Optional[str] = "Alumno"
    session_pin: Optional[str] = None
    timestamp: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    delta: Optional[Dict[str, Any]] = None
    alerts: Optional[List[Dict[str, Any]]] = None
    preview: Optional[str] = None

class DecisionRecord(BaseModel):
    id: Optional[str] = None
    story_id: str
    story_title: Optional[str] = None
    node_id: str
    chapter: Optional[int] = 1
    prompt: str
    option_id: str
    option_label: str
    all_options: Optional[List[Dict[str, str]]] = None
    time_seconds: float
    time_ms: Optional[int] = None
    student_nickname: Optional[str] = "Alumno"
    session_pin: Optional[str] = None
    timestamp: Optional[float] = None


class TelemetryStore:
    def __init__(self):
        self.decisions: List[Dict[str, Any]] = []
        self.drawing_records: List[Dict[str, Any]] = []
        self._load()
        self._load_drawings()
        if not self.decisions:
            self._seed_initial_data()
        if not self.drawing_records:
            self._seed_drawing_data()

    def _load(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    self.decisions = json.load(f)
            except Exception as e:
                print(f"[TelemetryStore] Error al cargar {DATA_FILE}: {e}")
                self.decisions = []

    def _save(self):
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.decisions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[TelemetryStore] Error al guardar {DATA_FILE}: {e}")

    def _load_drawings(self):
        if os.path.exists(DRAWING_DATA_FILE):
            try:
                with open(DRAWING_DATA_FILE, "r", encoding="utf-8") as f:
                    self.drawing_records = json.load(f)
            except Exception as e:
                print(f"[TelemetryStore] Error al cargar {DRAWING_DATA_FILE}: {e}")
                self.drawing_records = []

    def _save_drawings(self):
        try:
            with open(DRAWING_DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.drawing_records, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[TelemetryStore] Error al guardar {DRAWING_DATA_FILE}: {e}")

    def add_drawing_record(self, record: ProjectiveDrawingRecord) -> Dict[str, Any]:
        data = record.dict()
        if not data.get("id"):
            data["id"] = f"draw_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        if not data.get("timestamp"):
            data["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        self.drawing_records.insert(0, data)
        self._save_drawings()
        return data

    def get_drawing_records(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.drawing_records[:limit]

    def get_drawing_summary(self) -> Dict[str, Any]:
        phase2_evaluations = [d for d in self.drawing_records if d.get("phase") == "phase2" and d.get("delta")]
        total_evals = len(phase2_evaluations)

        alert_counts = {}
        avg_tremor_delta = 0.0
        avg_occupancy_delta = 0.0
        avg_latency_delta = 0.0

        if total_evals > 0:
            for item in phase2_evaluations:
                delta = item.get("delta", {})
                avg_tremor_delta += delta.get("delta_tremor_index", 0)
                avg_occupancy_delta += delta.get("delta_occupancy_ratio", 0)
                avg_latency_delta += delta.get("delta_initial_latency_ms", 0)

                for alert in item.get("alerts", []):
                    atype = alert.get("type", "other")
                    alert_counts[atype] = alert_counts.get(atype, 0) + 1

            avg_tremor_delta = round(avg_tremor_delta / total_evals, 2)
            avg_occupancy_delta = round(avg_occupancy_delta / total_evals, 3)
            avg_latency_delta = round(avg_latency_delta / total_evals, 1)

        return {
            "total_evaluations": total_evals,
            "average_tremor_delta": avg_tremor_delta,
            "average_occupancy_delta": avg_occupancy_delta,
            "average_latency_delta_ms": avg_latency_delta,
            "active_alerts_count": sum(alert_counts.values()),
            "alert_breakdown": alert_counts,
            "recent_cases": self.drawing_records[:15],
        }

    def _seed_drawing_data(self):
        """Genera casos de ejemplo enriquecidos con métricas periciales para demostración."""
        demo_cases = [
            {
                "id": "seed_draw_01",
                "phase": "phase2",
                "student_nickname": "Sara (Caso Principal)",
                "session_pin": "481 920",
                "timestamp": "2026-10-21T18:40:00Z",
                "metrics": {
                    "duration_total_ms": 28400,
                    "initial_latency_ms": 6200,
                    "pressure": { "mean": 0.42, "max": 0.81, "std_dev": 0.18, "high_pressure_ratio": 0.12, "low_pressure_ratio": 0.22 },
                    "velocity_px_per_ms": { "mean": 0.31, "max": 1.15 },
                    "tremor": { "jitter_index": 22.4, "inflections_count": 58 },
                    "spatial": { "occupancy_ratio": 0.28, "predominant_quadrant": "bottom-left" },
                    "chromatic": { "colors_used": ["#1e1b26"], "is_monochrome": True, "primary_color": "#1e1b26" },
                    "corrections": { "eraser_strokes": 4, "undo_count": 3 }
                },
                "delta": {
                    "delta_tremor_index": 12.6,
                    "tremor_change_percent": 128.5,
                    "delta_pressure_mean": -0.16,
                    "pressure_change_percent": -27.5,
                    "delta_occupancy_ratio": -0.24,
                    "occupancy_change_percent": -46.1,
                    "delta_initial_latency_ms": 4100,
                    "delta_air_time_ratio": 0.18,
                    "delta_velocity_mean": -0.15,
                    "delta_eraser_strokes": 3
                },
                "alerts": [
                    {
                        "type": "tremor_increase",
                        "severity": "warning",
                        "title": "Incremento significativo de temblor / inestabilidad motora",
                        "detail": "El índice de micro-oscilaciones aumentó un 128.5% post-trauma (9.8 → 22.4). Refleja angustia aguda y tensión neuromuscular al rememorar la agresión."
                    },
                    {
                        "type": "micrographism",
                        "severity": "warning",
                        "title": "Retracción espacial / Micrografismo defensivo",
                        "detail": "La ocupación del lienzo se redujo un 46.1% (52% → 28%). Asociado a repliegue afectivo, sensación de indefensión y contracción de la autoimagen."
                    },
                    {
                        "type": "latency_block",
                        "severity": "warning",
                        "title": "Latencia de reacción prolongada (Bloqueo emocional)",
                        "detail": "Tardó 6.2s en iniciar el primer trazo (+4.1s sobre la línea base). Indica impacto inicial ante la consigna traumática."
                    }
                ]
            },
            {
                "id": "seed_draw_02",
                "phase": "phase2",
                "student_nickname": "Lucas R.",
                "session_pin": "312 804",
                "timestamp": "2026-10-20T16:15:00Z",
                "metrics": {
                    "duration_total_ms": 32100,
                    "initial_latency_ms": 3800,
                    "pressure": { "mean": 0.76, "max": 0.98, "std_dev": 0.14, "high_pressure_ratio": 0.44, "low_pressure_ratio": 0.02 },
                    "velocity_px_per_ms": { "mean": 0.65, "max": 2.20 },
                    "tremor": { "jitter_index": 16.8, "inflections_count": 39 },
                    "spatial": { "occupancy_ratio": 0.64, "predominant_quadrant": "center" },
                    "chromatic": { "colors_used": ["#b93b3b", "#1e1b26"], "is_monochrome": False, "primary_color": "#b93b3b" },
                    "corrections": { "eraser_strokes": 1, "undo_count": 1 }
                },
                "delta": {
                    "delta_tremor_index": 5.2,
                    "tremor_change_percent": 44.8,
                    "delta_pressure_mean": 0.22,
                    "pressure_change_percent": 40.7,
                    "delta_occupancy_ratio": 0.12,
                    "occupancy_change_percent": 23.0,
                    "delta_initial_latency_ms": 800,
                    "delta_air_time_ratio": -0.05,
                    "delta_velocity_mean": 0.18,
                    "delta_eraser_strokes": 0
                },
                "alerts": [
                    {
                        "type": "high_pressure",
                        "severity": "warning",
                        "title": "Hipertonía y tensión gráfica (Picos de presión)",
                        "detail": "La presión media aumentó un 40.7% (0.54 → 0.76) con un 44% de trazos en presión máxima. Sugiere respuesta de cólera, descarga reactiva o hipervigilancia."
                    }
                ]
            }
        ]
        self.drawing_records = demo_cases
        self._save_drawings()

    def add_decision(self, record: DecisionRecord) -> Dict[str, Any]:
        data = record.dict()
        if not data.get("id"):
            data["id"] = f"dec_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        if not data.get("timestamp"):
            data["timestamp"] = time.time()
        if not data.get("time_ms") and data.get("time_seconds"):
            data["time_ms"] = int(data["time_seconds"] * 1000)

        # Mapeo de títulos legibles de historias
        story_titles = {
            "sara": "Sara · Mi historia sigue",
            "dos-voces": "Dos voces",
            "no-lo-reenvies": "No lo reenvíes",
            "no-soy-yo": "No soy yo",
            "between-the-lines": "Between the lines",
        }
        if not data.get("story_title"):
            data["story_title"] = story_titles.get(data.get("story_id", ""), data.get("story_id", ""))

        self.decisions.append(data)
        self._save()
        return data

    def get_all(self, story_id: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
        results = self.decisions
        if story_id and story_id != "all":
            results = [d for d in results if d.get("story_id") == story_id]
        # Devolver ordenados por timestamp descendente
        results = sorted(results, key=lambda x: x.get("timestamp", 0), reverse=True)
        return results[:limit]

    def reset_to_seed(self):
        self.decisions = []
        self._seed_initial_data()
        self._save()
        return {"status": "ok", "total_records": len(self.decisions)}

    def clear(self):
        self.decisions = []
        self._save()
        return {"status": "ok", "total_records": 0}

    def get_summary(self, story_id: Optional[str] = None) -> Dict[str, Any]:
        filtered = self.decisions
        if story_id and story_id != "all":
            filtered = [d for d in filtered if d.get("story_id") == story_id]

        total_decisions = len(filtered)
        if total_decisions == 0:
            return {
                "total_decisions": 0,
                "overall_avg_time": 0,
                "overall_median_time": 0,
                "fastest_decision_time": 0,
                "slowest_decision_time": 0,
                "questions": [],
                "story_stats": {},
            }

        all_times = [d["time_seconds"] for d in filtered if "time_seconds" in d]
        avg_time = round(sum(all_times) / len(all_times), 2) if all_times else 0
        sorted_times = sorted(all_times)
        median_time = round(sorted_times[len(sorted_times) // 2], 2) if sorted_times else 0

        # Agrupar por pregunta (node_id)
        questions_map: Dict[str, Dict[str, Any]] = {}

        for d in filtered:
            q_key = f"{d.get('story_id')}__{d.get('node_id')}"
            if q_key not in questions_map:
                questions_map[q_key] = {
                    "story_id": d.get("story_id"),
                    "story_title": d.get("story_title", d.get("story_id")),
                    "node_id": d.get("node_id"),
                    "chapter": d.get("chapter", 1),
                    "prompt": d.get("prompt"),
                    "all_options": d.get("all_options") or [],
                    "total_responses": 0,
                    "times": [],
                    "options_data": {},
                }

            q_obj = questions_map[q_key]
            q_obj["total_responses"] += 1
            t_sec = float(d.get("time_seconds", 0))
            q_obj["times"].append(t_sec)

            opt_id = d.get("option_id")
            if opt_id not in q_obj["options_data"]:
                q_obj["options_data"][opt_id] = {
                    "option_id": opt_id,
                    "option_label": d.get("option_label", opt_id),
                    "count": 0,
                    "times": [],
                }

            opt_obj = q_obj["options_data"][opt_id]
            opt_obj["count"] += 1
            opt_obj["times"].append(t_sec)

        # Procesar promedios y métricas de cada pregunta y opción
        questions_list = []
        for q_key, q_data in questions_map.items():
            times = q_data["times"]
            q_avg = round(sum(times) / len(times), 2) if times else 0
            sorted_q_times = sorted(times)
            q_median = round(sorted_q_times[len(sorted_q_times) // 2], 2) if sorted_q_times else 0
            q_min = round(min(times), 2) if times else 0
            q_max = round(max(times), 2) if times else 0

            options_list = []
            for opt_id, opt_info in q_data["options_data"].items():
                opt_times = opt_info["times"]
                opt_count = opt_info["count"]
                opt_avg = round(sum(opt_times) / len(opt_times), 2) if opt_times else 0
                sorted_opt = sorted(opt_times)
                opt_median = round(sorted_opt[len(sorted_opt) // 2], 2) if sorted_opt else 0
                opt_min = round(min(opt_times), 2) if opt_times else 0
                opt_max = round(max(opt_times), 2) if opt_times else 0
                pct = round((opt_count / q_data["total_responses"]) * 100, 1)

                # Clasificación de tiempo / nivel de reflexión para asistentes sociales
                # < 6s = Muy rápida / Impulsiva
                # 6s - 15s = Reflexión moderada / Normal
                # 15s - 25s = Duda notable / Conflicto
                # > 25s = Alta indecisión / Bloqueo emocional
                tag = "normal"
                tag_label = "Tiempo habitual"
                if opt_avg < 6:
                    tag = "rapida"
                    tag_label = "Decisión rápida / impulsiva"
                elif opt_avg > 22:
                    tag = "bloqueo"
                    tag_label = "Alta indecisión o bloqueo"
                elif opt_avg > 14:
                    tag = "duda"
                    tag_label = "Reflexión prolongada"

                options_list.append({
                    "option_id": opt_id,
                    "option_label": opt_info["option_label"],
                    "count": opt_count,
                    "percentage": pct,
                    "avg_time": opt_avg,
                    "median_time": opt_median,
                    "min_time": opt_min,
                    "max_time": opt_max,
                    "interpretation_tag": tag,
                    "interpretation_label": tag_label,
                })

            # Asegurarse de que si había opciones conocidas no elegidas, aparezcan con count 0
            if q_data["all_options"]:
                existing_ids = {o["option_id"] for o in options_list}
                for known_opt in q_data["all_options"]:
                    if known_opt.get("id") and known_opt["id"] not in existing_ids:
                        options_list.append({
                            "option_id": known_opt["id"],
                            "option_label": known_opt.get("label", known_opt["id"]),
                            "count": 0,
                            "percentage": 0.0,
                            "avg_time": 0,
                            "median_time": 0,
                            "min_time": 0,
                            "max_time": 0,
                            "interpretation_tag": "sin_datos",
                            "interpretation_label": "Sin elecciones",
                        })

            # Ordenar opciones por orden original o por count
            options_list = sorted(options_list, key=lambda x: x["count"], reverse=True)

            # Identificar opción más meditada y más rápida
            valid_opts = [o for o in options_list if o["count"] > 0]
            slowest_opt = max(valid_opts, key=lambda x: x["avg_time"]) if valid_opts else None
            fastest_opt = min(valid_opts, key=lambda x: x["avg_time"]) if valid_opts else None

            questions_list.append({
                "story_id": q_data["story_id"],
                "story_title": q_data["story_title"],
                "node_id": q_data["node_id"],
                "chapter": q_data["chapter"],
                "prompt": q_data["prompt"],
                "total_responses": q_data["total_responses"],
                "avg_time": q_avg,
                "median_time": q_median,
                "min_time": q_min,
                "max_time": q_max,
                "options": options_list,
                "slowest_option": slowest_opt,
                "fastest_option": fastest_opt,
                "is_high_hesitation": q_avg > 16.0,
            })

        # Ordenar preguntas: primero las que tienen mayor tiempo de indecisión o mayor actividad
        questions_list = sorted(questions_list, key=lambda q: q["avg_time"], reverse=True)

        # Estadísticas agrupadas por historia
        story_stats: Dict[str, Dict[str, Any]] = {}
        for q in questions_list:
            s_id = q["story_id"]
            if s_id not in story_stats:
                story_stats[s_id] = {
                    "story_id": s_id,
                    "story_title": q["story_title"],
                    "questions_count": 0,
                    "total_responses": 0,
                    "times": [],
                }
            story_stats[s_id]["questions_count"] += 1
            story_stats[s_id]["total_responses"] += q["total_responses"]
            # estimar promedio
            for opt in q["options"]:
                if opt["count"] > 0:
                    story_stats[s_id]["times"].extend([opt["avg_time"]] * opt["count"])

        for s_id, s_data in story_stats.items():
            t_list = s_data.pop("times")
            s_data["avg_time"] = round(sum(t_list) / len(t_list), 2) if t_list else 0

        # Pregunta con mayor vacilación global
        most_hesitated_question = questions_list[0] if questions_list else None

        return {
            "total_decisions": total_decisions,
            "overall_avg_time": avg_time,
            "overall_median_time": median_time,
            "fastest_decision_time": min(all_times) if all_times else 0,
            "slowest_decision_time": max(all_times) if all_times else 0,
            "most_hesitated_question": {
                "story_title": most_hesitated_question["story_title"],
                "prompt": most_hesitated_question["prompt"],
                "node_id": most_hesitated_question["node_id"],
                "avg_time": most_hesitated_question["avg_time"],
            } if most_hesitated_question else None,
            "questions": questions_list,
            "story_stats": list(story_stats.values()),
        }

    def _seed_initial_data(self):
        """Genera un dataset realista de decisiones de alumnos para análisis inicial."""
        student_names = [
            "Álex G.", "Lucía M.", "Mateo R.", "Carla P.", "Hugo S.",
            "Valeria T.", "Leo D.", "Noa F.", "Daniel B.", "Emma C.",
            "Iker L.", "Sara V.", "Marcos N.", "Alba Z.", "Adrián H.",
            "Chloe G.", "Pablo K.", "Elena V.", "Mario Q.", "Martina E."
        ]

        # Definición de preguntas clave con tiempos psicológicamente coherentes:
        # Preguntas con dilemas éticos y miedo a represalias tienen tiempos más altos.
        curated_questions = [
            {
                "story_id": "sara",
                "story_title": "Sara · Mi historia sigue",
                "node_id": "c1-choice",
                "chapter": 1,
                "prompt": "A Sara le cuesta empezar. ¿Qué necesita decir primero?",
                "options": [
                    {
                        "id": "partial",
                        "label": "«En casa pasan cosas que me dan miedo».",
                        "base_time": 22.4,  # Tiempo muy alto: gran coste emocional
                        "weight": 35,
                    },
                    {
                        "id": "time",
                        "label": "«Necesito un poco de tiempo».",
                        "base_time": 14.8,  # Tiempo intermedio: cautela
                        "weight": 40,
                    },
                    {
                        "id": "what",
                        "label": "«Si te cuento algo, ¿qué va a pasar?».",
                        "base_time": 18.2,  # Tiempo elevado: miedo a la incertidumbre
                        "weight": 25,
                    },
                ]
            },
            {
                "story_id": "sara",
                "story_title": "Sara · Mi historia sigue",
                "node_id": "c2-choice",
                "chapter": 2,
                "prompt": "¿Qué pregunta Sara mientras Laura organiza la ayuda?",
                "options": [
                    {
                        "id": "call",
                        "label": "«¿Vais a llamar a mi padre ahora mismo?».",
                        "base_time": 19.5,
                        "weight": 45,
                    },
                    {
                        "id": "steps",
                        "label": "«¿Adónde vamos después de hablar aquí?».",
                        "base_time": 11.2,
                        "weight": 35,
                    },
                    {
                        "id": "stay",
                        "label": "«¿Puedo quedarme con Paula un rato más?».",
                        "base_time": 7.4,
                        "weight": 20,
                    },
                ]
            },
            {
                "story_id": "sara",
                "story_title": "Sara · Mi historia sigue",
                "node_id": "c3-choice",
                "chapter": 3,
                "prompt": "Sara tiene muchas preguntas. ¿Cuál hace primero?",
                "options": [
                    {
                        "id": "court",
                        "label": "«¿Tendré que estar delante de él cuando cuente esto?».",
                        "base_time": 25.6, # El dilema con más miedo
                        "weight": 50,
                    },
                    {
                        "id": "brother",
                        "label": "«¿Alguien se va a ocupar de cómo está Dani?».",
                        "base_time": 16.3,
                        "weight": 30,
                    },
                    {
                        "id": "school",
                        "label": "«¿Puedo seguir yendo a clase de voleibol?».",
                        "base_time": 9.1,
                        "weight": 20,
                    },
                ]
            },
            {
                "story_id": "sara",
                "story_title": "Sara · Mi historia sigue",
                "node_id": "c5-choice",
                "chapter": 5,
                "prompt": "Antes de la actuación, ¿qué quiere conocer Sara?",
                "options": [
                    {
                        "id": "room",
                        "label": "«Quiero ver la sala antes de que empiece la grabación».",
                        "base_time": 10.5,
                        "weight": 45,
                    },
                    {
                        "id": "judge",
                        "label": "«Quiero saber quién va a escuchar mis respuestas».",
                        "base_time": 17.8,
                        "weight": 35,
                    },
                    {
                        "id": "break",
                        "label": "«Quiero acordar qué señal hago si necesito parar».",
                        "base_time": 14.1,
                        "weight": 20,
                    },
                ]
            },
            {
                "story_id": "dos-voces",
                "story_title": "Dos voces",
                "node_id": "c1-m1",
                "chapter": 1,
                "prompt": "El padre da un golpe en la mesa. La madre se queda callada. ¿Qué hace Maya?",
                "options": [
                    {
                        "id": "c1-m1-safe",
                        "label": "Esperar a que baje la tensión y acompañar a mamá después, sin ponerse en medio.",
                        "base_time": 16.5,
                        "weight": 40,
                    },
                    {
                        "id": "c1-m1-risk1",
                        "label": "Ponerse delante de papá para que pare.",
                        "base_time": 6.8, # Decisión impulsiva y de riesgo
                        "weight": 25,
                    },
                    {
                        "id": "c1-m1-risk2",
                        "label": "Subir el volumen de los auriculares y pensar que es culpa suya.",
                        "base_time": 11.2,
                        "weight": 35,
                    },
                ]
            },
            {
                "story_id": "dos-voces",
                "story_title": "Dos voces",
                "node_id": "c3-m3",
                "chapter": 3,
                "prompt": "En la entrevista con Servicios Sociales, Maya teme que la separen de su madre. ¿Qué hace?",
                "options": [
                    {
                        "id": "c3-m3-safe",
                        "label": "Preguntarle directamente a la trabajadora social qué va a pasar ahora.",
                        "base_time": 21.0,
                        "weight": 45,
                    },
                    {
                        "id": "c3-m3-risk1",
                        "label": "Callarse por miedo a que las cosas empeoren.",
                        "base_time": 13.5,
                        "weight": 35,
                    },
                    {
                        "id": "c3-m3-risk2",
                        "label": "Decir que todo era una exageración.",
                        "base_time": 8.0,
                        "weight": 20,
                    },
                ]
            },
            {
                "story_id": "dos-voces",
                "story_title": "Dos voces",
                "node_id": "c2-m4",
                "chapter": 2,
                "prompt": "El padre envía un mensaje: «Si cuentas algo, tu madre lo va a pasar peor». ¿Qué hace Maya?",
                "options": [
                    {
                        "id": "c2-m4-safe",
                        "label": "Guardar el mensaje como prueba y enseñárselo a orientación.",
                        "base_time": 24.3,
                        "weight": 50,
                    },
                    {
                        "id": "c2-m4-risk1",
                        "label": "Borrar el mensaje para que no haya problemas.",
                        "base_time": 7.5,
                        "weight": 30,
                    },
                    {
                        "id": "c2-m4-risk2",
                        "label": "Responder con insultos para defender a su madre.",
                        "base_time": 5.9,
                        "weight": 20,
                    },
                ]
            },
            {
                "story_id": "no-lo-reenvies",
                "story_title": "No lo reenvíes",
                "node_id": "decision-1",
                "chapter": 1,
                "prompt": "Sara ve lo que está pasando con la foto en el grupo. ¿Qué hace?",
                "options": [
                    {
                        "id": "opt-stop",
                        "label": "Decir en el grupo que borren la foto y avisar a Julia.",
                        "base_time": 12.8,
                        "weight": 55,
                    },
                    {
                        "id": "opt-forward",
                        "label": "Reenviar la foto a sus amigas más cercanas.",
                        "base_time": 4.5,
                        "weight": 15,
                    },
                    {
                        "id": "opt-ignore",
                        "label": "No decir nada para no meterse en líos.",
                        "base_time": 8.2,
                        "weight": 30,
                    },
                ]
            },
            {
                "story_id": "no-soy-yo",
                "story_title": "No soy yo",
                "node_id": "decision-2",
                "chapter": 2,
                "prompt": "¿Qué decide hacer Sergio con la cuenta falsa?",
                "options": [
                    {
                        "id": "report",
                        "label": "Capturar pantallas y denunciar la cuenta a la plataforma y a sus padres.",
                        "base_time": 15.4,
                        "weight": 60,
                    },
                    {
                        "id": "confront",
                        "label": "Escribir al perfil falso amenazando con pegarle.",
                        "base_time": 6.2,
                        "weight": 25,
                    },
                    {
                        "id": "hide",
                        "label": "Cerrar su propia cuenta y no decírselo a nadie.",
                        "base_time": 9.8,
                        "weight": 15,
                    },
                ]
            },
        ]

        # Simular ~70 decisiones de alumnos reales
        now = time.time()
        random.seed(42)

        for q in curated_questions:
            # Número de respuestas para esta pregunta (entre 12 y 18 alumnos)
            num_responses = random.randint(12, 17)
            options_pool = q["options"]
            all_opts_simple = [{"id": o["id"], "label": o["label"]} for o in options_pool]

            for _ in range(num_responses):
                student = random.choice(student_names)
                # Elegir opción según pesos
                weights = [o["weight"] for o in options_pool]
                chosen_opt = random.choices(options_pool, weights=weights, k=1)[0]

                # Variar el tiempo alrededor de la base (con distribución gamma o normal)
                base = chosen_opt["base_time"]
                noise = random.gauss(0, base * 0.22)
                t_val = max(2.5, round(base + noise, 1))

                # Fecha en los últimos 7 días
                time_ago = random.uniform(300, 86400 * 5)
                rec_ts = now - time_ago

                self.decisions.append({
                    "id": f"seed_{int(rec_ts)}_{random.randint(1000, 9999)}",
                    "story_id": q["story_id"],
                    "story_title": q["story_title"],
                    "node_id": q["node_id"],
                    "chapter": q["chapter"],
                    "prompt": q["prompt"],
                    "option_id": chosen_opt["id"],
                    "option_label": chosen_opt["label"],
                    "all_options": all_opts_simple,
                    "time_seconds": t_val,
                    "time_ms": int(t_val * 1000),
                    "student_nickname": student,
                    "session_pin": f"{random.randint(100, 999)} {random.randint(100, 999)}",
                    "timestamp": rec_ts,
                })


telemetry_store = TelemetryStore()
