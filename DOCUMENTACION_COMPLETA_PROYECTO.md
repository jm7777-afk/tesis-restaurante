# 📚 DOCUMENTACIÓN TÉCNICA INTEGRAL — DONDE DAVID MANAGEMENT SYSTEM

**Versión del Sistema:** 2.0.0 Enterprise  
**Fecha de Auditoría y Verificación:** 28 de Agosto de 2026  
**Repositorio GitHub Oficial:** [https://github.com/jm7777-afk/tesis-restaurante.git](https://github.com/jm7777-afk/tesis-restaurante.git)

---

## 📋 TABLA DE CONTENIDO
1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura del Sistema y Stack Tecnológico](#2-arquitectura-del-sistema-y-stack-tecnológico)
3. [Módulos Operativos del Sistema](#3-módulos-operativos-del-sistema)
4. [Seguridad y Lógica Financiera Backend](#4-seguridad-y-lógica-financiera-backend)
5. [Esquema de Base de Datos y Migración PostgreSQL](#5-esquema-de-base-de-datos-y-migración-postgresql)
6. [Suite de Pruebas y Auditoría Operativa](#6-suite-de-pruebas-y-auditoría-operativa)
7. [Guía de Despliegue en Producción (Render / Docker)](#7-guía-de-despliegue-en-producción-render--docker)

---

## 1. RESUMEN EJECUTIVO

**Donde David Management System** es una solución tecnológica integral diseñada para la automatización operativa, control financiero y optimización de servicios en restaurantes de alta demanda. 

El sistema digitaliza el flujo operativo completo: desde el escaneo de menú QR en mesa y pedidos por **Delivery con detección GPS en 1-Clic**, pasando por la comandera KDS de cocina en tiempo real y la atención del salón por meseros, hasta la facturación dual ($ USD / Bs.), **arqueo auditado de caja registradora POS** y reportes estadísticos para la toma de decisiones gerenciales.

---

## 2. ARQUITECTURA DEL SISTEMA Y STACK TECNOLÓGICO

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

### 🛠️ Tecnologías Principales:
- **Backend Framework:** FastAPI 0.109.2 (Python 3.10+) con soporte asíncrono ASGI.
- **Servidor de Aplicación:** Gunicorn 21.2.0 con trabajadores Uvicorn (`UvicornWorker`).
- **Base de Datos & ORM:** PostgreSQL 14+ / SQLite 3 abstraídos por SQLAlchemy 2.0.25.
- **Comunicaciones en Tiempo Real:** WebSockets (`websockets 12.0`) con reconexión automática `WSClient`.
- **Criptografía & Seguridad:** `python-jose` (Tokens JWT HS256), `passlib[bcrypt]` (Hashing de contraseñas) y validación de entrada Pydantic.
- **Frontend Core:** HTML5 semántico, CSS3 con Toon Theme (`components.css`), JavaScript ES6+ asíncrono (Fetch API, WebSockets).

---

## 3. MÓDULOS OPERATIVOS DEL SISTEMA

### 📱 3.1 App Cliente & Delivery 1-Clic GPS (`cliente/app.html`)
- **Menú Digital Interactivo:** Visualización dinámica por categorías con fotos, ingredientes y opciones personalizables.
- **Identificación por Mesa QR:** Detección del número de mesa mediante parámetro URL (`?mesa=X`) para pedidos en salón.
- **Detección GPS 1-Clic:** Captura las coordenadas exactas de geolocalización del cliente para envíos a domicilio, generando enlaces directos a Google Maps sin requerir direcciones de texto.
- **Carrito Persistente en BD:** Guardado automático de los productos agregados a la cesta en la tabla `carritos`, evitando la pérdida de información al recargar.
- **Seguimiento en Vivo:** Actualización del estado del pedido (`PENDIENTE` ➔ `EN_PREPARACION` ➔ `LISTO` ➔ `EN_CAMINO`) transmitido por WebSockets.

---

### 🍳 3.2 Monitor KDS de Cocina (`cocina/monitor.html`)
- **Pantalla Comandera Digital:** Desglose de pedidos agrupados por columnas de estado con código de colores según prioridad y tiempo transcurrido.
- **Notificaciones Sonoras y Visuales:** Alerta auditiva automática al recibir nuevas comandas.
- **Avanzado de Estado:** Botones interactivos para cambiar el estado de la comanda de `PENDIENTE` a `EN_PREPARACION` y `LISTO`.

---

### 💳 3.3 Caja POS Registradora Touch & Arqueo (`caja/panel.html`)
- **Ventas Rápida y Cobro Dual:** Registro de pagos en Efectivo, Punto de Venta o Pago Móvil con desglose en Dólares ($ USD) y Bolívares (Bs.).
- **Arqueo y Cierre Auditado de Turno:** Modal de cierre `#close-shift-modal` donde la cajera ingresa el efectivo contado. El sistema compara el valor contra las ventas esperadas (`monto_apertura + total_ventas`) y registra la diferencia (`Exacto`, `Sobrante`, `Faltante`) en la tabla `turnos`.
- **Inspector de Mesas:** Modal `#pos-table-selector-modal` que muestra el estado de disponibilidad de las 20 mesas del salón (`🟢 LIBRE` / `🔴 OCUPADA`).
- **Despacho a Mototaxi:** Módulo de cola de delivery en caja para validar pagos y asignar pedidos al personal de reparto (`🛵 ENVIAR A MOTOTAXI`).
- **Historial de Facturas:** Búsqueda e reimpresión de comprobantes fiscales (`FAC-DD-XXXXXX`).

---

### 🍽️ 3.4 Panel de Meseros Salón (`mesero/panel.html`)
- **Mapa Interactivo de 20 Mesas:** Visualización visual de las mesas del restaurante con indicador de ocupación.
- **Creación y Atención de Comandas:** Asignación directa de pedidos a mesas y cambio de estado a `ENTREGADO`.

---

### 📊 3.5 Dashboard de Administración SaaS (`admin/index.html`)
- **Métricas KPI:** Facturación total del día, ticket promedio, número de comandas procesadas e impuestos IVA retenidos.
- **Gestión de Inventario y Menú:** Altas, bajas y modificaciones de productos, precios y stock disponible.
- **Control de Usuarios:** Administración de cuentas del personal con asignación de roles RBAC.

---

## 4. SEGURIDAD Y LÓGICA FINANCIERA BACKEND

### 🔒 Autenticación y Permisos RBAC
1. **Tokens JWT Firmados:** Las peticiones protegidas requieren la cabecera `Authorization: Bearer <token_jwt>` firmado por el algoritmo `HS256` y la clave secreta `SECRET_KEY`.
2. **Restricción de Funciones por Rol:** Los decoradores de FastAPI (`require_caja`, `require_admin`, `require_cocina`) impiden el acceso no autorizado entre roles.

---

### 💰 Recálculo Financiero e Inmutabilidad Fiscal
- **Recálculo Backend en `caja.py`:** El servidor FastAPI valida y recalcula el subtotal, impuesto (16% IVA), total neto y vuelto dual. No confía en los valores calculados en el navegador.
- **Rechazo por Monto Insuficiente:** Si el dinero recibido por el cliente es menor al total neto (`monto_recibido < total`), el backend rechaza la transacción con un código `HTTP 400 Bad Request`.
- **Tasa de Cambio Dinámica:** La conversión entre Dólares y Bolívares se consulta desde la base de datos (`configuraciones`), manteniendo el historial de la tasa aplicada en la factura fiscal.

---

## 5. ESQUEMA DE BASE DE DATOS Y MIGRACIÓN POSTGRESQL

El esquema relacional de **[scripts/postgres_schema.sql](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/scripts/postgres_schema.sql)** está compuesto por 10 tablas optimizadas con índices B-Tree:

- `usuarios`: Cuentas de personal y clientes con hash BCrypt.
- `categorias`: Clasificación del menú.
- `productos`: Catálogo de platillos e ingredientes en formato `JSONB`.
- `turnos`: Arqueos y cierres de caja registradora POS.
- `pedidos`: Comandas multicanal (Salón, Llevar, Delivery GPS).
- `detalles_pedido`: Desglose de ítems para el KDS de cocina.
- `carritos`: Persistencia de la cesta de compras del cliente.
- `configuraciones`: Parámetros globales (Tasa de cambio $ / Bs., IVA 16%).
- `facturas`: Registro inmutable de comprobantes fiscales duales.
- `pagos`: Transacciones bancarias y métodos de pago.

### 🐍 Script ETL SQLite ➔ PostgreSQL (`scripts/migrate_to_postgres.py`)
Script automatizado que extrae los datos de `restaurante.db` (SQLite), transforma las cadenas JSON a tipos nativos `JSONB`, normaliza las marcas temporales ISO y las inserta mediante consultas parametrizadas idempotentes `ON CONFLICT DO NOTHING` en PostgreSQL.

---

## 6. SUITE DE PRUEBAS Y AUDITORÍA OPERATIVA

### 🧪 Ejecución de Pruebas Automatizadas Pytest (`tests/test_system.py`)
```bash
pytest tests/test_system.py -v
```

**Resultado de Ejecución:**
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

### ⚡ Simulación de Flujo Global (`backend/scripts/simulate_user_audit_v2.py`)
```
======================================================================
  [VERIFICACIÓN GLOBAL COMPLETA - DONDE DAVID RESTAURANTE]
======================================================================
[OK 1: CATÁLOGO Y MESAS] Categorías: 8 | Productos: 10 | Mesas: 20
[OK 2: USUARIOS Y RBAC] Total Usuarios: 8 (Admin, Caja, Cocina, Mesero, Clientes)
[OK 3: CAJA Y TURNO] Turno #4 Activo | Monto Apertura: $50.00
[OK 4: DELIVERY GPS 1-CLIC] Captura de coordenadas GPS en 1-clic con enlace a Google Maps
[OK 5: COBRO Y MOTOTAXI] Facturación fiscal dual ($ / Bs.) y despacho directo a Mototaxi
[OK 6: ARQUEO DE CAJA] Monto Esperado: $325.16 | Declarado: $325.16 | Diferencia: $0.00 (EXACTO)

======================================================================
  🟢 SISTEMA 100% OPERATIVO, AUDITADO Y LISTO PARA TESIS
======================================================================
```

---

## 7. GUÍA DE DESPLIEGUE EN PRODUCCIÓN (RENDER / DOCKER)

### 📄 Despliegue Automatizado Blueprint (`render.yaml`)
El archivo **[render.yaml](file:///C:/Users/Windows/.gemini/antigravity/scratch/tesis-restaurante/render.yaml)** aprisiona de manera automática la base de datos PostgreSQL y el servicio web FastAPI:

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

### 🌐 ENLACES DE REPOSITORIO Y SERVICIOS EN VIVO

- 🐙 **Repositorio GitHub Oficial:** [https://github.com/jm7777-afk/tesis-restaurante.git](https://github.com/jm7777-afk/tesis-restaurante.git)
- 💳 **Caja POS Registradora Touch:** [http://127.0.0.1:8000/caja/panel.html](http://127.0.0.1:8000/caja/panel.html)
- 📱 **App Cliente QR & Delivery GPS:** [http://127.0.0.1:8000/static/cliente/app.html?mesa=1](http://127.0.0.1:8000/static/cliente/app.html?mesa=1)
- 🍳 **Monitor KDS Cocina:** [http://127.0.0.1:8000/cocina/monitor.html](http://127.0.0.1:8000/cocina/monitor.html)
- 📑 **Documentación Swagger / OpenAPI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
