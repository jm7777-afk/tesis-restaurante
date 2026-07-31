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
    if (event === "NUEVO_PEDIDO" || event === "PAGO_CONFIRMADO" || event === "TURNO_ACTUALIZADO") {
      loadShiftStatus();
      loadPendingOrders();
      loadPaidOrders();
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

  document.getElementById("view-btn-pos").classList.toggle("active", viewName === 'pos');
  document.getElementById("view-btn-queue").classList.toggle("active", viewName === 'queue');
  document.getElementById("view-btn-history").classList.toggle("active", viewName === 'history');
}

async function loadPosCategories() {
  try {
    const res = await fetch("/api/v1/cliente/categorias");
    if (res.ok) {
      posCategories = await res.json();
      renderPosCategorySidebar();
    }
  } catch (err) {
    console.error(err);
  }
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
  document.getElementById("mc-cat-title-label").innerText = catObj ? `Categoría: ${catObj.nombre}` : "Mostrando Menú Completo";
}

async function loadPosProducts() {
  try {
    const res = await fetch("/api/v1/cliente/productos");
    if (res.ok) {
      allProductsPos = await res.json();
      renderPosTouchProducts();
    }
  } catch (err) {
    console.error(err);
  }
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
      <div class="mc-product-touch-card" onclick="addPosItem(${p.id})">
        <img src="${img}" alt="${p.nombre}">
        <div class="mc-product-title">${p.nombre}</div>
        <div class="mc-product-price">${formatPriceDual(price)}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ==================== MCDONALD'S CUSTOMIZATION MODAL ==================== */
function addPosItem(prodId) {
  const p = allProductsPos.find(item => item.id === prodId);
  if (!p) return;

  currentCustomizingProduct = p;
  currentCustomizingQty = 1;

  document.getElementById("pos-cust-title").innerText = `🛠️ PERSONALIZAR: ${p.nombre}`;
  document.getElementById("pos-cust-desc").innerText = p.descripcion || '';
  document.getElementById("pos-cust-img").src = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
  document.getElementById("pos-cust-price").innerHTML = formatPriceDual(p.precio_promocion || p.precio);
  document.getElementById("pos-cust-qty").innerText = "1";
  document.getElementById("pos-cust-notes").value = "";

  // Render dynamic ingredients & extras
  let ings = ["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"];
  if (p.ingredientes_json) {
    try { ings = JSON.parse(p.ingredientes_json); } catch(e){}
  }

  let html = `<div style="font-weight: 800; color: var(--mc-yellow); font-size: 0.85rem; margin-bottom: 0.4rem;">❌ REMOVER INGREDIENTES</div>`;
  ings.forEach(ing => {
    html += `
      <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;">
        <span>Sin ${ing}</span>
        <input type="checkbox" class="pos-dyn-ing-no" value="Sin ${ing}">
      </label>
    `;
  });

  html += `<div style="font-weight: 800; color: var(--mc-yellow); font-size: 0.85rem; margin-top: 0.8rem; margin-bottom: 0.4rem;">🧀 EXTRAS OPCIONALES</div>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Queso (+$1.00 / Bs. ${(1.0 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-queso" value="1.0"></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Tocino (+$1.50 / Bs. ${(1.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-tocino" value="1.5"></label>
    <label style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.4rem; cursor: pointer; color: #fff;"><span>Extra Carne (+$2.50 / Bs. ${(2.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="pos-extra-carne" value="2.5"></label>
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

  const basePrice = currentCustomizingProduct.precio_promocion || currentCustomizingProduct.precio;
  let extraPrice = 0.0;
  let opts = [];

  document.querySelectorAll(".pos-dyn-ing-no:checked").forEach(cb => {
    opts.push(cb.value);
  });

  if (document.getElementById("pos-extra-queso")?.checked) { opts.push("Extra Queso"); extraPrice += 1.0; }
  if (document.getElementById("pos-extra-tocino")?.checked) { opts.push("Extra Tocino"); extraPrice += 1.5; }
  if (document.getElementById("pos-extra-carne")?.checked) { opts.push("Extra Carne"); extraPrice += 2.5; }

  const notes = document.getElementById("pos-cust-notes").value;
  if (notes) opts.push(`Nota: ${notes}`);

  const unitPrice = basePrice + extraPrice;

  posCart.push({
    producto_id: currentCustomizingProduct.id,
    nombre: currentCustomizingProduct.nombre,
    precio_unitario: unitPrice,
    cantidad: currentCustomizingQty,
    subtotal: unitPrice * currentCustomizingQty,
    opciones: opts
  });

  closeModal("pos-customization-modal");
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
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 2rem 0;">Toca productos a la izquierda para armar el pedido presencial.</p>`;
    document.getElementById("pos-subtotal").innerHTML = "$0.00 (Bs. 0.00)";
    document.getElementById("pos-tax").innerHTML = "$0.00 (Bs. 0.00)";
    document.getElementById("pos-extra").innerHTML = "$0.00 (Bs. 0.00)";
    document.getElementById("pos-total").innerHTML = "$0.00 (Bs. 0.00)";
    return;
  }

  let subtotal = 0.0;
  let html = "";
  posCart.forEach((item, idx) => {
    subtotal += item.subtotal;
    html += `
      <div class="mc-ticket-row">
        <div>
          <strong style="color: #fff;">${item.nombre}</strong><br>
          ${item.opciones && item.opciones.length > 0 ? `<small style="color: var(--mc-yellow);">${item.opciones.join(', ')}</small><br>` : ''}
          <small style="color: var(--text-muted);">${formatPriceDual(item.precio_unitario)} x ${item.cantidad}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 0.1rem 0.4rem; cursor: pointer;" onclick="updatePosItemQty(${idx}, -1)">-</button>
          <strong style="font-size: 0.9rem;">${item.cantidad}</strong>
          <button style="background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 4px; padding: 0.1rem 0.4rem; cursor: pointer;" onclick="updatePosItemQty(${idx}, 1)">+</button>
          <button style="background: transparent; border: none; color: var(--neon-red); font-weight: bold; cursor: pointer; margin-left: 0.3rem;" onclick="removePosItem(${idx})">&times;</button>
        </div>
      </div>
    `;
  });

  const tax = subtotal * 0.16;
  const extraFee = currentOrderType === 'llevar' ? 1.0 : (currentOrderType === 'delivery' ? 5.0 : 0.0);
  const total = subtotal + tax + extraFee;

  container.innerHTML = html;
  document.getElementById("pos-subtotal").innerHTML = formatPriceDual(subtotal);
  document.getElementById("pos-tax").innerHTML = formatPriceDual(tax);
  document.getElementById("pos-extra").innerHTML = formatPriceDual(extraFee);
  document.getElementById("pos-total").innerHTML = formatPriceDual(total);

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

  const rec = parseFloat(document.getElementById("pos-received-input").value) || total;
  const mesa = document.getElementById("pos-mesa-input").value || "Mostrador";

  if (rec < total) {
    showToast(`El monto recibido ($${rec.toFixed(2)}) es menor al total $${total.toFixed(2)}`, "warning");
    return;
  }

  const payload = {
    numero_mesa: mesa,
    tipo: currentOrderType,
    metodo_pago: currentPaymentMethod,
    monto_recibido: rec,
    nit_cliente: "CF",
    nombre_factura: "Consumidor Final",
    detalles: posCart.map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad
    }))
  };

  try {
    const res = await fetch("/api/v1/caja/crear-y-cobrar-rapido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Error al procesar pedido POS Touch");
    const data = await res.json();
    showToast(`⚡ Pedido y Factura ${data.factura_numero} emitida con éxito!`, "success");
    
    posCart = [];
    document.getElementById("pos-received-input").value = "";
    renderPosTicket();

    loadShiftStatus();
    loadPendingOrders();
    loadPaidOrders();
    viewReceipt(data.pedido_id);
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
      <button class="btn-gold" style="background: var(--mc-red); color: #fff; border-color: var(--mc-red); font-size: 0.75rem;" onclick="submitCerrarTurno()">🔴 CERRAR TURNO</button>
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
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPendingOrders() {
  const container = document.getElementById("pending-orders-list");
  document.getElementById("pending-count").innerText = pendingOrders.length;

  if (pendingOrders.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 2rem; background: var(--toon-card); border-radius: var(--radius-md); grid-column: span 3;">No hay cuentas o pedidos pendientes en espera.</div>`;
    return;
  }

  let html = "";
  pendingOrders.forEach(o => {
    const itemsStr = o.detalles.map(d => `${d.cantidad}x ${d.producto ? d.producto.nombre : 'Producto'}`).join(', ');
    const isCuentaAbierta = o.modo_pago === "PAGAR_DESPUES";

    html += `
      <div style="background: var(--mc-card); border: 1px solid var(--mc-border); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 1.2rem; color: #fff;">#${o.id} - ${o.numero_mesa}</strong>
            <span class="badge" style="background: ${isCuentaAbierta ? 'var(--cyan-accent)' : 'var(--mc-yellow)'}; color: #000; font-weight: 800; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px;">
              ${isCuentaAbierta ? 'CUENTA ABIERTA' : 'POR COBRAR'}
            </span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">${itemsStr}</p>
          ${o.direccion_delivery ? `<div style="font-size: 0.8rem; color: var(--neon-red);">🛵 Delivery: ${o.direccion_delivery} (${o.telefono_delivery})</div>` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.75rem;">
          <div style="font-size: 1.2rem; font-weight: 900; color: var(--mc-yellow);">${formatPriceDual(o.total)}</div>
          <button class="btn-gold" style="padding: 0.5rem 1rem;" onclick="openPaymentModal(${o.id})">
            💳 COBRAR
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
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPaidOrders() {
  const tbody = document.getElementById("paid-orders-tbody");
  if (!tbody) return;

  if (paidOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Sin facturas registradas en este turno.</td></tr>`;
    return;
  }

  let html = "";
  paidOrders.forEach(o => {
    const facNum = o.factura_numero || `FAC-DD-${o.id}`;
    html += `
      <tr style="border-bottom: 1px solid var(--toon-border);">
        <td style="padding: 0.75rem;"><strong style="color: var(--mc-yellow);">${facNum}</strong></td>
        <td style="padding: 0.75rem;">${o.numero_mesa}</td>
        <td style="padding: 0.75rem;">${o.metodo_pago || 'Efectivo'}</td>
        <td style="padding: 0.75rem; font-weight: 900;">${formatPriceDual(o.total)}</td>
        <td style="padding: 0.75rem;"><button class="btn-gold" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="viewReceipt(${o.id})">📄 FACTURA TICKET</button></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

async function submitAbrirTurno() {
  const monto = parseFloat(document.getElementById("monto-apertura-input").value) || 50.0;
  try {
    const res = await fetch("/api/v1/caja/abrir-turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_apertura: monto })
    });
    if (!res.ok) throw new Error("Error al abrir turno");
    showToast("🟢 Turno de caja abierto correctamente", "success");
    closeModal("open-shift-modal");
    loadShiftStatus();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function submitCerrarTurno() {
  if (!confirm("¿Deseas cerrar el turno de caja activo?")) return;
  try {
    const res = await fetch("/api/v1/caja/cerrar-turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_cierre: activeShift ? activeShift.total_ventas + activeShift.monto_apertura : 0.0 })
    });
    if (!res.ok) throw new Error("Error al cerrar turno");
    showToast("🔴 Turno cerrado exitosamente", "success");
    loadShiftStatus();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openPaymentModal(orderId) {
  selectedOrderForPayment = pendingOrders.find(o => o.id === orderId);
  if (!selectedOrderForPayment) return;

  document.getElementById("pay-order-id").innerText = `#${selectedOrderForPayment.id}`;
  document.getElementById("pay-order-mesa").innerText = selectedOrderForPayment.numero_mesa;
  document.getElementById("pay-order-total").innerHTML = formatPriceDual(selectedOrderForPayment.total);
  document.getElementById("pay-received-input").value = selectedOrderForPayment.total.toFixed(2);

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

  try {
    const res = await fetch(`/api/v1/caja/pedidos/${selectedOrderForPayment.id}/cobrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    closeModal("payment-modal");
    
    loadShiftStatus();
    loadPendingOrders();
    loadPaidOrders();
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

    document.getElementById("factura-ticket-content").innerHTML = ticketHtml;
    openModal("receipt-modal");
  } catch (err) {
    showToast(err.message, "danger");
  }
}
