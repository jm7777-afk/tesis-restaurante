from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.turno import Turno
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.core.exceptions import ShiftClosedException, InsufficientPaymentException, EntityNotFoundException

class CajaService:
    @staticmethod
    def get_turno_activo(db: Session) -> Turno:
        turno = db.query(Turno).filter(Turno.activo == True).order_by(Turno.id.desc()).first()
        if not turno:
            raise ShiftClosedException("No hay ningún turno de caja activo.")
        return turno

    @staticmethod
    def abrir_turno(db: Session, usuario_caja_id: int, monto_apertura: float) -> Turno:
        turno_existente = db.query(Turno).filter(Turno.activo == True).first()
        if turno_existente:
            raise ShiftClosedException(f"Ya existe un turno activo (# {turno_existente.numero_turno}).")

        ultimo_turno = db.query(Turno).order_by(Turno.numero_turno.desc()).first()
        nuevo_num = (ultimo_turno.numero_turno + 1) if ultimo_turno else 1

        nuevo_turno = Turno(
            numero_turno=nuevo_num,
            monto_apertura=monto_apertura,
            total_ventas=0.0,
            total_pedidos=0,
            activo=True,
            usuario_caja_id=usuario_caja_id
        )
        db.add(nuevo_turno)
        db.commit()
        db.refresh(nuevo_turno)
        return nuevo_turno

    @staticmethod
    def cerrar_turno(db: Session, monto_declarado: float) -> Turno:
        turno = db.query(Turno).filter(Turno.activo == True).first()
        if not turno:
            raise ShiftClosedException("No hay un turno activo para cerrar.")

        turno.fecha_cierre = datetime.now(timezone.utc)
        turno.efectivo_declarado = monto_declarado
        esperado = float(turno.monto_apertura) + float(turno.total_ventas)
        turno.monto_cierre = esperado
        turno.diferencia = round(monto_declarado - esperado, 2)
        turno.activo = False

        db.commit()
        db.refresh(turno)
        return turno

    @staticmethod
    def cobrar_pedido(db: Session, pedido_id: int, metodo_pago: str, monto_recibido: float, nit_cliente: str = "CF", nombre_factura: str = "Consumidor Final") -> Pedido:
        pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        if not pedido:
            raise EntityNotFoundException("Pedido", pedido_id)

        if float(monto_recibido) < float(pedido.total):
            raise InsufficientPaymentException(total_requerido=float(pedido.total), monto_recibido=float(monto_recibido))

        turno = db.query(Turno).filter(Turno.activo == True).first()
        
        pedido.metodo_pago = metodo_pago
        pedido.monto_recibido = monto_recibido
        pedido.cambio = round(monto_recibido - float(pedido.total), 2)
        pedido.nit_cliente = nit_cliente
        pedido.nombre_factura = nombre_factura
        pedido.estado = "PAGADO"
        pedido.factura_numero = f"FAC-DD-{pedido.id:06d}"
        if turno:
            pedido.turno_id = turno.id
            turno.total_ventas = float(turno.total_ventas) + float(pedido.total)
            turno.total_pedidos += 1

        db.commit()
        db.refresh(pedido)
        return pedido
