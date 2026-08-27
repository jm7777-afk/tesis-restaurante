from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Carrito(Base):
    __tablename__ = "carritos"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    items = Column(JSON, nullable=False, default=[])
    total_usd = Column(Numeric(12, 2), default=0.00)
    total_bs = Column(Numeric(12, 2), default=0.00)
    fecha_actualizacion = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    usuario = relationship("Usuario")
