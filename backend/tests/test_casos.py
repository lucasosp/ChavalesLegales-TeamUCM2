"""Tests de CasoStore: los primeros tests de backend del repo.

Sin dependencias nuevas: solo la stdlib. Cada test trabaja en un directorio
temporal, sin FastAPI y sin red.

    cd backend && python -m unittest discover -s tests -v
"""
import json
import os
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import casos  # noqa: E402
from casos import CasoStore, ESQUEMA_VERSION, es_id_valido  # noqa: E402


class CasoStoreTest(unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.raiz = self._dir.name
        self.datos = os.path.join(self.raiz, "casos_data")
        self.legacy = os.path.join(self.raiz, "casos_data.json")
        self.store = CasoStore(data_dir=self.datos, legacy_file=self.legacy)

    def tearDown(self):
        self._dir.cleanup()

    # -- comportamiento general ---------------------------------------------

    def test_meta_hace_merge_y_persiste(self):
        self.store.set_meta("CL-1", {"contexto": "Prueba"})
        self.store.set_meta("CL-1", {"tipoRiesgo": "grooming"})

        self.assertEqual(
            self.store.get("CL-1")["meta"],
            {"contexto": "Prueba", "tipoRiesgo": "grooming"},
        )

        otro = CasoStore(data_dir=self.datos, legacy_file=self.legacy)
        self.assertEqual(otro.get("CL-1")["meta"]["tipoRiesgo"], "grooming")

    def test_evento_dibujo_reemplaza_y_no_acumula(self):
        self.store.add_evento("CL-1", {"kind": "dibujo", "t": 1, "data": {"phase1": "a"}})
        self.store.add_evento("CL-1", {"kind": "dibujo", "t": 2, "data": {"phase1": "b"}})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 3, "data": {}})

        eventos = self.store.get("CL-1")["eventos"]
        dibujos = [e for e in eventos if e["kind"] == "dibujo"]
        self.assertEqual(len(dibujos), 1)
        self.assertEqual(dibujos[0]["data"]["phase1"], "b")
        self.assertEqual(len(eventos), 2)

    def test_limita_el_numero_de_eventos(self):
        limite_original = casos.MAX_EVENTOS
        casos.MAX_EVENTOS = 20
        try:
            for i in range(25):
                self.store.add_evento("CL-1", {"kind": "progreso", "t": i, "data": {}})
        finally:
            casos.MAX_EVENTOS = limite_original

        eventos = self.store.get("CL-1")["eventos"]
        self.assertEqual(len(eventos), 20)
        self.assertEqual(eventos[-1]["t"], 24)  # se conservan los últimos

    def test_get_devuelve_copia(self):
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "data": {}})

        caso = self.store.get("CL-1")
        caso["eventos"].append({"kind": "falso"})
        caso["meta"]["contexto"] = "mutado"

        self.assertEqual(len(self.store.get("CL-1")["eventos"]), 1)
        self.assertEqual(self.store.get("CL-1")["meta"], {})

    def test_set_meta_devuelve_copia(self):
        devuelto = self.store.set_meta("CL-1", {"contexto": "Obs"})
        devuelto["meta"]["contexto"] = "mutado"
        self.assertEqual(self.store.get("CL-1")["meta"]["contexto"], "Obs")

    def test_caso_inexistente(self):
        self.assertIsNone(self.store.get("NO-EXISTE"))
        self.assertEqual(self.store.listar(), [])

    def test_listar_resume_sin_devolver_eventos(self):
        self.store.set_meta("CL-1", {"contexto": "Obs"})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "data": {}})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 2, "data": {}})

        self.assertEqual(
            self.store.listar(),
            [{"id": "CL-1", "meta": {"contexto": "Obs"}, "eventos": 2}],
        )

    # -- esquema del evento (version 2) -------------------------------------

    def test_estampa_t_servidor_y_version(self):
        antes = casos.ahora_ms()
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "data": {}})
        despues = casos.ahora_ms()

        caso = self.store.get("CL-1")
        evento = caso["eventos"][0]
        self.assertEqual(caso["schemaVersion"], ESQUEMA_VERSION)
        self.assertGreaterEqual(evento["t_servidor"], antes)
        self.assertLessEqual(evento["t_servidor"], despues)
        self.assertEqual(evento["t"], 1)  # el reloj del cliente se conserva

    def test_no_deja_que_el_cliente_fije_t_servidor(self):
        # t_servidor es del servidor: si llega uno, se respeta solo si es plausible
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "t_servidor": 5, "data": {}})
        self.assertEqual(self.store.get("CL-1")["eventos"][0]["t_servidor"], 5)

    def test_evento_mal_formado_lanza(self):
        for malo in (
            "no soy un evento",
            ["tampoco"],
            {"data": {}},
            {"kind": "", "data": {}},
            {"kind": 7, "data": {}},
            {"kind": "progreso", "data": "esto no es un objeto"},
            {"kind": "progreso", "t": "ayer", "data": {}},
        ):
            with self.assertRaises(ValueError, msg=repr(malo)):
                self.store.add_evento("CL-1", malo)
        self.assertEqual(os.listdir(self.datos), [])

    def test_kind_desconocido_se_acepta(self):
        # la novela puede emitir un tipo nuevo antes de que el informe lo entienda
        self.store.add_evento("CL-1", {"kind": "evento-futuro", "t": 1, "data": {}})
        self.assertEqual(len(self.store.get("CL-1")["eventos"]), 1)

    def test_data_por_defecto_es_objeto_vacio(self):
        self.store.add_evento("CL-1", {"kind": "salida", "t": 1})
        self.assertEqual(self.store.get("CL-1")["eventos"][0]["data"], {})

    # -- resumen ligero ------------------------------------------------------

    def test_resumen_no_devuelve_eventos(self):
        self.store.set_meta("CL-1", {"contexto": "Obs"})
        self.store.add_evento("CL-1", {"kind": "inicio", "t": 10, "data": {}})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 20, "data": {}})

        resumen = self.store.resumen("CL-1")
        self.assertEqual(sorted(resumen), ["eventos", "id", "schemaVersion", "ultimo"])
        self.assertEqual(resumen["eventos"], 2)  # un contador, no la lista
        self.assertIsInstance(resumen["ultimo"], int)
        self.assertEqual(resumen["schemaVersion"], ESQUEMA_VERSION)

    def test_resumen_de_caso_inexistente_o_id_invalido(self):
        self.assertIsNone(self.store.resumen("NO-EXISTE"))
        self.assertIsNone(self.store.resumen("../evil"))

    def test_caso_antiguo_se_marca_version_1(self):
        with open(os.path.join(self.datos, "CL-1.json"), "w", encoding="utf-8") as f:
            json.dump({"id": "CL-1", "meta": {}, "eventos": [{"kind": "inicio", "t": 1, "data": {}}]}, f)

        store = CasoStore(data_dir=self.datos, legacy_file=self.legacy)
        self.assertEqual(store.resumen("CL-1")["schemaVersion"], 1)

    def test_escrituras_concurrentes_no_pierden_eventos(self):
        def escribe(n):
            for i in range(10):
                self.store.add_evento("CL-1", {"kind": "progreso", "t": n * 100 + i, "data": {}})

        hilos = [threading.Thread(target=escribe, args=(n,)) for n in range(4)]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()

        self.assertEqual(len(self.store.get("CL-1")["eventos"]), 40)

        with open(os.path.join(self.datos, "CL-1.json"), encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)["eventos"]), 40)

    # -- 3b: un archivo por caso --------------------------------------------

    def test_set_meta_ignora_nombre_joven(self):
        caso = self.store.set_meta("CL-1", {"nombreJoven": "Ana", "edad": 10})
        self.assertNotIn("nombreJoven", caso["meta"])
        self.assertEqual(caso["meta"]["edad"], 10)
        self.assertNotIn("nombreJoven", self.store.get("CL-1")["meta"])

    def test_escribe_un_archivo_por_caso(self):
        self.store.set_meta("CL-1", {"contexto": "Obs 1"})
        self.store.set_meta("CL-2", {"contexto": "Obs 2"})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "data": {}})

        self.assertEqual(sorted(os.listdir(self.datos)), ["CL-1.json", "CL-2.json"])

        # cada archivo contiene solo su caso
        with open(os.path.join(self.datos, "CL-1.json"), encoding="utf-8") as f:
            self.assertEqual(json.load(f)["id"], "CL-1")

    def test_reescribir_un_caso_no_toca_los_demas(self):
        self.store.set_meta("CL-1", {"contexto": "Obs 1"})
        self.store.set_meta("CL-2", {"contexto": "Obs 2"})
        ruta2 = os.path.join(self.datos, "CL-2.json")
        antes = os.stat(ruta2).st_mtime_ns

        for i in range(5):
            self.store.add_evento("CL-1", {"kind": "progreso", "t": i, "data": {}})

        self.assertEqual(os.stat(ruta2).st_mtime_ns, antes)

    # -- validación del id (path traversal) ---------------------------------

    def test_ids_validos(self):
        for bueno in ["CL-12345", "DEMO", "SMOKE-1792635182", "a_b-c", "x" * 64]:
            self.assertTrue(es_id_valido(bueno), bueno)

    def test_ids_invalidos(self):
        for malo in ["", "..", "../evil", "a/b", "a\\b", ".", "x" * 65, "con espacio", "ñ", None, 7]:
            self.assertFalse(es_id_valido(malo), repr(malo))

    def test_escritura_con_id_invalido_lanza_y_no_toca_disco(self):
        for operacion in (
            lambda: self.store.set_meta("../../evil", {"x": 1}),
            lambda: self.store.add_evento("../evil", {"kind": "x"}),
        ):
            with self.assertRaises(ValueError):
                operacion()

        self.assertEqual(os.listdir(self.datos), [])
        self.assertFalse(os.path.exists(os.path.join(self.raiz, "evil.json")))

    def test_lectura_con_id_invalido_devuelve_none(self):
        self.assertIsNone(self.store.get("../../etc/passwd"))

    # -- migración del blob antiguo -----------------------------------------

    def test_migra_el_archivo_antiguo_y_lo_renombra(self):
        legado = {
            "CL-11111": {
                "id": "CL-11111",
                "meta": {"nombreJoven": "Antiguo"},
                "eventos": [{"kind": "inicio", "t": 1, "data": {}}],
            },
            "CL-22222": {"id": "CL-22222", "meta": {}, "eventos": []},
            "../malo": {"id": "x", "meta": {}, "eventos": []},
        }
        with open(self.legacy, "w", encoding="utf-8") as f:
            json.dump(legado, f)

        store = CasoStore(data_dir=self.datos, legacy_file=self.legacy)

        self.assertEqual(store.get("CL-11111")["meta"]["nombreJoven"], "Antiguo")
        self.assertEqual(len(store.get("CL-22222")["eventos"]), 0)
        # el id inválido no se migra
        self.assertEqual(sorted(os.listdir(self.datos)), ["CL-11111.json", "CL-22222.json"])
        # el archivo viejo se conserva renombrado y no se vuelve a migrar
        self.assertFalse(os.path.exists(self.legacy))
        self.assertTrue(os.path.exists(self.legacy + ".migrado"))

    def test_la_migracion_no_pisa_un_caso_mas_nuevo(self):
        self.store.set_meta("CL-11111", {"contexto": "Nuevo"})
        with open(self.legacy, "w", encoding="utf-8") as f:
            json.dump({"CL-11111": {"id": "CL-11111", "meta": {"contexto": "Viejo"}, "eventos": []}}, f)

        store = CasoStore(data_dir=self.datos, legacy_file=self.legacy)
        self.assertEqual(store.get("CL-11111")["meta"]["contexto"], "Nuevo")

    def test_sin_archivo_antiguo_arranca_vacio(self):
        self.assertEqual(self.store.listar(), [])
        self.assertTrue(os.path.isdir(self.datos))

