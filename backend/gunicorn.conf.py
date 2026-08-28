# ============================================================ #
# GUNICORN CONFIGURATION - DONDE DAVID                         #
# ============================================================ #

import multiprocessing
import os

# Directorio de Logs
os.makedirs("logs", exist_ok=True)

# Workers y Rendimiento
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'uvicorn.workers.UvicornWorker'

# Bind
bind = '0.0.0.0:8000'

# Logging
accesslog = 'logs/access.log'
errorlog = 'logs/error.log'
loglevel = 'info'

# Timeouts
timeout = 120
graceful_timeout = 30

# Seguridad
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Preload
preload_app = True

# Opción de Conexiones
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
