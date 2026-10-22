"""Pruebas del prototipo aislado. Sin red ni servicios externos (todo en memoria).

    cd isolated_story_engine && python -m unittest discover -s tests -v

`ValidadorReal` usa el validador del motor (solo lectura) si hay node y LegalinStory; si no, se salta.
"""
import copy
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config  # noqa: E402
from dag_swarm import (DagInvalido, decidir_etiquetas, desde_json, exportar, generar_historia, orden_topologico,  # noqa: E402
                       renderizar, validar)
from dag_swarm.node_catalog import ETIQUETAS_FASE, catalogo  # noqa: E402
from dag_swarm.phrasing_db import PHRASING_DB, get_phrases_by_age  # noqa: E402
from llm_generator import anonimizar, extraer_etiquetas, heuristica_etiquetas, validar_etiquetas  # noqa: E402
from validacion import validar_salida  # noqa: E402
from vector_store import PhraseStore, StateCache  # noqa: E402

ALMACEN = PhraseStore(usar_chroma=False)
EDADES = (5, 9, 10, 11, 13, 14, 17)
JUEGOS_DEL_MOTOR = {"dibujo-avatar", "cid-table", "caja-arena"}


def recuperar(consulta, banda, k, kind=None):
    return ALMACEN.retrieve(consulta, banda, k, kind)


def etiquetas(antes=None, durante=None, despues=None, confianza=0.9, sexo=None, confianza_sexo=0.9):
    """Salida del LLM simulada: una etiqueta por fase (o ninguna) y el sexo del protagonista."""
    def fase(etiqueta):
        return {"etiqueta": etiqueta, "confianza": confianza if etiqueta else 0.0}

    return {"antes": fase(antes), "durante": fase(durante), "despues": fase(despues),
            "protagonista": {"sexo": sexo or "desconocido", "confianza": confianza_sexo if sexo else 0.0}}


def historia(edad=12, tipo="privacidad", semilla=1, **kw):
    return generar_historia(etiquetas(**kw), edad, tipo, recuperar, semilla)


def ids_de(h):
    return {i for ids in h["grupos"].values() for i in ids}


class ReglasDelEnjambre(unittest.TestCase):
    def test_siempre_valido_sin_etiquetas(self):
        for edad in EDADES:
            for tipo in config.TIPOS_RIESGO:
                for semilla in range(3):
                    validar(historia(edad, tipo, semilla))

    def test_siempre_valido_con_cualquier_etiqueta_de_fase(self):
        for fase, lista in ETIQUETAS_FASE.items():
            for etiqueta in lista:
                for edad in (9, 15):
                    with self.subTest(etiqueta=etiqueta, edad=edad):
                        validar(historia(edad, "ciberacoso", 2, **{fase: etiqueta}))

    def test_los_dos_ultimos_grupos_son_de_legalidad(self):
        h = historia()
        self.assertEqual(list(h["grupos"])[-2:], list(config.LEGAL_GROUPS))
        for grupo in config.LEGAL_GROUPS:
            for id_ in h["grupos"][grupo]:
                self.assertIn("legalidad", h["nodos"][id_]["tags"])
        for grupo in (1, 2, 3):
            self.assertFalse(any("legalidad" in h["nodos"][i]["tags"] for i in h["grupos"][grupo]))

    def test_los_tres_minijuegos_estan_una_vez_en_los_grupos_intermedios(self):
        for edad in (8, 15):
            juegos = {n["minijuego"]: n["grupo"] for n in historia(edad)["nodos"].values() if n["minijuego"]}
            self.assertEqual(sorted(juegos), sorted(config.MINIGAMES))
            self.assertTrue(set(juegos.values()) <= {2, 3})

    def test_limites_por_grupo_y_etiquetas_sobreescritas(self):
        for semilla in range(8):
            h = historia(semilla=semilla)
            for ids in h["grupos"].values():
                self.assertLessEqual(len(ids), config.MAX_NODES_PER_GROUP)
            for grupo in config.GROUPS[:-1]:
                self.assertGreaterEqual(len(h["sobreescritas"][grupo]), config.MIN_OVERRIDDEN_TAGS)

    def test_el_grafo_es_aciclico(self):
        h = historia()
        orden = orden_topologico(h)
        self.assertEqual((orden[0], orden[-1]), ("inicio", "final"))
        roto = copy.deepcopy(h)
        roto["aristas"].append(["final", "inicio"])
        with self.assertRaises(DagInvalido):
            orden_topologico(roto)

    def test_validar_rechaza_historias_que_incumplen_las_reglas(self):
        sin_juego = copy.deepcopy(historia())
        for n in sin_juego["nodos"].values():
            if n["minijuego"] == "caja-arena":
                n["minijuego"] = None
        with self.assertRaises(DagInvalido):
            validar(sin_juego)
        sin_legal = copy.deepcopy(historia())
        sin_legal["nodos"][sin_legal["grupos"][5][0]]["tags"].remove("legalidad")
        with self.assertRaises(DagInvalido):
            validar(sin_legal)
        pocas = copy.deepcopy(historia())
        pocas["sobreescritas"][2] = {}
        with self.assertRaises(DagInvalido):
            validar(pocas)

    def test_determinista_con_la_misma_semilla(self):
        self.assertEqual(historia(semilla=7, antes="aislamiento_social"), historia(semilla=7, antes="aislamiento_social"))

    def test_cada_nodo_tiene_las_dos_variantes_de_edad_y_ninguna_concordancia_de_genero(self):
        for nodo in catalogo():
            self.assertTrue(nodo.texto["under_11"].strip() and nodo.texto["over_11"].strip(), nodo.id)
            self.assertNotEqual(nodo.texto["under_11"], nodo.texto["over_11"], nodo.id)
            textos = list(nodo.texto.values()) + [t for o in nodo.opciones for t in o.respuesta.values()]
            for texto in textos:
                self.assertNotIn("{o}", texto, nodo.id)  # el sexo ya no entra en el texto
            for opcion in nodo.opciones:
                self.assertEqual(set(opcion.respuesta), {"under_11", "over_11"})


