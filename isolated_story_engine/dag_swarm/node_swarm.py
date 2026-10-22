"""Enjambre de nodos: elige los nodos de cada grupo y los une en un DAG.

Flujo:  inicio -> grupo 1 -> grupo 2 -> grupo 3 -> grupo 4 (LEGAL) -> grupo 5 (LEGAL) -> final

Elección de nodos en cada grupo:
  1. Entran los obligatorios compatibles (los 3 minijuegos, el marco legal, el gancho del tipo de
     riesgo seleccionado).
  2. Entran los nodos FORZADOS: los que expresan una etiqueta de fase (antes / durante / después)
     que el LLM ha detectado con confianza >= UMBRAL_CONFIANZA. Anulan la elección aleatoria.
  3. El resto de huecos (hasta MAX_NODES_PER_GROUP) se rellena AL AZAR entre los nodos compatibles.
     Si ninguna etiqueta supera el umbral, la historia es enteramente aleatoria (más lo obligatorio).

Al cerrar cada grupo, sus nodos SOBREESCRIBEN etiquetas del estado (lugar, tensión, foco, apoyo);
si cambian menos de MIN_OVERRIDDEN_TAGS, se aplican los cambios de CAMBIOS_DE_GRUPO. Los nodos de
elección abren un rombo (dos ramas que vuelven a juntarse): el grafo sigue siendo acíclico.
Los dos últimos grupos son SIEMPRE de legalidad; `validar` lo comprueba.

El nombre del menor no entra aquí: los textos llevan {nombre} y se sustituye en `renderizar`.
"""
import graphlib
import random
from typing import Callable, Optional

import config
from dag_swarm.node_catalog import CAMBIOS_DE_GRUPO, CLAVES_DE_ESTADO, ETIQUETAS_FASE, NINGUNA, Nodo, catalogo
from dag_swarm.phrasing_db import age_band, get_phrase

Recuperador = Callable[..., list]  # (consulta, franja de edad, k, kind=None) -> resultados

# Con "sin denuncia todavía" no puede haber resultado de un proceso que aún no existe
_RESULTADOS_DE_PROCESO = ("sentencia_condenatoria", "sentencia_absolutoria", "recurso_pendiente", "archivo_de_la_causa")


class DagInvalido(ValueError):
    pass


# --- Etiquetas de fase y umbral --------------------------------------------------------------
def decidir_etiquetas(etiquetas_llm: dict, umbral: Optional[float] = None) -> tuple:
    """Aplica la franja límite. Devuelve (etiquetas aplicadas por fase, decisiones explicadas).

    `etiquetas_llm`: {"antes": {"etiqueta", "confianza"}, "durante": ..., "despues": ...}.
    Una etiqueta solo se aplica si es válida para su fase y su confianza llega al umbral.
    """
    umbral = config.UMBRAL_CONFIANZA if umbral is None else umbral
    aplicadas, decisiones = {}, []
    for fase in config.FASES:
        bruta = etiquetas_llm.get(fase) or {}
        etiqueta, confianza = bruta.get("etiqueta"), float(bruta.get("confianza") or 0.0)
        if etiqueta not in ETIQUETAS_FASE[fase]:
            motivo, aplicada = "el contexto no encaja con ninguna etiqueta", False
        elif confianza < umbral:
            motivo, aplicada = f"confianza {confianza:.2f} por debajo del umbral {umbral:.2f}: manda el azar", False
        else:
            motivo, aplicada = f"confianza {confianza:.2f} >= umbral {umbral:.2f}: anula el azar", True
        aplicadas[fase] = etiqueta if aplicada else NINGUNA
        decisiones.append({"fase": fase, "etiqueta": etiqueta if etiqueta in ETIQUETAS_FASE[fase] else None,
                           "confianza": round(confianza, 2), "aplicada": aplicada, "motivo": motivo})

    # Coherencia: no puede haber sentencia ni recurso de una denuncia que todavía no existe
    if aplicadas["durante"] == "sin_denuncia_todavia" and aplicadas["despues"] in _RESULTADOS_DE_PROCESO:
        decision = next(d for d in decisiones if d["fase"] == "despues")
        decision.update(aplicada=False, motivo=f"incompatible con 'sin_denuncia_todavia': manda el azar")
        aplicadas["despues"] = NINGUNA
    return aplicadas, decisiones


