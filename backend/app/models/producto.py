from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(500), nullable=True)
    precio = Column(Numeric(12, 2), nullable=False, default=0.00)
    precio_promocion = Column(Numeric(12, 2), nullable=True)
    stock = Column(Integer, default=50)
    stock_minimo = Column(Integer, default=5)
    imagen_url = Column(String(500), nullable=True)
    tiempo_preparacion = Column(Integer, default=15)
    personalizable = Column(Boolean, default=True)
    ingredientes_json = Column(Text, nullable=True) # JSON list of customizable ingredients & extras
    activo = Column(Boolean, default=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)

    categoria = relationship("Categoria", backref="productos")
