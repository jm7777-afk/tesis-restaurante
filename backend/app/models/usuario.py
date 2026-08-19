from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from datetime import datetime, timezone
from backend.app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    nombre_usuario = Column(String(50), unique=True, index=True, nullable=False)
    contraseña_hash = Column(String(255), nullable=False)
    rol = Column(String(30), nullable=False, default="cliente") # admin, supervisor, caja, cocina, cliente, mesero
    puntos_fidelidad = Column(Integer, default=280)
    pedidos_count = Column(Integer, default=6)
    total_gastado = Column(Float, default=345.0)
    direccion_default = Column(String(255), default="Av. Reforma 12-34, Zona 9")
    tour_completed = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
