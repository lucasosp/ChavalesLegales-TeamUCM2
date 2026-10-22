"""Base de frases por edad: <11 años (lenguaje sencillo) y >=11 (más completo).

Son frases en primera persona que el motor intercala al abrir cada grupo. Los textos de los
nodos (node_catalog.py) llevan además su propia variante por edad.
"""
from config import AGE_BAND_THRESHOLD

PHRASING_DB = {
    "under_11": {
        "pensamiento": [
            "Me siento un poco confuso hoy.",
            "Esto es como un juego de pistas.",
            "Quiero que todo salga bien y estar tranquilo.",
        ],
        "duda": [
            "No sé muy bien qué va a pasar ahora.",
            "¿Y si no me acuerdo de todo?",
        ],
        "alivio": [
            "Menos mal que hay personas que me ayudan.",
            "Ya no me siento tan solo.",
        ],
        "cierre": [
            "Hoy he aprendido que puedo pedir ayuda.",
        ],
    },
    "over_11": {
        "pensamiento": [
            "Comprendo la magnitud de la situación y necesito analizar mis opciones con claridad.",
            "El procedimiento legal plantea cuestiones complejas sobre mi entorno.",
            "Busco una resolución justa que aporte estabilidad a mi día a día.",
        ],
        "duda": [
            "No tengo claro qué esperan de mí y me gustaría que me lo explicaran paso a paso.",
            "Me preocupa no recordar algunos detalles con exactitud.",
        ],
        "alivio": [
            "Saber que hay profesionales a mi lado me da algo de calma.",
            "Entender el proceso me ayuda a sentirme con más control.",
        ],
        "cierre": [
            "Pedir ayuda ha sido difícil, pero era lo que necesitaba.",
        ],
    },
}


def age_band(age: int) -> str:
    return "under_11" if age < AGE_BAND_THRESHOLD else "over_11"


def get_phrases_by_age(age: int) -> list:
    """Todas las frases de la franja de edad, en una lista plana."""
    return [frase for grupo in PHRASING_DB[age_band(age)].values() for frase in grupo]


def get_phrase(intent: str, age: int, rng) -> str:
    """Una frase de la intención pedida (o de 'pensamiento' si no existe) para esa edad."""
    banda = PHRASING_DB[age_band(age)]
    return rng.choice(banda.get(intent) or banda["pensamiento"])
