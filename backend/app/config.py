import os
from dotenv import load_dotenv
from typing import List

# Cargar variables de entorno desde .env o .env.production
env_file = ".env.production" if os.path.exists(".env.production") else ".env"
load_dotenv(env_file)

class Config:
    """Configuración centralizada de la aplicación Donde David"""
    
    # ENTORNO
    ENV = os.getenv('ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    API_VERSION = os.getenv('API_VERSION', 'v1')
    
    # BASE DE DATOS
    DATABASE_URL = os.getenv('DATABASE_URL') 
    #'sqlite:///./restaurante.db')
    
    # SEGURIDAD
    SECRET_KEY = os.getenv('SECRET_KEY', 'donde_david_super_secret_jwt_key_2026_tesis_restaurante')
    ALGORITHM = os.getenv('ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 60))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 7))
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',')
    
    # URLs
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8000')
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
    
    # NEGOCIO Y FISCAL
    TASA_CAMBIO_DEFAULT = float(os.getenv('TASA_CAMBIO_DEFAULT', 42.50))
    IVA_PORCENTAJE = float(os.getenv('IVA_PORCENTAJE', 16.00))
    TIEMPO_PREPARACION_BASE = int(os.getenv('TIEMPO_PREPARACION_BASE', 15))
    
    # LOGGING
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/app.log')
    
    # EMAIL
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    
    # ARCHIVOS
    STATIC_DIR = os.getenv('STATIC_DIR', 'static')
    UPLOAD_DIR = os.getenv('UPLOAD_DIR', 'static/uploads')
    MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', 5 * 1024 * 1024))
    
    # WEBSOCKETS
    WS_PING_INTERVAL = int(os.getenv('WS_PING_INTERVAL', 20))
    
    # PAGINACIÓN
    PAGINACION_POR_DEFECTO = int(os.getenv('PAGINACION_POR_DEFECTO', 20))

config = Config()
