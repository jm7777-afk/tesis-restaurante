from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class Resena(Base):
    __tablename__ = "resenas"

    id = Column(Integer, primary_key=True, index=True)
    nombre_cliente = Column(String(100), nullable=False)
    comentario = Column(Text, nullable=False)
    estrellas = Column(Integer, default=5)
    foto_url = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
