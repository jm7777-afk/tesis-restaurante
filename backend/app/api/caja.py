from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.core.security import require_roles
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.producto import Producto
from backend.app.models.turno import Turno
from backend.app.models.configuracion import Configuracion
from backend.app.models.mesa import Mesa
from backend.app.schemas.schemas import PedidoOut, TurnoApertura, TurnoCierre, TurnoOut, CobrarPedidoRequest, DetallePedidoItem
from backend.app.websockets.manager import ws_manager

router = APIRouter(prefix="/caja", tags=["Caja / Control de Turnos"])

class PedidoRapidoPOSCreate(BaseModel):
    numero_mesa: str # e.g. "Mesa 5", "Mostrador"
    tipo: Optional[str] = "llevar"
    metodo_pago: str
    monto_recibido: float
    nit_cliente: Optional[str] = "CF"
    nombre_factura: Optional[str] = "Consumidor Final"
    detalles: List[DetallePedidoItem]

@router.get("/turno-activo", response_model=TurnoOut)
def get_turno_activo(
    db: Session = Depends(get_db)
):
    turno = db.query(Turno).filter(Turno.activo == True).order_by(Turno.id.desc()).first()
    if not turno:
        raise HTTPException(status_code=404, detail="No hay ningún turno de caja activo.")
    return turno

