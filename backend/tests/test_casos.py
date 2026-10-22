"""Tests de CasoStore: los primeros tests de backend del repo.

Sin dependencias nuevas: solo la stdlib. Se ejecutan en un directorio temporal,
sin FastAPI y sin red.

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
from casos import CasoStore  # noqa: E402


class CasoStoreTest(unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.TemporaryDirectory()
        self.ruta = os.path.join(self._dir.name, "casos.json")
        self.store = CasoStore(data_file=self.ruta)

    def tearDown(self):
        self._dir.cleanup()

    def test_meta_hace_merge_y_persiste(self):
        self.store.set_meta("CL-1", {"nombreJoven": "Ana"})
        self.store.set_meta("CL-1", {"tipoRiesgo": "grooming"})

        self.assertEqual(
            self.store.get("CL-1")["meta"],
            {"nombreJoven": "Ana", "tipoRiesgo": "grooming"},
        )

        # un store nuevo lee lo que quedó en disco
        otro = CasoStore(data_file=self.ruta)
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
        # Se parchea el límite para no escribir 5000 veces el archivo (cada _save lo
        # reescribe entero: es justo el problema que documenta la etapa 3b).
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
        caso["meta"]["nombreJoven"] = "mutado"

        self.assertEqual(len(self.store.get("CL-1")["eventos"]), 1)
        self.assertEqual(self.store.get("CL-1")["meta"], {})

    def test_set_meta_devuelve_copia(self):
        devuelto = self.store.set_meta("CL-1", {"nombreJoven": "Ana"})
        devuelto["meta"]["nombreJoven"] = "mutado"
        self.assertEqual(self.store.get("CL-1")["meta"]["nombreJoven"], "Ana")

    def test_caso_inexistente(self):
        self.assertIsNone(self.store.get("NO-EXISTE"))
        self.assertEqual(self.store.listar(), [])

    def test_listar_resume_sin_devolver_eventos(self):
        self.store.set_meta("CL-1", {"nombreJoven": "Ana"})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 1, "data": {}})
        self.store.add_evento("CL-1", {"kind": "progreso", "t": 2, "data": {}})

        self.assertEqual(
            self.store.listar(),
            [{"id": "CL-1", "meta": {"nombreJoven": "Ana"}, "eventos": 2}],
        )

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

        with open(self.ruta, encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)["CL-1"]["eventos"]), 40)


if __name__ == "__main__":
    unittest.main()
