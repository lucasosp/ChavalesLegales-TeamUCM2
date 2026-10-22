"""Pruebas del prototipo aislado. Sin red ni servicios externos (todo en memoria).

    cd isolated_story_engine && python -m unittest discover -s tests -v
"""
import copy
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config  # noqa: E402
from dag_swarm import DagInvalido, generar_historia, orden_topologico, renderizar, validar  # noqa: E402
from dag_swarm.node_catalog import CONTEXTOS, TEMAS, catalogo  # noqa: E402
from dag_swarm.phrasing_db import PHRASING_DB, get_phrases_by_age  # noqa: E402
from llm_generator import anonimizar, extraer_etiquetas  # noqa: E402
from vector_store import PhraseStore, StateCache  # noqa: E402

ALMACEN = PhraseStore(usar_chroma=False)
EDADES = (5, 9, 10, 11, 13, 14, 17)


def recuperar(consulta, banda, k):
    return ALMACEN.retrieve(consulta, banda, k)


def historia(edad=12, contexto="violencia_familiar", semilla=1, sexo="f", temas=()):
    return generar_historia({"contexto": contexto, "temas": list(temas), "tono": "calido"}, edad, sexo, recuperar, semilla)


class ReglasDelEnjambre(unittest.TestCase):
    def test_siempre_valido_para_cualquier_perfil(self):
        for edad in EDADES:
            for contexto in CONTEXTOS:
                for semilla in range(4):
                    h = historia(edad, contexto, semilla)
                    validar(h)  # lanza DagInvalido si algo se rompe

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
            h = historia(edad)
            juegos = {n["minijuego"]: n["grupo"] for n in h["nodos"].values() if n["minijuego"]}
            self.assertEqual(sorted(juegos), sorted(config.MINIGAMES))
            self.assertTrue(set(juegos.values()) <= {2, 3})

    def test_limites_por_grupo_y_etiquetas_sobreescritas(self):
        for semilla in range(6):
            h = historia(semilla=semilla)
            for grupo, ids in h["grupos"].items():
                self.assertLessEqual(len(ids), config.MAX_NODES_PER_GROUP)
            for grupo in config.GROUPS[:-1]:
                self.assertGreaterEqual(len(h["sobreescritas"][grupo]), config.MIN_OVERRIDDEN_TAGS)

    def test_el_grafo_es_aciclico_y_empieza_y_acaba_donde_debe(self):
        h = historia()
        orden = orden_topologico(h)
        self.assertEqual(orden[0], "inicio")
        self.assertEqual(orden[-1], "final")
        h2 = copy.deepcopy(h)
        h2["aristas"].append(["final", "inicio"])
        with self.assertRaises(DagInvalido):
            orden_topologico(h2)

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

    def test_las_etiquetas_sobreescritas_condicionan_el_estado_final(self):
        h = historia()
        self.assertEqual(h["estado_final"]["foco"], "yo")      # cierra mirando a la vida de la persona
        self.assertEqual(h["estado_final"]["tension"], "baja")

    def test_el_contexto_legal_filtra_los_nodos(self):
        for semilla in range(8):
            digital = {i for ids in historia(contexto="ciberacoso", semilla=semilla)["grupos"].values() for i in ids}
            familiar = {i for ids in historia(contexto="violencia_familiar", semilla=semilla)["grupos"].values() for i in ids}
            self.assertNotIn("g1-casa-tension", digital)
            self.assertNotIn("g1-movil", familiar)
            self.assertNotIn("g2-ayuda-digital", familiar)

    def test_determinista_con_la_misma_semilla(self):
        self.assertEqual(historia(semilla=7), historia(semilla=7))

    def test_cada_nodo_tiene_las_dos_variantes_de_edad(self):
        for nodo in catalogo():
            self.assertTrue(nodo.texto["under_11"].strip() and nodo.texto["over_11"].strip(), nodo.id)
            self.assertNotEqual(nodo.texto["under_11"], nodo.texto["over_11"], nodo.id)
            for opcion in nodo.opciones:
                self.assertEqual(set(opcion.respuesta), {"under_11", "over_11"})


class EdadYLegalidad(unittest.TestCase):
    def test_el_lenguaje_depende_de_la_franja_de_edad(self):
        pequeño = renderizar(historia(edad=9, semilla=3), "Luna", "f")
        mayor = renderizar(historia(edad=13, semilla=3), "Luna", "f")
        self.assertNotEqual([p["texto"] for p in pequeño], [p["texto"] for p in mayor])
        self.assertTrue(set(get_phrases_by_age(10)) <= {f for fs in PHRASING_DB["under_11"].values() for f in fs})
        self.assertTrue(set(get_phrases_by_age(11)) <= {f for fs in PHRASING_DB["over_11"].values() for f in fs})
        self.assertEqual(historia(edad=10)["edad_banda"], "under_11")
        self.assertEqual(historia(edad=11)["edad_banda"], "over_11")

    def test_la_variante_legal_depende_de_tener_14_anos(self):
        for semilla in range(5):
            joven = {i for ids in historia(edad=13, semilla=semilla)["grupos"].values() for i in ids}
            mayor = {i for ids in historia(edad=14, semilla=semilla)["grupos"].values() for i in ids}
            self.assertIn("g4-declara-menor14", joven)
            self.assertNotIn("g4-declara-14mas", joven)
            self.assertIn("g4-declara-14mas", mayor)
            self.assertNotIn("g4-declara-menor14", mayor)


