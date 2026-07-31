from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class Promocion(Base):
    __tablename__ = "promociones"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descripcion = Column(String(255), nullable=True)
    descuento_pct = Column(Float, default=0.0) # e.g. 20% off
    codigo_cupon = Column(String(50), nullable=True, unique=True)
    banner_url = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True)
    fecha_inicio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_fin = Column(DateTime, nullable=True)
