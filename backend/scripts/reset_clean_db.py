import sys
import os
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.security import get_password_hash
from backend.app.models.usuario import Usuario
from backend.app.models.producto import Producto
from backend.app.models.categoria import Categoria
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.turno import Turno
from backend.app.models.mesa import Mesa
from backend.app.models.resena import Resena
from backend.app.models.carrito import Carrito
from backend.app.models.configuracion import Configuracion
from backend.app.models.promocion import Promocion
from backend.app.models.puntos_log import PuntosLog

def reset_clean_db():
    print("=" * 70)
    print("  [LIMPIEZA TOTAL DE BASE DE DATOS A 0 - DONDE DAVID]")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        # 1. Vaciar tablas de transacciones y datos operativos
        print("[1/6] Limpiando comprobantes, pagos, detalles y pedidos...")
        for tbl in ["facturas", "pagos", "detalles_pedido", "pedidos", "turnos", "carritos", "puntos_log", "resenas", "promociones", "movimientos_inventario", "insumos"]:
            try:
                db.execute(text(f"DELETE FROM {tbl};"))
            except Exception:
                pass
        
        # 2. Vaciar catálogo de productos y categorías (Para carga manual por el usuario)
        print("[2/6] Limpiando productos y categorias a 0...")
        db.query(Producto).delete()
        db.query(Categoria).delete()
        
        # 3. Vaciar usuarios
        print("[3/6] Limpiando usuarios...")
        db.query(Usuario).delete()
        
        # 4. Crear únicamente los usuarios base del personal para login
        print("[4/6] Creando usuarios base de acceso por rol...")
        users_seed = [
            Usuario(nombre="Admin", apellido="Donde David", email="admin@donde-david.com", nombre_usuario="admin", contraseña_hash=get_password_hash("admin123"), rol="admin", activo=True),
            Usuario(nombre="Maria", apellido="Garcia", email="caja@donde-david.com", nombre_usuario="caja", contraseña_hash=get_password_hash("caja123"), rol="caja", activo=True),
            Usuario(nombre="Juan", apellido="Perez", email="cocina@donde-david.com", nombre_usuario="cocina1", contraseña_hash=get_password_hash("cocina123"), rol="cocina", activo=True),
            Usuario(nombre="Pedro", apellido="Rojas", email="mesero@donde-david.com", nombre_usuario="mesero1", contraseña_hash=get_password_hash("mesero123"), rol="mesero", activo=True),
            Usuario(nombre="Javier", apellido="Mendoza", email="cliente@donde-david.com", nombre_usuario="cliente1", contraseña_hash=get_password_hash("cliente123"), rol="cliente", activo=True),
        ]
        db.add_all(users_seed)
        
        # 5. Reiniciar las 20 mesas del salón a estado LIBRE
        print("[5/6] Reiniciando las 20 mesas del salon a LIBRE...")
        db.query(Mesa).delete()
        mesas = [Mesa(numero_mesa=i, capacidad=4, estado="LIBRE") for i in range(1, 21)]
        db.add_all(mesas)
        
        # 6. Preservar configuraciones globales del sistema ($/Bs. e IVA 16%)
        print("[6/6] Restableciendo configuraciones base ($/Bs., IVA 16%)...")
        db.query(Configuracion).delete()
        configs = [
            Configuracion(clave="TASA_CAMBIO_USD_BS", valor="42.50", descripcion="Tasa de cambio oficial del Dolar a Bolivares"),
            Configuracion(clave="tasa_cambio_bs", valor="42.50", descripcion="Tasa de cambio estandar"),
            Configuracion(clave="IVA_PORCENTAJE", valor="16.00", descripcion="Porcentaje IVA 16%"),
            Configuracion(clave="TIEMPO_PREPARACION_BASE", valor="15", descripcion="Tiempo base cocina en minutos"),
            Configuracion(clave="HORA_APERTURA", valor="08:00", descripcion="Hora de apertura"),
            Configuracion(clave="HORA_CIERRE", valor="22:00", descripcion="Hora de cierre"),
        ]
        db.add_all(configs)
        
        db.commit()
        print("\n" + "=" * 70)
        print("  🟢 BASE DE DATOS VACIADA Y PUESTA EN 0 CON ÉXITO")
        print("======================================================================")
        print("  - Categorias en BD: 0 (Listas para agregar manualmente)")
        print("  - Productos en BD:  0 (Listos para agregar manualmente)")
        print("  - Pedidos en BD:    0 (Limpio)")
        print("  - Turnos en BD:     0 (Limpio)")
        print("  - Mesas Salon:      20 (Todas LIBRE)")
        print("======================================================================")
        print("  🔑 CREDENCIALES DE ACCESO BASE:")
        print("  • Admin:   admin    / admin123")
        print("  • Caja:    caja     / caja123")
        print("  • Cocina:  cocina1  / cocina123")
        print("  • Mesero:  mesero1  / mesero123")
        print("  • Cliente: cliente1 / cliente123")
        print("======================================================================")
    except Exception as e:
        db.rollback()
        print(f"Error al limpiar base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_clean_db()
