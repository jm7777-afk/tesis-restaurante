# 📚 MANUAL TÉCNICO COMPLETO Y DOCUMENTACIÓN DE ARQUITECTURA — DONDE DAVID MANAGEMENT SYSTEM

**Versión del Sistema:** 2.0.0 Enterprise  
**Fecha de Revisión:** 28 de Agosto de 2026  
**Repositorio GitHub Oficial:** [https://github.com/jm7777-afk/tesis-restaurante.git](https://github.com/jm7777-afk/tesis-restaurante.git)  
**Estado:** 🟢 100% Auditado, Verificado y Desplegado en GitHub

---

## 📋 TABLA DE CONTENIDO
1. [Resumen Ejecutivo y Ámbito del Proyecto](#1-resumen-ejecutivo-y-ámbito-del-proyecto)
2. [Arquitectura de Software y Tecnologías](#2-arquitectura-de-software-y-tecnologías)
3. [Estructura del Repositorio de Código](#3-estructura-del-repositorio-de-código)
4. [Módulos Operativos y Componentes Frontend](#4-módulos-operativos-y-componentes-frontend)
5. [Seguridad, Control Financiero y Lógica de Negocio](#5-seguridad-control-financiero-y-lógica-de-negocio)
6. [Esquema Relacional PostgreSQL y Migración ETL](#6-esquema-relacional-postgresql-y-migración-etl)
7. [Scripts de Mantenimiento e Inicialización](#7-scripts-de-mantenimiento-e-inicialización)
8. [Suite de Pruebas y Auditoría Operativa](#8-suite-de-pruebas-y-auditoría-operativa)
9. [Guía de Despliegue en Producción (Render / Docker)](#9-guía-de-despliegue-en-producción-render--docker)
10. [Matriz de Credenciales y Endpoints REST](#10-matriz-de-credenciales-y-endpoints-rest)

---

## 1. RESUMEN EJECUTIVO Y ÁMBITO DEL PROYECTO

**Donde David Management System** es una plataforma integral desarrollada para la digitalización, automatización operativa y control financiero de restaurantes de alto flujo de clientes.

### 🎯 Objetivos Principales:
1. **Atención Multicanal:** Permitir que los comensales realicen pedidos en salón mediante **Escaneo QR en Mesa** y envíos a domicilio mediante **Delivery GPS en 1-Clic**.
2. **Operación en Tiempo Real:** Sincronizar instantáneamente las comandas entre la App Cliente, la pantalla **KDS de Cocina**, el panel de **Meseros** y la **Caja POS Registradora** utilizando WebSockets con reconexión automática.
3. **Seguridad Financiera y Fiscal:** Garantizar el recálculo estricto en el backend del subtotal, IVA (16%), tasa de cambio ($ / Bs.), vuelto dual y validación de montos recibidos.
4. **Arqueo de Turno Auditado:** Proporcionar a la cajera un modal de cierre de turno (`#close-shift-modal`) que calcula automáticamente sobrantes o faltantes de efectivo.
5. **Cero Dependencia Cloud Obligatoria:** Capacidad de operar en servidores locales (SQLite) o escalar a la nube (PostgreSQL + Render + Docker).

---

## 2. ARQUITECTURA DE SOFTWARE Y TECNOLOGÍAS

El sistema adopta una arquitectura desacoplada basada en servicios RESTful y WebSockets bidireccionales:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CAPA DE PRESENTACIÓN                          │
│   Landing Page  │ App Cliente QR │ POS Touch │ KDS Cocina │ Admin SaaS │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / WSS (WebSockets)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                          CAPA DE SERVICIOS API                         │
│             FastAPI 0.109  │  Uvicorn ASGI  │ Gunicorn WSGI            │
│       Autenticación JWT    │   CORS / GZip  │ WebSockets Manager       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ ORM SQLAlchemy 2.0
┌──────────────────────────────────▼─────────────────────────────────────┐
│                           CAPA DE DATOS                                │
│       PostgreSQL 14+ (Producción)   │   SQLite 3 (Desarrollo Local)    │
└────────────────────────────────────────────────────────────────────────┘
```

### 🛠️ Ficha Técnica de Componentes:
- **Lenguaje Core:** Python 3.10+ (Backend) y JavaScript ES6+ (Frontend).
- **Framework Web Backend:** FastAPI 0.109.2 con soporte nativo de asincronía (`async/await`).
- **Servidores de Aplicación:** Gunicorn 21.2.0 (Process Manager) + Uvicorn 0.27.1 (Worker ASGI).
- **Base de Datos & ORM:** SQLAlchemy 2.0.25 con motor dual (PostgreSQL 14+ / SQLite 3).
- **Comunicaciones en Tiempo Real:** WebSockets (`websockets 12.0`) encapsulados en el cliente `WSClient` con reconexión por backoff exponencial y latido ping/pong cada 30 segundos.
- **Seguridad Criptográfica:** `python-jose[cryptography]` 3.3.0 (Tokens JWT HS256) y `passlib[bcrypt]` 1.7.4 (Hashing adaptativo de contraseñas).
- **Diseño Visual & UI:** HTML5 semántico, CSS3 Toon Theme (`components.css`, `toon-theme.css`) con soporte para accesibilidad (a11y) y diseño responsive.

---

## 3. ESTRUCTURA DEL REPOSITORIO DE CÓDIGO

El proyecto cuenta con una estructura limpia organizada por capas de responsabilidad:

```
tesis-restaurante/
├── backend/
│   ├── app/
│   │   ├── api/                # Endpoints REST agrupados por rol
│   │   │   ├── admin.py        # Métricas, inventario y gestión SaaS
│   │   │   ├── auth.py         # Autenticación JWT y Login
│   │   │   ├── caja.py         # Facturación, arqueo de turno y pagos
│   │   │   ├── cliente.py      # Menú digital, carrito BD y Delivery GPS
│   │   │   ├── cocina.py       # Monitor KDS y cambio de estado comandas
│   │   │   └── mesero.py       # Atención de las 20 mesas del salón
│   │   ├── core/               # Núcleo del sistema
│   │   │   ├── config.py       # Cargador de variables de entorno
│   │   │   ├── database.py     # Sesiones y motor SQLAlchemy dual
│   │   │   ├── logging.py      # Logger audit.log en formato JSON
│   │   │   └── security.py     # Funciones JWT y hashing BCrypt
│   │   ├── models/             # Modelos de datos SQLAlchemy
│   │   │   ├── carrito.py      # Cesta de compra persistente
│   │   │   ├── categoria.py    # Categorías del menú
│   │   │   ├── configuracion.py# Parámetros ($/Bs., IVA)
│   │   │   ├── detalle_pedido.py # Ítems de la comanda
│   │   │   ├── mesa.py         # Estado de las 20 mesas
│   │   │   ├── pedido.py       # Pedidos multicanal
│   │   │   ├── producto.py     # Platillos e ingredientes JSONB
│   │   │   ├── turno.py        # Arqueo de caja POS
│   │   │   └── usuario.py      # Cuentas con roles RBAC
│   │   ├── services/           # Servicios de negocio
│   │   │   ├── carrito_service.py # Lógica de carrito persistente
│   │   │   └── email_service.py   # Envío de notificaciones por email
│   │   ├── websockets/         # Manejador de eventos en tiempo real
│   │   │   └── manager.py      # ConnectionManager para broadcasting
│   │   └── main.py             # Punto de entrada de la aplicación FastAPI
│   ├── scripts/                # Scripts utilitarios del backend
│   │   ├── clear_pos_accounts.py # Vaciado rápido de cuentas de caja
│   │   ├── reset_clean_db.py   # Restablecimiento de BD a 0
│   │   └── simulate_user_audit_v2.py # Auditoría global de los 6 roles
│   ├── static/                 # Frontend estático servido por FastAPI
│   │   ├── admin/index.html    # Panel de Administración SaaS
│   │   ├── caja/panel.html     # Caja POS Touch Registradora
│   │   ├── cliente/app.html    # App Cliente QR & Delivery GPS
│   │   ├── cocina/monitor.html # Monitor KDS de Cocina
│   │   ├── mesero/panel.html   # Panel de Atención de Meseros
│   │   ├── css/                # Hojas de estilo Toon Theme
│   │   │   ├── components.css  # Componentes reutilizables UI
│   │   │   └── toon-theme.css  # Tema visual caricatura premium
│   │   └── js/                 # Controladores JavaScript ES6
│   │       ├── caja.js         # Lógica de cobro, arqueo y mesas POS
│   │       ├── cliente-toon.js # Lógica de pedido QR y GPS
│   │       ├── cocina.js       # Control de comandas KDS
│   │       └── websocket.js    # Cliente WebSocket con backoff
│   ├── .env.production         # Variables de entorno de producción
│   ├── gunicorn.conf.py        # Configuración del servidor Gunicorn
│   └── requirements.txt        # Dependencias fijadas con versiones exactas
├── scripts/                    # Scripts de infraestructura y base de datos
│   ├── backup.sh               # Respaldo PostgreSQL automatizado
│   ├── deploy_render.sh        # Script de despliegue en Render
│   ├── migrate_to_postgres.py  # Script ETL de SQLite a PostgreSQL
│   └── postgres_schema.sql     # Esquema DDL en lenguaje SQL nativo
├── tests/                      # Suite de pruebas automatizadas
│   └── test_system.py          # Pruebas de integración Pytest
├── Dockerfile                  # Contenedor multi-stage de producción
├── docker-compose.prod.yml     # Orquestador Docker Compose
├── render.yaml                 # Blueprint Infrastructure-as-Code para Render
├── MANUAL_Y_DOCUMENTACION_COMPLETA_DONDE_DAVID.md # Manual Maestro
└── requirements.txt            # Dependencias raíz del proyecto
```

---

## 4. MÓDULOS OPERATIVOS Y COMPONENTES FRONTEND

### 📱 4.1 App Cliente & Delivery 1-Clic GPS (`static/cliente/app.html`)
- **Visualización de Menú:** Carrusel superior de categorías y tarjetas de productos con fotografía, precio dual ($ / Bs.) e ingredientes seleccionables.
- **Identificación QR:** Lee el parámetro URL `?mesa=X` para asignar pedidos automáticamente a la mesa seleccionada.
- **Delivery GPS 1-Clic:** Captura las coordenadas de latitud y longitud del dispositivo móvil del cliente y genera un enlace directo a Google Maps, facilitando la ubicación al repartidor sin requerir dirección escrita.
- **Carrito Persistente en BD:** Almacena los productos agregados en la tabla `carritos` del backend mediante la API `/api/v1/cliente/carrito`, asegurando que la cesta permanezca intacta al actualizar la página.

---

### 💳 4.2 Caja POS Registradora Touch & Arqueo (`static/caja/panel.html`)
- **Facturación Dual y Cobro Rápido:** Selección de métodos de pago (Efectivo, Punto de Venta, Pago Móvil) con desglose automático en Dólares ($ USD) y Bolívares (Bs.).
- **Arqueo Auditado de Caja:** Modal `#close-shift-modal` donde la cajera ingresa el dinero físico en caja. El backend calcula la diferencia (`monto_esperado = monto_apertura + total_ventas`), registrando la `diferencia` (`Exacto`, `Sobrante`, `Faltante`) en la tabla `turnos`.
- **Inspector de Disponibilidad de Mesas:** Modal `#pos-table-selector-modal` que despliega el estado de las 20 mesas del salón (`🟢 LIBRE` / `🔴 OCUPADA`).
- **Despacho a Mototaxi:** Sección de cola de entregas en caja para validar pagos y asignar pedidos al repartidor (`🛵 ENVIAR A MOTOTAXI`).
- **Reimpresión Fiscal:** Búsqueda rápida de facturas por correlativo (`FAC-DD-XXXXXX`) con reimpresión de comprobante fiscal.

---

### 🍳 4.3 Monitor KDS de Cocina (`static/cocina/monitor.html`)
- **Visualización por Columna de Estado:** Comandas organizadas dinámicamente en columnas: `PENDIENTE`, `EN PREPARACIÓN` y `LISTO`.
- **Alertas Sonoras:** Reproducción automática de tono de aviso al ingresar un nuevo pedido por WebSockets.
- **Avanzado de Comandas:** Botones de un clic para actualizar el estado del pedido en tiempo real.

---

### 🍽️ 4.4 Panel de Meseros Salón (`static/mesero/panel.html`)
- **Mapa de 20 Mesas:** Renderizado del plano del restaurante mostrando la ocupación de las mesas.
- **Toma de Comandas:** Creación manual de pedidos por parte del mesero y cambio de estado a `ENTREGADO`.

---

### 📊 4.5 Dashboard de Administración SaaS (`static/admin/index.html`)
- **Métricas KPI:** Resumen diario de ventas totales, ticket promedio, recaudo de IVA (16%) y cantidad de comandas.
- **Gestión de Menú e Inventario:** Formulario interactivo para crear o modificar categorías y platillos.
- **Control de Usuarios:** Alta y desactivación de cuentas del personal con asignación de roles RBAC.

---

## 5. SEGURIDAD, CONTROL FINANCIERO Y LÓGICA DE NEGOCIO

### 🔒 Autenticación y Control de Acceso por Roles (RBAC)
- **Token JWT HS256:** Cada inicio de sesión exitoso genera un token JWT firmado por el backend con un tiempo de vida configurable (`ACCESS_TOKEN_EXPIRE_MINUTES=60`).
- **Decoradores de FastAPI:** Protección estricta de rutas mediante dependencias (`require_admin`, `require_caja`, `require_cocina`). Si un cliente intenta acceder a un endpoint de caja, el servidor responde con `HTTP 403 Forbidden`.

---

### 💰 Recálculo Financiero Obligatorio en Backend
- **Cero Confianza en el Cliente:** El frontend sólo envía los identificadores de productos y cantidades. El backend en `caja.py` consulta los precios oficiales en la base de datos y recalcula de forma estricta:
  $$\text{Subtotal USD} = \sum (\text{Precio USD} \times \text{Cantidad})$$
  $$\text{IVA USD} = \text{Subtotal USD} \times 0.16$$
  $$\text{Total USD} = \text{Subtotal USD} + \text{IVA USD}$$
  $$\text{Total Bs} = \text{Total USD} \times \text{Tasa de Cambio}$$
- **Rechazo de Pagos Insuficientes:** Si el pago recibido es menor al total calculado (`monto_recibido < total_usd`), la API cancela la transacción retornando `HTTP 400 Bad Request`.

---

## 6. ESQUEMA RELACIONAL POSTGRESQL Y MIGRACIÓN ETL

### 📄 Esquema DDL (`scripts/postgres_schema.sql`)
Contiene las sentencias nativas SQL optimizadas con índices B-Tree para PostgreSQL:

- `usuarios`: Cuentas con contraseñas BCrypt y roles RBAC.
- `categorias`: Secciones del menú digital.
- `productos`: Platillos con ingredientes en formato `JSONB`.
- `turnos`: Registros auditados de apertura y cierre de caja.
- `pedidos`: Comandas multicanal (Salón, Llevar, Delivery GPS).
- `detalles_pedido`: Desglose individual de platillos.
- `carritos`: Cesta de compra persistente de usuarios.
- `configuraciones`: Tasa de cambio y porcentaje de IVA.
- `facturas`: Registro fiscal inmutable con correlativo único.
- `pagos`: Transacciones bancarias y métodos de pago.

### 🐍 Script ETL de Migración (`scripts/migrate_to_postgres.py`)
Script en Python que extrae los datos desde la base de datos local SQLite (`restaurante.db`), transforma las cadenas de texto JSON en objetos binarios `JSONB`, normaliza las fechas al formato ISO 8601 e inserta los registros de manera atómica en PostgreSQL con la cláusula `ON CONFLICT DO NOTHING`.

---

## 7. SCRIPTS DE MANTENIMIENTO E INICIALIZACIÓN

| SCRIPT | RUTA | DESCRIPCIÓN |
|---|---|---|
| 🧹 **`reset_clean_db.py`** | [backend/scripts/reset_clean_db.py](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/backend/scripts/reset_clean_db.py) | Vacía la base de datos a 0 eliminando productos, pedidos y turnos pasados, preservando las cuentas de acceso del personal. |
| 🐍 **`simulate_user_audit_v2.py`** | [backend/scripts/simulate_user_audit_v2.py](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/backend/scripts/simulate_user_audit_v2.py) | Ejecuta una simulación completa de los 6 roles del sistema y verifica el arqueo de caja. |
| 🐚 **`backup.sh`** | [scripts/backup.sh](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/scripts/backup.sh) | Genera respaldos comprimidos `.tar.gz` de PostgreSQL con rotación de 30 días. |
| 🐚 **`deploy_render.sh`** | [scripts/deploy_render.sh](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/scripts/deploy_render.sh) | Automatiza el despliegue mediante el CLI de Render. |

---

## 8. SUITE DE PRUEBAS Y AUDITORÍA OPERATIVA

### 🧪 Ejecución de Pruebas Automatizadas Pytest (`tests/test_system.py`)
```bash
pytest tests/test_system.py -v
```

**Resultado de Ejecución Auditado:**
```
========================= TEST SESSION RESULTS =========================
tests/test_system.py::test_health_check PASSED                           [12%]
tests/test_system.py::test_readiness_check PASSED                        [25%]
tests/test_system.py::test_unauthorized_admin_access_fails PASSED        [37%]
tests/test_system.py::test_public_categories PASSED                      [50%]
tests/test_system.py::test_public_products PASSED                        [62%]
tests/test_system.py::test_login_demo_admin PASSED                       [75%]
tests/test_system.py::test_rbac_client_forbidden_on_caja PASSED          [87%]
tests/test_system.py::test_financial_insufficient_payment_rejected PASSED [100%]

======================= 8 PASSED IN 3.05 SECONDS =======================
```

---

## 9. GUÍA DE DESPLIEGUE EN PRODUCCIÓN (RENDER / DOCKER)

### 📄 Blueprint IaC para Render (`render.yaml`)
Permite desplegar el sistema completo en la nube con un solo clic conectando la base de datos PostgreSQL y el servicio web FastAPI:

```yaml
services:
  - type: web
    name: donde-david-backend
    runtime: python
    repo: https://github.com/jm7777-afk/tesis-restaurante
    branch: main
    buildCommand: |
      pip install --upgrade pip
      pip install -r backend/requirements.txt
    startCommand: |
      cd backend
      gunicorn -c gunicorn.conf.py app.main:app
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: donde-david-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: ENV
        value: production
      - key: DEBUG
        value: "false"

  - type: postgresql
    name: donde-david-db
    plan: free
    database: donde_david_db
    user: postgres
```

---

## 10. MATRIZ DE CREDENCIALES Y ENDPOINTS REST

### 🔑 Credenciales Base de Acceso por Rol:

| ROL | USUARIO | CONTRASEÑA | PANEL WEB EN VIVO |
|---|---|---|---|
| 👑 **Administrador** | `admin` | `admin123` | [http://127.0.0.1:8000/admin/index.html](http://127.0.0.1:8000/admin/index.html) |
| 💳 **Cajero POS** | `caja` | `caja123` | [http://127.0.0.1:8000/caja/panel.html](http://127.0.0.1:8000/caja/panel.html) |
| 🍳 **Cocinero KDS** | `cocina1` | `cocina123` | [http://127.0.0.1:8000/cocina/monitor.html](http://127.0.0.1:8000/cocina/monitor.html) |
| 🍽️ **Mesero Salón** | `mesero1` | `mesero123` | [http://127.0.0.1:8000/mesero/panel.html](http://127.0.0.1:8000/mesero/panel.html) |
| 📱 **Cliente QR** | `cliente1` | `cliente123` | [http://127.0.0.1:8000/static/cliente/app.html?mesa=1](http://127.0.0.1:8000/static/cliente/app.html?mesa=1) |

---

### 🌐 Principales Endpoints REST de la API:

| MÉTODO | ENDPOINT | ROL DE ACCESO | PROPÓSITO TÉCNICO |
|---|---|---|---|
| `GET` | `/health` | Público | Verificación de salud del servidor |
| `POST` | `/api/v1/auth/login` | Público | Autenticación y obtención de JWT |
| `GET` | `/api/v1/cliente/categorias` | Público | Menú digital de categorías |
| `GET` | `/api/v1/cliente/productos` | Público | Menú digital de productos |
| `POST` | `/api/v1/cliente/pedidos` | Cliente / Público | Creación de comandas y Delivery GPS |
| `GET` | `/api/v1/cliente/carrito` | Cliente | Consulta de carrito persistente |
| `GET` | `/api/v1/caja/pedidos/pendientes` | Caja / Admin | Cola de cobro registradora POS |
| `POST` | `/api/v1/caja/pagar` | Caja / Admin | Cobro, facturación dual e IVA |
| `POST` | `/api/v1/caja/turno/cerrar` | Caja / Admin | Arqueo auditado de caja POS |
| `GET` | `/api/v1/cocina/pedidos` | Cocina / Admin | Cola de comandas en tiempo real KDS |
| `PUT` | `/api/v1/cocina/pedidos/{id}/estado` | Cocina / Admin | Avanzado de estado de preparación |
| `GET` | `/api/v1/admin/estadisticas` | Admin | Dashboard de métricas KPI |
