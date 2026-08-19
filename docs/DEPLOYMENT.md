# 🚀 DEPLOYMENT.md — Guía de Despliegue en Producción (Render / Cloud / VPS)

Este documento detalla el procedimiento de empaquetado, variables de entorno y despliegue del sistema **DONDE DAVID**.

---

## 📄 1. Especificación de `render.yaml`

```yaml
services:
  - type: web
    name: donde-david-app
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
      - key: ALLOWED_ORIGINS
        value: "*"
```

---

## 🔑 2. Variables de Entorno Requeridas (`.env`)

```env
PROJECT_NAME="DONDE DAVID - FRESH & TASTY!"
VERSION="2.0.0"
ENVIRONMENT="production"
SECRET_KEY="SU_CLAVE_SECRETA_JWT_SUPER_SEGURA"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Base de datos (SQLite local o MySQL remoto)
DATABASE_URL="sqlite:///./tesis_restaurante.db"

ALLOWED_ORIGINS="*"
PORT=8000
```

---

## 🛠️ 3. Pasos de Despliegue Local / VPS Linux

1. **Clonar repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/donde-david.git
   cd donde-david
   ```

2. **Crear entorno virtual e instalar dependencias**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Ejecutar servidor con Uvicorn**:
   ```bash
   python -m backend.app.main
   ```