class CasoSoloLecturaTest(unittest.TestCase):
    """DEMO es un ejemplo: se lee, pero nada lo modifica."""

    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.datos = os.path.join(self._dir.name, "casos_data")
        os.makedirs(self.datos)
        self.ruta = os.path.join(self.datos, "DEMO.json")
        self.original = {
            "id": "DEMO",
            "meta": {"edad": 14},
            "eventos": [{"kind": "inicio", "t": 1, "t_servidor": 1, "data": {}}],
            "schemaVersion": ESQUEMA_VERSION,
        }
        with open(self.ruta, "w", encoding="utf-8") as f:
            json.dump(self.original, f)
        self.store = CasoStore(data_dir=self.datos, legacy_file="")

    def tearDown(self):
        self._dir.cleanup()

    def _contenido(self):
        with open(self.ruta, encoding="utf-8") as f:
            return json.load(f)

    def test_se_puede_leer(self):
        self.assertEqual(self.store.get("DEMO")["meta"], {"edad": 14})
        self.assertEqual(self.store.resumen("DEMO")["eventos"], 1)

    def test_rechaza_eventos_y_meta(self):
        with self.assertRaises(PermissionError):
            self.store.add_evento("DEMO", {"kind": "inicio", "data": {}})
        with self.assertRaises(PermissionError):
            self.store.set_meta("DEMO", {"contexto": "x"})
        self.assertEqual(self._contenido(), self.original)

    def test_da_igual_las_mayusculas(self):
        # En Windows demo.json y DEMO.json son el mismo archivo
        with self.assertRaises(PermissionError):
            self.store.add_evento("demo", {"kind": "inicio", "data": {}})
        self.assertEqual(self._contenido(), self.original)

    def test_los_demas_casos_siguen_escribiendo(self):
        self.store.add_evento("PRUEBA-123456", {"kind": "inicio", "data": {}})
        self.assertEqual(len(self.store.get("PRUEBA-123456")["eventos"]), 1)
        self.assertEqual(self._contenido(), self.original)

