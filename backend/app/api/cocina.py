from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import require_roles
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.schemas.schemas import PedidoOut
from backend.app.websockets.manager import ws_manager

router = APIRouter(prefix="/cocina", tags=["Cocina / KDS"])

@router.get("/pedidos", response_model=List[PedidoOut])
def get_pedidos_cocina(
    db: Session = Depends(get_db),
    user = Depends(require_roles(["admin", "supervisor", "cocina", "caja", "mesero"]))
):
    # Retrieve active orders for kitchen (PENDIENTE, COBRADO, EN_PREPARACION, LISTO)
    return db.query(Pedido).filter(
        Pedido.estado.in_(["PENDIENTE", "COBRADO", "EN_PREPARACION", "LISTO"])
    ).order_by(Pedido.fecha_creacion.asc()).all()

@router.put("/pedidos/{pedido_id}/estado")
async def actualizar_estado_pedido(
    pedido_id: int, 
    estado: str, 
    db: Session = Depends(get_db),
    user = Depends(require_roles(["admin", "supervisor", "cocina", "caja", "mesero"]))
):
    valid_estados = ["PENDIENTE", "COBRADO", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"]
    if estado not in valid_estados:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {valid_estados}")

    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    pedido.estado = estado
    if estado == "ENTREGADO" or estado == "LISTO":
        pedido.fecha_entrega = datetime.now(timezone.utc)
    
    # Update individual items state if marking entire order
    for detalle in pedido.detalles:
        if (estado == "EN_PREPARACION" or estado == "COBRADO") and detalle.estado in ["PENDIENTE", "COBRADO"]:
            detalle.estado = "EN_PREPARACION"
        elif estado == "LISTO":
            detalle.estado = "LISTO"
            detalle.fecha_listo = datetime.now(timezone.utc)

    db.commit()

    # Broadcast event
    await ws_manager.broadcast("CAMBIO_ESTADO_PEDIDO", {
        "pedido_id": pedido.id,
        "numero_mesa": pedido.numero_mesa,
        "nuevo_estado": estado
    })

    return {"mensaje": "Estado actualizado exitosamente", "pedido_id": pedido_id, "estado": estado}

@router.put("/detalles/{detalle_id}/estado")
async def actualizar_estado_detalle(
    detalle_id: int, 
    estado: str, 
    db: Session = Depends(get_db),
    user = Depends(require_roles(["admin", "supervisor", "cocina", "caja", "mesero"]))
):
    detalle = db.query(DetallePedido).filter(DetallePedido.id == detalle_id).first()
    if not detalle:
        raise HTTPException(status_code=404, detail="Item de pedido no encontrado")

    detalle.estado = estado
    if estado == "LISTO":
        detalle.fecha_listo = datetime.now(timezone.utc)

    db.commit()

    # Check if all items in the parent order are ready
    pedido = db.query(Pedido).filter(Pedido.id == detalle.pedido_id).first()
    todos_listos = all(d.estado == "LISTO" for d in pedido.detalles)
    if todos_listos and pedido.estado != "LISTO":
        pedido.estado = "LISTO"
        pedido.fecha_entrega = datetime.now(timezone.utc)
        db.commit()
        await ws_manager.broadcast("CAMBIO_ESTADO_PEDIDO", {
            "pedido_id": pedido.id,
            "numero_mesa": pedido.numero_mesa,
            "nuevo_estado": "LISTO"
        })

    return {"mensaje": "Estado del ítem actualizado", "detalle_id": detalle_id, "estado": estado}
