from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id = Column(Integer, primary_key=True, index=True)
    insumo_id = Column(Integer, ForeignKey("insumos.id"), nullable=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True)
    tipo_movimiento = Column(String(30), nullable=False) # ENTRADA, VENTA, AJUSTE, MERMA, DEVOLUCION
    cantidad_cambio = Column(Numeric(12, 2), nullable=False)
    cantidad_anterior = Column(Numeric(12, 2), nullable=False)
    cantidad_nueva = Column(Numeric(12, 2), nullable=False)
    motivo = Column(String(255), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    insumo = relationship("Insumo")
    producto = relationship("Producto")
    usuario = relationship("Usuario")