class Privacidad(unittest.TestCase):
    def test_el_nombre_solo_aparece_al_renderizar(self):
        h = historia()
        self.assertNotIn("Zoe", json.dumps(h, ensure_ascii=False))
        pasos = renderizar(h, "Zoe", "f")
        texto = " ".join(p["texto"] for p in pasos)
        self.assertIn("Zoe", texto)
        self.assertNotIn("{nombre}", texto)
        self.assertNotIn("{o}", texto)

    def test_el_sexo_solo_cambia_la_terminacion(self):
        h = historia(semilla=2)  # el cierre (obligatorio) termina en "…no está sol{o}" / "…pasarlos sol{o}"
        for sexo, sufijo in (("f", "a"), ("m", "o"), ("x", "e")):
            texto = " ".join(p["texto"] for p in renderizar(h, "Sol", sexo))
            self.assertNotIn("{o}", texto)
            self.assertRegex(texto, rf"sol{sufijo}\.")

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
            return {"contexto": "ciberacoso", "temas": ["movil", "inventado"], "tono": "sereno"}

        etiquetas = extraer_etiquetas("Marina", 12, "f", "Marina recibe mensajes de un grupo de clase", llamar=falso)
        self.assertEqual(len(prompts), 1)
        self.assertNotIn("Marina", prompts[0])
        self.assertEqual(etiquetas["contexto"], "ciberacoso")
        self.assertEqual(etiquetas["temas"], ["movil"])  # lo que no está en la taxonomía se descarta
        self.assertEqual(etiquetas["fuente"], "gemini")

    def test_si_gemini_falla_se_usa_la_heuristica(self):
        def roto(prompt):
            raise TimeoutError("sin red")

        etiquetas = extraer_etiquetas("Leo", 9, "m", "Hay gritos en casa con su padre", llamar=roto)
        self.assertEqual(etiquetas["fuente"], "heuristica")
        self.assertEqual(etiquetas["contexto"], "violencia_familiar")
        self.assertTrue(set(etiquetas["temas"]) <= set(TEMAS))

    def test_la_cache_no_contiene_el_nombre(self):
        cache = StateCache(usar_redis=False)
        cache.set("abc", {"historia": historia()})
        self.assertNotIn("Zoe", json.dumps(cache.get("abc")))


class Almacen(unittest.TestCase):
    def test_recupera_por_franja_de_edad(self):
        resultados = ALMACEN.retrieve("tribunal sentencia", "under_11", 5)
        self.assertTrue(resultados)
        self.assertTrue(all(r["meta"]["age_band"] == "under_11" for r in resultados))

    def test_la_cache_caduca(self):
        cache = StateCache(usar_redis=False)
        cache.set("x", {"a": 1}, ttl=-1)
        self.assertIsNone(cache.get("x"))


class Api(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient

        import api

        cls.cliente = TestClient(api.app)

    def _crear(self, **cambios):
        cuerpo = {"nombre": "Zoe", "edad": 12, "sexo": "f", "contexto_legal": "Hay gritos en casa", "semilla": 1, **cambios}
        return self.cliente.post("/historias", json=cuerpo)

    def test_salud(self):
        r = self.cliente.get("/salud")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["indice"], "memoria")

    def test_crear_y_recuperar_una_historia(self):
        r = self._crear()
        self.assertEqual(r.status_code, 200)
        cuerpo = r.json()
        self.assertTrue(any("Zoe" in p["texto"] for p in cuerpo["historia"]))
        self.assertNotIn("Zoe", json.dumps(cuerpo["dag"]) + json.dumps(cuerpo["etiquetas"]))
        otra = self.cliente.get(f"/historias/{cuerpo['id']}", params={"nombre": "Zoe"})
        self.assertEqual(otra.status_code, 200)
        self.assertEqual(otra.json()["historia"], cuerpo["historia"])

    def test_historia_desconocida_y_datos_invalidos(self):
        self.assertEqual(self.cliente.get("/historias/noexiste", params={"nombre": "Zoe"}).status_code, 404)
        self.assertEqual(self._crear(edad=2).status_code, 422)
        self.assertEqual(self._crear(sexo="z").status_code, 422)
        self.assertEqual(self._crear(nombre="").status_code, 422)


if __name__ == "__main__":
    unittest.main()
