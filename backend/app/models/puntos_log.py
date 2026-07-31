from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class PuntosLog(Base):
    __tablename__ = "puntos_log"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    puntos = Column(Integer, nullable=False) # e.g. +100 or -30
    concepto = Column(String(200), nullable=False) # e.g. "Pedido #1087", "Canje de recompensa"
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=True)
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(Integer, primary_key=True, index=True)
    accion = Column(String(100), nullable=False)
    usuario = Column(String(100), nullable=False)
    detalle = Column(String(255), nullable=True)
    fecha = Column(DateTime, default=lambda: datetime.now(timezone.utc))
