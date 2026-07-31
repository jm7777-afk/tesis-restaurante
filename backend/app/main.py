import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api import auth, cliente, cocina, caja, admin, mesero
from backend.app.websockets.manager import ws_manager
from backend.scripts.seed_data import seed

# Create DB tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
seed()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API para la automatización de pedidos en restaurante con QR, tiempo real y turnos de caja"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
