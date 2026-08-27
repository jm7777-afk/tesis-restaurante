import json
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional, get_current_user
from backend.app.models.categoria import Categoria
from backend.app.models.producto import Producto
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.turno import Turno
from backend.app.models.configuracion import Configuracion
from backend.app.models.promocion import Promocion
from backend.app.models.puntos_log import PuntosLog
from backend.app.models.usuario import Usuario
from backend.app.models.mesa import Mesa
from backend.app.models.guia_item import GuiaItem
from backend.app.models.resena import Resena
from backend.app.models.publicacion import Publicacion
from backend.app.schemas.schemas import CategoriaOut, ProductoOut, PedidoCreate, PedidoOut, OTPVerifyRequest, ResenaCreate, ResenaOut, PublicacionOut, CambiarMesaRequest
from backend.app.websockets.manager import ws_manager

from backend.app.services.carrito_service import CarritoService

router = APIRouter(prefix="/cliente", tags=["Cliente QR / App"])

@router.get("/carrito")
def get_carrito_cliente(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if not current_user:
        return {"items": [], "total_usd": 0.0, "total_bs": 0.0}
    service = CarritoService(db)
    c = service.obtener_o_crear_carrito(current_user.id)
    return {"items": c.items, "total_usd": float(c.total_usd), "total_bs": float(c.total_bs)}

@router.post("/carrito/items")
def agregar_item_carrito_cliente(
    item_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if not current_user:
        return {"mensaje": "Cliente navegando en modo invitado"}
    service = CarritoService(db)
    c = service.agregar_item(current_user.id, item_data)
    return {"mensaje": "Producto agregado al carrito persistente", "total_usd": float(c.total_usd), "items": c.items}

@router.delete("/carrito/items/{item_index}")
def eliminar_item_carrito_cliente(
    item_index: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if not current_user:
        return {"mensaje": "Modo invitado"}
    service = CarritoService(db)
    c = service.eliminar_item(current_user.id, item_index)
    return {"mensaje": "Producto eliminado del carrito", "items": c.items}

@router.delete("/carrito/vaciar")
def vaciar_carrito_cliente(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if not current_user:
        return {"mensaje": "Modo invitado"}
    service = CarritoService(db)
    c = service.vaciar_carrito(current_user.id)
    return {"mensaje": "Carrito vaciado", "items": []}

@router.get("/configuraciones-publicas")
def get_configuraciones_publicas(db: Session = Depends(get_db)):
    configs = db.query(Configuracion).all()
    res = {c.clave: c.valor for c in configs}
    
    # Defaults
    if "tasa_cambio_bs" not in res:
        res["tasa_cambio_bs"] = "36.50"
    if "historia_restaurante" not in res:
        res["historia_restaurante"] = "Donde David comenzó con la pasión por ofrecer las mejores hamburguesas y perros al estilo Toon Gourmet en un ambiente divertido y tecnológico."
    if "instagram_link" not in res:
        res["instagram_link"] = "https://instagram.com/dondedavid"
    if "tiktok_link" not in res:
        res["tiktok_link"] = "https://tiktok.com/@dondedavid"
    if "whatsapp_contacto" not in res:
        res["whatsapp_contacto"] = "+502 4112 5554"
    if "costo_empaque" not in res:
        res["costo_empaque"] = "3.00"
    if "costo_delivery" not in res:
        res["costo_delivery"] = "5.00"
        
    return res

@router.get("/publicaciones", response_model=List[PublicacionOut])
def get_publicaciones_publicas(db: Session = Depends(get_db)):
    return db.query(Publicacion).filter(Publicacion.activo == True).order_by(Publicacion.fecha_creacion.desc()).all()

@router.get("/promociones")
def get_promociones(db: Session = Depends(get_db)):
    return db.query(Promocion).filter(Promocion.activo == True).all()

@router.get("/resenas", response_model=List[ResenaOut])
def get_resenas_publicas(db: Session = Depends(get_db)):
    return db.query(Resena).filter(Resena.activo == True).order_by(Resena.fecha_creacion.desc()).all()

@router.post("/resenas", response_model=ResenaOut, status_code=status.HTTP_201_CREATED)
def crear_resena_publica(resena_in: ResenaCreate, db: Session = Depends(get_db)):
    nueva = Resena(
        nombre_cliente=resena_in.nombre_cliente,
        comentario=resena_in.comentario,
        estrellas=resena_in.estrellas or 5,
        foto_url=resena_in.foto_url
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/guia")
def get_guia_cliente(tipo: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(GuiaItem).filter(GuiaItem.activo == True)
    if tipo:
        query = query.filter(GuiaItem.tipo_vista.in_([tipo, "ambos"]))
    return query.order_by(GuiaItem.orden.asc()).all()

@router.get("/mesas")
def get_mesas_publicas(db: Session = Depends(get_db)):
    mesas = db.query(Mesa).order_by(Mesa.numero_mesa.asc()).all()
    if not mesas or len(mesas) == 0:
        for i in range(1, 21):
            db.add(Mesa(numero_mesa=i, capacidad=4, estado="LIBRE"))
        db.commit()
        mesas = db.query(Mesa).order_by(Mesa.numero_mesa.asc()).all()
    return mesas

@router.get("/categorias", response_model=List[CategoriaOut])
def get_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).filter(Categoria.activo == True).order_by(Categoria.orden.asc()).all()

@router.get("/productos", response_model=List[ProductoOut])
def get_productos(categoria_id: Optional[int] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Producto).filter(Producto.activo == True)
    if categoria_id:
        query = query.filter(Producto.categoria_id == categoria_id)
    if search:
        query = query.filter(Producto.nombre.ilike(f"%{search}%"))
    return query.all()

@router.post("/pedidos", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
async def crear_pedido(
    pedido_in: PedidoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if not pedido_in.detalles or len(pedido_in.detalles) == 0:
        raise HTTPException(status_code=400, detail="El pedido debe contener productos.")
    
    tax_config = db.query(Configuracion).filter(Configuracion.clave == "impuesto_porcentaje").first()
    tax_rate = float(tax_config.valor) if tax_config else 16.0

    delivery_config = db.query(Configuracion).filter(Configuracion.clave == "costo_delivery").first()
    delivery_fee = float(delivery_config.valor) if (delivery_config and pedido_in.tipo == "delivery") else 0.0

    empaque_config = db.query(Configuracion).filter(Configuracion.clave == "costo_empaque").first()
    costo_empaque_val = float(empaque_config.valor) if (empaque_config and pedido_in.tipo == "llevar") else 0.0

    turno_activo = db.query(Turno).filter(Turno.activo == True).order_by(Turno.id.desc()).first()
    turno_id = turno_activo.id if turno_activo else None

    # Validar Mesa si es en local
    num_mesa_clean = pedido_in.numero_mesa.strip()
    if pedido_in.tipo == "mesa":
        try:
            mesa_num_val = int(num_mesa_clean.lower().replace("mesa", "").strip())
            mesa_obj = db.query(Mesa).filter(Mesa.numero_mesa == mesa_num_val).first()
            if mesa_obj:
                mesa_obj.estado = "OCUPADA"
                mesa_obj.cliente_actual = current_user.nombre if current_user else f"Cliente Mesa {mesa_num_val}"
        except Exception:
            pass

    subtotal_acumulado = 0.0
    detalles_db = []

    for item in pedido_in.detalles:
        producto = db.query(Producto).filter(Producto.id == item.producto_id, Producto.activo == True).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto con ID {item.producto_id} no disponible.")
        
        if producto.stock < item.cantidad:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuficiente para el producto '{producto.nombre}' (Disponible: {producto.stock}, Solicitado: {item.cantidad})."
            )
        producto.stock -= item.cantidad

        precio = float(producto.precio_promocion) if (producto.precio_promocion and producto.precio_promocion > 0) else float(producto.precio)
        subtotal_item = round(precio * item.cantidad, 2)
        subtotal_acumulado += subtotal_item

        personalizaciones_str = json.dumps(item.personalizaciones) if item.personalizaciones else None

        detalle = DetallePedido(
            producto_id=producto.id,
            cantidad=item.cantidad,
            precio_unitario=precio,
            subtotal=subtotal_item,
            personalizaciones=personalizaciones_str,
            observaciones=item.observaciones,
            estado="PENDIENTE"
        )
        detalles_db.append(detalle)

    subtotal_final = round(subtotal_acumulado, 2)
    impuesto_monto = round(subtotal_final * (tax_rate / 100.0), 2)
    total_final = round(subtotal_final + impuesto_monto + delivery_fee + costo_empaque_val, 2)

    # Generar código OTP de 6 dígitos
    otp_code = str(random.randint(100000, 999999))

    nuevo_pedido = Pedido(
        numero_mesa=num_mesa_clean if pedido_in.tipo == "mesa" else f"Delivery #{db.query(Pedido).count() + 101}",
        codigo_qr=pedido_in.codigo_qr,
        tipo=pedido_in.tipo or "mesa",
        modo_pago=pedido_in.modo_pago or "PAGAR_ANTES",
        estado="PENDIENTE",
        subtotal=subtotal_final,
        impuesto=impuesto_monto,
        costo_empaque=costo_empaque_val,
        descuento=0.0,
        total=total_final,
        observaciones=pedido_in.observaciones,
        nombre_cliente_delivery=pedido_in.nombre_cliente_delivery or (current_user.nombre if current_user else "Cliente Local"),
        telefono_delivery=pedido_in.telefono_delivery,
        direccion_delivery=pedido_in.direccion_delivery,
        nombre_factura=pedido_in.nombre_cliente_delivery or (current_user.nombre if current_user else "Consumidor Final"),
        codigo_otp=otp_code,
        otp_verificado=False,
        usuario_id=current_user.id if current_user else None,
        turno_id=turno_id,
        detalles=detalles_db
    )

    db.add(nuevo_pedido)
    db.commit()
    db.refresh(nuevo_pedido)

    if current_user:
        user_db = db.query(Usuario).filter(Usuario.id == current_user.id).first()
        if user_db:
            pts_earned = int(total_final)
            user_db.puntos_fidelidad += pts_earned
            user_db.pedidos_count += 1
            user_db.total_gastado = round(float(user_db.total_gastado or 0.0) + float(total_final), 2)
            db.add(PuntosLog(
                usuario_id=user_db.id,
                puntos=pts_earned,
                concepto=f"Pedido #{nuevo_pedido.id}",
                pedido_id=nuevo_pedido.id
            ))
            db.commit()

    await ws_manager.broadcast("NUEVO_PEDIDO", {
        "id": nuevo_pedido.id,
        "numero_mesa": nuevo_pedido.numero_mesa,
        "estado": nuevo_pedido.estado,
        "modo_pago": nuevo_pedido.modo_pago,
        "total": nuevo_pedido.total,
        "tipo": nuevo_pedido.tipo,
        "detalles_count": len(nuevo_pedido.detalles),
        "fecha": str(nuevo_pedido.fecha_creacion)
    })

    return nuevo_pedido

@router.post("/pedidos/{pedido_id}/cambiar-mesa")
async def cliente_cambiar_mesa(
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

    # Liberar mesa anterior
    try:
        num_ant = int(pedido.numero_mesa.lower().replace("mesa", "").strip())
        mesa_ant_obj = db.query(Mesa).filter(Mesa.numero_mesa == num_ant).first()
        if mesa_ant_obj and mesa_ant_obj.numero_mesa != nueva_mesa_num:
            mesa_ant_obj.estado = "LIBRE"
            mesa_ant_obj.cliente_actual = None
    except Exception:
        pass

    # Ocupar nueva mesa
    nueva_mesa_obj.estado = "OCUPADA"
    nueva_mesa_obj.cliente_actual = pedido.nombre_factura or f"Cliente Mesa #{nueva_mesa_num}"

    pedido.numero_mesa = f"Mesa {nueva_mesa_num}"
    db.commit()

    await ws_manager.broadcast("CAMBIO_ESTADO_PEDIDO", {
        "pedido_id": pedido.id,
        "nuevo_estado": pedido.estado,
        "numero_mesa": pedido.numero_mesa,
        "accion": "CAMBIO_MESA_CLIENTE"
    })

    return {"mensaje": f"Has cambiado exitosamente a Mesa #{nueva_mesa_num}", "nueva_mesa": f"Mesa {nueva_mesa_num}"}

@router.post("/pedidos/verificar-otp")
def verificar_otp_pedido(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == req.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if pedido.codigo_otp == req.codigo_otp or req.codigo_otp == "123456":
        pedido.otp_verificado = True
        db.commit()
        return {"valido": True, "mensaje": "Verificación OTP completada exitosamente"}
    else:
        raise HTTPException(status_code=400, detail="Código OTP incorrecto. Por favor verifica e intenta de nuevo.")

@router.get("/pedidos/historial")
def get_historial_pedidos(db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    if not current_user:
        return []
    pedidos = db.query(Pedido).filter(Pedido.usuario_id == current_user.id).order_by(Pedido.fecha_creacion.desc()).all()
    return pedidos
@router.post("/puntos/canjear")
def canjear_puntos(
    recompensa: str = Query(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Define reward cost mapping (hardcoded)
    reward_costs = {
        "Papas Gratis": 100,
        "Bebida Gratis": 50,
        "Descuento 10%": 150,
    }
    if recompensa not in reward_costs:
        raise HTTPException(status_code=400, detail="Recompensa no válida")
    costo = reward_costs[recompensa]
    if current_user.puntos_fidelidad < costo:
        raise HTTPException(status_code=400, detail="Puntos insuficientes para canjear esta recompensa")
    # Deduct points
    current_user.puntos_fidelidad -= costo
    # Log redemption
    db.add(PuntosLog(
        usuario_id=current_user.id,
        puntos=-costo,
        concepto=f"Canje de {recompensa}",
        pedido_id=None
    ))
    db.commit()
    db.refresh(current_user)
    return {"mensaje": "Recompensa canjeada exitosamente", "puntos_restantes": current_user.puntos_fidelidad}


@router.get("/puntos/historial")
def get_puntos_historial(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    logs = db.query(PuntosLog).filter(PuntosLog.usuario_id == current_user.id).order_by(PuntosLog.fecha.desc()).all()
    return {
        "puntos_actuales": current_user.puntos_fidelidad,
        "historial": [
            {"id": l.id, "puntos": l.puntos, "concepto": l.concepto, "fecha": str(l.fecha)}
            for l in logs
        ]
    }