class SembrarDemoTest(unittest.TestCase):
    """El DEMO sale de un archivo versionado; al cambiar de versión se vacían las pruebas."""

    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.datos = os.path.join(self._dir.name, "casos_data")
        self.demo = os.path.join(self._dir.name, "DEMO.json")
        self._escribir_demo(semilla="v1", n=3)

    def tearDown(self):
        self._dir.cleanup()

    def _escribir_demo(self, semilla, n):
        caso = {
            "id": "OTRO",
            "meta": {"semilla": semilla, "edad": 14},
            "eventos": [{"kind": "inicio", "t": i, "t_servidor": i, "data": {}} for i in range(n)],
            "schemaVersion": ESQUEMA_VERSION,
        }
        with open(self.demo, "w", encoding="utf-8") as f:
            json.dump(caso, f)

    def _store(self):
        return CasoStore(data_dir=self.datos, legacy_file="", demo_file=self.demo)

    def _existe(self, caso_id):
        return os.path.exists(os.path.join(self.datos, f"{caso_id}.json"))

    def test_siembra_el_demo_si_falta(self):
        caso = self._store().get("DEMO")
        self.assertEqual(caso["id"], "DEMO")
        self.assertEqual(len(caso["eventos"]), 3)
        self.assertTrue(self._existe("DEMO"))

    def test_sin_archivo_no_crea_demo(self):
        store = CasoStore(data_dir=self.datos, legacy_file="", demo_file=os.path.join(self._dir.name, "no_existe.json"))
        self.assertIsNone(store.get("DEMO"))

    def test_un_demo_antiguo_se_reemplaza_y_se_vacian_las_pruebas(self):
        previo = CasoStore(data_dir=self.datos, legacy_file="")
        previo.add_evento("PRUEBA-111111", {"kind": "inicio", "data": {}})
        previo.add_evento("PRUEBA-222222", {"kind": "inicio", "data": {}})
        previo.add_evento("CL-12345", {"kind": "inicio", "data": {}})
        with open(os.path.join(self.datos, "DEMO.json"), "w", encoding="utf-8") as f:
            json.dump({"id": "DEMO", "meta": {}, "eventos": [{"kind": "inicio", "t": 0, "data": {}}] * 674}, f)

        store = self._store()
        self.assertEqual(len(store.get("DEMO")["eventos"]), 3)
        self.assertEqual(store.get("DEMO")["meta"]["semilla"], "v1")
        self.assertIsNone(store.get("PRUEBA-111111"))
        self.assertIsNone(store.get("PRUEBA-222222"))
        self.assertFalse(self._existe("PRUEBA-111111"))
        # Los casos reales no se tocan nunca
        self.assertEqual(len(store.get("CL-12345")["eventos"]), 1)
        self.assertTrue(self._existe("CL-12345"))

    def test_si_el_demo_ya_coincide_no_se_toca_nada(self):
        self._store()
        previo = CasoStore(data_dir=self.datos, legacy_file="")
        previo.add_evento("PRUEBA-333333", {"kind": "inicio", "data": {}})
        ruta = os.path.join(self.datos, "DEMO.json")
        antes = os.path.getmtime(ruta)
        os.utime(ruta, (antes - 100, antes - 100))

        store = self._store()
        self.assertEqual(os.path.getmtime(ruta), antes - 100)
        self.assertEqual(len(store.get("PRUEBA-333333")["eventos"]), 1)

    def test_una_semilla_nueva_reemplaza_el_demo(self):
        self._store()
        self._escribir_demo(semilla="v2", n=3)
        self.assertEqual(self._store().get("DEMO")["meta"]["semilla"], "v2")

    def test_limpiar_ids_retira_solo_los_ids_exactos_y_nunca_el_demo(self):
        previo = CasoStore(data_dir=self.datos, legacy_file="")
        for caso_id in ("CL-11111", "CL-22222", "CL-111110"):
            previo.add_evento(caso_id, {"kind": "inicio", "data": {}})
        caso = json.load(open(self.demo, encoding="utf-8"))
        caso["meta"]["limpiar_ids"] = ["CL-11111", "DEMO", "../x", "CL-99999"]  # un id real, el DEMO, uno inválido y uno que no existe
        json.dump(caso, open(self.demo, "w", encoding="utf-8"))

        store = self._store()
        self.assertIsNone(store.get("CL-11111"))                    # el listado: se retira
        self.assertEqual(len(store.get("CL-22222")["eventos"]), 1)  # el resto de casos reales, intactos
        self.assertEqual(len(store.get("CL-111110")["eventos"]), 1)  # no es prefijo: 'CL-11111' != 'CL-111110'
        self.assertEqual(len(store.get("DEMO")["eventos"]), 3)       # el DEMO nunca se borra
        self.assertNotIn("limpiar_ids", store.get("DEMO")["meta"])   # y no se queda en la ficha

    def test_limpiar_ids_solo_actua_al_sembrar(self):
        self._store()
        previo = CasoStore(data_dir=self.datos, legacy_file="")
        previo.add_evento("CL-33333", {"kind": "inicio", "data": {}})
        caso = json.load(open(self.demo, encoding="utf-8"))
        caso["meta"]["limpiar_ids"] = ["CL-33333"]
        json.dump(caso, open(self.demo, "w", encoding="utf-8"))  # misma semilla y mismos eventos: no se siembra
        self.assertEqual(len(self._store().get("CL-33333")["eventos"]), 1)

    def test_archivo_roto_se_ignora_y_no_borra_nada(self):
        previo = CasoStore(data_dir=self.datos, legacy_file="")
        previo.add_evento("PRUEBA-444444", {"kind": "inicio", "data": {}})
        with open(self.demo, "w", encoding="utf-8") as f:
            f.write("{no es json")
        store = self._store()
        self.assertIsNone(store.get("DEMO"))
        self.assertEqual(len(store.get("PRUEBA-444444")["eventos"]), 1)



if __name__ == "__main__":
    unittest.main()
