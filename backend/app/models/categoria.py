from sqlalchemy import Column, Integer, String, Boolean
from backend.app.core.database import Base

class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    descripcion = Column(String(300), nullable=True)
    imagen_url = Column(String(500), nullable=True)
    orden = Column(Integer, default=0)
    activo = Column(Boolean, default=True)