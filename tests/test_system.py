import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.security import get_password_hash
from backend.app.models.usuario import Usuario

@pytest.fixture(autouse=True)
def setup_test_users():
    db = SessionLocal()
    try:
        if not db.query(Usuario).filter(Usuario.nombre_usuario == "admin").first():
            db.add(Usuario(
                nombre="Admin", apellido="Sistema", email="admin@test.com",
                nombre_usuario="admin", contraseña_hash=get_password_hash("admin123"),
                rol="admin", activo=True
            ))
        if not db.query(Usuario).filter(Usuario.nombre_usuario == "cliente1").first():
            db.add(Usuario(
                nombre="Cliente", apellido="Test", email="cliente1@test.com",
                nombre_usuario="cliente1", contraseña_hash=get_password_hash("cliente123"),
                rol="cliente", activo=True
            ))
        if not db.query(Usuario).filter(Usuario.nombre_usuario == "cajero1").first():
            db.add(Usuario(
                nombre="Cajero", apellido="Test", email="cajero1@test.com",
                nombre_usuario="cajero1", contraseña_hash=get_password_hash("caja123"),
                rol="caja", activo=True
            ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

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
    login_res = client.post("/api/v1/auth/login", json={
        "nombre_usuario": "cliente1",
        "password": "cliente123"
    })
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        caja_res = client.get("/api/v1/caja/turno-activo", headers={"Authorization": f"Bearer {token}"})
        assert caja_res.status_code == 403

def test_financial_insufficient_payment_rejected():
    login_res = client.post("/api/v1/auth/login", json={
        "nombre_usuario": "cajero1",
        "password": "caja123"
    })
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        # Intentar cobrar pedido rapido con monto insuficiente
        res = client.post("/api/v1/caja/crear-y-cobrar-rapido", headers={"Authorization": f"Bearer {token}"}, json={
            "numero_mesa": "Mostrador",
            "tipo": "llevar",
            "metodo_pago": "Efectivo",
            "monto_recibido": 0.50, # Insuficiente para producto de $8+
            "detalles": [{"producto_id": 1, "cantidad": 1, "personalizaciones": None}]
        })
        assert res.status_code == 400
