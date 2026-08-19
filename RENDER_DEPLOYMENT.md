# Guía de Despliegue en Render — DONDE DAVID Enterprise

Guía técnica y lista de comprobación para el despliegue automático del proyecto **`tesis-restaurante`** en la plataforma **Render (Render Web Services)**.

---

## ⚙️ 1. VARIABLES DE ENTORNO EN RENDER

Configurar las siguientes variables en el panel de **Environment** de Render:

| VARIABLE | VALOR RECOMENDADO | PROPÓSITO |
|---|---|---|
| `ENVIRONMENT` | `production` | Activa modo producción y desactiva reloaders |
| `SECRET_KEY` | `donde_david_super_secret_jwt_key_2026_tesis_restaurante` | Firma segura de tokens JWT |
| `DATABASE_URL` | `sqlite:///./restaurante.db` (o PostgreSQL URL) | Conexión ORM a Base de Datos |
| `ALLOWED_ORIGINS` | `https://tesis-restaurante.onrender.com` | Dominios autorizados CORS |
| `PORT` | Asignado automáticamente por Render (`$PORT`) | Puerto dinámico de enlace HTTP |

---

## 🚀 2. CONFIGURACIÓN DEL SERVICIO WEBSERVICE (FastAPI)

- **Name**: `tesis-restaurante`
- **Environment**: `Python 3`
- **Build Command**:
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  gunicorn backend.app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
  ```
  *(Alternativa directa)*:
  ```bash
  python backend/app/main.py
  ```
- **Health Check Path**: `/health`

---

## 🩺 3. MONITOREO Y ENDPOINTS DE DIAGNÓSTICO

1. **`/health`**: Retorna `{"status": "ok", "app": "Donde David Restaurant Management System", "version": "2.0.0", "environment": "production"}`.
2. **`/ready`**: Consulta activamente `SELECT 1` a la base de datos para asegurar disponibilidad antes de dirigir tráfico de usuarios.

---

## 🛡️ 4. SEGURIDAD Y ARCHIVOS ESTÁTICOS

- **Imágenes y Fuentes**: Rutas relativas `/static/...` sin hardcoding de carpetas locales `C:\Users\...`.
- **Invalidación de Caché**: Servidor responde con cabeceras `Cache-Control: no-cache, no-store` para recursos `.css` y `.js`.
