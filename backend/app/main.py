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
from backend.app.api import auth, cliente, cocina, caja, admin, mesero, setup
from backend.app.api.setup import check_system_installed, LOCK_FILE_PATH
from backend.app.websockets.manager import ws_manager
from backend.scripts.seed_data import seed

# Create DB tables & Seed safely
try:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()
except Exception as e:
    print(f"Aviso en inicio de base de datos: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API para la automatización de pedidos en restaurante con QR, tiempo real y turnos de caja"
)

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
app.include_router(setup.router, prefix=settings.API_V1_STR)
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

# Middleware Guardia de Instalación Única (/setup Guard)
@app.middleware("http")
async def setup_installer_guard_middleware(request: Request, call_next):
    path = request.url.path
    
    # Excluir archivos estáticos css, js, uploads e imágenes, endpoints de API y websockets
    is_static_asset = path.startswith("/static/css") or path.startswith("/static/js") or path.startswith("/static/uploads") or path.startswith("/static/images") or path.startswith("/api/") or path.startswith("/ws") or path == "/health"
    
    if is_static_asset:
        response = await call_next(request)
        if path.startswith("/static/css") or path.startswith("/static/js"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    db = SessionLocal()
    try:
        is_installed = check_system_installed(db)
    finally:
        db.close()

    is_setup_route = path == "/setup" or path.startswith("/static/setup")

    # Si NO está instalado y quiere entrar a cualquier otra página -> Redirigir a /setup
    if not is_installed and not is_setup_route:
        return RedirectResponse(url="/setup")

    # Si YA está instalado e intenta entrar a /setup -> 403 Forbidden
    if is_installed and is_setup_route:
        return JSONResponse(
            status_code=403,
            content={"detail": "Acceso 403 Prohibido: El sistema ya se encuentra instalado. Esta ruta ha sido bloqueada permanentemente."}
        )

    return await call_next(request)

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

@app.get("/setup")
def setup_redirect():
    return RedirectResponse(url="/static/setup/index.html")

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
def readiness_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    finally:
        db.close()
    
    return {
        "status": "ready" if db_status == "connected" else "degraded",
        "database": db_status,
        "app": settings.PROJECT_NAME
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    is_dev = os.getenv("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=is_dev)
