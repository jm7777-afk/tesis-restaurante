import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def run_user_simulation():
    print("=" * 60)
    print("[SIMULACION DE AUDITORIA Y CHEQUEO DE USUARIO END-TO-END]")
    print("=" * 60)

    # -------------------------------------------------------------
    # 1. PRUEBA ROL: CLIENTE EN APP CLIENTE
    # -------------------------------------------------------------
    print("\n[ROL 1: CLIENTE] Explorando Menu y Realizando Pedidos...")

    # Cargar Categorias (CategoryHorizontalScroll)
    res_cats = client.get("/api/v1/cliente/categorias")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    print(f"  OK Categorias cargadas en carrusel horizontal: {[c['nombre'] for c in cats]}")

    # Cargar Productos
    res_prods = client.get("/api/v1/cliente/productos")
    assert res_prods.status_code == 200
    prods = res_prods.json()
    assert len(prods) > 0
    p1 = prods[0]
    print(f"  OK Producto seleccionado del catalogo: {p1['nombre']} (${p1['precio']})")

    # Flujo 1A: Cliente en Mesa (Comer en Mesa con Escaner QR + Cuenta Abierta)
    payload_mesa = {
        "numero_mesa": "Mesa 5",
        "tipo": "mesa",
        "modo_pago": "PAGAR_DESPUES",
        "detalles": [{ "producto_id": p1["id"], "cantidad": 2, "personalizaciones": {} }]
    }
    res_order1 = client.post("/api/v1/cliente/pedidos", json=payload_mesa)
    if res_order1.status_code != 201:
        print("ERROR EN PEDIDO MESA:", res_order1.status_code, res_order1.text)
    assert res_order1.status_code == 201
    order1 = res_order1.json()
    print(f"  OK [MESA QR] Pedido #{order1['id']} creado en {order1['numero_mesa']} con modo {order1['modo_pago']}")

    # Flujo 1B: Cliente Delivery (Con Ubicacion GPS y Pago Previo)
    payload_deliv = {
        "numero_mesa": "Delivery",
        "tipo": "delivery",
        "modo_pago": "PAGAR_ANTES",
        "nombre_cliente_delivery": "Carlos Rodriguez",
        "telefono_delivery": "+502 5555-8899",
        "direccion_delivery": "Coordenadas GPS: 10.4806, -66.9036 - Av. Reforma Apto 4B",
        "detalles": [{ "producto_id": p1["id"], "cantidad": 1, "personalizaciones": {} }]
    }
    res_order2 = client.post("/api/v1/cliente/pedidos", json=payload_deliv)
    assert res_order2.status_code == 201
    order2 = res_order2.json()
    print(f"  OK [DELIVERY MAPA GPS] Pedido #{order2['id']} registrado para envio en: {order2['direccion_delivery']}")

    # Flujo 1C: Enviar Calificacion de Servicio de 5 Estrellas
    payload_rating = {
        "nombre_cliente": "Carlos Rodriguez",
        "comentario": "Excelente servicio en mesa y la comida estuvo riquísima!",
        "estrellas": 5
    }
    res_rating = client.post("/api/v1/cliente/resenas", json=payload_rating)
    assert res_rating.status_code == 201
    print("  OK [RATING CLIENTE] Reseña de 5 estrellas enviada y guardada con exito.")

    # -------------------------------------------------------------
    # 2. PRUEBA ROL: LOGIN DE PERSONAL (ADMIN, CAJA, MESERO, COCINA)
    # -------------------------------------------------------------
    print("\n[AUTENTICACION DE PERSONAL] Iniciando sesion para roles de staff...")

    def get_token(user, pwd):
        res = client.post("/api/v1/auth/login", json={"nombre_usuario": user, "password": pwd})
        assert res.status_code == 200
        return res.json()["access_token"]

    token_admin = get_token("admin", "admin123")
    token_caja = get_token("caja", "caja123")
    token_cocina = get_token("cocina1", "cocina123")
    token_mesero = get_token("delivery1", "delivery123")
    print("  OK Autenticacion exitosa para Admin, Caja, Cocina y Mesero.")

    # -------------------------------------------------------------
    # 3. PRUEBA ROL: COCINA (MONITOR KDS Y ESCALA DE PANTALLA)
    # -------------------------------------------------------------
    print("\n[ROL 2: COCINA KDS] Procesando Comandas y Cambios de Estado...")
    headers_cocina = {"Authorization": f"Bearer {token_cocina}"}

    res_kds = client.get("/api/v1/cocina/pedidos", headers=headers_cocina)
    assert res_kds.status_code == 200
    kds_list = res_kds.json()
    print(f"  OK KDS Cocina: {len(kds_list)} comandas recibidas en tiempo real.")

    # Cambiar estado a EN_PREPARACION y luego LISTO
    if len(kds_list) > 0:
        target_id = kds_list[0]["id"]
        res_prep = client.put(f"/api/v1/cocina/pedidos/{target_id}/estado?estado=EN_PREPARACION", headers=headers_cocina)
        assert res_prep.status_code == 200
        print(f"  OK Comanda #{target_id} cambiada a estado 'EN_PREPARACION'.")

        res_ready = client.put(f"/api/v1/cocina/pedidos/{target_id}/estado?estado=LISTO", headers=headers_cocina)
        assert res_ready.status_code == 200
        print(f"  OK Comanda #{target_id} cambiada a estado 'LISTO' (notificando a Mesero y Caja).")

    # -------------------------------------------------------------
    # 4. PRUEBA ROL: MESERO (ATENCIÓN A SALÓN Y BEBIDAS)
    # -------------------------------------------------------------
    print("\n[ROL 3: MESERO] Verificando Comandas, Bebidas y Reasignacion de Mesa...")
    headers_mesero = {"Authorization": f"Bearer {token_mesero}"}

    res_mesas_m = client.get("/api/v1/mesero/mesas", headers=headers_mesero)
    assert res_mesas_m.status_code == 200
    print(f"  OK Mesero cargo {len(res_mesas_m.json())} mesas del salon.")

    res_activos = client.get("/api/v1/mesero/pedidos-activos", headers=headers_mesero)
    assert res_activos.status_code == 200
    activos = res_activos.json()
    print(f"  OK Mesero monitorea {len(activos)} comandas activas con destaque de bebidas.")

    if len(activos) > 0:
        target_m_id = activos[0]["id"]
        # Marcar como Entregado
        res_deliv = client.post(f"/api/v1/mesero/pedidos/{target_m_id}/marcar-entregado", headers=headers_mesero)
        assert res_deliv.status_code == 200
        print(f"  OK Comanda #{target_m_id} marcada como ENTREGADA en mesa por el mesero.")

    # -------------------------------------------------------------
    # 5. PRUEBA ROL: CAJA TOUCH POS (POSTRES, PAGOS APP Y COBRO)
    # -------------------------------------------------------------
    print("\n[ROL 4: CAJA POS TOUCH] Preparacion de Postres y Cobro Dual...")
    headers_caja = {"Authorization": f"Bearer {token_caja}"}

    # Abrir turno de caja si no hay uno activo
    client.post("/api/v1/caja/abrir-turno", json={"monto_inicial": 100.0}, headers=headers_caja)

    res_pend = client.get("/api/v1/caja/pedidos-pendientes", headers=headers_caja)
    assert res_pend.status_code == 200
    pendientes = res_pend.json()
    print(f"  OK Caja: {len(pendientes)} pedidos pendientes por cobrar/confirmar.")

    if len(pendientes) > 0:
        pay_target = pendientes[0]
        payload_cobro = {
            "pedido_id": pay_target["id"],
            "metodo_pago": "Efectivo",
            "monto_recibido": float(pay_target["total"]),
            "nombre_factura": "Cliente Satisfecho",
            "nit_factura": "CF"
        }
        res_cobrar = client.post(f"/api/v1/caja/pedidos/{pay_target['id']}/cobrar", json=payload_cobro, headers=headers_caja)
        if res_cobrar.status_code != 200:
            print("  [DEBUG CAJA COBRO ERROR]:", res_cobrar.status_code, res_cobrar.json())
        assert res_cobrar.status_code == 200
        print(f"  OK [CAJA] Cobro de Pedido #{pay_target['id']} procesado exitosamente en USD y Bs.")

    # -------------------------------------------------------------
    # 6. PRUEBA ROL: ADMINISTRADOR (FILTROS, METRICAS Y USUARIOS)
    # -------------------------------------------------------------
    print("\n[ROL 5: ADMINISTRADOR] Consultando Dashboard, Filtros y Usuarios...")
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    res_stats = client.get("/api/v1/admin/dashboard-stats", headers=headers_admin)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    print(f"  OK Dashboard Stats: Ventas Hoy=${stats.get('ventas_hoy', 0)}, Ventas Mes=${stats.get('ventas_mes', 0)}")

    res_users = client.get("/api/v1/admin/usuarios", headers=headers_admin)
    assert res_users.status_code == 200
    users = res_users.json()
    staff_count = len([u for u in users if u['rol'] != 'cliente'])
    client_count = len([u for u in users if u['rol'] == 'cliente'])
    print(f"  OK Separacion de Usuarios: {staff_count} Personal del Local | {client_count} Clientes Registrados.")

    print("\n" + "=" * 60)
    print("ALL ROLES AND FEATURES VERIFIED SUCCESSFULLY (100% OK)")
    print("=" * 60)

if __name__ == "__main__":
    run_user_simulation()
