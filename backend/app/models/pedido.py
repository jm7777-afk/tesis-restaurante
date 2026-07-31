from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    numero_mesa = Column(String(50), nullable=False) # e.g. "Mesa 5" or "Delivery #105"
    codigo_qr = Column(String(100), nullable=True)
    tipo = Column(String(30), default="mesa") # mesa, llevar, delivery
    modo_pago = Column(String(30), default="PAGAR_ANTES") # PAGAR_ANTES, PAGAR_DESPUES (Cuenta Abierta)
    estado = Column(String(30), default="PENDIENTE") # PENDIENTE, EN_PREPARACION, LISTO, COBRADO, ENTREGADO, CANCELADO
    subtotal = Column(Float, nullable=False)
    impuesto = Column(Float, nullable=False) # 16% IVA
    costo_empaque = Column(Float, default=0.0)
    descuento = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    observaciones = Column(Text, nullable=True)
    
    # Campos exclusivos para Delivery & OTP
    nombre_cliente_delivery = Column(String(150), nullable=True)
    telefono_delivery = Column(String(50), nullable=True)
    direccion_delivery = Column(Text, nullable=True)
    codigo_otp = Column(String(10), nullable=True)
    otp_verificado = Column(Boolean, default=False)
    
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_entrega = Column(DateTime, nullable=True)
    metodo_pago = Column(String(50), nullable=True) # Efectivo, Tarjeta, QR, Puntos
    monto_recibido = Column(Float, nullable=True)
    cambio = Column(Float, nullable=True)
    factura_numero = Column(String(50), nullable=True)
    nit_cliente = Column(String(50), default="CF")
    nombre_factura = Column(String(100), default="Consumidor Final")
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    turno_id = Column(Integer, ForeignKey("turnos.id"), nullable=True)

    detalles = relationship("DetallePedido", back_populates="pedido", cascade="all, delete-orphan")
    usuario = relationship("Usuario")
    turno = relationship("Turno")