def elegir_prototipo(protagonista: dict, rng: random.Random, umbral: Optional[float] = None) -> Optional[str]:
    """Personaje (id del motor) para el protagonista. Solo si el sexo se detecta con confianza."""
    umbral = config.UMBRAL_CONFIANZA if umbral is None else umbral
    sexo, confianza = (protagonista or {}).get("sexo"), float((protagonista or {}).get("confianza") or 0.0)
    if sexo in config.PROTOTIPOS and confianza >= umbral:
        return rng.choice(config.PROTOTIPOS[sexo])
    return None  # sin detectar con seguridad (o no binario): no se adivina


# --- Estado y selección ---------------------------------------------------------------------
def estado_inicial(tipo_riesgo: str, edad: int, aplicadas: dict) -> dict:
    return {
        "edad_banda": age_band(edad),
        "edad_legal": "menor_14" if edad < config.LEGAL_AGE_THRESHOLD else "14_mas",
        "tipo": tipo_riesgo,
        "antes": aplicadas["antes"], "durante": aplicadas["durante"], "despues": aplicadas["despues"],
        "lugar": "colegio", "tension": "baja", "foco": "yo", "apoyo": "ninguno",
    }


def _compatible(nodo: Nodo, estado: dict) -> bool:
    if "*" not in nodo.contextos and estado["tipo"] not in nodo.contextos:
        return False
    if not all(estado.get(clave) in valores for clave, valores in nodo.requiere.items()):
        return False
    return not any(estado.get(clave) in valores for clave, valores in nodo.excluye.items())


def _forzado_por(nodo: Nodo, estado: dict) -> Optional[str]:
    activas = {estado[fase] for fase in config.FASES} - {NINGUNA}
    return next((t for t in nodo.fase_tags if t in activas), None)


def _consulta(estado: dict) -> str:
    etiquetas = " ".join(estado[f] for f in config.FASES if estado[f] != NINGUNA)
    return f"{estado['tipo']} {etiquetas} {' '.join(f'{k} {estado[k]}' for k in CLAVES_DE_ESTADO)}"


def seleccionar_grupo(grupo: int, estado: dict, rng: random.Random) -> tuple:
    """Devuelve (nodos elegidos, {id: etiqueta que lo fuerza}, ids forzados que no cupieron)."""
    compatibles = [n for n in catalogo() if n.grupo == grupo and _compatible(n, estado)]
    obligatorios = [n for n in compatibles if n.obligatorio]
    if len(obligatorios) > config.MAX_NODES_PER_GROUP:
        raise DagInvalido(f"El grupo {grupo} tiene más obligatorios ({len(obligatorios)}) que el máximo")

    cubiertas = {t for n in obligatorios for t in n.cubre}  # ya las expresa un obligatorio: no se duplica
    forzados = [n for n in compatibles if not n.obligatorio and _forzado_por(n, estado)
                and not set(n.fase_tags) <= cubiertas]
    azar = [n for n in compatibles if not n.obligatorio and n not in forzados and not n.solo_por_etiqueta]
    huecos = config.MAX_NODES_PER_GROUP - len(obligatorios)

    rng.shuffle(forzados)
    rng.shuffle(azar)
    entran_forzados = forzados[:huecos]
    elegidos = obligatorios + entran_forzados + azar[: huecos - len(entran_forzados)]
    info = {n.id: _forzado_por(n, estado) for n in entran_forzados}
    sin_hueco = [n.id for n in forzados[huecos:]]
    return sorted(elegidos, key=lambda n: (n.orden, n.id)), info, sin_hueco


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
        "id": nodo.id, "grupo": nodo.grupo, "tipo": nodo.tipo, "texto": nodo.texto, "tags": list(nodo.tags),
        "fase_tags": list(nodo.fase_tags), "cubre": list(nodo.cubre), "minijuego": nodo.minijuego,
        "fuente": list(nodo.fuente), "fija": dict(nodo.fija),
    }
    return {**datos, **(extra or {})}


