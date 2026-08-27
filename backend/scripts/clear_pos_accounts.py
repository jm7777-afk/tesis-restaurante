import sys
import os

# Añadir el directorio raíz al path de Python
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.puntos_log import PuntosLog
from backend.app.models.mesa import Mesa
from backend.app.models.turno import Turno

def clear_all_caja_accounts():
    db = SessionLocal()
    try:
        num_detalles = db.query(DetallePedido).delete()
        num_pedidos = db.query(Pedido).delete()
        num_puntos = db.query(PuntosLog).delete()
        
        # Resetear estado de todas las mesas a LIBRE
        mesas = db.query(Mesa).all()
        for m in mesas:
            m.estado = "LIBRE"
            m.cliente_actual = None
            
        # Resetear métricas de turnos
        turnos = db.query(Turno).all()
        for t in turnos:
            t.total_ventas = 0.0
            t.total_pedidos = 0

        db.commit()
        print(f"EXITO: Se eliminaron {num_pedidos} pedidos/cuentas de caja y {num_detalles} detalles de comanda.")
        print("Se liberaron todas las mesas del salon y se reiniciaron los contadores de caja.")
    except Exception as e:
        db.rollback()
        print(f"Error al limpiar cuentas de caja: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_caja_accounts()
