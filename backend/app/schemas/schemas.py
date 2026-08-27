from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: dict

class LoginRequest(BaseModel):
    nombre_usuario: str
    password: str

# User Schemas
class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    email: str
    telefono: Optional[str] = None
    nombre_usuario: str
    rol: str
    activo: Optional[bool] = True

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioOut(UsuarioBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Categoria Schemas
class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    orden: Optional[int] = 0
    activo: Optional[bool] = True

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Producto Schemas
class ProductoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    precio_promocion: Optional[float] = None
    stock: Optional[int] = 50
    stock_minimo: Optional[int] = 5
    imagen_url: Optional[str] = None
    tiempo_preparacion: Optional[int] = 15
    personalizable: Optional[bool] = True
    ingredientes_json: Optional[str] = None
    activo: Optional[bool] = True
    categoria_id: int

class ProductoCreate(ProductoBase):
    pass

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

class ProductoOut(ProductoBase):
    id: int
    categoria: Optional[CategoriaOut] = None

    class Config:
        from_attributes = True

# Promocion Schemas
class PromocionCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    descuento_pct: Optional[float] = 0.0
    codigo_cupon: Optional[str] = None
    banner_url: Optional[str] = None
    activo: Optional[bool] = True

class PromocionOut(PromocionCreate):
    id: int

    class Config:
        from_attributes = True

# Resena Schemas
class ResenaCreate(BaseModel):
    nombre_cliente: str
    comentario: str
    estrellas: Optional[int] = 5
    foto_url: Optional[str] = None

class ResenaOut(ResenaCreate):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Publicacion Schemas
class PublicacionCreate(BaseModel):
    titulo: str
    contenido: str
    imagen_url: Optional[str] = None
    autor: Optional[str] = "Donde David"
    activo: Optional[bool] = True

class PublicacionOut(PublicacionCreate):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Cambiar Mesa Request
class CambiarMesaRequest(BaseModel):
    nueva_mesa: int

# OTP Verify Request
class OTPVerifyRequest(BaseModel):
    pedido_id: int
    codigo_otp: str

# Detalle Pedido Schemas
class DetallePedidoItem(BaseModel):
    producto_id: int
    cantidad: int
    personalizaciones: Optional[dict] = None
    observaciones: Optional[str] = None

class DetallePedidoOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    personalizaciones: Optional[str] = None
    estado: str
    observaciones: Optional[str] = None
    producto: Optional[ProductoOut] = None

    class Config:
        from_attributes = True

# Pedido Schemas
class PedidoCreate(BaseModel):
    numero_mesa: str
    codigo_qr: Optional[str] = None
    tipo: Optional[str] = "mesa" # mesa, llevar, delivery
    modo_pago: Optional[str] = "PAGAR_ANTES" # PAGAR_ANTES, PAGAR_DESPUES
    observaciones: Optional[str] = None
    nombre_cliente_delivery: Optional[str] = None
    telefono_delivery: Optional[str] = None
    direccion_delivery: Optional[str] = None
    detalles: List[DetallePedidoItem]

class PedidoOut(BaseModel):
    id: int
    numero_mesa: str
    codigo_qr: Optional[str] = None
    tipo: str
    modo_pago: Optional[str] = "PAGAR_ANTES"
    estado: str
    subtotal: float
    impuesto: float
    costo_empaque: Optional[float] = 0.0
    descuento: float
    total: float
    observaciones: Optional[str] = None
    nombre_cliente_delivery: Optional[str] = None
    telefono_delivery: Optional[str] = None
    direccion_delivery: Optional[str] = None
    codigo_otp: Optional[str] = None
    otp_verificado: Optional[bool] = False
    fecha_creacion: Optional[datetime] = None
    metodo_pago: Optional[str] = None
    monto_recibido: Optional[float] = None
    cambio: Optional[float] = None
    factura_numero: Optional[str] = None
    nit_cliente: Optional[str] = None
    nombre_factura: Optional[str] = None
    detalles: List[DetallePedidoOut] = []

    class Config:
        from_attributes = True

# Payment Request Schema
class CobrarPedidoRequest(BaseModel):
    metodo_pago: str # Efectivo, Tarjeta, QR, Pago Móvil
    monto_recibido: float
    nit_cliente: Optional[str] = "CF"
    nombre_factura: Optional[str] = "Consumidor Final"

# Turno Schemas
class TurnoApertura(BaseModel):
    monto_apertura: float

class TurnoCierre(BaseModel):
    monto_cierre: float

class TurnoOut(BaseModel):
    id: int
    numero_turno: int
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    monto_apertura: float
    monto_cierre: Optional[float] = None
    total_ventas: float
    total_pedidos: int
    efectivo_declarado: Optional[float] = None
    diferencia: Optional[float] = None
    activo: bool
    usuario_caja_id: int

    class Config:
        from_attributes = True
