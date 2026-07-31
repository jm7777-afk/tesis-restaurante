from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class DetallePedido(Base):
    __tablename__ = "detalles_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    personalizaciones = Column(Text, nullable=True) # JSON string of custom options (e.g. extra cheese)
    estado = Column(String(30), default="PENDIENTE") # PENDIENTE, EN_PREPARACION, LISTO
    observaciones = Column(String(255), nullable=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_listo = Column(DateTime, nullable=True)

    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto")
