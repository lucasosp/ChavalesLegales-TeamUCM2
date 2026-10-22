"""Extracción de etiquetas con Gemini (con alternativa local sin red).

PRIVACIDAD: a Gemini NUNCA se le envía el nombre del menor. Antes de salir, el contexto escrito
por el profesional se anonimiza (`anonimizar`): se sustituye el nombre por {NOMBRE} y se quitan
correos, teléfonos, DNI/NIE y enlaces. Solo viajan la edad, el sexo y ese contexto reducido.
La respuesta se valida contra la taxonomía: lo que no esté en ella se descarta.
"""
import json
import re
from typing import Optional

import config
from dag_swarm.node_catalog import CONTEXTOS, TEMAS
from dag_swarm.phrasing_db import age_band

_CORREO = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_ENLACE = re.compile(r"https?://\S+|www\.\S+")
_DNI = re.compile(r"\b(?:\d{8}[A-Za-z]|[XYZxyz]\d{7}[A-Za-z])\b")
_TELEFONO = re.compile(r"(?<!\w)\+?\d(?:[\s.-]?\d){6,}(?!\w)")


def anonimizar(contexto: str, nombre: str) -> str:
    """Quita del texto libre lo que identifica al menor, antes de enviarlo a un servicio externo."""
    texto = contexto or ""
    for patron in (_CORREO, _ENLACE, _DNI, _TELEFONO):
        texto = patron.sub("[dato eliminado]", texto)
    for parte in {p for p in re.split(r"\s+", nombre.strip()) if len(p) > 1}:
        texto = re.sub(rf"\b{re.escape(parte)}\b", "{NOMBRE}", texto, flags=re.IGNORECASE)
    return texto[: config.MAX_CONTEXT_CHARS]


# --- Alternativa local: reglas por palabras clave ---------------------------------------------
_REGLAS_CONTEXTO = (
    ("suplantacion", r"suplant|cuenta falsa|perfil falso|se hace pasar"),
    ("grooming", r"grooming|adulto desconocid|desconocido|chantaj|fotos? intim"),
    ("control_pareja", r"pareja|novi[oa]|\bex\b|controla el m[oó]vil de"),
    ("ciberacoso", r"ciber|redes sociales|insult\w* (?:por|en) (?:redes|mensajes)|difusi[oó]n|difund|viral"),
    ("privacidad", r"privacidad|expuest|sobreexposici|fotos? compartid"),
    ("violencia_familiar", r"violencia|maltrat|padre|madre|pap[aá]|mam[aá]|familia|golpe|grit|casa"),
)
_REGLAS_TEMAS = {
    "movil": r"m[oó]vil|mensaj|redes|whatsapp|foto",
    "familia": r"familia|padre|madre|pap[aá]|mam[aá]|herman",
    "hermanos": r"herman",
    "colegio": r"cole|clase|instituto|profes|tutor",
    "amistad": r"amig|compa[nñ]er",
    "miedo": r"miedo|asust|amenaz",
    "proteccion": r"protecci|medida|orden de|aproxim",
    "deporte": r"deporte|voley|f[uú]tbol|balonc",
}


def heuristica_etiquetas(edad: int, sexo: str, contexto: str) -> dict:
    texto = (contexto or "").lower()
    elegido = next((c for c, patron in _REGLAS_CONTEXTO if re.search(patron, texto)), "otro")
    temas = [t for t, patron in _REGLAS_TEMAS.items() if re.search(patron, texto)]
    return {"contexto": elegido, "temas": temas[:4], "tono": "sereno" if age_band(edad) == "over_11" else "calido",
            "fuente": "heuristica"}


# --- Gemini ---------------------------------------------------------------------------------
def _prompt(edad: int, sexo: str, contexto_anonimo: str) -> str:
    return (
        "Eres un asistente que clasifica el contexto de un caso para adaptar una historia educativa "
        "sobre derechos de la infancia. No inventes datos ni identifiques a nadie.\n"
        f"Edad: {edad}. Sexo: {sexo}. Contexto (anonimizado): {contexto_anonimo!r}\n"
        f"Responde SOLO con JSON: {{\"contexto\": uno de {list(CONTEXTOS)}, "
        f"\"temas\": hasta 4 de {list(TEMAS)}, \"tono\": \"calido\" o \"sereno\"}}"
    )


def _llamar_gemini(prompt: str) -> dict:
    """Hueco de configuración: aquí se conecta la API de Gemini (SDK google-genai)."""
    from google import genai  # perezoso: el prototipo funciona sin la librería

    cliente = genai.Client(api_key=config.GEMINI_API_KEY)
    respuesta = cliente.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=prompt,
        config={"response_mime_type": "application/json", "temperature": 0.2},
    )
    return json.loads(respuesta.text)


def validar_etiquetas(bruto: dict, respaldo: dict) -> dict:
    """Se queda solo con lo que pertenece a la taxonomía; lo demás se descarta."""
    contexto = bruto.get("contexto")
    temas = [t for t in bruto.get("temas", []) if t in TEMAS][:4]
    tono = bruto.get("tono") if bruto.get("tono") in ("calido", "sereno") else respaldo["tono"]
    return {"contexto": contexto if contexto in CONTEXTOS else respaldo["contexto"], "temas": temas, "tono": tono}


def extraer_etiquetas(nombre: str, edad: int, sexo: str, contexto_legal: str,
                      llamar: Optional[callable] = None) -> dict:
    """Etiquetas del caso. `llamar` permite inyectar otra función (pruebas) en lugar de Gemini."""
    anonimo = anonimizar(contexto_legal, nombre)
    respaldo = heuristica_etiquetas(edad, sexo, anonimo)
    llamada = llamar or (_llamar_gemini if config.USE_GEMINI else None)
    if llamada is None:
        return respaldo
    try:
        return {**validar_etiquetas(llamada(_prompt(edad, sexo, anonimo)), respaldo), "fuente": "gemini"}
    except Exception as error:  # red, cuota, JSON roto...: la historia no depende del LLM
        print(f"[llm_generator] Gemini no disponible, se usa la heurística local: {type(error).__name__}")
        return respaldo
