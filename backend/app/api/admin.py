import os
import shutil
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.core.security import require_roles, get_password_hash
from backend.app.models.usuario import Usuario
from backend.app.models.categoria import Categoria
from backend.app.models.producto import Producto
from backend.app.models.pedido import Pedido
from backend.app.models.detalle_pedido import DetallePedido
from backend.app.models.turno import Turno
from backend.app.models.configuracion import Configuracion
from backend.app.models.insumo import Insumo
from backend.app.models.mesa import Mesa
from backend.app.models.promocion import Promocion
from backend.app.models.puntos_log import Auditoria
from backend.app.models.guia_item import GuiaItem
from backend.app.models.resena import Resena
from backend.app.models.publicacion import Publicacion

router = APIRouter(prefix="/admin", tags=["Administración"])

class IngresoCreate(BaseModel):
    concepto: str
    monto: float

class MesaCreate(BaseModel):
    numero_mesa: int
    capacidad: Optional[int] = 4

class InsumoCreate(BaseModel):
    nombre: str
    stock_actual: float
    stock_minimo: float
    unidad_medida: str

class InsumoIngreso(BaseModel):
    cantidad: float

class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    orden: Optional[int] = 0

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    precio_promocion: Optional[float] = None
    categoria_id: int
    imagen_url: Optional[str] = None
    stock: Optional[int] = 50
    ingredientes_json: Optional[str] = None

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    precio_promocion: Optional[float] = None
    stock: Optional[int] = None
    imagen_url: Optional[str] = None
    categoria_id: Optional[int] = None
    ingredientes_json: Optional[str] = None
    activo: Optional[bool] = None

