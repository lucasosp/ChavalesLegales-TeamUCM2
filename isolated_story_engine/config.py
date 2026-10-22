"""Configuración e hiperparámetros del prototipo aislado.

Todo se puede sobreescribir con variables de entorno. Los servicios externos (ChromaDB, Redis,
Gemini) están APAGADOS por defecto: sin ellos el motor funciona con alternativas en memoria y
sin red, que es lo que usan las pruebas.
"""
import os

# --- Hiperparámetros del enjambre -------------------------------------------------------
MAX_NODES_PER_GROUP = 4       # nodos que se eligen como máximo en cada grupo
MIN_OVERRIDDEN_TAGS = 2       # etiquetas que cada grupo debe sobreescribir para el siguiente
GROUPS = (1, 2, 3, 4, 5)
LEGAL_GROUPS = (4, 5)         # los dos últimos grupos son SIEMPRE de legalidad
AGE_BAND_THRESHOLD = 11       # <11 años: lenguaje sencillo · >=11: lenguaje más completo
LEGAL_AGE_THRESHOLD = 14      # <14: la ley prevé garantías especiales para declarar (ver historia)
EDAD_MIN, EDAD_MAX = 5, 18    # mismos límites que backend/main.py
MINIGAMES = ("dibujo-avatar", "mesa-familia", "caja-arena")

# --- Etiquetas por fase y franja límite -------------------------------------------------------
# El LLM elige UNA etiqueta por fase (antes / durante / después del juicio) y da su confianza (0-1).
# Con confianza >= UMBRAL_CONFIANZA la etiqueta ANULA la elección aleatoria de nodos; por debajo,
# manda el azar. Es una constante global.
FASES = ("antes", "durante", "despues")
UMBRAL_CONFIANZA = float(os.getenv("UMBRAL_CONFIANZA", "0.70"))

# Tipos de riesgo del selector de la aplicación (frontend/components/panel/opcionesRiesgo.js)
TIPOS_RIESGO = ("ciberacoso", "suplantacion", "grooming", "control_pareja", "privacidad")

# Prototipos de personaje (ids de LegalinStory/public/content/shared/assets.json) para el
# protagonista. Se elige uno solo si el LLM detecta el sexo con confianza >= UMBRAL_CONFIANZA;
# si no, no hay prototipo (no se adivina). Todos los dibujos actuales son de adolescentes.
PROTOTIPOS = {"f": ("sara", "julia", "marina", "maya", "sofi", "hana"), "m": ("sergio", "hugo")}

# --- Servicios ----------------------------------------------------------------------------
USE_REDIS = os.getenv("USE_REDIS", "0") == "1"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
STATE_TTL_SECONDS = int(os.getenv("STATE_TTL_SECONDS", "3600"))

USE_CHROMA = os.getenv("USE_CHROMA", "0") == "1"
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
CHROMA_COLLECTION = "frases_y_nodos"

# La clave SOLO se lee del entorno: nunca se escribe en el código ni se versiona.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # comprobar el nombre vigente
USE_GEMINI = os.getenv("USE_GEMINI", "0") == "1" and bool(GEMINI_API_KEY)
MAX_CONTEXT_CHARS = 500       # lo máximo que se envía del contexto escrito por el profesional
