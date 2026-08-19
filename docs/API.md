# 🔌 API.md — Catálogo Completo de Endpoints y WebSockets

Este documento detalla la especificación formal de la API RESTful de **DONDE DAVID - FRESH & TASTY!** (Prefijo base: `/api/v1`).

---

## 🔐 1. Autenticación (`/api/v1/auth`)

### `POST /api/v1/auth/login`
- **Descripción**: Autentica usuarios del sistema y emite token JWT.
- **Request Body**:
  ```json
  {
    "nombre_usuario": "admin",
    "contraseña": "admin123"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "rol": "admin",
    "nombre": "Administrador"
  }
  ```

---

## 🍔 2. Módulo Cliente / Autoservicio QR (`/api/v1/cliente`)

### `GET /api/v1/cliente/productos`
- **Descripción**: Obtiene catálogo activo de productos con precios en USD y conversión automática a Bs. según tasa oficial.

### `GET /api/v1/cliente/categorias`
- **Descripción**: Listado de categorías activas para filtrado horizontal.

### `POST /api/v1/cliente/pedidos`
- **Request Body**:
  ```json
  {
    "numero_mesa": "5",
    "tipo": "mesa",
    "observaciones": "Sin cebolla en la hamburguesa",
    "items": [
      {
        "producto_id": 1,
        "cantidad": 2,
        "personalizaciones": {"sin_cebolla": true}
      }
    ]
  }
  ```

---

## 🍳 3. Módulo Cocina KDS (`/api/v1/cocina`)

### `GET /api/v1/cocina/pedidos/pendientes`
- **Descripción**: Retorna pedidos en estado `pendiente` y `en_preparacion`.

### `PUT /api/v1/cocina/pedidos/{id}/iniciar`
- **Descripción**: Transiciona el estado del pedido a `en_preparacion`.

### `PUT /api/v1/cocina/pedidos/{id}/listo`
- **Descripción**: Transiciona el estado del pedido a `listo` y emite evento por WebSocket.

---

## 💵 4. Módulo Caja POS (`/api/v1/caja`)

### `POST /api/v1/caja/turnos/abrir`
- **Request Body**:
  ```json
  {
    "monto_apertura_usd": 50.00,
    "tasa_cambio": 42.50
  }
  ```

### `POST /api/v1/caja/pedidos/{id}/pagar`
- **Request Body**:
  ```json
  {
    "monto_recibido_usd": 30.00,
    "metodo_pago": "efectivo"
  }
  ```

---

## ⚡ 5. Eventos WebSocket (`ws://localhost:8000/ws`)

### Evento Emitido por Cliente → Servidor
```json
{
  "tipo": "nuevo_pedido",
  "data": {
    "pedido_id": 102,
    "numero_mesa": "5",
    "total_usd": 29.58
  }
}
```

### Evento Emitido por Servidor → Cocina / Caja
```json
{
  "tipo": "estado_pedido",
  "data": {
    "pedido_id": 102,
    "estado": "listo",
    "numero_mesa": "5"
  }
}
```
