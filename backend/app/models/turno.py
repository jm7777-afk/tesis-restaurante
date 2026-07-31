from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Turno(Base):
    __tablename__ = "turnos"

    id = Column(Integer, primary_key=True, index=True)
    numero_turno = Column(Integer, nullable=False, unique=True)
    fecha_apertura = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_apertura = Column(Float, default=0.0, nullable=False)
    monto_cierre = Column(Float, nullable=True)
    total_ventas = Column(Float, default=0.0)
    total_pedidos = Column(Integer, default=0)
    activo = Column(Boolean, default=True)
    usuario_caja_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    usuario_caja = relationship("Usuario")
