import sys
import os
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

class TestDondeDavidSystem(unittest.TestCase):

    def test_01_health(self):
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)

    def test_02_login_and_register(self):
        res = client.post("/api/v1/auth/login", json={"nombre_usuario": "admin", "password": "admin123"})
        self.assertEqual(res.status_code, 200)
        TestDondeDavidSystem.token = res.json()["access_token"]

        # Register new client
        reg_payload = {
            "nombre": "Test",
            "apellido": "User",
            "email": "testuser@mail.com",
            "telefono": "+502 9999 8888",
            "nombre_usuario": "testuser",
            "password": "testuser123"
        }
        res_reg = client.post("/api/v1/auth/register", json=reg_payload)
        self.assertEqual(res_reg.status_code, 200)
        self.assertEqual(res_reg.json()["usuario"]["puntos_fidelidad"], 50)

    def test_03_mesas_and_qr(self):
        res = client.get("/api/v1/admin/mesas")
        self.assertEqual(res.status_code, 200)
        mesas = res.json()
        self.assertEqual(len(mesas), 20)

        # Get QR info for Mesa 3
        res_qr = client.get("/api/v1/admin/mesas/3/qr")
        self.assertEqual(res_qr.status_code, 200)
        self.assertIn("qr_image_url", res_qr.json())

    def test_04_insumos_inventory(self):
        res = client.get("/api/v1/admin/insumos")
        self.assertEqual(res.status_code, 200)
        insumos = res.json()
        self.assertGreater(len(insumos), 0)

    def test_05_promociones(self):
        res = client.get("/api/v1/cliente/promociones")
        self.assertEqual(res.status_code, 200)
        promos = res.json()
        self.assertGreater(len(promos), 0)

    def test_06_puntos_canje(self):
        # Login as javier who has 280 points
        res_log = client.post("/api/v1/auth/login", json={"nombre_usuario": "javier", "password": "javier123"})
        token_j = res_log.json()["access_token"]
        headers = {"Authorization": f"Bearer {token_j}"}

        res_canje = client.post("/api/v1/cliente/puntos/canjear?recompensa=Papas%20Gratis", headers=headers)
        self.assertEqual(res_canje.status_code, 200)
        self.assertEqual(res_canje.json()["puntos_restantes"], 180)

if __name__ == "__main__":
    unittest.main()