class UmbralYEtiquetas(unittest.TestCase):
    def test_la_franja_limite_decide_si_se_aplica(self):
        casos = ((0.69, False), (0.70, True), (0.95, True), (0.0, False))
        for confianza, esperada in casos:
            aplicadas, decisiones = decidir_etiquetas(etiquetas(antes="aislamiento_social", confianza=confianza))
            with self.subTest(confianza=confianza):
                self.assertEqual(aplicadas["antes"] == "aislamiento_social", esperada)
                self.assertEqual(decisiones[0]["aplicada"], esperada)
        self.assertEqual(config.UMBRAL_CONFIANZA, 0.70)

    def test_una_etiqueta_de_otra_fase_o_inventada_no_se_aplica(self):
        aplicadas, decisiones = decidir_etiquetas(etiquetas(antes="sentencia_condenatoria", durante="inventada"))
        self.assertEqual((aplicadas["antes"], aplicadas["durante"]), ("ninguna", "ninguna"))
        self.assertFalse(any(d["aplicada"] for d in decisiones))

    def test_cada_decision_explica_su_motivo(self):
        _, decisiones = decidir_etiquetas(etiquetas(antes="aislamiento_social", durante="citacion_reciente", confianza=0.5))
        self.assertEqual([d["fase"] for d in decisiones], ["antes", "durante", "despues"])
        self.assertTrue(all(d["motivo"] for d in decisiones))

    def test_sobre_el_umbral_la_etiqueta_anula_el_azar(self):
        for semilla in range(12):
            h = historia(semilla=semilla, antes="control_del_movil", durante="medidas_de_proteccion", despues="vuelta_a_la_rutina")
            self.assertTrue({"g1-movil-controlado", "g3-medidas", "g5-rutina"} <= ids_de(h), semilla)
            self.assertEqual(h["forzados"]["g1-movil-controlado"], "control_del_movil")

    def test_por_debajo_del_umbral_manda_el_azar(self):
        solo_por_etiqueta = {n.id for n in catalogo() if n.solo_por_etiqueta}
        conjuntos = set()
        for semilla in range(20):
            h = historia(semilla=semilla, antes="control_del_movil", confianza=0.5)
            self.assertFalse(ids_de(h) & solo_por_etiqueta, semilla)  # nunca entran por azar
            self.assertEqual(h["forzados"], {})
            conjuntos.add(frozenset(h["grupos"][1]))
        self.assertGreater(len(conjuntos), 1)  # y el azar sí cambia la historia

    def test_cada_tipo_de_riesgo_trae_su_gancho(self):
        for tipo in config.TIPOS_RIESGO:
            h = historia(tipo=tipo)
            self.assertIn(f"g1-hook-{tipo}", h["grupos"][1])
            self.assertEqual([i for i in h["grupos"][1] if i.startswith("g1-hook-")], [f"g1-hook-{tipo}"])

    def test_un_nodo_forzado_no_duplica_lo_que_ya_dice_el_gancho(self):
        for semilla in range(8):
            h = historia(tipo="grooming", semilla=semilla, antes="contacto_con_adulto_desconocido")
            self.assertNotIn("g1-adulto-desconocido", ids_de(h))   # el gancho de grooming ya lo cuenta
            self.assertTrue(h["decisiones"][0]["aplicada"])         # y la etiqueta sigue considerándose expresada
            otro = historia(tipo="ciberacoso", semilla=semilla, antes="contacto_con_adulto_desconocido")
            self.assertIn("g1-adulto-desconocido", ids_de(otro))   # con otro tipo de riesgo sí hace falta

    def test_los_forzados_que_no_caben_se_registran_sin_romper_la_historia(self):
        h = historia(durante="declaracion_pendiente")  # dos nodos candidatos y un solo hueco en el grupo 4
        self.assertEqual(len(h["forzados_sin_hueco"]) + len([i for i in h["forzados"]]), 2)
        validar(h)