@router.post("/abrir-turno", response_model=TurnoOut)
async def abrir_turno(
    data: TurnoApertura,
    db: Session = Depends(get_db)
):
    turno_existente = db.query(Turno).filter(Turno.activo == True).first()
    if turno_existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un turno activo (# {turno_existente.numero_turno}).")

    ultimo_turno = db.query(Turno).order_by(Turno.numero_turno.desc()).first()
    nuevo_num = (ultimo_turno.numero_turno + 1) if ultimo_turno else 1

    nuevo_turno = Turno(
        numero_turno=nuevo_num,
        monto_apertura=data.monto_apertura,
        total_ventas=0.0,
        total_pedidos=0,
        activo=True,
        usuario_caja_id=1
    )
    db.add(nuevo_turno)
    db.commit()
    db.refresh(nuevo_turno)

    await ws_manager.broadcast("TURNO_ACTUALIZADO", {
        "accion": "ABIERTO",
        "turno_id": nuevo_turno.id,
        "numero_turno": nuevo_turno.numero_turno
    })

    return nuevo_turno

@router.post("/cerrar-turno", response_model=TurnoOut)
async def cerrar_turno(
    data: TurnoCierre,
    db: Session = Depends(get_db)
):
    turno = db.query(Turno).filter(Turno.activo == True).order_by(Turno.id.desc()).first()
    if not turno:
        raise HTTPException(status_code=404, detail="No hay turno activo para cerrar.")

    turno.fecha_cierre = datetime.now(timezone.utc)
    turno.monto_cierre = data.monto_cierre
    turno.activo = False

    db.commit()
    db.refresh(turno)

    await ws_manager.broadcast("TURNO_ACTUALIZADO", {
        "accion": "CERRADO",
        "turno_id": turno.id,
        "numero_turno": turno.numero_turno,
        "total_ventas": turno.total_ventas
    })

    return turno

@router.get("/pedidos-pendientes", response_model=List[PedidoOut])
def get_pedidos_pendientes_cobro(
    db: Session = Depends(get_db)
):
    return db.query(Pedido).filter(
        Pedido.estado.in_(["PENDIENTE", "EN_PREPARACION", "LISTO"])
    ).order_by(Pedido.fecha_creacion.asc()).all()

@router.get("/pedidos-cobrados", response_model=List[PedidoOut])
def get_pedidos_cobrados(
    db: Session = Depends(get_db)
):
    turno = db.query(Turno).filter(Turno.activo == True).first()
    query = db.query(Pedido).filter(Pedido.estado.in_(["COBRADO", "ENTREGADO"]))
    if turno:
        query = query.filter(Pedido.turno_id == turno.id)
    return query.order_by(Pedido.fecha_creacion.desc()).all()

# ==================== COBRO Y PEDIDO RÁPIDO EN CAJA POS ====================
@router.post("/crear-y-cobrar-rapido")
async def crear_y_cobrar_rapido(data: PedidoRapidoPOSCreate, db: Session = Depends(get_db)):
    if not data.detalles or len(data.detalles) == 0:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos 1 producto.")

    tax_config = db.query(Configuracion).filter(Configuracion.clave == "impuesto_porcentaje").first()
    tax_rate = float(tax_config.valor) if tax_config else 16.0

    turno_activo = db.query(Turno).filter(Turno.activo == True).first()
    turno_id = turno_activo.id if turno_activo else None

    subtotal_acumulado = 0.0
    detalles_db = []

    for item in data.detalles:
        producto = db.query(Producto).filter(Producto.id == item.producto_id, Producto.activo == True).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto #{item.producto_id} no disponible.")
        
        if producto.stock >= item.cantidad:
            producto.stock -= item.cantidad

        precio = producto.precio_promocion if (producto.precio_promocion and producto.precio_promocion > 0) else producto.precio
        subtotal_item = round(precio * item.cantidad, 2)
        subtotal_acumulado += subtotal_item

        detalle = DetallePedido(
            producto_id=producto.id,
            cantidad=item.cantidad,
            precio_unitario=precio,
            subtotal=subtotal_item,
            estado="PENDIENTE"
        )
        detalles_db.append(detalle)

    subtotal_final = round(subtotal_acumulado, 2)
    impuesto_monto = round(subtotal_final * (tax_rate / 100.0), 2)
    total_final = round(subtotal_final + impuesto_monto, 2)

    if data.monto_recibido < total_final:
        raise HTTPException(status_code=400, detail=f"Monto recibido (Q{data.monto_recibido:.2f}) insuficiente. Total: Q{total_final:.2f}")

    cambio_calculado = round(data.monto_recibido - total_final, 2)

    nuevo_pedido = Pedido(
        numero_mesa=data.numero_mesa or "Mostrador",
        tipo=data.tipo or "llevar",
        modo_pago="PAGAR_ANTES",
        estado="COBRADO",
        subtotal=subtotal_final,
        impuesto=impuesto_monto,
        descuento=0.0,
        total=total_final,
        metodo_pago=data.metodo_pago,
        monto_recibido=data.monto_recibido,
        cambio=cambio_calculado,
        nit_cliente=data.nit_cliente or "CF",
        nombre_factura=data.nombre_factura or "Consumidor Final",
        turno_id=turno_id,
        detalles=detalles_db
    )

    db.add(nuevo_pedido)
    db.commit()
    db.refresh(nuevo_pedido)

    factura_num = f"FAC-DD-{nuevo_pedido.id:06d}"
    nuevo_pedido.factura_numero = factura_num
    db.commit()

    if turno_activo:
        turno_activo.total_ventas = round(turno_activo.total_ventas + total_final, 2)
        turno_activo.total_pedidos += 1
        db.commit()

    await ws_manager.broadcast("NUEVO_PEDIDO", {
        "id": nuevo_pedido.id,
        "numero_mesa": nuevo_pedido.numero_mesa,
        "estado": nuevo_pedido.estado,
        "total": nuevo_pedido.total
    })

    return {
        "mensaje": "Pedido y cobro rápido registrado exitosamente",
        "pedido_id": nuevo_pedido.id,
        "factura_numero": factura_num,
        "total": total_final,
        "monto_recibido": data.monto_recibido,
        "cambio": cambio_calculado,
        "metodo_pago": data.metodo_pago
    }

@router.post("/pedidos/{pedido_id}/cobrar")
async def cobrar_pedido(
    pedido_id: int,
    data: CobrarPedidoRequest,
    db: Session = Depends(get_db)
):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")

    if pedido.estado == "COBRADO":
        raise HTTPException(status_code=400, detail="El pedido ya ha sido cobrado previamente.")

    if data.monto_recibido < pedido.total:
        raise HTTPException(status_code=400, detail=f"Monto recibido insuficiente. Total: ${pedido.total:.2f}")

    cambio_calculado = round(data.monto_recibido - pedido.total, 2)

    factura_num = f"FAC-DD-{pedido.id:06d}"

    pedido.metodo_pago = data.metodo_pago
    pedido.monto_recibido = data.monto_recibido
    pedido.cambio = cambio_calculado
    pedido.nit_cliente = data.nit_cliente or "CF"
    pedido.nombre_factura = data.nombre_factura or "Consumidor Final"
    pedido.factura_numero = factura_num
    pedido.estado = "COBRADO"

    if pedido.tipo == "mesa" and pedido.numero_mesa:
        try:
            mesa_num = int(pedido.numero_mesa.lower().replace("mesa", "").strip())
            mesa_obj = db.query(Mesa).filter(Mesa.numero_mesa == mesa_num).first()
            if mesa_obj:
                mesa_obj.estado = "LIBRE"
                mesa_obj.cliente_actual = None
        except Exception:
            pass

    turno_activo = db.query(Turno).filter(Turno.activo == True).first()
    if turno_activo:
        pedido.turno_id = turno_activo.id
        turno_activo.total_ventas = round(turno_activo.total_ventas + pedido.total, 2)
        turno_activo.total_pedidos += 1

    db.commit()

    await ws_manager.broadcast("PAGO_CONFIRMADO", {
        "pedido_id": pedido.id,
        "numero_mesa": pedido.numero_mesa,
        "total": pedido.total,
        "factura_numero": factura_num,
        "metodo_pago": data.metodo_pago,
        "cambio": cambio_calculado
    })

    return {
        "mensaje": "Pago procesado y factura emitida exitosamente",
        "pedido_id": pedido.id,
        "factura_numero": factura_num,
        "total": pedido.total,
        "monto_recibido": data.monto_recibido,
        "cambio": cambio_calculado,
        "metodo_pago": data.metodo_pago
    }

@router.get("/pedidos/{pedido_id}/factura")
def get_factura_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    detalles_list = []
    for d in pedido.detalles:
        detalles_list.append({
            "producto": d.producto.nombre if d.producto else "Producto",
            "cantidad": d.cantidad,
            "precio_unitario": d.precio_unitario,
            "subtotal": d.subtotal
        })

    return {
        "restaurante": "Donde David - Fresh & Tasty!",
        "nit_emisor": "10928374-9",
        "factura_numero": pedido.factura_numero or f"FAC-DD-{pedido.id:06d}",
        "fecha": str(pedido.fecha_creacion),
        "nit_cliente": pedido.nit_cliente or "CF",
        "nombre_factura": pedido.nombre_factura or "Consumidor Final",
        "tipo_pedido": pedido.tipo,
        "numero_mesa": pedido.numero_mesa,
        "direccion_delivery": pedido.direccion_delivery,
        "telefono_delivery": pedido.telefono_delivery,
        "detalles": detalles_list,
        "subtotal": pedido.subtotal,
        "impuesto_iva": pedido.impuesto,
        "total": pedido.total,
        "metodo_pago": pedido.metodo_pago or "Efectivo",
        "monto_recibido": pedido.monto_recibido or pedido.total,
        "cambio": pedido.cambio or 0.0
    }
