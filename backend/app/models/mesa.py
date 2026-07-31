from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class Mesa(Base):
    __tablename__ = "mesas"

    id = Column(Integer, primary_key=True, index=True)
    numero_mesa = Column(Integer, unique=True, nullable=False) # 1 to N
    estado = Column(String(30), default="LIBRE") # LIBRE, OCUPADA, RESERVADA
    codigo_qr = Column(String(200), nullable=True)
    capacidad = Column(Integer, default=4)
    cliente_actual = Column(String(100), nullable=True)
    tiempo_ocupacion_min = Column(Integer, default=0)
    pedido_activo_id = Column(Integer, ForeignKey("pedidos.id"), nullable=True)
    subtotal_acumulado = Column(Float, default=0.0)
    fecha_actualizacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
