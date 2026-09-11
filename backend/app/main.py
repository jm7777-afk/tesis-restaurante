import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import RedirectResponse, Response, JSONResponse
import uvicorn

from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.api import auth, cliente, cocina, caja, admin, mesero
from backend.app.websockets.manager import ws_manager

# Safe DB initialization on startup without destructive drop_all or blocking seeding
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Aviso en inicio de base de datos: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API para la automatización de pedidos en restaurante con QR, tiempo real y turnos de caja",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="DONDE DAVID RESTAURANT API",
        version=settings.VERSION,
        description="Sistema de Automatización de Pedidos para Restaurantes con QR, KDS, Caja POS y Delivery",
        routes=app.routes,
        contact={"name": "Javier Mendoza", "email": "javier@donde-david.com"},
        license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"}
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# GZip Middleware para compresión ultrarrápida de respuestas HTTP
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Middleware configurado dinámicamente según entorno
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True if settings.ALLOWED_ORIGINS_LIST != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cliente.router, prefix=settings.API_V1_STR)
app.include_router(cocina.router, prefix=settings.API_V1_STR)
app.include_router(caja.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(mesero.router, prefix=settings.API_V1_STR)

# Global Exception Handler para capturar errores no controlados
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno en el servidor: {str(exc)}"}
    )

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Mount static files
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../static"))
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/login")
def login_redirect():
    return RedirectResponse(url="/static/login.html")

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION, "environment": settings.ENVIRONMENT}

@app.get("/ready")
def readiness_check(response: Response):
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    finally:
        db.close()
    
    is_ready = db_status == "connected"
    if not is_ready:
        response.status_code = 503
        
    return {
        "status": "ready" if is_ready else "degraded",
        "database": db_status,
        "app": settings.PROJECT_NAME
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    is_dev = settings.ENVIRONMENT.lower() == "development"
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=is_dev)
