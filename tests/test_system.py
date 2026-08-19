import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

def test_readiness_check():
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ready", "degraded"]

def test_unauthorized_admin_access_fails():
    # Cliente no autenticado intentando acceder a usuarios del admin
    response = client.get("/api/v1/admin/usuarios")
    assert response.status_code in [401, 403]

def test_public_categories():
    response = client.get("/api/v1/cliente/categorias")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_public_products():
    response = client.get("/api/v1/cliente/productos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_login_demo_admin():
    response = client.post("/api/v1/auth/login", json={
        "nombre_usuario": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["usuario"]["rol"] == "admin"

def test_rbac_client_forbidden_on_caja():
    # Login como cliente normal
    login_res = client.post("/api/v1/auth/login", json={
        "nombre_usuario": "cliente1",
        "password": "cliente123"
    })
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        # Intentar acceder a caja con token de cliente
        caja_res = client.get("/api/v1/caja/turno-activo", headers={"Authorization": f"Bearer {token}"})
        assert caja_res.status_code == 403
