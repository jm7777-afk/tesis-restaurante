from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class GuiaItem(Base):
    __tablename__ = "guia_items"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    media_url = Column(String(500), nullable=False)
    tipo_media = Column(String(20), default="imagen") # imagen, video
    tipo_vista = Column(String(30), default="ambos") # mesa, delivery, ambos
    orden = Column(Integer, default=1)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
