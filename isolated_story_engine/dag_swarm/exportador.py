"""Exporta el DAG al formato que lee el motor actual (LegalinStory): una carpeta de historia con
story.json, novel.json, scene.json y assets.json, más la entrada para content/index.json.

NO escribe nada en disco ni toca el motor: devuelve los archivos como diccionarios. El nombre del
menor se incrusta aquí en los textos (el motor actual no tiene marcadores) y por eso el resultado
es efímero: la API lo devuelve y no lo guarda.

Correspondencia de nodos:
  inicio / tarjeta de grupo -> interstitial      narracion, dialogo, opcion, frase -> dialogue
  eleccion                  -> choice            minijuego                         -> external
  final                     -> ending

Los recursos (personajes y fondos) salen de plantillas/ (copia de los de la historia de Sara):
así el motor del prototipo no necesita leer fuera de esta carpeta al generar.
"""
import copy
import json
from pathlib import Path
from typing import Optional

from dag_swarm.node_swarm import orden_topologico

PLANTILLAS = Path(__file__).resolve().parent / "plantillas"

# Título y subtítulo de la tarjeta de cada grupo (capítulo)
TARJETAS = {
    1: ("Algo no va bien", "Un día cualquiera, hasta que algo cambia."),
    2: ("Alguien escucha", "Pedir ayuda, paso a paso."),
    3: ("Mi vida continúa", "Mientras los adultos organizan la ayuda."),
    4: ("El tribunal", "Saber quién es quién y qué va a pasar."),
    5: ("Después de todo", "El proceso sigue su camino, y la vida también."),
}
TOTAL_CAPITULOS = len(TARJETAS)

# Escenas de scene.json (las mismas que usa la historia de Sara)
ESCENA_DE_LUGAR = {
    "colegio": "classroom-day", "despacho": "orientation-office", "casa": "bedroom-evening",
    "casa_segura": "quiet-room", "tribunal": "court-friendly",
}
ESCENA_INICIAL = "school-exterior"
# Ids de actividad de la plataforma. 'dibujo-avatar' aún no existe como actividad externa: el motor
# actual solo la dispara por id de nodo en la historia de Sara (hay que integrarla más adelante).
JUEGO_DE_MINIJUEGO = {"dibujo-avatar": "dibujo-avatar", "mesa-familia": "cid-table", "caja-arena": "caja-arena"}
EXPRESION_DE_TENSION = {"alta": "sad", "media": "neutral", "baja": "smile"}


def _id(id_: str) -> str:
    return id_.replace("::", "--")


def _insertar_antes(aristas: list, destino: str, nuevos: list) -> None:
    """Cuelga la cadena `nuevos` entre los predecesores de `destino` y `destino`."""
    previos = [a for a, b in aristas if b == destino]
    aristas[:] = [[a, b] for a, b in aristas if b != destino]
    aristas += [[p, nuevos[0]] for p in previos]
    aristas += [[x, y] for x, y in zip(nuevos, nuevos[1:])]
    aristas.append([nuevos[-1], destino])