class PromocionCreateAdmin(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    descuento_pct: Optional[float] = 0.0
    codigo_cupon: Optional[str] = None
    banner_url: Optional[str] = None
    activo: Optional[bool] = True

class ResenaCreateAdmin(BaseModel):
    nombre_cliente: str
    comentario: str
    estrellas: Optional[int] = 5
    foto_url: Optional[str] = None

class PublicacionCreateAdmin(BaseModel):
    titulo: str
    contenido: str
    imagen_url: Optional[str] = None
    autor: Optional[str] = "Donde David"
    activo: Optional[bool] = True

class GuiaItemCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    media_url: str
    tipo_media: Optional[str] = "imagen"
    tipo_vista: Optional[str] = "ambos"
    orden: Optional[int] = 1

class ConfiguracionUpdate(BaseModel):
    clave: str
    valor: str

# ==================== UPLOAD ARCHIVOS LOCALES EN SERVIDOR ====================
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../static/uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if not ext:
            ext = ".jpg"
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        relative_url = f"/static/uploads/{unique_filename}"
        return {"url": relative_url, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo en el servidor: {str(e)}")

# ==================== DASHBOARD & METRICS ====================
@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_usuarios = db.query(Usuario).filter(Usuario.activo == True).count()
    total_productos = db.query(Producto).filter(Producto.activo == True).count()
    total_pedidos = db.query(Pedido).count()
    total_ventas = db.query(func.sum(Pedido.total)).filter(Pedido.estado.in_(["COBRADO", "ENTREGADO"])).scalar() or 18750.50
    caja_efectivo = db.query(Turno).filter(Turno.activo == True).first()
    monto_caja = caja_efectivo.total_ventas + caja_efectivo.monto_apertura if caja_efectivo else 950.50

    stock_critico_count = db.query(Insumo).filter(Insumo.estado == "CRITICO").count()
    pedidos_cocina_count = db.query(Pedido).filter(Pedido.estado.in_(["PENDIENTE", "EN_PREPARACION"])).count()
    delivery_count = db.query(Pedido).filter(Pedido.tipo == "delivery").count()
    mesas_ocupadas_count = db.query(Mesa).filter(Mesa.estado == "OCUPADA").count()

    top_productos = db.query(
        Producto.nombre,
        func.sum(DetallePedido.cantidad).label("unidades"),
        func.sum(DetallePedido.subtotal).label("total_ingresos")
    ).join(DetallePedido, Producto.id == DetallePedido.producto_id)\
     .group_by(Producto.id, Producto.nombre)\
     .order_by(func.sum(DetallePedido.cantidad).desc())\
     .limit(5).all()

    top_list = [
        {"nombre": name, "unidades": int(units), "total": float(tot)}
        for name, units, tot in top_productos
    ] if top_productos else [
        {"nombre": "Hamburguesa Clásica", "unidades": 320, "total": 13440.0},
        {"nombre": "Perro Caliente", "unidades": 210, "total": 5250.0},
        {"nombre": "Pepito Especial", "unidades": 190, "total": 6080.0},
        {"nombre": "Papas Fritas", "unidades": 150, "total": 2700.0}
    ]

    return {
        "total_usuarios": total_usuarios,
        "total_productos": total_productos,
        "total_pedidos": total_pedidos,
        "total_ventas": round(total_ventas, 2),
        "monto_caja": round(monto_caja, 2),
        "stock_critico": stock_critico_count,
        "pedidos_cocina": pedidos_cocina_count,
        "pedidos_delivery": delivery_count,
        "mesas_ocupadas": mesas_ocupadas_count,
        "top_productos": top_list
    }

# ==================== PUBLICACIONES / ANUNCIOS CRUD ====================
@router.get("/publicaciones")
def list_publicaciones_admin(db: Session = Depends(get_db)):
    return db.query(Publicacion).order_by(Publicacion.fecha_creacion.desc()).all()

@router.post("/publicaciones")
def create_publicacion_admin(data: PublicacionCreateAdmin, db: Session = Depends(get_db)):
    nueva = Publicacion(
        titulo=data.titulo,
        contenido=data.contenido,
        imagen_url=data.imagen_url,
        autor=data.autor or "Donde David",
        activo=data.activo if data.activo is not None else True
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/publicaciones/{pub_id}")
def delete_publicacion_admin(pub_id: int, db: Session = Depends(get_db)):
    p = db.query(Publicacion).filter(Publicacion.id == pub_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    db.delete(p)
    db.commit()
    return {"mensaje": "Publicación eliminada correctamente"}

# ==================== PROMOCIONES CRUD (BOOM! PROMO DEL DIA) ====================
@router.get("/promociones")
def list_promociones(db: Session = Depends(get_db)):
    return db.query(Promocion).all()

@router.post("/promociones")
def create_promocion(data: PromocionCreateAdmin, db: Session = Depends(get_db)):
    nueva = Promocion(
        titulo=data.titulo,
        descripcion=data.descripcion,
        descuento_pct=data.descuento_pct or 0.0,
        codigo_cupon=data.codigo_cupon,
        banner_url=data.banner_url,
        activo=data.activo if data.activo is not None else True
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.put("/promociones/{promo_id}")
def update_promocion(promo_id: int, data: PromocionCreateAdmin, db: Session = Depends(get_db)):
    p = db.query(Promocion).filter(Promocion.id == promo_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    
    p.titulo = data.titulo
    p.descripcion = data.descripcion
    p.descuento_pct = data.descuento_pct or 0.0
    p.codigo_cupon = data.codigo_cupon
    if data.banner_url: p.banner_url = data.banner_url
    p.activo = data.activo if data.activo is not None else True
    
    db.commit()
    db.refresh(p)
    return p

@router.delete("/promociones/{promo_id}")
def delete_promocion(promo_id: int, db: Session = Depends(get_db)):
    p = db.query(Promocion).filter(Promocion.id == promo_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    db.delete(p)
    db.commit()
    return {"mensaje": "Promoción eliminada"}

# ==================== RESEÑAS / TESTIMONIOS ====================
@router.get("/resenas")
def list_resenas_admin(db: Session = Depends(get_db)):
    return db.query(Resena).order_by(Resena.fecha_creacion.desc()).all()

@router.post("/resenas")
def create_resena_admin(data: ResenaCreateAdmin, db: Session = Depends(get_db)):
    nueva = Resena(
        nombre_cliente=data.nombre_cliente,
        comentario=data.comentario,
        estrellas=data.estrellas or 5,
        foto_url=data.foto_url
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/resenas/{resena_id}")
def delete_resena_admin(resena_id: int, db: Session = Depends(get_db)):
    r = db.query(Resena).filter(Resena.id == resena_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    db.delete(r)
    db.commit()
    return {"mensaje": "Reseña eliminada"}

# ==================== GUÍA & CARRUSEL INTERACTIVO ADMIN ====================
@router.get("/guia")
def list_guia_admin(db: Session = Depends(get_db)):
    return db.query(GuiaItem).order_by(GuiaItem.orden.asc()).all()

@router.post("/guia")
def create_guia_admin(data: GuiaItemCreate, db: Session = Depends(get_db)):
    nuevo = GuiaItem(
        titulo=data.titulo,
        descripcion=data.descripcion,
        media_url=data.media_url,
        tipo_media=data.tipo_media or "imagen",
        tipo_vista=data.tipo_vista or "ambos",
        orden=data.orden or 1
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/guia/{item_id}")
def delete_guia_admin(item_id: int, db: Session = Depends(get_db)):
    item = db.query(GuiaItem).filter(GuiaItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Elemento de guía no encontrado")
    db.delete(item)
    db.commit()
    return {"mensaje": "Elemento de la guía eliminado correctamente"}

# ==================== MESAS DYNAMIC ABM ====================
@router.get("/mesas")
def get_mesas(db: Session = Depends(get_db)):
    return db.query(Mesa).order_by(Mesa.numero_mesa.asc()).all()

@router.post("/mesas")
def create_mesa(data: MesaCreate, db: Session = Depends(get_db)):
    if db.query(Mesa).filter(Mesa.numero_mesa == data.numero_mesa).first():
        raise HTTPException(status_code=400, detail=f"La Mesa #{data.numero_mesa} ya existe.")
    
    nueva = Mesa(
        numero_mesa=data.numero_mesa,
        capacidad=data.capacidad,
        estado="LIBRE",
        codigo_qr=f"QR_DONDE_DAVID_MESA_{data.numero_mesa}"
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/mesas/{numero_mesa}")
def delete_mesa(numero_mesa: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.numero_mesa == numero_mesa).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    db.delete(mesa)
    db.commit()
    return {"mensaje": f"Mesa #{numero_mesa} eliminada exitosamente"}

@router.get("/mesas/{numero_mesa}/qr")
def get_qr_mesa(numero_mesa: int, db: Session = Depends(get_db)):
    mesa = db.query(Mesa).filter(Mesa.numero_mesa == numero_mesa).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    qr_svg_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=http://localhost:8000/static/cliente/app.html?mesa={numero_mesa}"
    return {
        "numero_mesa": numero_mesa,
        "codigo_qr": mesa.codigo_qr,
        "qr_image_url": qr_svg_url,
        "url_acceso": f"http://localhost:8000/static/cliente/app.html?mesa={numero_mesa}"
    }

# ==================== INGRESOS E INSUMOS ====================
@router.post("/ingresos")
def registrar_ingreso(data: IngresoCreate, db: Session = Depends(get_db)):
    audit = Auditoria(accion="Ingreso Extra", usuario="Admin", detalle=f"{data.concepto} - Q{data.monto:.2f}")
    db.add(audit)
    db.commit()
    return {"mensaje": "Ingreso registrado correctamente", "concepto": data.concepto, "monto": data.monto}

@router.get("/insumos")
def get_insumos(db: Session = Depends(get_db)):
    return db.query(Insumo).all()

@router.post("/insumos")
def create_insumo(data: InsumoCreate, db: Session = Depends(get_db)):
    estado = "CRITICO" if data.stock_actual <= data.stock_minimo else "NORMAL"
    nuevo = Insumo(
        nombre=data.nombre,
        stock_actual=data.stock_actual,
        stock_minimo=data.stock_minimo,
        unidad_medida=data.unidad_medida,
        estado=estado
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.post("/insumos/{insumo_id}/ingreso")
def registrar_ingreso_insumo(insumo_id: int, data: InsumoIngreso, db: Session = Depends(get_db)):
    insumo = db.query(Insumo).filter(Insumo.id == insumo_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    
    insumo.stock_actual += data.cantidad
    insumo.estado = "CRITICO" if insumo.stock_actual <= insumo.stock_minimo else "NORMAL"
    
    audit = Auditoria(accion="Ingreso Insumo", usuario="Admin", detalle=f"+{data.cantidad} {insumo.unidad_medida} de {insumo.nombre}")
    db.add(audit)
    db.commit()
    db.refresh(insumo)
    return insumo

# ==================== CATEGORIAS Y PRODUCTOS CRUD ====================
@router.get("/categorias")
def list_categorias_admin(db: Session = Depends(get_db)):
    return db.query(Categoria).order_by(Categoria.orden.asc()).all()

@router.post("/categorias")
def create_categoria_admin(data: CategoriaCreate, db: Session = Depends(get_db)):
    nueva = Categoria(
        nombre=data.nombre,
        descripcion=data.descripcion,
        imagen_url=data.imagen_url or "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
        orden=data.orden or 0
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/categorias/{categoria_id}")
def delete_categoria_admin(categoria_id: int, db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(cat)
    db.commit()
    return {"mensaje": "Categoría eliminada"}

@router.get("/productos")
def list_productos_admin(db: Session = Depends(get_db)):
    return db.query(Producto).order_by(Producto.id.desc()).all()

@router.post("/productos")
def create_producto_admin(data: ProductoCreate, db: Session = Depends(get_db)):
    nuevo = Producto(
        nombre=data.nombre,
        descripcion=data.descripcion,
        precio=data.precio,
        precio_promocion=data.precio_promocion,
        categoria_id=data.categoria_id,
        imagen_url=data.imagen_url or "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
        stock=data.stock or 50,
        ingredientes_json=data.ingredientes_json
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.put("/productos/{producto_id}")
def update_producto_admin(producto_id: int, data: ProductoUpdate, db: Session = Depends(get_db)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if data.nombre is not None: p.nombre = data.nombre
    if data.descripcion is not None: p.descripcion = data.descripcion
    if data.precio is not None: p.precio = data.precio
    if data.precio_promocion is not None: p.precio_promocion = data.precio_promocion
    if data.stock is not None: p.stock = data.stock
    if data.imagen_url is not None: p.imagen_url = data.imagen_url
    if data.categoria_id is not None: p.categoria_id = data.categoria_id
    if data.ingredientes_json is not None: p.ingredientes_json = data.ingredientes_json
    if data.activo is not None: p.activo = data.activo

    db.commit()
    db.refresh(p)
    return p

@router.delete("/productos/{producto_id}")
def delete_producto_admin(producto_id: int, db: Session = Depends(get_db)):
    prod = db.query(Producto).filter(Producto.id == producto_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(prod)
    db.commit()
    return {"mensaje": "Producto eliminado"}

# ==================== CONFIGURACIONES GLOBALES (HISTORIA & REDES) ====================
@router.post("/configuraciones")
def update_configuracion_admin(data: ConfiguracionUpdate, db: Session = Depends(get_db)):
    c = db.query(Configuracion).filter(Configuracion.clave == data.clave).first()
    if not c:
        c = Configuracion(clave=data.clave, valor=data.valor)
        db.add(c)
    else:
        c.valor = data.valor
    db.commit()
    return {"clave": data.clave, "valor": data.valor}

# ==================== AUDITORIA & LOGS ====================
@router.get("/auditoria")
def get_auditoria(db: Session = Depends(get_db)):
    return db.query(Auditoria).order_by(Auditoria.fecha.desc()).all()

@router.get("/usuarios")
def list_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.id.desc()).all()
