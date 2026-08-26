// appShell.js – Universal Header & System Component for "Donde David"
// Estética Cashea, adaptabilidad por rol y monitoreo en tiempo real

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "flex";
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
    el.classList.add("open");
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("open");
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.display = "none";
  }
}

function detectSystemRole() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/admin/")) return "admin";
  if (path.includes("/cocina/")) return "cocina";
  if (path.includes("/caja/")) return "caja";
  if (path.includes("/mesero/")) return "mesero";
  if (path.includes("/cliente/")) return "cliente";
  return "landing";
}

function renderUniversalHeader() {
  const headerEl = document.getElementById("app-header");
  if (!headerEl) return;

  const role = detectSystemRole();

  // Configuración de Insignias por Rol
  const roleBadges = {
    landing: `<span class="universal-role-badge">🔥 GOURMET TECH</span>`,
    cliente: `<span class="universal-role-badge cliente" id="header-table-badge">📱 QR MESA</span>`,
    admin: `<span class="universal-role-badge admin">👑 ADMINISTRADOR</span>`,
    cocina: `<span class="universal-role-badge cocina">🍳 COCINA KDS</span>`,
    caja: `<span class="universal-role-badge caja">💵 CAJA POS TOUCH</span>`,
    mesero: `<span class="universal-role-badge mesero">🤵 MESERO / SALÓN</span>`
  };

  // Botón Hamburguesa Móvil Universal para Todos los Roles
  let leftAction = `
    <button class="universal-mobile-hamburger-trigger" onclick="toggleUniversalMobileDrawer()" style="margin-right: 0.6rem;">
      <span style="font-size: 1.15rem;">☰</span> <strong style="font-size: 0.78rem;">MENÚ</strong>
    </button>
  `;

  // Acciones Rápidas Específicas por Rol
  let rightActions = "";
  if (role === "cocina") {
    rightActions = `
      <div style="display: flex; gap: 0.3rem;" title="Escala de Pantalla KDS">
        <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="typeof setKDSGridScale === 'function' && setKDSGridScale('scale-sm')">🔍 80%</button>
        <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="typeof setKDSGridScale === 'function' && setKDSGridScale('scale-md')">📐 100%</button>
        <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="typeof setKDSGridScale === 'function' && setKDSGridScale('scale-lg')">🐘 120%</button>
      </div>
    `;
  } else if (role === "caja") {
    rightActions = ``;
  } else if (role === "cliente") {
    rightActions = `
      <a onclick="showScreen('screen-carrito')" class="btn btn-outline" style="padding: 0.3rem 0.7rem; font-size: 0.8rem; cursor: pointer;">
        🛒 <span id="nav-cart-badge-hdr" class="badge badge-PENDIENTE" style="font-size: 0.7rem;">0</span>
      </a>
    `;
  } else if (role === "landing") {
    rightActions = `
      <a href="/static/cliente/app.html?mesa=5" class="btn btn-cta" style="padding: 0.4rem 0.9rem; font-size: 0.8rem;">🔥 PEDIR AHORA</a>
      <a href="/login" class="btn btn-outline" style="padding: 0.4rem 0.9rem; font-size: 0.8rem;">🔐 EMPLEADOS</a>
    `;
  }

  // Botón de Cerrar Sesión para Personal
  let logoutBtn = "";
  if (role !== "landing" && role !== "cliente" && role !== "caja") {
    logoutBtn = `
      <button class="btn btn-cta" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; background: rgba(255,71,87,0.2); border: 1px solid var(--neon-red); color: var(--neon-red);" onclick="typeof Auth !== 'undefined' ? Auth.logout() : (window.location.href='/login')">
        🚪 Salir
      </button>
    `;
  }

  headerEl.innerHTML = `
    <header class="universal-header">
      <div class="universal-header-inner">
        <!-- Izquierda: Marca Destacada Donde David con Logo Oficial 3D Extra Grande -->
        <div style="display: flex; align-items: center;">
          ${leftAction}
          <a href="/" class="universal-brand" style="display: flex; align-items: center; gap: 0.85rem; text-decoration: none; padding: 0.2rem 0;">
            <img src="/static/img/logo.png" alt="Donde David" style="height: clamp(45px, 7vw, 85px); max-height: 85px; width: auto; object-fit: contain; filter: drop-shadow(0 6px 20px rgba(255, 183, 3, 0.65)); transition: transform 0.25s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
          </a>
        </div>

        <!-- Centro: Rol, Tasa BCV y Conexión Realtime WebSocket -->
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          ${roleBadges[role] || roleBadges.landing}
          
          <div class="bcv-rate-badge" title="Tasa Oficial en Bolívares">
            💵 BCV: <span id="hdr-bcv-rate">Bs. 36.50/$</span>
          </div>

          <div class="ws-pulse-indicator" title="Estado de Conexión en Tiempo Real Servidor">
            <span class="ws-pulse-dot"></span>
            <span style="font-size: 0.72rem;">EN VIVO</span>
          </div>
        </div>

        <!-- Derecha: Acciones, Tema & Salir -->
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          ${rightActions}
          <button class="theme-toggle-btn" onclick="typeof toggleThemeMode === 'function' ? toggleThemeMode() : null" title="Cambiar Tema Oscuro / Claro" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">🌓 TEMA</button>
          ${logoutBtn}
        </div>
      </div>
    </header>
  `;
}