def exportar(historia: dict, nombre: str, story_id: str) -> dict:
    banda, nombre = historia["edad_banda"], nombre.strip()
    prototipo = historia.get("prototipo")
    texto = lambda nodo: nodo["texto"][banda].replace("{nombre}", nombre)  # noqa: E731

    nodos = copy.deepcopy(historia["nodos"])
    aristas = [list(a) for a in historia["aristas"]]
    extra = {}  # nodos que añade el exportador: tarjetas de capítulo y frases de apertura

    for grupo, ids in historia["grupos"].items():
        primero = ids[0]
        nuevos = []
        if grupo > 1:
            titulo, subtitulo = TARJETAS[grupo]
            extra[f"cap-{grupo}"] = {"tipo": "tarjeta", "grupo": grupo, "titulo": titulo, "subtitulo": subtitulo}
            nuevos.append(f"cap-{grupo}")
        if nodos[primero].get("frase"):
            extra[f"{primero}::pensamiento"] = {"tipo": "pensamiento", "grupo": grupo, "texto": nodos[primero]["frase"]}
            nuevos.append(f"{primero}::pensamiento")
        if nuevos:
            _insertar_antes(aristas, primero, nuevos)

    sucesores = {}
    for origen, destino in aristas:
        sucesores.setdefault(origen, []).append(destino)
    sig = lambda id_: _id(sucesores[id_][0])  # noqa: E731

    orden = orden_topologico({"nodos": {**nodos, **extra}, "aristas": aristas})
    lugar, tension, escena_puesta = "colegio", "baja", ESCENA_INICIAL
    salida = {}

    for id_ in orden:
        nodo = nodos.get(id_) or extra[id_]
        tipo, grupo = nodo["tipo"], nodo["grupo"]
        capitulo = min(max(grupo, 1), TOTAL_CAPITULOS)

        # Escena y expresión según las etiquetas de estado que van fijando los nodos
        fija = nodo.get("fija", {})
        lugar, tension = fija.get("lugar", lugar), fija.get("tension", tension)
        escena = ESCENA_DE_LUGAR[lugar] if tipo not in ("inicio", "tarjeta") else None
        pone_escena = escena and escena != escena_puesta
        if pone_escena:
            escena_puesta = escena
        decorado = {"chapter": capitulo, **({"scene": escena} if pone_escena else {})}
        reparto = {"cast": {prototipo: EXPRESION_DE_TENSION[tension]}} if prototipo else {}

        if tipo == "inicio":
            titulo, subtitulo = TARJETAS[1]
            salida[id_] = {"chapter": 1, "type": "interstitial", "kicker": f"CAPÍTULO 1 DE {TOTAL_CAPITULOS}",
                           "title": titulo, "text": subtitulo, "next": sig(id_), "scene": ESCENA_INICIAL}
        elif tipo == "tarjeta":
            salida[_id(id_)] = {"chapter": capitulo, "type": "interstitial",
                                "kicker": f"CAPÍTULO {grupo} DE {TOTAL_CAPITULOS}",
                                "title": nodo["titulo"], "text": nodo["subtitulo"], "next": sig(id_)}
        elif tipo == "pensamiento":
            salida[_id(id_)] = {**decorado, "type": "dialogue", "speaker": nombre, "tone": "thought",
                                "text": nodo["texto"], "next": sig(id_), **reparto}
        elif tipo in ("narracion", "dialogo", "opcion"):
            salida[_id(id_)] = {**decorado, "type": "dialogue", "speaker": None, "text": texto(nodo),
                                "next": sig(id_), **reparto}
        elif tipo == "eleccion":
            clave = id_.replace("-", "_")
            opciones = []
            for destino in sucesores[id_]:
                rama = nodos[destino]
                opcion_id = destino.split("::", 1)[1]
                opciones.append({"id": opcion_id, "label": rama["etiqueta"], "next": _id(destino),
                                 "flags": {clave: opcion_id}})
            salida[_id(id_)] = {**decorado, "type": "choice", "prompt": texto(nodo), "options": opciones, **reparto}
        elif tipo == "minijuego":
            salida[_id(id_)] = {**decorado, "type": "external", "game": JUEGO_DE_MINIJUEGO[nodo["minijuego"]],
                                "text": texto(nodo), "next": sig(id_), **reparto}
        elif tipo == "final":
            salida[_id(id_)] = {"chapter": TOTAL_CAPITULOS, "type": "ending",
                                "kicker": f"{nombre.upper()} · MI HISTORIA SIGUE", "title": "Seguimos adelante",
                                "text": texto(nodo)}
        else:
            raise ValueError(f"Tipo de nodo desconocido: {tipo}")

    titulo_historia = f"{nombre} · Mi historia sigue"
    return {
        "story_id": story_id,
        "indice": {
            "id": story_id, "title": titulo_historia,
            "subtitle": "Una historia adaptada para acompañar y comprender el proceso.",
            "manifest": f"stories/{story_id}/novel.json", "cover": "assets/backgrounds/patio-day.svg",
        },
        "archivos": {
            "story.json": {"version": 1, "start": "inicio", "initialFlags": {}, "nodes": salida},
            "novel.json": {
                "version": 1, "id": story_id, "title": titulo_historia,
                "content": {"story": "story.json", "assets": "assets.json", "scenes": "scene.json"},
                "stage": {"width": 1920, "height": 1080}, "start": {"node": "inicio", "scene": ESCENA_INICIAL},
                "save": {"key": f"{story_id}.save", "version": 1},
            },
            "scene.json": json.loads((PLANTILLAS / "scene_base.json").read_text(encoding="utf-8")),
            "assets.json": json.loads((PLANTILLAS / "assets_base.json").read_text(encoding="utf-8")),
        },
    }