class CierreLegal(unittest.TestCase):
    def cierre(self, h):
        return [i for i in h["grupos"][5] if i.startswith("g5-sentencia") or i in ("g5-archivo", "g5-sin-proceso")]

    def test_el_cierre_depende_de_la_etiqueta_de_despues(self):
        esperado = {
            "sentencia_condenatoria": "g5-sentencia-condena", "sentencia_absolutoria": "g5-sentencia-absolucion",
            "archivo_de_la_causa": "g5-archivo", None: "g5-sentencia", "recurso_pendiente": "g5-sentencia",
        }
        for etiqueta, nodo in esperado.items():
            with self.subTest(etiqueta=etiqueta):
                self.assertEqual(self.cierre(historia(despues=etiqueta)), [nodo])

    def test_un_archivo_no_tiene_juicio_ni_recurso(self):
        for semilla in range(6):
            ids = ids_de(historia(semilla=semilla, despues="archivo_de_la_causa"))
            self.assertFalse(ids & {"g5-juicio", "g5-recurso"})

    def test_sin_denuncia_cambia_todo_el_marco_legal(self):
        h = historia(durante="sin_denuncia_todavia", despues="sentencia_condenatoria")
        ids = ids_de(h)
        self.assertIn("g4-sin-citacion", ids)
        self.assertIn("g5-sin-proceso", ids)
        self.assertFalse(ids & {"g4-citacion", "g5-juicio", "g5-espera", "g5-recurso", "g5-sentencia-condena",
                                "g4-declara-menor14", "g4-declara-14mas"})

    def test_etiquetas_incompatibles_se_resuelven_y_se_explican(self):
        h = historia(durante="sin_denuncia_todavia", despues="sentencia_condenatoria")
        despues = next(d for d in h["decisiones"] if d["fase"] == "despues")
        self.assertFalse(despues["aplicada"])
        self.assertIn("incompatible", despues["motivo"])
        self.assertEqual(h["etiquetas_aplicadas"]["despues"], "ninguna")

    def test_la_variante_legal_depende_de_tener_14_anos(self):
        for semilla in range(5):
            joven, mayor = ids_de(historia(13, semilla=semilla)), ids_de(historia(14, semilla=semilla))
            self.assertIn("g4-declara-menor14", joven)
            self.assertNotIn("g4-declara-14mas", joven)
            self.assertIn("g4-declara-14mas", mayor)
            self.assertNotIn("g4-declara-menor14", mayor)


