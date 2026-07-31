from sqlalchemy import Column, Integer, String, Text
from backend.app.core.database import Base

class Configuracion(Base):
    __tablename__ = "configuraciones"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, index=True, nullable=False)
    valor = Column(Text, nullable=False)
    descripcion = Column(String(255), nullable=True)
