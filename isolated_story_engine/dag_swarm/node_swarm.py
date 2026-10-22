"""Enjambre de nodos: elige los nodos de cada grupo y los une en un DAG.

Flujo:  inicio -> grupo 1 -> grupo 2 -> grupo 3 -> grupo 4 (LEGAL) -> grupo 5 (LEGAL) -> final

- Cada grupo elige hasta MAX_NODES_PER_GROUP nodos compatibles con el estado actual de etiquetas.
  Los obligatorios entran siempre (los 3 minijuegos, y el marco legal de los grupos 4 y 5).
- Al cerrar cada grupo, sus nodos SOBREESCRIBEN etiquetas del estado (lugar, tensión, foco,
  apoyo). Si cambian menos de MIN_OVERRIDDEN_TAGS, se aplican los cambios de CAMBIOS_DE_GRUPO.
  Las etiquetas nuevas condicionan qué nodos son elegibles en el grupo siguiente.
- Los nodos de elección abren un rombo (dos ramas que vuelven a juntarse): el grafo sigue
  siendo acíclico.
- Los dos últimos grupos son SIEMPRE de legalidad; `validar` lo comprueba.

El nombre del menor no entra aquí: los textos llevan {nombre} y se sustituye en `renderizar`.
"""
import graphlib
import random
from typing import Callable, Optional

import config
from dag_swarm.node_catalog import CAMBIOS_DE_GRUPO, CLAVES_DE_ESTADO, Nodo, catalogo
from dag_swarm.phrasing_db import age_band, get_phrase

Recuperador = Callable[[str, str, int], list]  # (consulta, franja de edad, k) -> resultados


class DagInvalido(ValueError):
    pass


def estado_inicial(etiquetas: dict, edad: int, sexo: str) -> dict:
    return {
        "edad_banda": age_band(edad),
        "edad_legal": "menor_14" if edad < config.LEGAL_AGE_THRESHOLD else "14_mas",
        "sexo": sexo,
        "contexto": etiquetas.get("contexto", "otro"),
        "temas": list(etiquetas.get("temas", [])),
        "tono": etiquetas.get("tono", "calido"),
        "lugar": "colegio", "tension": "baja", "foco": "yo", "apoyo": "ninguno",
    }


def _elegible(nodo: Nodo, estado: dict) -> bool:
    if "*" not in nodo.contextos and estado["contexto"] not in nodo.contextos:
        return False
    return all(estado.get(clave) in valores for clave, valores in nodo.requiere.items())


def _consulta(estado: dict) -> str:
    claves = " ".join(f"{k} {estado[k]}" for k in CLAVES_DE_ESTADO)
    return f"{claves} {estado['contexto']} {' '.join(estado['temas'])}"


def seleccionar_grupo(grupo: int, estado: dict, recuperar: Recuperador, rng: random.Random) -> list:
    """Hasta MAX_NODES_PER_GROUP nodos del grupo: primero los obligatorios, luego los mejor puntuados."""
    candidatos = [n for n in catalogo() if n.grupo == grupo and _elegible(n, estado)]
    obligatorios = [n for n in candidatos if n.obligatorio]
    if len(obligatorios) > config.MAX_NODES_PER_GROUP:
        raise DagInvalido(f"El grupo {grupo} tiene más obligatorios ({len(obligatorios)}) que el máximo")

    afines = {r["meta"].get("node_id") for r in recuperar(_consulta(estado), estado["edad_banda"], 8) if r["meta"].get("kind") == "nodo"}
    libres = [n for n in candidatos if not n.obligatorio]
    puntuados = sorted(
        libres,
        key=lambda n: -(len(set(n.tags) & set(estado["temas"])) + 2 * (n.id in afines) + rng.random() * 0.5),
    )
    elegidos = obligatorios + puntuados[: config.MAX_NODES_PER_GROUP - len(obligatorios)]
    return sorted(elegidos, key=lambda n: (n.orden, n.id))


def sobreescribir(grupo: int, estado: dict, elegidos: list) -> tuple:
    """Aplica las etiquetas que fijan los nodos y devuelve (estado nuevo, etiquetas sobreescritas)."""
    nuevo = dict(estado)
    cambios = {}

    def fijar(clave, valor):
        if nuevo[clave] != valor:
            cambios[clave] = {"antes": nuevo[clave], "despues": valor}
            nuevo[clave] = valor

    for nodo in elegidos:
        for clave, valor in nodo.fija.items():
            fijar(clave, valor)
        for opcion in nodo.opciones[:1]:  # la primera opción es la rama de referencia
            for clave, valor in opcion.fija.items():
                fijar(clave, valor)
    for clave, alternativas in CAMBIOS_DE_GRUPO.get(grupo, {}).items():
        if len(cambios) >= config.MIN_OVERRIDDEN_TAGS:
            break
        if clave in cambios:
            continue  # ya la sobreescribió un nodo
        valor = next((v for v in alternativas if v != nuevo[clave]), None)
        if valor is not None:
            fijar(clave, valor)
    return nuevo, cambios


def _nodo_a_dict(nodo: Nodo, extra: Optional[dict] = None) -> dict:
    datos = {
        "id": nodo.id, "grupo": nodo.grupo, "tipo": nodo.tipo, "texto": nodo.texto,
        "tags": list(nodo.tags), "minijuego": nodo.minijuego, "fuente": list(nodo.fuente),
    }
    return {**datos, **(extra or {})}


