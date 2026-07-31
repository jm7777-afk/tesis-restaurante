from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.models.pedido import Pedido
from backend.app.models.mesa import Mesa
from backend.app.schemas.schemas import PedidoOut, CambiarMesaRequest
from backend.app.websockets.manager import ws_manager

router = APIRouter(prefix="/mesero", tags=["Panel de Meseros"])

@router.get("/mesas")
def get_mesas_mesero(db: Session = Depends(get_db)):
    return db.query(Mesa).order_by(Mesa.numero_mesa.asc()).all()

@router.get("/pedidos-activos", response_model=List[PedidoOut])
def get_pedidos_activos_mesero(db: Session = Depends(get_db)):
    return db.query(Pedido).filter(
        Pedido.estado.in_(["PENDIENTE", "EN_PREPARACION", "LISTO"])
    ).order_by(Pedido.fecha_creacion.asc()).all()

@router.post("/pedidos/{pedido_id}/cambiar-mesa")
async def cambiar_mesa_pedido(
    pedido_id: int,
    data: CambiarMesaRequest,
    db: Session = Depends(get_db)
):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    nueva_mesa_num = data.nueva_mesa
    nueva_mesa_obj = db.query(Mesa).filter(Mesa.numero_mesa == nueva_mesa_num).first()
    if not nueva_mesa_obj:
        raise HTTPException(status_code=404, detail=f"La Mesa #{nueva_mesa_num} no existe")

    # Liberar mesa anterior si estaba ocupada
    mesa_anterior_str = pedido.numero_mesa
    try:
        num_ant = int(mesa_anterior_str.lower().replace("mesa", "").strip())
        mesa_ant_obj = db.query(Mesa).filter(Mesa.numero_mesa == num_ant).first()
        if mesa_ant_obj and mesa_ant_obj.numero_mesa != nueva_mesa_num:
            mesa_ant_obj.estado = "LIBRE"
            mesa_ant_obj.cliente_actual = None
    except Exception:
        pass

    # Ocupar nueva mesa
    nueva_mesa_obj.estado = "OCUPADA"
    nueva_mesa_obj.cliente_actual = pedido.nombre_factura or f"Cliente Pedido #{pedido.id}"

    # Actualizar pedido
    pedido.numero_mesa = f"Mesa {nueva_mesa_num}"
    db.commit()
    db.refresh(pedido)

    await ws_manager.broadcast("CAMBIO_ESTADO_PEDIDO", {
        "pedido_id": pedido.id,
        "nuevo_estado": pedido.estado,
        "numero_mesa": pedido.numero_mesa,
        "accion": "CAMBIO_MESA"
    })

    return {
        "mensaje": f"Pedido #{pedido.id} reasignado exitosamente de {mesa_anterior_str} a Mesa #{nueva_mesa_num}",
        "pedido_id": pedido.id,
        "nueva_mesa": f"Mesa {nueva_mesa_num}"
    }

@router.post("/pedidos/{pedido_id}/marcar-entregado")
async def marcar_pedido_entregado(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    pedido.estado = "ENTREGADO"
    db.commit()

    await ws_manager.broadcast("CAMBIO_ESTADO_PEDIDO", {
        "pedido_id": pedido.id,
        "nuevo_estado": "ENTREGADO",
        "numero_mesa": pedido.numero_mesa
    })

    return {"mensaje": f"Pedido #{pedido.id} marcado como ENTREGADO por el mesero."}
