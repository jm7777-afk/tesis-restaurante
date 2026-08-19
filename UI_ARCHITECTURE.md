# Arquitectura Visual y Shells — DONDE DAVID Enterprise

Este documento detalla los **AppShells** y la composición visual estructurada para cada módulo de la plataforma **Donde David**.

---

## 🏛️ 1. ESTRUCTURA CENTRAL DE PANTALLAS (AppShell)

```
                    DONDE DAVID
                         │
             ┌───────────┴───────────┐
             │                       │
          HEADER                  SIDEBAR (240px / 72px)
             │                       │
             └───────────┬───────────┘
                         │
                    PAGE CONTENT
                         │
             ┌───────────┼───────────┐
             │           │           │
          BREADCRUMB   TITLE       ACTIONS
                         │
                    FEEDBACK / TABLES / CARDS
                         │
                      FOOTER
```

---

## 📐 2. SHELLS POR MÓDULOS DE OPERACIÓN

### A. `AdminShell` (Panel de Administración SaaS)
- **Sidebar Desktop (`280px` / `72px` collapsed)**:
  - **PRINCIPAL**: Dashboard
  - **OPERACIÓN**: Pedidos, Mesas, Cocina
  - **CATÁLOGO**: Productos, Categorías, Promociones
  - **GESTIÓN**: Inventario, Usuarios
  - **ANÁLISIS**: Reportes
  - **CONFIGURACIÓN**: Configuraciones
- **PageHeader Estándar**:
  ```
  Inicio / Productos
  PRODUCTOS
  Administra el catálogo del restaurante.
  [ + Nuevo producto ]
  ```

### B. `CustomerShell` (App Cliente & Delivery)
- **Desktop**: Header Sticky + Navegación Horizontal + Grid Responsvio.
- **Mobile**: Header + Scroll Horizontal de Categorías + Carrito Flotante + Navigation Bar Inferior.

### C. `KitchenShell` (Monitor Cocina KDS)
- **Visibilidad Máxima Operativa**: Topbar con conteo en tiempo real (`RECIBIDOS`, `PREPARANDO`, `LISTOS`, `URGENTES`).
- **Layout 3 Columnas**: `RECIBIDOS` | `PREPARANDO` | `LISTOS`.
- **Mobile**: Selector de Tabs (`Nuevos` | `Preparando` | `Listos`).

### D. `WaiterShell` (Panel de Meseros Salón)
- **Mapa Táctil de Mesas**: Tarjetas cuadradas táctiles con estado multimodal (`LIBRE`, `OCUPADA`, `LISTO`).
- **Touch Targets**: Mínimo `44px` de altura.

### E. `POSShell` (Caja POS Registradora)
- **Disposición 3 Columnas**: Categorías | Grid de Selección | Ticket Contable & Cobro.
- **Botón Destacado**: **`⚡ COBRAR Y FACTURAR`** de alto contraste en Naranja `#FF7A00`.

---

## 📱 3. ESTRATEGIA RESPONSIVE MOBILE-FIRST

- **Breakpoints**: `320px`, `360px`, `375px`, `390px`, `414px`, `480px`, `640px`, `768px`, `834px`, `1024px`, `1280px`, `1440px`, `1920px`.
- **Fluid Layout**: Implementación de `clamp()` para títulos e imágenes sin provocar scroll horizontal.
