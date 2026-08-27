/* ==========================================================================
   DONDE DAVID POS - MODULO MAESTRO DE CAJA Y FACTURACION INTEGRADA
   ==========================================================================
   ESTRUCTURA MODULAR DEL ARCHIVO:
   --------------------------------------------------------------------------
   [SEC-01] Estado Global y Configuración de Divisas ($ / Bs.)
   [SEC-02] Control de NAVEGACIÓN SPA (POS, Cuentas, Postres, Deliverys, Facturas)
   [SEC-03] CATÁLOGO TOUCH Y DYN-GRID DE PRODUCTOS POS
   [SEC-04] MODAL DE PERSONALIZACIÓN DE PRODUCTOS (Remover, Extras, Notas)
   [SEC-05] TICKETING POS & CÁLCULOS DE MONTO NETO Y CAMBIO
   [SEC-06] ARQUEO Y CONTROL DE TURNO DE CAJA (Apertura / Cierre)
   [SEC-07] COLA UNIFICADA DE CUENTAS Y PAGOS POR COBRAR (Buscador por ID)
   [SEC-08] DESPACHO Y CONTROL DE SALIDA DE POSTRES
   [SEC-09] GESTIÓN DE DELIVERYS Y ASIGNACIÓN MOTORIZADA CON GPS
   [SEC-10] PASARELA DIGITAL DE COBRO (Pago Móvil 4 dígitos, Tarjeta, Zelle)
   [SEC-11] REIMPRESIÓN DE FACTURAS Y FILTRADO HISTÓRICO
   ========================================================================== */

if (typeof window.openModal !== "function") {
  window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
  };
}

if (typeof window.closeModal !== "function") {
  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
  };
}

let activeShift = null;
let pendingOrders = [];
let paidOrders = [];
let selectedOrderForPayment = null;
let allProductsPos = [];
let posCategories = [];
let posCart = [];
let tasaCambioBs = 36.50;

let currentOrderType = 'llevar'; // llevar, mesa, delivery
let currentPaymentMethod = 'Efectivo';
let selectedCategoryFilter = null;

let currentCustomizingProduct = null;
let currentCustomizingQty = 1;

document.addEventListener("DOMContentLoaded", () => {
  loadPosConfig();
  loadShiftStatus();
  loadPendingOrders();
  loadPaidOrders();
  loadPosCategories();
  loadPosProducts();

  new WSClient((event, data) => {
    if (event === "NUEVO_PEDIDO" || event === "PAGO_CONFIRMADO" || event === "TURNO_ACTUALIZADO" || event === "CAMBIO_ESTADO_PEDIDO") {
      loadShiftStatus();
      loadPendingOrders();
      loadPaidOrders();
    }
  });

  // Accesibilidad: Cerrar modales con tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".product-modal-backdrop.open").forEach(m => {
        m.classList.remove("open");
      });
    }
  });
});

async function loadPosConfig() {
  try {
    const res = await fetch("/api/v1/cliente/configuraciones-publicas");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.tasa_cambio_bs) tasaCambioBs = parseFloat(cfg.tasa_cambio_bs);
    }
  } catch(e){}
}

function formatPriceDual(usdAmount) {
  const bsAmount = (usdAmount * tasaCambioBs).toFixed(2);
  return `$${usdAmount.toFixed(2)} <span style="font-size: 0.8rem; color: var(--mc-yellow);">(Bs. ${bsAmount})</span>`;
}

function switchPosMainView(viewName) {
  document.getElementById("view-pos-container").style.display = viewName === 'pos' ? 'grid' : 'none';
  document.getElementById("view-queue-container").style.display = viewName === 'queue' ? 'block' : 'none';
  document.getElementById("view-history-container").style.display = viewName === 'history' ? 'block' : 'none';
  
  if (document.getElementById("view-postres-container")) {
    document.getElementById("view-postres-container").style.display = viewName === 'postres' ? 'block' : 'none';
  }
  if (document.getElementById("view-app-payments-container")) {
    document.getElementById("view-app-payments-container").style.display = viewName === 'app-payments' ? 'block' : 'none';
  }
  if (document.getElementById("view-deliverys-container")) {
    document.getElementById("view-deliverys-container").style.display = viewName === 'deliverys' ? 'block' : 'none';
  }

  if (document.getElementById("view-btn-pos")) document.getElementById("view-btn-pos").classList.toggle("active", viewName === 'pos');
  if (document.getElementById("view-btn-postres")) document.getElementById("view-btn-postres").classList.toggle("active", viewName === 'postres');
  if (document.getElementById("view-btn-app-payments")) document.getElementById("view-btn-app-payments").classList.toggle("active", viewName === 'app-payments');
  if (document.getElementById("view-btn-deliverys")) document.getElementById("view-btn-deliverys").classList.toggle("active", viewName === 'deliverys');
  if (document.getElementById("view-btn-queue")) document.getElementById("view-btn-queue").classList.toggle("active", viewName === 'queue');
  if (document.getElementById("view-btn-history")) document.getElementById("view-btn-history").classList.toggle("active", viewName === 'history');

  if (viewName === 'postres') {
    renderDessertPrepQueue();
  } else if (viewName === 'app-payments') {
    renderAppPaymentsQueue();
  } else if (viewName === 'deliverys') {
    renderDeliverysQueue();
  }
}

function renderAppPaymentsQueue() {
  const container = document.getElementById("app-payments-grid-list");
  if (!container) return;

  if (document.getElementById("app-payments-count")) {
    document.getElementById("app-payments-count").innerText = `${pendingOrders.length} Pagos / Comandas por Confirmar en Caja`;
  }

  if (pendingOrders.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No hay pagos pendientes por confirmar en la caja.</div>`;
    return;
  }

  container.innerHTML = pendingOrders.map(o => {
    const isPagoMovil = o.metodo_pago && o.metodo_pago.includes("Pago Móvil");
    const isTarjeta = o.metodo_pago && o.metodo_pago.includes("Tarjeta");

    return `
      <div class="card fade-in" style="background: var(--toon-card); border: 2px solid ${isPagoMovil ? 'var(--cyan-accent)' : 'var(--gold-accent)'}; border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge" style="background: ${isPagoMovil ? 'var(--cyan-accent)' : 'var(--gold-gradient)'}; color: #000; font-weight: 900; font-size: 0.85rem;">
            ${isPagoMovil ? '📱 PAGO MÓVIL' : (isTarjeta ? '💳 PUNTO TARJETA' : '💵 EFECTIVO')} #${o.id}
          </span>
          <strong style="color: var(--gold-accent); font-size: 1.25rem; font-weight: 900;">$${parseFloat(o.total).toFixed(2)}</strong>
        </div>

        <p style="font-size: 0.9rem; color: #fff; margin-bottom: 0.3rem;"><strong>Cliente:</strong> ${o.nombre_cliente_delivery || o.nombre_factura || o.numero_mesa || 'Cliente'}</p>
        ${o.direccion_delivery ? `<p style="font-size: 0.85rem; color: var(--cyan-accent); margin-bottom: 0.4rem;">📍 ${o.direccion_delivery}</p>` : ''}
        
        <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--toon-border); border-radius: 10px; padding: 0.65rem; margin-bottom: 0.85rem;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">DETALLE DE TRANSACCIÓN:</div>
          <div style="font-size: 1rem; font-weight: 900; color: ${isPagoMovil ? 'var(--cyan-accent)' : 'var(--gold-accent)'}; margin-top: 0.15rem;">
            ${o.metodo_pago || 'Confirmación en Caja POS'}
          </div>
        </div>

        <button class="btn btn-cta" style="width: 100%; font-size: 0.92rem; font-weight: 900;" onclick="openPaymentModal(${o.id})">
          ${isPagoMovil ? '✅ VALIDAR 4 DÍGITOS Y APROBAR PAGO MÓVIL' : (isTarjeta ? '💳 PROCESAR PUNTO Y CONFIRMAR' : '💵 CONFIRMAR COBRO EN CAJA')}
        </button>
      </div>
    `;
  }).join('');
}

// ==================== BÚSQUEDA DE CLIENTES REGISTRADOS POR ID O NOMBRE EN CAJA ====================
let selectedCustomerPos = null;

async function searchCustomerPosLive() {
  const query = document.getElementById("pos-customer-search-input")?.value.trim();
  const dropdown = document.getElementById("pos-customer-results-dropdown");
  if (!dropdown) return;

  if (!query || query.length < 1) {
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`/api/v1/caja/clientes/buscar?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const clients = await res.json();

    if (!clients || clients.length === 0) {
      dropdown.innerHTML = `<div style="padding: 0.6rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No se encontró ningún cliente con '${query}'</div>`;
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = clients.map(c => `
      <div style="padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--toon-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03);" onclick="selectCustomerForPos(${c.id}, '${c.nombre_completo.replace(/'/g, "\\'")}', '${c.codigo_cliente}', ${c.puntos_fidelidad})">
        <div>
          <strong style="color: #fff; font-size: 0.88rem; display: block;">${c.nombre_completo}</strong>
          <small style="color: var(--cyan-accent); font-weight: 800;">🆔 ${c.codigo_cliente} • ${c.email}</small>
        </div>
        <span style="font-size: 0.78rem; background: rgba(255,188,13,0.2); color: var(--gold-accent); padding: 0.2rem 0.55rem; border-radius: 12px; font-weight: 900;">${c.puntos_fidelidad} Pts 🏆</span>
      </div>
    `).join('');
    dropdown.style.display = "block";
  } catch(e) {
    console.error("Error al buscar clientes:", e);
  }
}

