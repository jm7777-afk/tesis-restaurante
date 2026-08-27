# Reporte de QA Local y Auditoría de Seguridad — DONDE DAVID (Tesis)

**Fecha de Ejecución:** 26 de Agosto de 2026  
**Resultado Global:** 🟢 **PASÓ 100% DE PRUEBAS FINANCIERAS Y DE ACCESIBILIDAD**

---

## 📋 LISTA DE CHEQUEO DE VALIDACIÓN E INTEGRIDAD DE CÓDIGO

| CATEGORÍA | ÍTEM DE AUDITORÍA | ESTADO | OBSERVACIONES TÉCNICAS |
|---|---|---|---|
| **Lógica de Pago** | Tasa de Cambio Dinámica | 🟢 PASÓ | Obtenida desde la API `/api/v1/cliente/configuraciones-publicas`. |
| **Lógica de Pago** | Validación `monto_recibido >= total` | 🟢 PASÓ | Rechazo en Frontend y Backend (`HTTP 400`) ante montos insuficientes. |
| **Lógica de Pago** | Recálculo Backend de Facturas | 🟢 PASÓ | Cálculo estricto de Subtotal, 16% IVA y Cambio en `caja.py`. |
| **Gestión de Turnos** | Arqueo y Cierre de Caja | 🟢 PASÓ | Modal `#close-shift-modal` calcula diferencia de arqueo en BD (`Turno`). |
| **Accesibilidad** | Atributos `aria-label` & `<label>` | 🟢 PASÓ | Integrados en la totalidad de inputs y botones. |
| **Accesibilidad** | Navegación Teclado (ESC) | 🟢 PASÓ | Escuchador `Escape` cierra modales de manera limpia. |
| **Base de Datos** | Compatibilidad MySQL / SQLite | 🟢 PASÓ | SQLAlchemy ORM soporta SQLite local y MySQL (Pymysql). |
| **Entorno & Deps** | `requirements.txt` & `.env.example` | 🟢 PASÓ | Versiones fijas y ejemplos documentados para InfinityFree y Render. |
| **Despliegue** | `render.yaml` | 🟢 PASÓ | Configuración Gunicorn / Uvicorn lista para despliegue en Render. |

---

## 🎯 PRUEBAS DE SEGURIDAD Y INTEGRIDAD DE DATOS (TESTS)

- **Ejecución de Tests API (`tests/test_system.py`)**:
  - Salida limpia para `/health`, `/ready`, autenticación JWT, RBAC de clientes vs caja y rechazo de montos insuficientes.
