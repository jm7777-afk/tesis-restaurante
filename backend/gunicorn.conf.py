# ============================================================ #
# GUNICORN CONFIGURATION - DONDE DAVID                         #
# ============================================================ #

import multiprocessing
import os

# Directorio de Logs
os.makedirs("logs", exist_ok=True)

# Port dinámico para Render / Heroku / Docker
port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Workers y Rendimiento
workers = int(os.getenv("WEB_CONCURRENCY", min(multiprocessing.cpu_count() * 2 + 1, 4)))
worker_class = 'uvicorn.workers.UvicornWorker'

# Logging
accesslog = 'logs/access.log'
errorlog = 'logs/error.log'
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Timeouts
timeout = 120
graceful_timeout = 30

# Seguridad
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Preload (Desactivado en producción para evitar colisiones durante startup)
preload_app = False

# Opción de Conexiones
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