async function updateHeaderBcvRate() {
  const el = document.getElementById("hdr-bcv-rate");
  try {
    const res = await fetch("/api/v1/cliente/configuraciones-publicas");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.tasa_cambio_bs) {
        const rate = parseFloat(cfg.tasa_cambio_bs).toFixed(2);
        if (el) el.innerText = `Bs. ${rate}/$`;
        if (typeof tasaCambioBs !== "undefined") {
          tasaCambioBs = parseFloat(cfg.tasa_cambio_bs);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderUniversalHeader();
  createGlobalLoaderDOM();
  updateHeaderBcvRate();

  if (typeof WSClient !== "undefined") {
    try {
      new WSClient((event, data) => {
        if (event === "CONFIGURACION_ACTUALIZADA" || event === "TURNO_ACTUALIZADO") {
          updateHeaderBcvRate();
        }
      });
    } catch(e){}
  }
});

// Auto-disparo del Loader 3D al recargar la página (Page Reload / Refresh)
(function initPageReloadLoader() {
  if (typeof document === "undefined") return;

  function runInitialLoader() {
    createGlobalLoaderDOM();
    showGlobalLoader("CARGANDO SISTEMA DONDE DAVID...");

    window.addEventListener("load", () => {
      setTimeout(() => {
        hideGlobalLoader();
      }, 500);
    });

    if (document.readyState === "complete") {
      setTimeout(() => {
        hideGlobalLoader();
      }, 500);
    }
  }

  if (document.body) {
    runInitialLoader();
  } else {
    document.addEventListener("DOMContentLoaded", runInitialLoader);
  }
})();

// ==================== UNIVERSAL LOADER SYSTEM API ====================
function createGlobalLoaderDOM() {
  if (document.getElementById("global-loader-backdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "global-loader-backdrop";
  backdrop.className = "global-loader-backdrop";
  backdrop.innerHTML = `
    <div class="global-loader-spinner-box">
      <div style="position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem;">
        <div class="spinner-ring-neon"></div>
        <img src="/static/img/logo.png" alt="Donde David" style="position: absolute; width: 68px; height: auto; object-fit: contain; filter: drop-shadow(0 0 14px rgba(255,183,3,0.8)); animation: logoPulse 1.4s ease-in-out infinite alternate;">
      </div>
      <div style="text-align: center;">
        <div class="global-loader-text" id="global-loader-msg">PROCESANDO SOLICITUD EN VIVO...</div>
        <div class="global-loader-subtext">
          <span style="color: var(--cyan-accent); font-weight: 800;">DONDE DAVID POS</span> • ESTADO DE OPERACIÓN EN CURSO
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
}

function showGlobalLoader(message = "PROCESANDO SOLICITUD...") {
  createGlobalLoaderDOM();
  const el = document.getElementById("global-loader-backdrop");
  const msgEl = document.getElementById("global-loader-msg");
  if (msgEl) msgEl.innerText = message;
  if (el) {
    el.style.display = "flex";
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
    el.style.zIndex = "999999";
    el.classList.add("open");
  }
}

function hideGlobalLoader() {
  const el = document.getElementById("global-loader-backdrop");
  if (el) {
    el.classList.remove("open");
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.display = "none";
  }
}



// ==================== UNIVERSAL MOBILE DRAWER SYSTEM ====================
function createUniversalMobileDrawerDOM() {
  if (document.getElementById("universal-mobile-drawer")) return;

  const role = detectSystemRole();

  let roleItems = "";
  if (role === "caja") {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('pos');">🖥️ POS Touch Grid</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('pendientes');">🧾 Cuentas y Cobros</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('postres');">🍰 Preparación Postres</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('deliverys');">🛵 Deliverys y Entregas</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('facturas');">📄 Consulta de Facturas</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof openModal==='function') openModal('open-shift-modal');">🟢 Apertura / Cierre Turno</div>
    `;
  } else if (role === "cliente") {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof showScreen==='function') showScreen('screen-menu');">🍔 Menú Gourmet QR</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof showScreen==='function') showScreen('screen-carrito');">🛒 Mi Carrito de Compras</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof showScreen==='function') showScreen('screen-pedidos');">📋 Mis Pedidos Activos</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof showScreen==='function') showScreen('screen-delivery');">📍 Seguimiento GPS Delivery</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof openModal==='function') openModal('service-rating-modal');">⭐ Calificar Servicio</div>
    `;
  } else if (role === "cocina") {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof loadCocinaComandas==='function') loadCocinaComandas();">🍳 Actualizar Comandas</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof setKDSGridScale==='function') setKDSGridScale('scale-sm');">🔍 Escala KDS 80%</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof setKDSGridScale==='function') setKDSGridScale('scale-md');">📐 Escala KDS 100%</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof setKDSGridScale==='function') setKDSGridScale('scale-lg');">🐘 Escala KDS 120%</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof openModal==='function') openModal('cocina-guide-modal');">📜 Guía KDS Cocina</div>
    `;
  } else if (role === "mesero") {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof loadMeseroData==='function') loadMeseroData();">🍽️ Actualizar Mesas Salón</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof openModal==='function') openModal('mesero-guide-modal');">❓ Guía de Meseros</div>
    `;
  } else if (role === "admin") {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('dashboard');">📊 Dashboard y Ventas</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('productos');">🍔 Productos y Menú</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('mesas');">🍽️ Mesas y Códigos QR</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('insumos');">🚚 Insumos e Inventario</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('configuracion');">💵 Configuración Tasa BCV</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('reportes');">📈 Reportes & Exportar</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('usuarios');">👥 Usuarios y Personal</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('promos');">🎁 Promociones</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof switchTab==='function') switchTab('resenas');">⭐ Reseñas de Clientes</div>
    `;
  } else {
    roleItems = `
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); window.location.href='/static/cliente/app.html?mesa=5';">🔥 Ver Menú y Pedir</div>
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); window.location.href='/login';">🔐 Portal de Empleados</div>
    `;
  }

  const backdrop = document.createElement("div");
  backdrop.id = "universal-mobile-overlay";
  backdrop.className = "universal-mobile-drawer-overlay";
  backdrop.onclick = closeUniversalMobileDrawer;

  const drawer = document.createElement("div");
  drawer.id = "universal-mobile-drawer";
  drawer.className = "universal-mobile-drawer-card";
  drawer.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; border-bottom: 1px solid var(--toon-border); padding-bottom: 0.85rem;">
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <img src="/static/img/logo.png" alt="Donde David" style="height: 42px; width: auto; object-fit: contain;">
        <span style="font-weight: 900; font-family: var(--font-display); color: var(--gold-accent); font-size: 0.95rem;">MENÚ MÓVIL</span>
      </div>
      <button onclick="closeUniversalMobileDrawer()" style="background: transparent; border: none; color: #fff; font-size: 1.6rem; cursor: pointer;">&times;</button>
    </div>

    <div style="flex: 1;">
      <div style="font-size: 0.72rem; font-weight: 900; text-transform: uppercase; color: var(--cyan-accent); letter-spacing: 1px; margin-bottom: 0.6rem;">OPCIONES DEL MÓDULO</div>
      ${roleItems}
    </div>

    <div style="border-top: 1px solid var(--toon-border); padding-top: 1rem; margin-top: 1rem;">
      <div class="drawer-nav-item" onclick="closeUniversalMobileDrawer(); if (typeof toggleThemeMode==='function') toggleThemeMode();">🌓 Cambiar Tema Claro/Oscuro</div>
      <div class="drawer-nav-item" style="color: var(--neon-red); border-color: rgba(255,71,87,0.3);" onclick="closeUniversalMobileDrawer(); if (typeof Auth!=='undefined') Auth.logout(); else window.location.href='/login';">🚪 Cerrar Sesión / Salir</div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
}

function toggleUniversalMobileDrawer() {
  createUniversalMobileDrawerDOM();
  const overlay = document.getElementById("universal-mobile-overlay");
  const drawer = document.getElementById("universal-mobile-drawer");
  if (overlay && drawer) {
    overlay.classList.toggle("open");
    drawer.classList.toggle("open");
  }
}

function closeUniversalMobileDrawer() {
  const overlay = document.getElementById("universal-mobile-overlay");
  const drawer = document.getElementById("universal-mobile-drawer");
  if (overlay) overlay.classList.remove("open");
  if (drawer) drawer.classList.remove("open");
}

// Fetch Interceptor para mostrar/ocultar el indicador de carga automáticamente sin demoras
if (typeof window !== "undefined" && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0] ? args[0].toString() : "";
    const isBackgroundCall = url.includes("/configuraciones-publicas") || url.includes("/health") || url.includes("/websocket") || url.includes("/caja/") || url.includes("/cliente/");
    
    if (!isBackgroundCall) {
      showGlobalLoader("CARGANDO DATOS...");
    }
    
    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } finally {
      if (!isBackgroundCall) {
        hideGlobalLoader();
      }
    }
  };
}
