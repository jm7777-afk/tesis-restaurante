from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Turno(Base):
    __tablename__ = "turnos"

    id = Column(Integer, primary_key=True, index=True)
    numero_turno = Column(Integer, nullable=False, unique=True)
    fecha_apertura = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_apertura = Column(Numeric(12, 2), default=0.00, nullable=False)
    monto_cierre = Column(Numeric(12, 2), nullable=True)
    total_ventas = Column(Numeric(12, 2), default=0.00)
    total_pedidos = Column(Integer, default=0)
    efectivo_declarado = Column(Numeric(12, 2), nullable=True)
    diferencia = Column(Numeric(12, 2), nullable=True)
    activo = Column(Boolean, default=True)
    usuario_caja_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    usuario_caja = relationship("Usuario")