def generar_historia(etiquetas: dict, edad: int, sexo: str, recuperar: Recuperador, semilla: Optional[int] = None) -> dict:
    """Construye el DAG de la historia. Devuelve nodos, aristas, grupos y etiquetas sobreescritas."""
    rng = random.Random(semilla)
    estado = estado_inicial(etiquetas, edad, sexo)
    banda = estado["edad_banda"]

    nodos = {"inicio": {"id": "inicio", "grupo": 0, "tipo": "inicio", "texto": {"under_11": "", "over_11": ""},
                        "tags": [], "minijuego": None, "fuente": ["start"]}}
    aristas = []
    grupos, sobreescritas = {}, {}
    colas = ["inicio"]  # nodos de los que cuelga lo siguiente

    for grupo in config.GROUPS:
        elegidos = seleccionar_grupo(grupo, estado, recuperar, rng)
        grupos[grupo] = [n.id for n in elegidos]
        frase = get_phrase("pensamiento", edad, rng)
        for i, nodo in enumerate(elegidos):
            nodos[nodo.id] = _nodo_a_dict(nodo, {"frase": frase} if i == 0 else None)
            aristas += [[origen, nodo.id] for origen in colas]
            if nodo.tipo == "eleccion":
                colas = []
                for opcion in nodo.opciones:
                    id_rama = f"{nodo.id}::{opcion.id}"
                    nodos[id_rama] = {"id": id_rama, "grupo": grupo, "tipo": "opcion", "etiqueta": opcion.etiqueta,
                                      "texto": opcion.respuesta, "tags": [], "minijuego": None, "fuente": list(nodo.fuente)}
                    aristas.append([nodo.id, id_rama])
                    colas.append(id_rama)
            else:
                colas = [nodo.id]
        estado, cambios = sobreescribir(grupo, estado, elegidos)
        sobreescritas[grupo] = cambios

    nodos["final"] = {"id": "final", "grupo": 6, "tipo": "final", "tags": [], "minijuego": None, "fuente": ["epilogue"],
                      "texto": {"under_11": get_phrase("cierre", edad, rng), "over_11": get_phrase("cierre", edad, rng)}}
    aristas += [[origen, "final"] for origen in colas]

    historia = {"nodos": nodos, "aristas": aristas, "grupos": grupos, "sobreescritas": sobreescritas,
                "estado_final": {k: estado[k] for k in CLAVES_DE_ESTADO}, "edad_banda": banda}
    validar(historia)
    return historia


def orden_topologico(historia: dict) -> list:
    """Orden de lectura. Lanza DagInvalido si el grafo tuviera un ciclo."""
    previos = {id_: set() for id_ in historia["nodos"]}
    for origen, destino in historia["aristas"]:
        previos[destino].add(origen)
    try:
        return list(graphlib.TopologicalSorter(previos).static_order())
    except graphlib.CycleError as error:
        raise DagInvalido("El grafo tiene un ciclo") from error


def validar(historia: dict) -> None:
    """Reglas que no se pueden saltar: acíclico, 3 minijuegos, límites y legalidad al final."""
    orden_topologico(historia)

    minijuegos = [n["minijuego"] for n in historia["nodos"].values() if n["minijuego"]]
    if sorted(minijuegos) != sorted(config.MINIGAMES):
        raise DagInvalido(f"Los minijuegos deben ser exactamente {config.MINIGAMES}, hay {minijuegos}")
    if not all(g in (2, 3) for g in (n["grupo"] for n in historia["nodos"].values() if n["minijuego"])):
        raise DagInvalido("Los minijuegos van en los nodos intermedios (grupos 2 y 3)")

    for grupo, ids in historia["grupos"].items():
        if not 1 <= len(ids) <= config.MAX_NODES_PER_GROUP:
            raise DagInvalido(f"El grupo {grupo} tiene {len(ids)} nodos")

    if tuple(list(historia["grupos"])[-2:]) != config.LEGAL_GROUPS:
        raise DagInvalido("Los dos últimos grupos deben ser los de legalidad")
    for grupo in config.LEGAL_GROUPS:
        if not all("legalidad" in historia["nodos"][i]["tags"] for i in historia["grupos"][grupo]):
            raise DagInvalido(f"El grupo {grupo} debe ser de legalidad")

    for grupo in config.GROUPS[:-1]:
        if len(historia["sobreescritas"][grupo]) < config.MIN_OVERRIDDEN_TAGS:
            raise DagInvalido(f"El grupo {grupo} sobreescribe menos de {config.MIN_OVERRIDDEN_TAGS} etiquetas")


_SUFIJO = {"f": "a", "m": "o", "x": "e"}


def renderizar(historia: dict, nombre: str, sexo: str) -> list:
    """Historia lista para leer, en orden topológico, con el nombre ya puesto (solo aquí)."""
    banda = historia["edad_banda"]
    nombre = nombre.strip()

    def poner(texto: str) -> str:
        return texto.replace("{nombre}", nombre).replace("{o}", _SUFIJO.get(sexo, "e"))

    pasos = []
    for id_ in orden_topologico(historia):
        nodo = historia["nodos"][id_]
        paso = {"id": id_, "grupo": nodo["grupo"], "tipo": nodo["tipo"], "texto": poner(nodo["texto"][banda])}
        if nodo.get("minijuego"):
            paso["minijuego"] = nodo["minijuego"]
        if nodo.get("etiqueta"):
            paso["etiqueta"] = nodo["etiqueta"]
        if nodo.get("frase"):
            paso["frase"] = nodo["frase"]
        pasos.append(paso)
    return pasos