class EdadYPrototipo(unittest.TestCase):
    def test_el_lenguaje_depende_de_la_franja_de_edad(self):
        pequeño = renderizar(historia(edad=9, semilla=3), "Luna")
        mayor = renderizar(historia(edad=13, semilla=3), "Luna")
        self.assertNotEqual([p["texto"] for p in pequeño], [p["texto"] for p in mayor])
        self.assertTrue(set(get_phrases_by_age(10)) <= {f for fs in PHRASING_DB["under_11"].values() for f in fs})
        self.assertTrue(set(get_phrases_by_age(11)) <= {f for fs in PHRASING_DB["over_11"].values() for f in fs})
        self.assertEqual(historia(edad=10)["edad_banda"], "under_11")
        self.assertEqual(historia(edad=11)["edad_banda"], "over_11")

    def test_el_prototipo_sale_del_sexo_detectado_con_confianza(self):
        for semilla in range(6):
            self.assertIn(historia(semilla=semilla, sexo="f")["prototipo"], config.PROTOTIPOS["f"])
            self.assertIn(historia(semilla=semilla, sexo="m")["prototipo"], config.PROTOTIPOS["m"])

    def test_sin_confianza_o_sin_dato_no_se_adivina(self):
        self.assertIsNone(historia(sexo="f", **{"confianza_sexo": 0.5})["prototipo"])
        self.assertIsNone(historia(sexo="x")["prototipo"])
        self.assertIsNone(historia()["prototipo"])

    def test_la_heuristica_detecta_el_sexo_solo_si_es_explicito(self):
        self.assertEqual(heuristica_etiquetas("Es una niña de 12 años")["protagonista"]["sexo"], "f")
        self.assertEqual(heuristica_etiquetas("Es un chico que no habla")["protagonista"]["sexo"], "m")
        self.assertEqual(heuristica_etiquetas("Un niño y una niña")["protagonista"]["sexo"], "desconocido")
        self.assertEqual(heuristica_etiquetas("Sin datos")["protagonista"]["sexo"], "desconocido")