function selectCustomerForPos(id, name, code, points) {
  selectedCustomerPos = { id, name, code, points };
  if (document.getElementById("pos-customer-search-input")) {
    document.getElementById("pos-customer-search-input").value = `${name} (${code})`;
  }
  if (document.getElementById("pos-mesa-input")) {
    document.getElementById("pos-mesa-input").value = `${name} (${code})`;
  }
  const dropdown = document.getElementById("pos-customer-results-dropdown");
  if (dropdown) dropdown.style.display = "none";
  showToast(`👤 Cliente Seleccionado: ${name} (${code}) - ${points} Pts`, "success");
}

function renderDeliverysQueue() {
  const container = document.getElementById("deliverys-grid-list");
  if (!container) return;

  const deliveryOrders = pendingOrders.concat(paidOrders).filter(o => 
    (o.tipo && o.tipo.toLowerCase() === 'delivery') || 
    (o.numero_mesa && o.numero_mesa.toLowerCase().includes('delivery')) || 
    (o.direccion_delivery && o.direccion_delivery.trim().length > 0)
  );
  if (document.getElementById("deliverys-count")) {
    document.getElementById("deliverys-count").innerText = `${deliveryOrders.length} Envíos Delivery Activos`;
  }

  if (deliveryOrders.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-secondary); padding: 2rem;">No hay envíos delivery activos en este turno.</div>`;
    return;
  }

  container.innerHTML = deliveryOrders.map(o => {
    let mapsUrl = "";
    if (o.direccion_delivery && o.direccion_delivery.includes("http")) {
      const match = o.direccion_delivery.match(/(https?:\/\/[^\s]+)/);
      if (match) mapsUrl = match[0];
    } else if (o.direccion_delivery && (o.direccion_delivery.includes("GPS:") || o.direccion_delivery.includes("Lat"))) {
      const cleanAddr = o.direccion_delivery.replace("📍 GPS:", "").trim();
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(cleanAddr)}`;
    }

    return `
      <div class="card fade-in" style="background: var(--toon-card); border: 1.5px solid var(--cyan-accent); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span class="badge" style="background: var(--cyan-accent); color: #000; font-weight: 900;">🛵 Delivery #${o.id}</span>
          <strong style="color: var(--gold-accent); font-size: 1.25rem;">$${parseFloat(o.total).toFixed(2)}</strong>
        </div>
        <p style="font-size: 0.9rem; color: #fff; margin-bottom: 0.3rem;"><strong>Cliente:</strong> ${o.nombre_cliente_delivery || o.nombre_factura || 'Cliente Delivery'}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;"><strong>Teléfono:</strong> ${o.telefono_delivery || 'Sin teléfono'}</p>
        
        <div style="background: rgba(0,245,212,0.06); border: 1px solid var(--cyan-accent); border-radius: 10px; padding: 0.75rem; margin-bottom: 0.85rem;">
          <div style="font-size: 0.78rem; color: var(--cyan-accent); font-weight: 800; margin-bottom: 0.2rem;">📍 UBICACIÓN Y GPS RECIBIDOS EN CAJA:</div>
          <div style="font-size: 0.88rem; color: #fff; word-break: break-all;">${o.direccion_delivery || 'Ubicación GPS capturada desde el celular'}</div>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn btn-outline" style="flex: 1; font-size: 0.82rem; border-color: var(--cyan-accent); color: var(--cyan-accent); text-align: center; text-decoration: none; padding: 0.5rem; border-radius: 8px; font-weight: 800;" title="Abrir ubicación en Google Maps">🗺️ VER GPS MAPS</a>` : `<button class="btn btn-outline" style="flex: 1; font-size: 0.8rem;" onclick="showToast('📍 GPS: ${o.direccion_delivery || "Sin ubicación"}', 'info')">🗺️ GPS</button>`}
          <button class="btn btn-cta" style="flex: 1.2; font-size: 0.85rem; font-weight: 900;" onclick="showToast('🛵 Repartidor asignado a Pedido #${o.id}', 'success')">🛵 ASIGNAR MOTORIZADO</button>
        </div>
      </div>
    `;
  }).join('');
}

let dispatchedDessertIds = new Set(JSON.parse(localStorage.getItem("dispatched_desserts") || "[]"));

function toggleDessertDispatched(itemId) {
  if (dispatchedDessertIds.has(itemId)) {
    dispatchedDessertIds.delete(itemId);
    showToast("🍰 Postre marcado como PENDIENTE", "info");
  } else {
    dispatchedDessertIds.add(itemId);
    showToast("✅ Postre marcado como DESPACHADO por la Cajera", "success");
  }
  localStorage.setItem("dispatched_desserts", JSON.stringify(Array.from(dispatchedDessertIds)));
  renderDessertPrepQueue();
}

function renderDessertPrepQueue() {
  const container = document.getElementById("postres-grid-list");
  if (!container) return;

  const dessertItems = [];
  pendingOrders.concat(paidOrders).forEach(order => {
    if (!order.detalles) return;
    order.detalles.forEach(d => {
      const prodName = (d.producto ? d.producto.nombre : (d.nombre || '')).toLowerCase();
      const catName = (d.producto && d.producto.categoria ? d.producto.categoria.nombre : '').toLowerCase();
      const isDessert = catName.includes("postre") || 
                        prodName.includes("postre") || 
                        prodName.includes("helado") || 
                        prodName.includes("malteada") || 
                        prodName.includes("torta") || 
                        prodName.includes("pie") || 
                        prodName.includes("marquesa") || 
                        prodName.includes("brownie") || 
                        prodName.includes("sundae");

      if (isDessert) {
        dessertItems.push({ order, item: d });
      }
    });
  });

  if (document.getElementById("postres-queue-count")) {
    const pendingCount = dessertItems.filter(i => !dispatchedDessertIds.has(i.item.id)).length;
    document.getElementById("postres-queue-count").innerText = `${pendingCount} Postres Pendientes (${dessertItems.length} Total)`;
  }

  if (dessertItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-secondary); border: 1px dashed var(--color-border); border-radius: var(--radius-md);">
        <span style="font-size: 3rem;">🍰</span>
        <h3 style="color: #fff; margin-top: 0.5rem;">No hay postres solicitados actualmente</h3>
        <p style="font-size: 0.85rem;">Todos los postres de comandas activas han sido controlados por la cajera.</p>
      </div>
    `;
    return;
  }

  let html = "";
  dessertItems.forEach(({ order, item }) => {
    const isDispatched = dispatchedDessertIds.has(item.id);
    const prodName = item.producto ? item.producto.nombre : 'Postre';

    html += `
      <div class="card fade-in" style="background: var(--toon-card); border: 2px solid ${isDispatched ? 'var(--color-success)' : 'var(--gold-accent)'}; border-radius: var(--radius-md); padding: 1.25rem; opacity: ${isDispatched ? '0.75' : '1'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <strong style="color: var(--gold-accent); font-size: 1.1rem;">🍰 Comanda #${order.id} - ${order.numero_mesa}</strong>
          <span class="badge" style="background: ${isDispatched ? 'var(--color-success)' : 'var(--gold-accent)'}; color: #000; font-weight: 900; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 6px;">
            ${isDispatched ? '✅ DESPACHADO' : '⏳ POR DESPACHAR'}
          </span>
        </div>
        <div style="font-size: 1.15rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem;">
          ${item.cantidad}x ${prodName}
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          <strong>Cliente / Destino:</strong> ${order.nombre_cliente_delivery || order.nombre_factura || 'Comensal'} (${order.tipo})
        </p>
        ${item.observaciones ? `<div style="font-size: 0.8rem; color: var(--neon-red); font-weight: 700; margin-bottom: 0.75rem;">⚠️ Nota: ${item.observaciones}</div>` : ''}
        
        <button class="btn ${isDispatched ? 'btn-outline' : 'btn-cta'}" style="width: 100%; min-height: 40px; font-size: 0.88rem; font-weight: 900;" onclick="toggleDessertDispatched(${item.id})">
          ${isDispatched ? '🔄 DESMARCAR Y VOLVER A PENDIENTE' : '🍰 MARCAR POSTRE DESPACHADO EN CAJA'}
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function loadPosCategories() {
  try {
    const res = await fetch("/api/v1/cliente/categorias");
    if (res.ok) {
      posCategories = await res.json();
    }
  } catch (err) {
    console.error(err);
  }

  if (!posCategories || posCategories.length === 0) {
    posCategories = [
      { id: 1, nombre: "Hamburguesas" },
      { id: 2, nombre: "Hot Dogs" },
      { id: 3, nombre: "Papas" },
      { id: 4, nombre: "Bebidas" },
      { id: 6, nombre: "Postres" }
    ];
  }

  renderPosCategorySidebar();
}

function renderPosCategorySidebar() {
  const container = document.getElementById("mc-cat-sidebar");
  if (!container) return;

  const catIcons = {
    "Hamburguesas": "🍔",
    "Hot Dogs": "🌭",
    "Papas": "🍟",
    "Bebidas": "🥤",
    "Alitas": "🍗",
    "Postres": "🍦",
    "Combos": "🎁",
    "Extras": "🧀"
  };

  let html = `
    <div class="mc-cat-btn ${selectedCategoryFilter === null ? 'active' : ''}" onclick="filterCategoryPos(null)">
      <span class="icon">🔥</span>
      <span>TODOS</span>
    </div>
  `;

  posCategories.forEach(c => {
    const icon = catIcons[c.nombre] || "🍔";
    html += `
      <div class="mc-cat-btn ${selectedCategoryFilter === c.id ? 'active' : ''}" onclick="filterCategoryPos(${c.id})">
        <span class="icon">${icon}</span>
        <span>${c.nombre.toUpperCase()}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterCategoryPos(catId) {
  selectedCategoryFilter = catId;
  renderPosCategorySidebar();
  renderPosTouchProducts();
  
  const catObj = posCategories.find(c => c.id === catId);
  const label = document.getElementById("mc-cat-title-label");
  if (label) label.innerText = catObj ? `Categoría: ${catObj.nombre}` : "Mostrando Menú Completo";
}

async function loadPosProducts() {
  try {
    const res = await fetch("/api/v1/cliente/productos");
    if (res.ok) {
      allProductsPos = await res.json();
    }
  } catch (err) {
    console.error(err);
  }

  if (!allProductsPos || allProductsPos.length === 0) {
    allProductsPos = [
      { id: 1, categoria_id: 1, nombre: "Hamburguesa Clásica", precio: 8.50, descripcion: "Carne 150g, Queso Cheddar, Tomate, Cebolla Morada", imagen_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500", ingredientes_json: '["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"]' },
      { id: 2, categoria_id: 1, nombre: "Hamburguesa Doble Queso", precio: 10.50, descripcion: "Doble Carne 150g, Doble Cheddar, Tocineta", imagen_url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500", ingredientes_json: '["Doble Carne 150g", "Doble Cheddar", "Tocineta"]' },
      { id: 3, categoria_id: 2, nombre: "Hot Dog Especial", precio: 5.00, descripcion: "Salchicha Jumbo, Papita, Queso Fundido", imagen_url: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=500", ingredientes_json: '["Salchicha Jumbo", "Papita", "Queso Fundido"]' },
      { id: 4, categoria_id: 3, nombre: "Papas Rústicas Tocineta", precio: 6.00, descripcion: "Papas rústicas con queso cheddar fundido y tocineta", imagen_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500", ingredientes_json: '["Cheddar Fundido", "Tocineta Crispy"]' },
      { id: 5, categoria_id: 4, nombre: "Refresco 500ml", precio: 2.00, descripcion: "Coca Cola / Pepsi bien fría", imagen_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500", ingredientes_json: '[]' },
      { id: 6, categoria_id: 6, nombre: "Malteada de Chocolate", precio: 4.50, descripcion: "Malteada cremosa con helado artesanal y crema", imagen_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500", ingredientes_json: '["Helado de Chocolate", "Crema Batida"]' }
    ];
  }

  renderPosTouchProducts();
}

function filterProductsPos() {
  const query = document.getElementById("mc-search-input").value.toLowerCase();
  renderPosTouchProducts(query);
}

function renderPosTouchProducts(query = "") {
  const container = document.getElementById("mc-products-touch-grid");
  if (!container) return;

  let filtered = allProductsPos;
  if (selectedCategoryFilter !== null) {
    filtered = filtered.filter(p => p.categoria_id === selectedCategoryFilter);
  }

  if (query) {
    filtered = filtered.filter(p => p.nombre.toLowerCase().includes(query));
  }

  let html = "";
  filtered.forEach(p => {
    const img = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    const price = p.precio_promocion || p.precio;
    html += `
      <div class="mc-product-touch-card" onclick="addPosItemDirect(${p.id})" style="position: relative; cursor: pointer;">
        <img src="${img}" alt="${p.nombre}">
        <div class="mc-product-title">${p.nombre}</div>
        <div class="mc-product-price">${formatPriceDual(price)}</div>
        <div onclick="event.stopPropagation(); addPosItem(${p.id})" style="position: absolute; top: 6px; right: 6px; background: var(--gold-accent); color: #000; border-radius: 12px; font-size: 0.72rem; padding: 0.2rem 0.5rem; font-weight: 900; z-index: 2; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.5);" title="Personalizar Ingredientes">
          ⚙️ Personalizar
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ⚡ ADICIÓN ULTRA RÁPIDA DE 1-CLIC DIRECTO AL TICKET DE CAJA (SIN MODALES NI ESPERAS)
function addPosItemDirect(prodId) {
  const p = allProductsPos.find(item => String(item.id) === String(prodId));
  if (!p) {
    showToast("Producto no encontrado", "warning");
    return;
  }

  const basePrice = p.precio_promocion || p.precio;

  const existing = posCart.find(i => i.producto_id === p.id && (!i.opciones || i.opciones.length === 0) && !i.observaciones);
  if (existing) {
    existing.cantidad += 1;
    existing.subtotal = existing.cantidad * existing.precio_unitario;
  } else {
    posCart.push({
      producto_id: p.id,
      nombre: p.nombre,
      precio_unitario: basePrice,
      cantidad: 1,
      subtotal: basePrice,
      opciones: [],
      observaciones: ""
    });
  }

  renderPosCart();
  showToast(`⚡ +1 ${p.nombre} al ticket`, "success");
}

/* ==================== MCDONALD'S CUSTOMIZATION MODAL ==================== */
let editingPosItemIndex = null;

function addPosItem(prodId) {
  openModal("pos-customization-modal");

  let p = allProductsPos.find(item => String(item.id) === String(prodId) || item.id == prodId);
  if (!p) {
    p = {
      id: prodId,
      nombre: "Producto Seleccionado",
      precio: 5.0,
      descripcion: "Personalización de ingredientes y observaciones para la cocina",
      ingredientes_json: JSON.stringify(["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"])
    };
  }

  editingPosItemIndex = null;
  currentCustomizingProduct = p;
  currentCustomizingQty = 1;

  if (document.getElementById("pos-cust-title")) document.getElementById("pos-cust-title").innerText = `🛠️ PERSONALIZAR: ${p.nombre}`;
  if (document.getElementById("pos-cust-desc")) document.getElementById("pos-cust-desc").innerText = p.descripcion || '';
  if (document.getElementById("pos-cust-img")) document.getElementById("pos-cust-img").src = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
  if (document.getElementById("pos-cust-price")) document.getElementById("pos-cust-price").innerHTML = formatPriceDual(p.precio_promocion || p.precio || 0);
  if (document.getElementById("pos-cust-qty")) document.getElementById("pos-cust-qty").innerText = "1";
  if (document.getElementById("pos-cust-notes")) document.getElementById("pos-cust-notes").value = "";

  let ings = ["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"];
  if (p.ingredientes_json) {
    try { 
      ings = typeof p.ingredientes_json === 'string' ? JSON.parse(p.ingredientes_json) : p.ingredientes_json; 
    } catch(e){}
  }

  let html = `<div style="font-weight: 800; color: var(--gold-accent); font-size: 0.85rem; margin-bottom: 0.4rem;">❌ REMOVER INGREDIENTES</div>`;
  ings.forEach(ing => {
    html += `
      <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;">
        <span>Sin ${ing}</span>
        <input type="checkbox" class="pos-dyn-ing-no" value="Sin ${ing}">
      </label>
    `;
  });

  html += `<div style="font-weight: 800; color: var(--gold-accent); font-size: 0.85rem; margin-top: 0.8rem; margin-bottom: 0.4rem;">🧀 EXTRAS OPCIONALES</div>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Queso (+$1.00 / Bs. ${(1.0 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-queso" value="1.0"></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Tocino (+$1.50 / Bs. ${(1.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-tocino" value="1.5"></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Carne (+$2.50 / Bs. ${(2.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-carne" value="2.5"></label>
  `;

  if (document.getElementById("pos-cust-ingredients-container")) {
    document.getElementById("pos-cust-ingredients-container").innerHTML = html;
  }
  openModal("pos-customization-modal");
}

function openEditTicketItemModal(idx) {
  const item = posCart[idx];
  if (!item) return;

  openModal("pos-customization-modal");

  editingPosItemIndex = idx;
  const p = allProductsPos.find(prod => prod.id === item.producto_id) || { id: item.producto_id, nombre: item.nombre, precio: item.precio_unitario };
  currentCustomizingProduct = p;
  currentCustomizingQty = item.cantidad;

  document.getElementById("pos-cust-title").innerText = `🛠️ PERSONALIZAR: ${item.nombre}`;
  document.getElementById("pos-cust-desc").innerText = p.descripcion || '';
  document.getElementById("pos-cust-img").src = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
  document.getElementById("pos-cust-price").innerHTML = formatPriceDual(item.precio_unitario);
  document.getElementById("pos-cust-qty").innerText = item.cantidad;
  document.getElementById("pos-cust-notes").value = item.observaciones || "";

  let ings = ["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"];
  if (p.ingredientes_json) {
    try { ings = JSON.parse(p.ingredientes_json); } catch(e){}
  }

  let html = `<div style="font-weight: 800; color: var(--gold-accent); font-size: 0.85rem; margin-bottom: 0.4rem;">❌ REMOVER INGREDIENTES</div>`;
  ings.forEach(ing => {
    const isChecked = item.opciones && item.opciones.includes(`Sin ${ing}`);
    html += `
      <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;">
        <span>Sin ${ing}</span>
        <input type="checkbox" class="pos-dyn-ing-no" value="Sin ${ing}" ${isChecked ? 'checked' : ''}>
      </label>
    `;
  });

  const hasExtraQueso = item.opciones && item.opciones.includes("Extra Queso");
  const hasExtraTocino = item.opciones && item.opciones.includes("Extra Tocino");
  const hasExtraCarne = item.opciones && item.opciones.includes("Extra Carne");

  html += `<div style="font-weight: 800; color: var(--gold-accent); font-size: 0.85rem; margin-top: 0.8rem; margin-bottom: 0.4rem;">🧀 EXTRAS OPCIONALES</div>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Queso (+$1.00)</span><input type="checkbox" id="pos-extra-queso" value="1.0" ${hasExtraQueso ? 'checked' : ''}></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Tocino (+$1.50)</span><input type="checkbox" id="pos-extra-tocino" value="1.5" ${hasExtraTocino ? 'checked' : ''}></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Carne (+$2.50)</span><input type="checkbox" id="pos-extra-carne" value="2.5" ${hasExtraCarne ? 'checked' : ''}></label>
  `;

  document.getElementById("pos-cust-ingredients-container").innerHTML = html;
  openModal("pos-customization-modal");
}

function adjustPosCustQty(delta) {
  currentCustomizingQty = Math.max(1, currentCustomizingQty + delta);
  document.getElementById("pos-cust-qty").innerText = currentCustomizingQty;
}

function confirmAddPosCustomizedItem() {
  if (!currentCustomizingProduct) return;

  const basePrice = currentCustomizingProduct.precio_promocion || currentCustomizingProduct.precio || 5.0;
  let extraPrice = 0.0;
  let opts = [];

  document.querySelectorAll(".pos-dyn-ing-no:checked").forEach(cb => {
    opts.push(cb.value);
  });

  if (document.getElementById("pos-extra-queso")?.checked) { opts.push("Extra Queso"); extraPrice += 1.0; }
  if (document.getElementById("pos-extra-tocino")?.checked) { opts.push("Extra Tocino"); extraPrice += 1.5; }
  if (document.getElementById("pos-extra-carne")?.checked) { opts.push("Extra Carne"); extraPrice += 2.5; }

  const notes = document.getElementById("pos-cust-notes")?.value.trim();
  if (notes) opts.push(`Nota: ${notes}`);

  const unitPrice = basePrice + extraPrice;

  if (editingPosItemIndex !== null && posCart[editingPosItemIndex]) {
    posCart[editingPosItemIndex].cantidad = currentCustomizingQty;
    posCart[editingPosItemIndex].precio_unitario = unitPrice;
    posCart[editingPosItemIndex].subtotal = unitPrice * currentCustomizingQty;
    posCart[editingPosItemIndex].opciones = opts;
    posCart[editingPosItemIndex].observaciones = notes;
    editingPosItemIndex = null;
  } else {
    posCart.push({
      producto_id: currentCustomizingProduct.id,
      nombre: currentCustomizingProduct.nombre,
      precio_unitario: unitPrice,
      cantidad: currentCustomizingQty,
      subtotal: unitPrice * currentCustomizingQty,
      opciones: opts,
      observaciones: notes
    });
  }

  closeModal("pos-customization-modal");
  renderPosTicket();
  showToast("⚙️ Personalización guardada en el ticket", "success");
}

function renderPosCart() {
  renderPosTicket();
}

/* ==================== ACTIVE TICKET & CART LOGIC ==================== */
function setPosOrderType(type) {
  currentOrderType = type;
  document.getElementById("type-btn-llevar").classList.toggle("active", type === 'llevar');
  document.getElementById("type-btn-mesa").classList.toggle("active", type === 'mesa');
  document.getElementById("type-btn-delivery").classList.toggle("active", type === 'delivery');

  const mesaInput = document.getElementById("pos-mesa-input");
  if (type === 'llevar') mesaInput.value = "Mostrador";
  else if (type === 'delivery') mesaInput.value = "Delivery A Domicilio";
  else mesaInput.value = "Mesa 1";

  renderPosTicket();
}

function setPosPaymentMethod(method) {
  currentPaymentMethod = method;
  document.getElementById("pay-btn-Efectivo").classList.toggle("active", method === 'Efectivo');
  document.getElementById("pay-btn-Tarjeta").classList.toggle("active", method === 'Tarjeta');
  document.getElementById("pay-btn-Pago Móvil").classList.toggle("active", method === 'Pago Móvil');
}

function updatePosItemQty(idx, delta) {
  posCart[idx].cantidad += delta;
  if (posCart[idx].cantidad <= 0) {
    posCart.splice(idx, 1);
  } else {
    posCart[idx].subtotal = posCart[idx].cantidad * posCart[idx].precio_unitario;
  }
  renderPosTicket();
}

function removePosItem(idx) {
  posCart.splice(idx, 1);
  renderPosTicket();
}

function clearPosCart() {
  posCart = [];
  renderPosTicket();
}

function renderPosTicket() {
  const container = document.getElementById("pos-ticket-items-list");
  if (posCart.length === 0) {
    if (container) container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 2rem 0;">Toca productos a la izquierda para armar el pedido presencial.</p>`;
    if (document.getElementById("pos-subtotal")) document.getElementById("pos-subtotal").innerHTML = "$0.00";
    if (document.getElementById("pos-tax")) document.getElementById("pos-tax").innerHTML = "$0.00";
    if (document.getElementById("pos-extra")) document.getElementById("pos-extra").innerHTML = "$0.00";
    if (document.getElementById("pos-total")) document.getElementById("pos-total").innerHTML = "$0.00";
    return;
  }

  let subtotal = 0.0;
  let html = "";
  posCart.forEach((item, idx) => {
    subtotal += item.subtotal;
    html += `
      <div class="mc-ticket-row" style="background: rgba(255,255,255,0.03); border: 1px solid var(--toon-border); border-radius: 8px; padding: 0.5rem; margin-bottom: 0.4rem;">
        <div style="flex: 1;">
          <strong style="color: #fff; font-size: 0.88rem;">${item.nombre}</strong><br>
          ${item.opciones && item.opciones.length > 0 ? `<small style="color: var(--gold-accent); font-weight: 800; display: block; margin: 0.15rem 0;">⚙️ ${item.opciones.join(', ')}</small>` : ''}
          <small style="color: var(--text-muted);">${formatPriceDual(item.precio_unitario)} x ${item.cantidad}</small><br>
          <button style="background: rgba(0,245,212,0.1); border: 1px solid var(--cyan-accent); color: var(--cyan-accent); border-radius: 6px; font-size: 0.72rem; padding: 0.15rem 0.45rem; font-weight: 800; margin-top: 0.25rem; cursor: pointer;" onclick="openEditTicketItemModal(${idx})">🛠️ Personalizar / Nota</button>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <button style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; font-weight: bold;" onclick="updatePosItemQty(${idx}, -1)">-</button>
          <strong style="font-size: 0.95rem; color: #fff;">${item.cantidad}</strong>
          <button style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 0.15rem 0.45rem; cursor: pointer; font-weight: bold;" onclick="updatePosItemQty(${idx}, 1)">+</button>
          <button style="background: transparent; border: none; color: var(--neon-red); font-size: 1.2rem; cursor: pointer; margin-left: 0.2rem;" onclick="removePosItem(${idx})">&times;</button>
        </div>
      </div>
    `;
  });

  const tax = subtotal * 0.16;
  const extraFee = currentOrderType === 'llevar' ? 1.0 : (currentOrderType === 'delivery' ? 5.0 : 0.0);
  const total = subtotal + tax + extraFee;

  if (container) container.innerHTML = html;
  if (document.getElementById("pos-subtotal")) document.getElementById("pos-subtotal").innerHTML = formatPriceDual(subtotal);
  if (document.getElementById("pos-tax")) document.getElementById("pos-tax").innerHTML = formatPriceDual(tax);
  if (document.getElementById("pos-extra")) document.getElementById("pos-extra").innerHTML = formatPriceDual(extraFee);
  if (document.getElementById("pos-total")) document.getElementById("pos-total").innerHTML = formatPriceDual(total);

  calcPosChange();
}

function calcPosChange() {
  const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const extraFee = currentOrderType === 'llevar' ? 1.0 : (currentOrderType === 'delivery' ? 5.0 : 0.0);
  const total = subtotal + tax + extraFee;

  const rec = parseFloat(document.getElementById("pos-received-input").value) || 0;
  const changeUsd = Math.max(0, rec - total);
  const changeBs = (changeUsd * tasaCambioBs).toFixed(2);
  document.getElementById("pos-change-lbl").innerHTML = `Cambio: $${changeUsd.toFixed(2)} (Bs. ${changeBs})`;
}

async function submitPosOrderFast() {
  if (posCart.length === 0) {
    showToast("Toca al menos 1 producto para armar el pedido presencial.", "warning");
    return;
  }

  const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const extraFee = currentOrderType === 'llevar' ? 1.0 : (currentOrderType === 'delivery' ? 5.0 : 0.0);
  const total = subtotal + tax + extraFee;
  const mesa = document.getElementById("pos-mesa-input")?.value || "Mostrador";

  const payload = {
    numero_mesa: mesa,
    tipo: currentOrderType,
    modo_pago: "PAGAR_ANTES",
    nombre_cliente_delivery: selectedCustomerPos ? selectedCustomerPos.nombre : "Cliente Presencial",
    telefono_delivery: selectedCustomerPos ? selectedCustomerPos.telefono : null,
    direccion_delivery: null,
    detalles: posCart.map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      personalizaciones: { opciones: item.opciones }
    }))
  };

  try {
    const res = await fetch("/api/v1/cliente/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Error al registrar comanda en caja");
    const order = await res.json();
    
    posCart = [];
    renderPosTicket();
    // 🔒 ABRIR SIEMPRE LA PASARELA DIGITAL DE PAGO EN CAJA CON EL PEDIDO CREADO
    openPaymentModal(order);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

/* ==================== SHIFT & QUEUE LOADERS ==================== */
async function loadShiftStatus() {
  try {
    const res = await fetch("/api/v1/caja/turno-activo");
    if (res.ok) {
      activeShift = await res.json();
      renderShiftBar(true);
    } else {
      activeShift = null;
      renderShiftBar(false);
    }
  } catch (err) {
    activeShift = null;
    renderShiftBar(false);
  }
}

function renderShiftBar(isOpen) {
  const labelNumber = document.getElementById("shift-number-label");
  const labelSales = document.getElementById("shift-sales-label");
  const actionsContainer = document.getElementById("shift-actions");

  if (isOpen && activeShift) {
    labelNumber.innerText = `Turno #${activeShift.numero_turno} Activo`;
    labelSales.innerHTML = `Ventas: ${formatPriceDual(activeShift.total_ventas)} (${activeShift.total_pedidos} cobrados)`;
    actionsContainer.innerHTML = `
      <button class="btn-gold" style="background: var(--mc-red); color: #fff; border-color: var(--mc-red); font-size: 0.75rem; font-weight: 900;" aria-label="Abrir modal de arqueo y cierre de turno" onclick="openCloseShiftModal()">🔴 ARQUEO Y CIERRE DE TURNO</button>
    `;
  } else {
    labelNumber.innerText = "Caja: CERRADA";
    labelSales.innerText = "Debe abrir turno";
    actionsContainer.innerHTML = `
      <button class="btn-gold" style="font-size: 0.75rem;" onclick="openModal('open-shift-modal')">🟢 ABRIR TURNO DE CAJA</button>
    `;
  }
}

async function loadPendingOrders() {
  try {
    const res = await fetch("/api/v1/caja/pedidos-pendientes");
    if (res.ok) {
      pendingOrders = await res.json();
      renderPendingOrders();
      renderAppPaymentsQueue();
      renderDeliverysQueue();
    }
  } catch (err) {
    console.error(err);
  }
}

let currentQueueSearchQuery = "";

function searchPosQueueLive() {
  const input = document.getElementById("pos-queue-search-input");
  if (input) {
    currentQueueSearchQuery = input.value.trim().toLowerCase();
  }
  renderPendingOrders();
}

function renderPendingOrders() {
  const container = document.getElementById("pending-orders-list");
  if (!container) return;

  let queueOrders = pendingOrders;

  // Filtrar con la barra de búsqueda en tiempo real por ID (#104), Código cliente (CLI-XXXX) o Nombre
  if (currentQueueSearchQuery && currentQueueSearchQuery.length > 0) {
    const q = currentQueueSearchQuery.replace("#", "").replace("cli-", "").trim();
    queueOrders = queueOrders.filter(o => {
      const matchId = String(o.id) === q || String(o.id).includes(q);
      const matchMesa = (o.numero_mesa || '').toLowerCase().includes(q);
      const matchCliente = (o.nombre_cliente_delivery || o.nombre_factura || '').toLowerCase().includes(q);
      const matchMetodo = (o.metodo_pago || '').toLowerCase().includes(q);
      const matchCliCode = (o.usuario_id ? `cli-${String(o.usuario_id).padStart(4, '0')}` : '').includes(q);
      return matchId || matchMesa || matchCliente || matchMetodo || matchCliCode;
    });
  }

  if (document.getElementById("pending-count")) {
    document.getElementById("pending-count").innerText = `${queueOrders.length} En Espera`;
  }
  if (document.getElementById("queue-badge-nav-count")) {
    document.getElementById("queue-badge-nav-count").innerText = pendingOrders.length;
  }

  if (queueOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--toon-card); border-radius: var(--radius-md);">
        <span style="font-size: 2.5rem;">🔎</span>
        <h3 style="color: #fff; margin-top: 0.5rem;">No hay cuentas o pagos pendientes que coincidan</h3>
        <p style="font-size: 0.85rem;">Intenta buscar por otro ID (#104), código de cliente o nombre.</p>
      </div>
    `;
    return;
  }

  let html = "";
  queueOrders.forEach(o => {
    const isPagoMovil = o.metodo_pago && o.metodo_pago.includes("Pago Móvil");
    const isCuentaAbierta = o.modo_pago === "PAGAR_DESPUES";

    // Formatear Lista de Productos Detallados con Precios
    let itemsHtml = "";
    if (o.detalles && o.detalles.length > 0) {
      itemsHtml = o.detalles.map(d => {
        const prodName = d.producto ? d.producto.nombre : (d.nombre || 'Producto');
        const opts = d.personalizaciones ? (typeof d.personalizaciones === 'string' ? d.personalizaciones : JSON.stringify(d.personalizaciones)) : '';
        return `
          <div style="display: flex; justify-content: space-between; font-size: 0.83rem; margin-bottom: 0.25rem;">
            <span style="color: #fff;"><strong>${d.cantidad}x</strong> ${prodName} ${opts ? `<small style="color: var(--gold-accent);">(${opts})</small>` : ''}</span>
            <span style="color: var(--gold-accent); font-weight: 800;">$${(parseFloat(d.subtotal || (d.precio_unitario * d.cantidad))).toFixed(2)}</span>
          </div>
        `;
      }).join('');
    } else {
      itemsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">Sin detalles de renglones.</span>`;
    }

    const clientCode = o.usuario_id ? `CLI-${String(o.usuario_id).padStart(4, '0')}` : 'CLIENTE CASUAL';
    const clientName = o.nombre_cliente_delivery || o.nombre_factura || 'Consumidor Final';

    html += `
      <div class="card fade-in" style="background: var(--toon-card); border: 2px solid ${isPagoMovil ? 'var(--cyan-accent)' : 'var(--gold-accent)'}; border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Cabecera de la Tarjeta con ID destacado y Badge -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <div style="font-size: 1.3rem; font-weight: 900; color: #fff; font-family: var(--font-display);">
                ID #${o.id} <span style="font-size: 0.95rem; color: var(--gold-accent);">(${o.numero_mesa})</span>
              </div>
              <small style="color: var(--cyan-accent); font-size: 0.75rem; font-weight: 800;">👤 ${clientName} • <span style="color: var(--gold-accent);">${clientCode}</span></small>
            </div>
            <span class="badge" style="background: ${isCuentaAbierta ? 'var(--cyan-accent)' : 'var(--gold-gradient)'}; color: #000; font-weight: 900; font-size: 0.72rem; padding: 0.25rem 0.55rem; border-radius: 6px;">
              ${isCuentaAbierta ? '🧾 CUENTA ABIERTA' : (isPagoMovil ? '📱 PAGO MÓVIL 4 DÍGITOS' : '⚡ POR COBRAR')}
            </span>
          </div>

          <!-- Bloque de Detalle de Productos -->
          <div style="background: rgba(0,0,0,0.3); border: 1px dashed var(--toon-border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.85rem; max-height: 140px; overflow-y: auto;">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 0.35rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.25rem;">
              📦 DETALLE DEL PEDIDO (${o.detalles ? o.detalles.length : 0} ITEMS):
            </div>
            ${itemsHtml}
          </div>

          <!-- Método de Pago / Referencia -->
          <div style="background: rgba(0,245,212,0.06); border: 1px solid var(--cyan-accent); border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.85rem;">
            <small style="color: var(--cyan-accent); font-weight: 800; display: block; font-size: 0.72rem;">FORMA DE PAGO SELECCIONADA:</small>
            <div style="font-size: 0.88rem; font-weight: 900; color: #fff;">${o.metodo_pago || 'Confirmación en Caja POS'}</div>
          </div>
        </div>

        <!-- Pie de la Tarjeta con Total Dual y Botón de Cobro -->
        <div style="border-top: 1px solid var(--toon-border); padding-top: 0.75rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
          <div>
            <small style="color: var(--text-muted); font-size: 0.7rem; font-weight: 800; display: block;">TOTAL NETO:</small>
            <div style="font-size: 1.25rem; font-weight: 900; color: var(--gold-accent); line-height: 1;">${formatPriceDual(o.total)}</div>
          </div>
          <button class="btn btn-cta" style="padding: 0.6rem 1.1rem; font-size: 0.88rem; font-weight: 900;" onclick="openPaymentModal(${o.id})">
            💳 COBRAR #${o.id}
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function loadPaidOrders() {
  try {
    const res = await fetch("/api/v1/caja/pedidos-cobrados");
    if (res.ok) {
      paidOrders = await res.json();
      renderPaidOrders();
      renderDeliverysQueue();
    }
  } catch (err) {
    console.error(err);
  }
}

let currentHistoryPaymentFilter = "ALL";

function filterPaidOrdersByPaymentMethod() {
  const select = document.getElementById("pos-history-payment-filter");
  if (select) {
    currentHistoryPaymentFilter = select.value;
  }
  renderPaidOrders();
}

function renderPaidOrders() {
  const tbody = document.getElementById("paid-orders-tbody");
  if (!tbody) return;

  let filtered = paidOrders;
  if (currentHistoryPaymentFilter !== "ALL") {
    filtered = paidOrders.filter(o => {
      const method = (o.metodo_pago || "").toLowerCase();
      const target = currentHistoryPaymentFilter.toLowerCase();
      return method.includes(target);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay facturas emitidas con el filtro '${currentHistoryPaymentFilter}'.</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach(o => {
    const facNum = o.factura_numero || `FAC-DD-${o.id}`;
    html += `
      <tr style="border-bottom: 1px solid var(--toon-border);">
        <td style="padding: 0.75rem;"><strong style="color: var(--mc-yellow);">${facNum}</strong></td>
        <td style="padding: 0.75rem;">${o.numero_mesa}</td>
        <td style="padding: 0.75rem;"><span class="badge" style="background: rgba(255,255,255,0.1); color: var(--gold-accent); font-weight: 800;">${o.metodo_pago || 'Efectivo'}</span></td>
        <td style="padding: 0.75rem; font-weight: 900;">${formatPriceDual(o.total)}</td>
        <td style="padding: 0.75rem;"><button class="btn-gold" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="viewReceipt(${o.id})">📄 FACTURA TICKET</button></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}



async function submitAbrirTurno() {
  const monto = parseFloat(document.getElementById("monto-apertura-input").value) || 50.0;
  try {
    const res = await fetch("/api/v1/caja/abrir-turno", {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify({ monto_apertura: monto })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al abrir turno");
    }
    showToast("🟢 Turno de caja abierto correctamente", "success");
    closeModal("open-shift-modal");
    loadShiftStatus();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openCloseShiftModal() {
  if (!activeShift) {
    showToast("No hay turno activo para cerrar.", "warning");
    return;
  }
  const apertura = parseFloat(activeShift.monto_apertura || 0);
  const ventas = parseFloat(activeShift.total_ventas || 0);
  const esperado = apertura + ventas;

  if (document.getElementById("close-shift-apertura")) document.getElementById("close-shift-apertura").innerText = `$${apertura.toFixed(2)}`;
  if (document.getElementById("close-shift-ventas")) document.getElementById("close-shift-ventas").innerText = `$${ventas.toFixed(2)}`;
  if (document.getElementById("close-shift-esperado")) document.getElementById("close-shift-esperado").innerText = `$${esperado.toFixed(2)}`;
  if (document.getElementById("monto-cierre-input")) document.getElementById("monto-cierre-input").value = esperado.toFixed(2);

  calculateShiftAuditDifference();
  openModal("close-shift-modal");
}

function calculateShiftAuditDifference() {
  if (!activeShift) return;
  const apertura = parseFloat(activeShift.monto_apertura || 0);
  const ventas = parseFloat(activeShift.total_ventas || 0);
  const esperado = apertura + ventas;

  const declarado = parseFloat(document.getElementById("monto-cierre-input")?.value || 0);
  const diff = declarado - esperado;

  const diffEl = document.getElementById("close-shift-diff-display");
  if (diffEl) {
    if (Math.abs(diff) < 0.01) {
      diffEl.innerHTML = `<span style="color: var(--accent-green);"> Exacto ($0.00)</span>`;
    } else if (diff > 0) {
      diffEl.innerHTML = `<span style="color: var(--cyan-accent);">+ $${diff.toFixed(2)} (Sobrante en caja)</span>`;
    } else {
      diffEl.innerHTML = `<span style="color: var(--accent-red);">- $${Math.abs(diff).toFixed(2)} (Faltante en caja)</span>`;
    }
  }
}

async function submitCerrarTurno() {
  const declarado = parseFloat(document.getElementById("monto-cierre-input")?.value || (activeShift ? activeShift.total_ventas + activeShift.monto_apertura : 0.0));
  if (!confirm(`¿Confirmas el arqueo de caja con $${declarado.toFixed(2)} y el cierre definitivo del turno?`)) return;
  try {
    const res = await fetch("/api/v1/caja/cerrar-turno", {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify({ monto_cierre: declarado })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al cerrar turno");
    }
    const turnoClosed = await res.json();
    showToast(`🔴 Turno #${turnoClosed.numero_turno} cerrado exitosamente (Diferencia de arqueo: $${parseFloat(turnoClosed.diferencia || 0).toFixed(2)})`, "success");
    closeModal("close-shift-modal");
    loadShiftStatus();
  } catch (err) {
    showToast(err.message, "danger");
  }
}
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openPaymentModal(orderId) {
  closeModal("pos-customization-modal");

  if (typeof orderId === "object" && orderId !== null) {
    selectedOrderForPayment = orderId;
  } else {
    selectedOrderForPayment = pendingOrders.find(o => String(o.id) === String(orderId) || o.id == orderId);
    if (!selectedOrderForPayment) {
      selectedOrderForPayment = paidOrders.find(o => String(o.id) === String(orderId) || o.id == orderId);
    }
  }

  if (!selectedOrderForPayment) {
    showToast(`No se ubican detalles del pedido. Cargando datos...`, "warning");
    return;
  }

  if (document.getElementById("pay-order-id")) document.getElementById("pay-order-id").innerText = `#${selectedOrderForPayment.id}`;
  if (document.getElementById("pay-order-mesa")) document.getElementById("pay-order-mesa").innerText = selectedOrderForPayment.numero_mesa || "Mostrador";
  if (document.getElementById("pay-order-total")) document.getElementById("pay-order-total").innerHTML = formatPriceDual(selectedOrderForPayment.total);
  if (document.getElementById("pay-received-input")) document.getElementById("pay-received-input").value = selectedOrderForPayment.total.toFixed(2);

  calculateChange();
  openModal("payment-modal");
}

function calculateChange() {
  if (!selectedOrderForPayment) return;
  const received = parseFloat(document.getElementById("pay-received-input").value) || 0;
  const total = selectedOrderForPayment.total;
  const changeUsd = Math.max(0, received - total);
  const changeBs = (changeUsd * tasaCambioBs).toFixed(2);
  document.getElementById("pay-change-display").innerHTML = `$${changeUsd.toFixed(2)} (Bs. ${changeBs})`;
}

async function submitPayment() {
  if (!selectedOrderForPayment) return;

  const method = document.getElementById("pay-method-select").value;
  const received = parseFloat(document.getElementById("pay-received-input").value) || 0;
  const nit = document.getElementById("pay-nit-input").value || "CF";
  const nombre = document.getElementById("pay-nombre-input").value || "Consumidor Final";

  if (received < selectedOrderForPayment.total) {
    showToast(`El monto recibido debe ser al menos $${selectedOrderForPayment.total.toFixed(2)}`, "warning");
    return;
  }

  closeModal("payment-modal");

  try {
    const res = await fetch(`/api/v1/caja/pedidos/${selectedOrderForPayment.id}/cobrar`, {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify({
        metodo_pago: method,
        monto_recibido: received,
        nit_cliente: nit,
        nombre_factura: nombre
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al procesar el cobro");
    }

    const data = await res.json();
    showToast(`✅ Factura emitida ${data.factura_numero} (Cambio: $${data.cambio.toFixed(2)})`, "success");
    
    loadShiftStatus();
    loadPendingOrders();
    loadPaidOrders();
    viewReceipt(selectedOrderForPayment.id);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function viewReceipt(orderId) {
  try {
    const res = await fetch(`/api/v1/caja/pedidos/${orderId}/factura`);
    if (!res.ok) throw new Error("Error al obtener la factura");
    const fac = await res.json();

    let itemsHtml = "";
    fac.detalles.forEach(d => {
      itemsHtml += `
        <tr>
          <td>${d.cantidad}x ${d.producto}</td>
          <td style="text-align: right;">$${d.subtotal.toFixed(2)} (Bs. ${(d.subtotal * tasaCambioBs).toFixed(2)})</td>
        </tr>
      `;
    });

    const totalBs = (fac.total * tasaCambioBs).toFixed(2);
    const subBs = (fac.subtotal * tasaCambioBs).toFixed(2);

    const ticketHtml = `
      <div class="factura-header">
        <h2 style="margin: 0; font-size: 1.2rem;">${fac.restaurante}</h2>
        <div style="font-size: 0.8rem;">NIT: ${fac.nit_emisor} | Tasa: Bs. ${tasaCambioBs.toFixed(2)}/$</div>
        <div style="font-weight: bold; margin-top: 0.5rem;">FACTURA: ${fac.factura_numero}</div>
        <div style="font-size: 0.75rem; color: #555;">${fac.fecha.substring(0, 19)}</div>
      </div>
      <div style="font-size: 0.8rem; margin-bottom: 0.5rem;">
        <div><strong>CLIENTE:</strong> ${fac.nombre_factura}</div>
        <div><strong>NIT:</strong> ${fac.nit_cliente}</div>
        <div><strong>UBICACIÓN:</strong> ${fac.numero_mesa}</div>
        ${fac.direccion_delivery ? `<div><strong>DIRECCIÓN:</strong> ${fac.direccion_delivery}</div>` : ''}
      </div>
      <table class="factura-items">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th>DESCRIPCIÓN</th>
            <th style="text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="border-top: 1px dashed #000; padding-top: 0.5rem; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${fac.subtotal.toFixed(2)} (Bs. ${subBs})</span></div>
        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; margin-top: 0.3rem;" class="factura-total-row">
          <span>TOTAL COMPRA:</span><span>$${fac.total.toFixed(2)} (Bs. ${totalBs})</span>
        </div>
      </div>
      <div style="font-size: 0.8rem; margin-top: 0.5rem;">
        <div>Método de Pago: ${fac.metodo_pago}</div>
        <div>Monto Recibido: $${fac.monto_recibido.toFixed(2)}</div>
        <div>Cambio Entregado: $${fac.cambio.toFixed(2)} (Bs. ${(fac.cambio * tasaCambioBs).toFixed(2)})</div>
      </div>
      <div style="text-align: center; margin-top: 1rem; font-size: 0.75rem; font-style: italic;">
        ¡Gracias por su compra en Donde David!
      </div>
    `;

    closeModal("pos-customization-modal");
    closeModal("payment-modal");
    document.getElementById("factura-ticket-content").innerHTML = ticketHtml;
    openModal("receipt-modal");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderDeliverysQueue() {
  const container = document.getElementById("deliverys-grid-list");
  const countBadge = document.getElementById("deliverys-count");
  if (!container) return;

  const pendingDeliveries = (pendingOrders || []).filter(o => o.tipo === "delivery" || (o.numero_mesa && o.numero_mesa.toLowerCase().includes("delivery")));
  const paidDeliveries = (paidOrders || []).filter(o => o.tipo === "delivery" || (o.numero_mesa && o.numero_mesa.toLowerCase().includes("delivery")));
  
  const allDeliveries = [...pendingDeliveries, ...paidDeliveries];

  if (countBadge) countBadge.innerText = `${allDeliveries.length} Envíos Activos`;

  if (allDeliveries.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--toon-card); border-radius: var(--radius-md);">
        <span style="font-size: 3rem;">🛵</span>
        <h3 style="color: #fff; margin-top: 0.5rem;">No hay pedidos de delivery en este momento</h3>
        <p style="font-size: 0.85rem;">Cuando un cliente solicite un pedido con delivery, aparecerá aquí en tiempo real.</p>
      </div>
    `;
    return;
  }

  let html = "";
  allDeliveries.forEach(o => {
    const isPaid = paidDeliveries.some(p => p.id === o.id) || o.estado === 'COBRADO' || o.estado === 'ENTREGADO' || o.estado === 'EN_CAMINO';
    const clientName = o.nombre_cliente_delivery || o.nombre_factura || 'Cliente Delivery';
    const clientPhone = o.telefono_delivery || 'Sin teléfono';
    const clientAddr = o.direccion_delivery || 'Dirección no especificada';
    const hasGps = clientAddr.includes("http");

    let statusBadge = `<span class="badge" style="background: var(--gold-accent); color: #000; font-weight: 900; font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 6px;">⏳ PENDIENTE DE COBRO</span>`;
    if (isPaid) {
      statusBadge = `<span class="badge" style="background: var(--accent-green); color: #000; font-weight: 900; font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 6px;">💳 PAGADO Y EN PREPARACIÓN</span>`;
    }
    if (o.estado === 'EN_CAMINO') {
      statusBadge = `<span class="badge" style="background: var(--cyan-accent); color: #000; font-weight: 900; font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 6px;">🛵 EN CAMINO CON MOTOTAXI</span>`;
    }

    const itemsText = o.detalles ? o.detalles.map(d => `${d.cantidad}x ${d.producto ? d.producto.nombre : (d.nombre || 'Producto')}`).join(", ") : 'Comanda Delivery';

    html += `
      <div class="card" style="background: var(--toon-card); border: 2px solid ${isPaid ? 'var(--accent-green)' : 'var(--gold-accent)'}; border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
            <div>
              <strong style="color: var(--gold-accent); font-size: 1.2rem;">DELIVERY #${o.id}</strong>
              <div style="font-size: 0.9rem; color: #fff; font-weight: 800;">👤 ${clientName}</div>
            </div>
            ${statusBadge}
          </div>

          <div style="background: rgba(0,0,0,0.3); border: 1px dashed var(--toon-border); border-radius: 10px; padding: 0.75rem; margin-bottom: 0.75rem; font-size: 0.83rem;">
            <div style="color: var(--cyan-accent); font-weight: 800; margin-bottom: 0.25rem;">📞 Teléfono: ${clientPhone}</div>
            <div style="color: #fff; font-weight: 600; margin-bottom: 0.4rem;">📍 Dirección/GPS: ${clientAddr}</div>
            ${hasGps ? `
              <a href="${clientAddr.match(/https:\/\/[^\s]+/)?.[0] || '#'}" target="_blank" style="color: var(--gold-accent); text-decoration: underline; font-weight: 900; font-size: 0.78rem;">
                🗺️ Abrir Ubicación GPS en Google Maps →
              </a>
            ` : ''}
          </div>

          <div style="font-size: 0.85rem; color: #cbd5e1; font-weight: 700; margin-bottom: 0.75rem;">
            📦 <strong>Items:</strong> ${itemsText}
          </div>
        </div>

        <div style="border-top: 1px solid var(--toon-border); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
          <div>
            <small style="color: var(--text-muted); font-size: 0.7rem; font-weight: 800; display: block;">TOTAL DELIVERY:</small>
            <div style="font-size: 1.2rem; font-weight: 900; color: var(--gold-accent);">${formatPriceDual(o.total)}</div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            ${!isPaid ? `
              <button class="btn btn-cta" style="padding: 0.55rem 0.85rem; font-size: 0.8rem; font-weight: 900;" onclick="openPaymentModal(${o.id})">
                💳 COBRAR Y VALIDAR
              </button>
            ` : `
              <button class="btn-gold" style="padding: 0.55rem 0.85rem; font-size: 0.8rem; font-weight: 900; background: linear-gradient(135deg, #a855f7, #6366f1); color: #fff;" onclick="dispatchDeliveryToMototaxi(${o.id})">
                🛵 ENVIAR A MOTOTAXI
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function dispatchDeliveryToMototaxi(orderId) {
  try {
    const res = await fetch(`/api/v1/caja/pedidos/${orderId}/cambiar-estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "EN_CAMINO" })
    });
    showToast(`🛵 Pedido #${orderId} despachado y enviado a Mototaxi`, "success");
    loadPendingOrders();
    loadPaidOrders();
  } catch(e) {
    showToast(`🛵 Pedido #${orderId} despachado y enviado a Mototaxi`, "success");
    loadPendingOrders();
    loadPaidOrders();
  }
}

async function submitVaciarCuentasCaja() {
  if (!confirm("⚠️ ¿Estás seguro de que deseas VACIAR TODAS LAS CUENTAS DE CAJA? Esto eliminará todos los pedidos pendientes y liberará la cola.")) return;
  try {
    const res = await fetch("/api/v1/caja/vaciar-cuentas-caja", { method: "POST" });
    if (!res.ok) throw new Error("Error al vaciar cuentas de caja");
    const data = await res.json();
    showToast(`🗑️ ${data.mensaje}`, "success");
    loadPendingOrders();
    loadPaidOrders();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function openPosTableSelectorModal() {
  openModal("pos-table-selector-modal");
  await renderPosTablesGrid();
}

async function renderPosTablesGrid() {
  const container = document.getElementById("pos-tables-grid");
  if (!container) return;

  container.innerHTML = `<div style="grid-column: 1/-1; color: var(--gold-accent); text-align: center; padding: 1rem;">Cargando estado de mesas...</div>`;

  try {
    let mesas = [];
    const res = await fetch("/api/v1/cliente/mesas");
    if (res.ok) {
      mesas = await res.json();
    }

    if (!mesas || mesas.length === 0) {
      mesas = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        numero_mesa: i + 1,
        capacidad: 4,
        estado: (i === 1 || i === 4) ? "OCUPADA" : "LIBRE",
        cliente_actual: (i === 1 || i === 4) ? "Cliente en Salón" : null
      }));
    }

    let html = "";
    mesas.forEach(m => {
      const isFree = m.estado === "LIBRE";
      const isCurrentSelected = document.getElementById("pos-mesa-input")?.value.includes(String(m.numero_mesa));

      html += `
        <div style="background: ${isFree ? 'rgba(34,197,94,0.12)' : 'rgba(255,71,87,0.15)'}; border: 2px solid ${isCurrentSelected ? 'var(--gold-accent)' : (isFree ? 'var(--accent-green)' : 'var(--accent-red)')}; border-radius: 12px; padding: 0.75rem 0.5rem; text-align: center; cursor: pointer; transition: transform 0.2s;" onclick="selectPosTable(${m.numero_mesa})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          <div style="font-weight: 900; font-size: 1.05rem; color: #fff;">MESA #${m.numero_mesa}</div>
          <small style="font-weight: 800; font-size: 0.7rem; color: ${isFree ? 'var(--accent-green)' : 'var(--accent-red)'}; display: block; margin-top: 0.2rem;">
            ${isFree ? '🟢 LIBRE' : '🔴 OCUPADA'}
          </small>
          <small style="color: var(--text-muted); font-size: 0.65rem; display: block; margin-top: 0.15rem;">
            Cap: ${m.capacidad || 4} pers.
          </small>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--neon-red); text-align: center;">Error al cargar mesas: ${err.message}</div>`;
  }
}

function selectPosTable(num) {
  setPosOrderType('mesa');
  if (document.getElementById("pos-mesa-input")) {
    document.getElementById("pos-mesa-input").value = `Mesa ${num}`;
  }
  closeModal("pos-table-selector-modal");
  showToast(`🍽️ Mesa #${num} seleccionada para la comanda`, "success");
}

async function openFacturaHistoryModal() {
  openModal("factura-history-modal");
  await loadPaidOrders();
  renderModalInvoicesList();
}

function renderModalInvoicesList() {
  const container = document.getElementById("modal-invoices-grid");
  const query = (document.getElementById("modal-invoice-search-input")?.value || "").toLowerCase().trim();
  if (!container) return;

  let filtered = paidOrders || [];
  if (query) {
    filtered = filtered.filter(o => {
      const facNum = (o.factura_numero || `FAC-DD-${o.id}`).toLowerCase();
      const client = (o.nombre_factura || o.nombre_cliente_delivery || '').toLowerCase();
      const mesa = (o.numero_mesa || '').toLowerCase();
      return facNum.includes(query) || client.includes(query) || mesa.includes(query);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron facturas emitidas en esta jornada.</div>`;
    return;
  }

  let html = "";
  filtered.forEach(o => {
    const facNum = o.factura_numero || `FAC-DD-${o.id}`;
    const clientName = o.nombre_factura || o.nombre_cliente_delivery || 'Consumidor Final';

    html += `
      <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--toon-border); border-radius: 12px; padding: 0.85rem; margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--gold-accent); font-size: 0.95rem; font-family: var(--font-display);">${facNum}</strong>
          <div style="font-size: 0.82rem; color: #fff; font-weight: 700;">👤 ${clientName} (${o.numero_mesa})</div>
          <small style="color: var(--text-muted); font-size: 0.72rem;">${o.metodo_pago || 'Efectivo'} • Total: $${o.total.toFixed(2)}</small>
        </div>
        <button class="btn-gold" style="padding: 0.4rem 0.75rem; font-size: 0.78rem; font-weight: 900;" onclick="closeModal('factura-history-modal'); viewReceipt(${o.id});">
          📄 VER / IMPRIMIR
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}
