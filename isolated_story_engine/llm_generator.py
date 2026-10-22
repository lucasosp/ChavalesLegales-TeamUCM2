"""Clasificación del contexto con Gemini (con alternativa local sin red).

El LLM NO escribe la historia: solo clasifica el texto libre del contexto. Para cada fase (antes /
durante / después del juicio) elige la etiqueta que mejor encaja y da su CONFIANZA (0-1); además
detecta el sexo del protagonista, que solo sirve para elegir el prototipo de personaje. El motor
(node_swarm) decide con la franja límite UMBRAL_CONFIANZA si esa etiqueta anula la elección aleatoria.

PRIVACIDAD: a Gemini NUNCA se le envía el nombre del menor. El contexto se anonimiza antes
(`anonimizar`): se sustituye el nombre por {NOMBRE} y se quitan correos, teléfonos, DNI/NIE y
enlaces. Viajan solo la edad, el tipo de riesgo del selector y ese contexto reducido. La respuesta
se valida contra la taxonomía: lo que no esté en ella se descarta.
"""
import json
import re
from typing import Callable, Optional

import config
from dag_swarm.node_catalog import ETIQUETAS_FASE

_CORREO = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_ENLACE = re.compile(r"https?://\S+|www\.\S+")
_DNI = re.compile(r"\b(?:\d{8}[A-Za-z]|[XYZxyz]\d{7}[A-Za-z])\b")
_TELEFONO = re.compile(r"(?<!\w)\+?\d(?:[\s.-]?\d){6,}(?!\w)")
SEXOS = ("f", "m", "x", "desconocido")


def anonimizar(contexto: str, nombre: str) -> str:
    """Quita del texto libre lo que identifica al menor, antes de enviarlo a un servicio externo."""
    texto = contexto or ""
    for patron in (_CORREO, _ENLACE, _DNI, _TELEFONO):
        texto = patron.sub("[dato eliminado]", texto)
    for parte in {p for p in re.split(r"\s+", nombre.strip()) if len(p) > 1}:
        texto = re.sub(rf"\b{re.escape(parte)}\b", "{NOMBRE}", texto, flags=re.IGNORECASE)
    return texto[: config.MAX_CONTEXT_CHARS]


# --- Alternativa local: reglas por palabras clave, con confianza según las coincidencias --------
_REGLAS = {
    "convivencia_conflictiva": r"gritos?|discusi[oó]n|violencia en casa|maltrat|golpe|pelea[sn]? en casa|miedo en casa",
    "aislamiento_social": r"aisl|sola? en el recreo|sin amig|no habla con nadie|se aparta",
    "ausencias_escolares": r"falta[sn]? (?:a )?clase|ausencia|no (?:va|viene) al (?:cole|colegio|instituto)|absentismo",
    "control_del_movil": r"le revisa el m[oó]vil|controla(?:n)? el m[oó]vil|le quita el m[oó]vil|le mira el m[oó]vil",
    "difusion_de_imagenes": r"difusi[oó]n|difund|foto(?:s)? (?:compartid|circula)|imagen(?:es)? (?:compartid|circula)|viral",
    "contacto_con_adulto_desconocido": r"adulto desconocido|desconocid[oa]|persona mayor|conoci[oó] por internet|le pide (?:fotos|que no lo cuente)",
    "cambios_de_conducta": r"duerme mal|irritab|cambio de (?:actitud|conducta|humor)|ya no quiere|apat[ií]a|llora",
    "citacion_reciente": r"citaci[oó]n|le han citado|carta del (?:juzgado|tribunal)",
    "declaracion_pendiente": r"declarar|declaraci[oó]n|prueba preconstituida|tiene que ir al (?:juzgado|tribunal)",
    "medidas_de_proteccion": r"orden de (?:alejamiento|protecci[oó]n)|medida[s]? (?:de protecci[oó]n|cautelar)|no puede acercarse|prohibici[oó]n de aproxim",
    "acompanamiento_psicosocial": r"psic[oó]log|equipo psicosocial|terapia|apoyo emocional",
    "sin_denuncia_todavia": r"sin denuncia|no hay denuncia|no se ha denunciado|todav[ií]a no (?:han )?denunci",
    "sentencia_condenatoria": r"sentencia condenatoria|condenad|condena",
    "sentencia_absolutoria": r"absoluci[oó]n|absuelt|sentencia absolutoria",
    "recurso_pendiente": r"recurso|han recurrido|recurrir",
    "archivo_de_la_causa": r"archiv(?:o|ada|ado|aron)|sobresei",
    "proteccion_continuada": r"sigue (?:la )?protecci[oó]n|seguimiento|medidas? (?:siguen|continúan)",
    "vuelta_a_la_rutina": r"vuelve a (?:clase|la rutina)|rutina|ha vuelto al (?:cole|colegio|instituto)",
}
_SEXO_F = re.compile(r"\b(?:ni[ñn]a|chica|hija|alumna|ella|adolescente chica|la menor)\b", re.IGNORECASE)
_SEXO_M = re.compile(r"\b(?:ni[ñn]o|chico|hijo|alumno|[eé]l|el menor)\b", re.IGNORECASE)
_CONFIANZA_POR_COINCIDENCIAS = {1: 0.60, 2: 0.80}  # 3 o más: 0.90


