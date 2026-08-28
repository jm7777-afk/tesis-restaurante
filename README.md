# 🍔 DONDE DAVID - RESTAURANTE MANAGEMENT SYSTEM (v2.0 Enterprise)

**SISTEMA WEB INTEGRAL ADMINISTRATIVO PARA LA GESTIÓN DE PEDIDOS POS TOUCH PARA EL RESTAURANTE “DONDE DAVID - FRESH & TASTY!” C.A., VALENCIA, ESTADO CARABOBO**

**Repositorio Oficial:** [https://github.com/jm7777-afk/tesis-restaurante](https://github.com/jm7777-afk/tesis-restaurante)  
**URL de Producción en Render:** [https://adondedavid-com.onrender.com](https://adondedavid-com.onrender.com)

---

## 📋 CARACTERÍSTICAS PRINCIPALES

- 📱 **App Cliente QR & Delivery 1-Clic GPS:** Escaneo de mesa QR, carrito persistente en BD y captura de coordenadas GPS en 1-clic con enlace a Google Maps.
- 💳 **Caja POS Registradora Touch:** Cobro dual ($ USD / Bs.), IVA (16%), arqueo auditado de turno (`#close-shift-modal`), inspector de 20 mesas salón (`#pos-table-selector-modal`), despacho a mototaxis y facturación inmutable.
- 🍳 **Monitor KDS de Cocina:** Pantalla comandera digital en tiempo real con notificaciones auditivas e indicación de tiempo transcurrido.
- 🍽️ **Panel de Meseros:** Mapa de 20 mesas del salón con control de estados.
- 📊 **Dashboard SaaS Admin:** Métricas KPI financieras, control de inventario y gestión de personal con 5 roles RBAC.
- 🐘 **Migraciones Alembic & PostgreSQL:** Migraciones de base de datos automatizadas con Alembic e integración nativa con PostgreSQL en Render.

---

## ⚙️ REQUISITOS PREVIOS E INSTALACIÓN LOCAL

### 1. Clonar el Repositorio
```bash
git clone https://github.com/jm7777-afk/tesis-restaurante.git
cd tesis-restaurante
```

### 2. Configurar Entorno Virtual e Instalar Dependencias
```bash
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Linux/macOS:
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno
Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```

### 4. Ejecutar Migraciones de Base de Datos
```bash
python -m alembic upgrade head
```

### 5. Iniciar el Servidor de Desarrollo
```bash
python backend/app/main.py
```
El sistema estará disponible localmente en: **`http://127.0.0.1:8000`**

---

## 🧪 PRUEBAS AUTOMATIZADAS Y AUDITORÍA

### Ejecutar Suite Pytest
```bash
pytest tests/test_system.py -v
```

### Ejecutar Simulación End-to-End de Roles
```bash
python backend/scripts/simulate_user_audit_v2.py
```

### Resetear la Base de Datos a 0
```bash
python backend/scripts/reset_clean_db.py
```

---

## 🔑 CREDENCIALES DE ACCESO BASE POR ROL

| ROL | USUARIO | CONTRASEÑA | RUTA WEB EN VIVO |
|---|---|---|---|
| 👑 **Admin** | `admin` | `admin123` | `/admin/index.html` |
| 💳 **Cajero POS** | `caja` | `caja123` | `/caja/panel.html` |
| 🍳 **Cocinero KDS** | `cocina1` | `cocina123` | `/cocina/monitor.html` |
| 🍽️ **Mesero** | `mesero1` | `mesero123` | `/mesero/panel.html` |
| 📱 **Cliente Demo** | `cliente1` | `cliente123` | `/static/cliente/app.html?mesa=1` |

---

## ☁️ DESPLIEGUE EN RENDER

El proyecto utiliza un Blueprint de Render en `render.yaml` que configura automáticamente el Web Service y PostgreSQL:

- **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
- **Pre-deploy Command:** `python -m alembic upgrade head`
- **Start Command:** `cd backend && gunicorn -c gunicorn.conf.py app.main:app`