class Privacidad(unittest.TestCase):
    def test_el_nombre_solo_aparece_al_renderizar_o_exportar(self):
        h = historia(sexo="f")
        self.assertNotIn("Zoe", json.dumps(h, ensure_ascii=False))
        texto = " ".join(p["texto"] for p in renderizar(h, "Zoe"))
        self.assertIn("Zoe", texto)
        self.assertNotIn("{nombre}", texto)
        salida = json.dumps(exportar(h, "Zoe", "historia-x")["archivos"]["story.json"], ensure_ascii=False)
        self.assertIn("Zoe", salida)
        self.assertNotIn("{nombre}", salida)

    def test_anonimizar_quita_identificadores(self):
        crudo = ("Ana Pérez vive con su madre. Escribir a ana@correo.es o llamar al 612 345 678. "
                 "DNI 12345678Z, ver https://ejemplo.org/caso/1 y www.ejemplo.org. ANA dice que sí. " + "x" * 700)
        limpio = anonimizar(crudo, "Ana Pérez")
        for secreto in ("Ana", "Pérez", "ana@correo.es", "612 345 678", "12345678Z", "https://", "www.ejemplo"):
            self.assertNotIn(secreto.lower(), limpio.lower(), secreto)
        self.assertIn("{NOMBRE}", limpio)
        self.assertLessEqual(len(limpio), config.MAX_CONTEXT_CHARS)

    def test_a_gemini_no_le_llega_el_nombre(self):
        prompts = []

        def falso(prompt):
            prompts.append(prompt)
            return {"antes": {"etiqueta": "aislamiento_social", "confianza": 0.9},
                    "durante": {"etiqueta": "inventada", "confianza": 0.99},
                    "despues": {"etiqueta": "archivo_de_la_causa", "confianza": "mucha"},
                    "protagonista": {"sexo": "f", "confianza": 7}}

        resultado = extraer_etiquetas("Marina", 12, "Marina come sola en el recreo", "ciberacoso", llamar=falso)
        self.assertEqual(len(prompts), 1)
        self.assertNotIn("Marina", prompts[0])
        self.assertEqual(resultado["fuente"], "gemini")
        self.assertEqual(resultado["antes"], {"etiqueta": "aislamiento_social", "confianza": 0.9})
        self.assertIsNone(resultado["durante"]["etiqueta"])                    # fuera de la taxonomía
        self.assertEqual(resultado["despues"]["confianza"], 0.0)               # no numérica
        self.assertEqual(resultado["protagonista"]["confianza"], 1.0)          # recortada a [0, 1]

    def test_la_respuesta_del_llm_se_valida(self):
        basura = validar_etiquetas({"antes": "texto", "durante": None, "protagonista": {"sexo": "otro"}})
        self.assertTrue(all(basura[f]["etiqueta"] is None for f in config.FASES))
        self.assertEqual(basura["protagonista"]["sexo"], "desconocido")

    def test_si_gemini_falla_se_usa_la_heuristica(self):
        def roto(prompt):
            raise TimeoutError("sin red")

        resultado = extraer_etiquetas("Leo", 9, "Hay gritos en casa y discusiones con su padre", "privacidad", llamar=roto)
        self.assertEqual(resultado["fuente"], "heuristica")
        self.assertEqual(resultado["antes"]["etiqueta"], "convivencia_conflictiva")
        self.assertGreaterEqual(resultado["antes"]["confianza"], config.UMBRAL_CONFIANZA)  # dos coincidencias

    def test_la_cache_no_contiene_el_nombre_y_la_historia_sobrevive_a_json(self):
        original = historia(sexo="f")
        cache = StateCache(usar_redis=False)
        cache.set("abc", {"historia": original})
        recuperada = cache.get("abc")
        self.assertNotIn("Zoe", json.dumps(recuperada))
        restaurada = desde_json(recuperada["historia"])  # JSON vuelve las claves numéricas en texto
        self.assertEqual(restaurada, original)
        validar(restaurada)
        self.assertEqual(exportar(restaurada, "Zoe", "historia-j"), exportar(original, "Zoe", "historia-j"))
        cache.set("x", {"a": 1}, ttl=-1)
        self.assertIsNone(cache.get("x"))


class Exportador(unittest.TestCase):
    def salida(self, **kw):
        return exportar(historia(**kw), "Zoe", "historia-t")["archivos"]["story.json"]["nodes"]

    def test_toda_referencia_existe_y_todo_nodo_llega_al_final(self):
        for kw in ({}, {"sexo": "f"}, {"durante": "sin_denuncia_todavia"}, {"despues": "archivo_de_la_causa"}):
            nodos = self.salida(**kw)
            siguientes = {}
            for id_, n in nodos.items():
                destinos = [o["next"] for o in n["options"]] if n["type"] == "choice" else ([n["next"]] if "next" in n else [])
                for d in destinos:
                    self.assertIn(d, nodos, f"{id_} -> {d}")
                siguientes[id_] = destinos
            alcanzados, pila = set(), ["inicio"]
            while pila:
                actual = pila.pop()
                if actual not in alcanzados:
                    alcanzados.add(actual)
                    pila += siguientes[actual]
            self.assertEqual(alcanzados, set(nodos), "hay nodos inalcanzables")
            self.assertEqual([i for i, n in nodos.items() if n["type"] == "ending"], ["final"])

    def test_las_tres_actividades_salen_como_external(self):
        juegos = [n["game"] for n in self.salida().values() if n["type"] == "external"]
        self.assertEqual(sorted(juegos), sorted(JUEGOS_DEL_MOTOR))

    def test_el_prototipo_se_pinta_solo_si_existe(self):
        con = self.salida(sexo="f")
        protagonistas = {k for n in con.values() for k in n.get("cast", {})}
        self.assertEqual(len(protagonistas), 1)
        self.assertTrue(protagonistas <= set(config.PROTOTIPOS["f"]))
        self.assertFalse(any("cast" in n for n in self.salida().values()))

    def test_las_elecciones_guardan_la_opcion_en_flags(self):
        elecciones = [n for n in self.salida().values() if n["type"] == "choice"]
        self.assertTrue(elecciones)
        for eleccion in elecciones:
            self.assertEqual(len(eleccion["options"]), 2)
            self.assertTrue(all(o["flags"] for o in eleccion["options"]))