def _confianza(coincidencias: int) -> float:
    return 0.0 if not coincidencias else _CONFIANZA_POR_COINCIDENCIAS.get(coincidencias, 0.90)


def heuristica_etiquetas(contexto: str) -> dict:
    """Misma salida que Gemini, calculada con reglas locales."""
    texto = (contexto or "").lower()
    resultado = {}
    for fase, etiquetas in ETIQUETAS_FASE.items():
        puntuadas = [(len(re.findall(_REGLAS[e], texto)), e) for e in etiquetas]
        coincidencias, etiqueta = max(puntuadas)
        resultado[fase] = {"etiqueta": etiqueta if coincidencias else None, "confianza": _confianza(coincidencias)}
    f, m = len(_SEXO_F.findall(texto)), len(_SEXO_M.findall(texto))
    if f and not m:
        resultado["protagonista"] = {"sexo": "f", "confianza": 0.80 if f == 1 else 0.90}
    elif m and not f:
        resultado["protagonista"] = {"sexo": "m", "confianza": 0.80 if m == 1 else 0.90}
    else:
        resultado["protagonista"] = {"sexo": "desconocido", "confianza": 0.0}  # nada o contradictorio
    return {**resultado, "fuente": "heuristica"}


# --- Gemini ---------------------------------------------------------------------------------
def _prompt(edad: int, tipo_riesgo: str, contexto_anonimo: str) -> str:
    taxonomia = {fase: list(etiquetas) for fase, etiquetas in ETIQUETAS_FASE.items()}
    return (
        "Eres un clasificador. Lees el contexto de un caso sobre derechos de la infancia (ya anonimizado) y "
        "eliges, para cada fase, la etiqueta que MEJOR encaja. No inventes datos ni identifiques a nadie. "
        "Si el texto no dice nada sobre una fase, devuelve etiqueta null. La confianza (0 a 1) debe ser honesta: "
        "usa menos de 0.5 si dudas.\n"
        f"Edad: {edad}. Tipo de riesgo: {tipo_riesgo}. Contexto: {contexto_anonimo!r}\n"
        f"Etiquetas posibles por fase: {json.dumps(taxonomia, ensure_ascii=False)}\n"
        "Además indica el sexo del protagonista si el texto lo dice (f, m, x o desconocido) con su confianza.\n"
        'Responde SOLO con JSON: {"antes": {"etiqueta": ..., "confianza": 0.0}, "durante": {...}, '
        '"despues": {...}, "protagonista": {"sexo": "f|m|x|desconocido", "confianza": 0.0}}'
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


def _numero(valor) -> float:
    try:
        return min(1.0, max(0.0, float(valor)))
    except (TypeError, ValueError):
        return 0.0


def validar_etiquetas(bruto: dict) -> dict:
    """Se queda solo con lo que pertenece a la taxonomía; lo demás se descarta."""
    resultado = {}
    for fase, etiquetas in ETIQUETAS_FASE.items():
        parte = bruto.get(fase) if isinstance(bruto.get(fase), dict) else {}
        etiqueta = parte.get("etiqueta")
        resultado[fase] = {"etiqueta": etiqueta if etiqueta in etiquetas else None, "confianza": _numero(parte.get("confianza"))}
    prot = bruto.get("protagonista") if isinstance(bruto.get("protagonista"), dict) else {}
    resultado["protagonista"] = {"sexo": prot.get("sexo") if prot.get("sexo") in SEXOS else "desconocido",
                                 "confianza": _numero(prot.get("confianza"))}
    return resultado


def extraer_etiquetas(nombre: str, edad: int, contexto: str, tipo_riesgo: str,
                      llamar: Optional[Callable[[str], dict]] = None) -> dict:
    """Etiquetas del contexto. `llamar` permite inyectar otra función (pruebas) en lugar de Gemini."""
    anonimo = anonimizar(contexto, nombre)
    llamada = llamar or (_llamar_gemini if config.USE_GEMINI else None)
    if llamada is None:
        return heuristica_etiquetas(anonimo)
    try:
        return {**validar_etiquetas(llamada(_prompt(edad, tipo_riesgo, anonimo))), "fuente": "gemini"}
    except Exception as error:  # red, cuota, JSON roto...: la historia no depende del LLM
        print(f"[llm_generator] Gemini no disponible, se usa la heurística local: {type(error).__name__}")
        return heuristica_etiquetas(anonimo)