def generar_historia(etiquetas_llm: dict, edad: int, tipo_riesgo: str, recuperar: Recuperador,
                     semilla: Optional[int] = None) -> dict:
    """Construye el DAG de la historia. Devuelve nodos, aristas, grupos, decisiones y prototipo."""
    rng = random.Random(semilla)
    aplicadas, decisiones = decidir_etiquetas(etiquetas_llm)
    prototipo = elegir_prototipo(etiquetas_llm.get("protagonista"), rng)
    estado = estado_inicial(tipo_riesgo, edad, aplicadas)
    banda = estado["edad_banda"]

    nodos = {"inicio": {"id": "inicio", "grupo": 0, "tipo": "inicio", "texto": {"under_11": "", "over_11": ""},
                        "tags": [], "fase_tags": [], "minijuego": None, "fuente": ["start"], "fija": {}}}
    aristas, grupos, sobreescritas, forzados, sin_hueco = [], {}, {}, {}, []
    colas = ["inicio"]  # nodos de los que cuelga lo siguiente

    for grupo in config.GROUPS:
        elegidos, info, descartados = seleccionar_grupo(grupo, estado, rng)
        grupos[grupo] = [n.id for n in elegidos]
        forzados.update(info)
        sin_hueco += descartados

        frase = _frase(recuperar, estado, banda, edad, rng)
        for i, nodo in enumerate(elegidos):
            extra = {"frase": frase} if i == 0 else {}
            if nodo.id in info:
                extra["forzado_por"] = info[nodo.id]
            nodos[nodo.id] = _nodo_a_dict(nodo, extra)
            aristas += [[origen, nodo.id] for origen in colas]
            if nodo.tipo == "eleccion":
                colas = []
                for opcion in nodo.opciones:
                    id_rama = f"{nodo.id}::{opcion.id}"
                    nodos[id_rama] = {"id": id_rama, "grupo": grupo, "tipo": "opcion", "etiqueta": opcion.etiqueta,
                                      "texto": opcion.respuesta, "tags": [], "fase_tags": [], "minijuego": None,
                                      "fuente": list(nodo.fuente), "fija": {}}
                    aristas.append([nodo.id, id_rama])
                    colas.append(id_rama)
            else:
                colas = [nodo.id]
        estado, cambios = sobreescribir(grupo, estado, elegidos)
        sobreescritas[grupo] = cambios

    nodos["final"] = {"id": "final", "grupo": 6, "tipo": "final", "tags": [], "fase_tags": [], "minijuego": None,
                      "fuente": ["epilogue"], "fija": {},
                      "texto": {"under_11": get_phrase("cierre", edad, rng), "over_11": get_phrase("cierre", edad, rng)}}
    aristas += [[origen, "final"] for origen in colas]

    historia = {"nodos": nodos, "aristas": aristas, "grupos": grupos, "sobreescritas": sobreescritas,
                "estado_final": {k: estado[k] for k in CLAVES_DE_ESTADO}, "edad_banda": banda,
                "tipo_riesgo": tipo_riesgo, "etiquetas_aplicadas": aplicadas, "decisiones": decisiones,
                "forzados": forzados, "forzados_sin_hueco": sin_hueco, "prototipo": prototipo}
    validar(historia)
    return historia


def _frase(recuperar: Recuperador, estado: dict, banda: str, edad: int, rng: random.Random) -> str:
    """Frase de apertura del grupo: la más afín al estado (recuperación semántica) o una al azar."""
    resultados = recuperar(_consulta(estado), banda, 1, "frase")
    return resultados[0]["texto"] if resultados else get_phrase("pensamiento", edad, rng)


def desde_json(historia: dict) -> dict:
    """Restaura las claves numéricas (grupos) tras pasar por JSON, p. ej. al leer la caché."""
    return {**historia,
            "grupos": {int(g): ids for g, ids in historia["grupos"].items()},
            "sobreescritas": {int(g): cambios for g, cambios in historia["sobreescritas"].items()}}