@unittest.skipUnless(validar_salida.disponible(), "Sin node o sin LegalinStory: no se puede usar el validador del motor")
class ValidadorReal(unittest.TestCase):
    """Lo que genera el prototipo lo acepta el validador REAL del motor (se ejecuta en solo lectura)."""

    def test_el_motor_acepta_todas_las_variantes(self):
        salidas = []

        def añadir(edad, tipo, semilla, **kw):
            h = historia(edad, tipo, semilla, **kw)
            salidas.append(exportar(h, "Zoe", f"historia-{len(salidas)}"))

        for i, tipo in enumerate(config.TIPOS_RIESGO):
            añadir(9 + i, tipo, i)
        for fase, lista in ETIQUETAS_FASE.items():
            for i, etiqueta in enumerate(lista):
                añadir(10 + i, config.TIPOS_RIESGO[i % 5], i, sexo="f" if i % 2 else "m", **{fase: etiqueta})
        añadir(13, "grooming", 4, durante="sin_denuncia_todavia", despues="vuelta_a_la_rutina", sexo="f")

        informe = validar_salida.validar_con_motor(salidas)
        self.assertEqual(informe["errores"], [])
        self.assertTrue(informe["ok"])
        self.assertEqual(informe["stats"]["stories"], len(salidas))


class Almacen(unittest.TestCase):
    def test_recupera_por_franja_de_edad_y_tipo(self):
        resultados = ALMACEN.retrieve("tribunal sentencia", "under_11", 5)
        self.assertTrue(resultados)
        self.assertTrue(all(r["meta"]["age_band"] == "under_11" for r in resultados))
        frases = ALMACEN.retrieve("pensamiento", "over_11", 5, "frase")
        self.assertTrue(all(r["meta"]["kind"] == "frase" for r in frases))


class Api(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient

        import api

        cls.cliente = TestClient(api.app)

    def _crear(self, **cambios):
        cuerpo = {"nombre": "Zoe", "edad": 12, "contexto": "Es una niña. Hay gritos en casa", "tipo_riesgo": "privacidad",
                  "semilla": 1, **cambios}
        return self.cliente.post("/historias", json=cuerpo)

    def test_salud(self):
        r = self.cliente.get("/salud")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["indice"], r.json()["umbral"]), ("memoria", 0.7))

    def test_crear_y_recuperar_una_historia(self):
        r = self._crear()
        self.assertEqual(r.status_code, 200)
        cuerpo = r.json()
        self.assertEqual(len(cuerpo["decisiones"]), 3)
        self.assertIn("prototipo", cuerpo)
        self.assertEqual(set(cuerpo["salida"]["archivos"]), {"story.json", "novel.json", "scene.json", "assets.json"})
        self.assertTrue(any("Zoe" in p["texto"] for p in cuerpo["historia"]))
        sin_nombre = json.dumps([cuerpo["dag"], cuerpo["etiquetas"], cuerpo["decisiones"]], ensure_ascii=False)
        self.assertNotIn("Zoe", sin_nombre)
        otra = self.cliente.get(f"/historias/{cuerpo['id']}", params={"nombre": "Zoe"})
        self.assertEqual(otra.status_code, 200)
        self.assertEqual(otra.json()["historia"], cuerpo["historia"])

    def test_historia_desconocida_y_datos_invalidos(self):
        self.assertEqual(self.cliente.get("/historias/noexiste", params={"nombre": "Zoe"}).status_code, 404)
        self.assertEqual(self._crear(edad=2).status_code, 422)
        self.assertEqual(self._crear(tipo_riesgo="otro").status_code, 422)
        self.assertEqual(self._crear(nombre="").status_code, 422)
        self.assertEqual(self.cliente.post("/historias", json={"nombre": "Zoe", "edad": 12}).status_code, 422)


if __name__ == "__main__":
    unittest.main()
