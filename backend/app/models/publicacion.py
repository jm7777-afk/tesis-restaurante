from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class Publicacion(Base):
    __tablename__ = "publicaciones"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    contenido = Column(Text, nullable=False)
    imagen_url = Column(String(500), nullable=True)
    autor = Column(String(100), default="Donde David")
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