# --- Orden y validación ---------------------------------------------------------------------
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
    """Reglas que no se pueden saltar: acíclico, 3 minijuegos, límites, legalidad y coherencia."""
    orden_topologico(historia)
    nodos, grupos = historia["nodos"], historia["grupos"]

    minijuegos = [n["minijuego"] for n in nodos.values() if n["minijuego"]]
    if sorted(minijuegos) != sorted(config.MINIGAMES):
        raise DagInvalido(f"Los minijuegos deben ser exactamente {config.MINIGAMES}, hay {minijuegos}")
    if not all(n["grupo"] in (2, 3) for n in nodos.values() if n["minijuego"]):
        raise DagInvalido("Los minijuegos van en los nodos intermedios (grupos 2 y 3)")

    for grupo, ids in grupos.items():
        if not 1 <= len(ids) <= config.MAX_NODES_PER_GROUP:
            raise DagInvalido(f"El grupo {grupo} tiene {len(ids)} nodos")

    if tuple(list(grupos)[-2:]) != config.LEGAL_GROUPS:
        raise DagInvalido("Los dos últimos grupos deben ser los de legalidad")
    for grupo in config.LEGAL_GROUPS:
        if not all("legalidad" in nodos[i]["tags"] for i in grupos[grupo]):
            raise DagInvalido(f"El grupo {grupo} debe ser de legalidad")

    for grupo in config.GROUPS[:-1]:
        if len(historia["sobreescritas"][grupo]) < config.MIN_OVERRIDDEN_TAGS:
            raise DagInvalido(f"El grupo {grupo} sobreescribe menos de {config.MIN_OVERRIDDEN_TAGS} etiquetas")

    # Toda etiqueta aplicada (confianza >= umbral) debe verse en la historia: si no, no anulaba nada
    elegidos = [nodos[i] for ids in grupos.values() for i in ids]
    for fase, etiqueta in historia["etiquetas_aplicadas"].items():
        if etiqueta == NINGUNA:
            continue
        expresada = any(etiqueta in n["fase_tags"] or etiqueta in n.get("cubre", []) for n in elegidos)
        if not expresada and not _variante_de(etiqueta, fase, elegidos):
            raise DagInvalido(f"La etiqueta aplicada '{etiqueta}' no aparece en ningún nodo")

    # El cierre legal es coherente: exactamente UNA explicación de cómo termina (o no empieza) el proceso
    cierres = [i for i in grupos[5] if i.startswith("g5-sentencia") or i in ("g5-archivo", "g5-sin-proceso")]
    if len(cierres) != 1:
        raise DagInvalido(f"El grupo 5 debe tener un único cierre del proceso, hay {cierres}")
    if historia["etiquetas_aplicadas"]["durante"] == "sin_denuncia_todavia":
        if any(i in grupos[4] or i in grupos[5] for i in ("g4-citacion", "g5-juicio", "g5-espera", "g5-recurso")):
            raise DagInvalido("Hay nodos de un proceso en marcha en una historia 'sin denuncia todavía'")


def _variante_de(etiqueta: str, fase: str, elegidos: list) -> bool:
    """Nodos obligatorios que expresan la etiqueta por `requiere` (p. ej. la sentencia condenatoria)."""
    from dag_swarm.node_catalog import por_id

    return any(etiqueta in por_id(n["id"]).requiere.get(fase, ()) for n in elegidos if n["tipo"] != "opcion")


def renderizar(historia: dict, nombre: str) -> list:
    """Historia lista para leer, en orden topológico, con el nombre ya puesto (solo aquí)."""
    banda = historia["edad_banda"]
    nombre = nombre.strip()
    pasos = []
    for id_ in orden_topologico(historia):
        nodo = historia["nodos"][id_]
        paso = {"id": id_, "grupo": nodo["grupo"], "tipo": nodo["tipo"],
                "texto": nodo["texto"][banda].replace("{nombre}", nombre)}
        for clave in ("minijuego", "etiqueta", "frase", "forzado_por"):
            if nodo.get(clave):
                paso[clave] = nodo[clave]
        pasos.append(paso)
    return pasos
