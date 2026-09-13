from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.api import auth, cliente, cocina, caja, admin, mesero

api_router = APIRouter()

# Inclusión aislada de sub-routers por dominio
api_router.include_router(auth.router, prefix=settings.API_V1_STR)
api_router.include_router(cliente.router, prefix=settings.API_V1_STR)
api_router.include_router(cocina.router, prefix=settings.API_V1_STR)
api_router.include_router(caja.router, prefix=settings.API_V1_STR)
api_router.include_router(admin.router, prefix=settings.API_V1_STR)
api_router.include_router(mesero.router, prefix=settings.API_V1_STR)
