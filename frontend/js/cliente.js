// Customer QR Menu JS State
let products = [];
let categories = [];
let cart = [];
let currentCategory = null;
let currentCustomProduct = null;
let activeOrderId = null;
let currentMesa = "Mesa 5";

// Extract Mesa from URL param ?mesa=5
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("mesa")) {
  currentMesa = `Mesa ${urlParams.get("mesa")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("table-badge-header").innerText = `📍 ${currentMesa}`;
  loadCategories();
  loadProducts();
  
  // Initialize WebSocket for real-time order tracking
  new WSClient((event, data) => {
    if (event === "CAMBIO_ESTADO_PEDIDO" && data.pedido_id === activeOrderId) {
      updateTrackingUI(data.nuevo_estado);
    }
  });
});

async function loadCategories() {
  try {
    const res = await fetch("/api/v1/cliente/categorias");
    categories = await res.json();
    renderCategories();
  } catch (err) {
    console.error("Error al cargar categorías:", err);
  }
}

async function loadProducts() {
  try {
    let url = "/api/v1/cliente/productos";
    if (currentCategory) url += `?categoria_id=${currentCategory}`;
    const res = await fetch(url);
    products = await res.json();
    renderProducts();
  } catch (err) {
    console.error("Error al cargar productos:", err);
  }
}

function renderCategories() {
  const container = document.getElementById("category-tabs");
  let html = `<button class="cat-btn ${!currentCategory ? 'active' : ''}" onclick="filterCategory(null)">✨ TODOS</button>`;
  categories.forEach(c => {
    html += `<button class="cat-btn ${currentCategory === c.id ? 'active' : ''}" onclick="filterCategory(${c.id})">${c.nombre}</button>`;
  });
  container.innerHTML = html;
}

function filterCategory(catId) {
  currentCategory = catId;
  renderCategories();
  loadProducts();
}

function renderProducts() {
  const container = document.getElementById("product-grid");
  if (products.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay productos en esta categoría.</p>`;
    return;
  }

  let html = "";
  products.forEach(p => {
    const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    html += `
      <div class="product-card">
        <div class="product-img-wrapper">
          <img src="${imgUrl}" alt="${p.nombre}" class="product-img">
          <div class="product-price-tag">$${p.precio.toFixed(2)}</div>
        </div>
        <div class="product-info">
          <h3 class="product-title">${p.nombre}</h3>
          <p class="product-desc">${p.descripcion || ''}</p>
          <button class="btn btn-accent" style="width: 100%; margin-top: auto;" onclick="openCustomModal(${p.id})">
            ➕ Agregar
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function openCustomModal(prodId) {
  currentCustomProduct = products.find(p => p.id === prodId);
  if (!currentCustomProduct) return;

  document.getElementById("custom-product-name").innerText = `Personalizar ${currentCustomProduct.nombre}`;
  document.getElementById("opt-queso").checked = false;
  document.getElementById("opt-tocino").checked = false;
  document.getElementById("opt-huevo").checked = false;
  document.getElementById("custom-notes").value = "";

  document.getElementById("custom-modal").classList.add("active");
}

function closeCustomModal() {
  document.getElementById("custom-modal").classList.remove("active");
}

function confirmAddToCart() {
  if (!currentCustomProduct) return;

  const options = [];
  let extraPrice = 0.0;

  ["opt-queso", "opt-tocino", "opt-huevo"].forEach(id => {
    const el = document.getElementById(id);
    if (el.checked) {
      options.push(el.value);
      extraPrice += parseFloat(el.getAttribute("data-price"));
    }
  });

  const notes = document.getElementById("custom-notes").value.trim();

  cart.push({
    producto_id: currentCustomProduct.id,
    nombre: currentCustomProduct.nombre,
    precio: currentCustomProduct.precio + extraPrice,
    cantidad: 1,
    personalizaciones: options,
    observaciones: notes
  });

  updateCartBar();
  closeCustomModal();
  showToast(`Agregado al carrito: ${currentCustomProduct.nombre}`, 'success');
}

function updateCartBar() {
  const count = cart.length;
  let total = cart.reduce((acc, item) => acc + item.precio, 0);
  
  document.getElementById("cart-count").innerText = count;
  document.getElementById("cart-total-display").innerText = `${count} Items | $${total.toFixed(2)}`;
}

function openCartModal() {
  if (cart.length === 0) {
    showToast("Tu carrito está vacío", "warning");
    return;
  }

  const container = document.getElementById("cart-items-container");
  let html = "";
  let subtotal = 0.0;

  cart.forEach((item, index) => {
    subtotal += item.precio;
    const optsStr = item.personalizaciones.length > 0 ? `<br><small style="color: var(--accent);">+ ${item.personalizaciones.join(', ')}</small>` : '';
    const noteStr = item.observaciones ? `<br><small style="color: var(--text-muted);">Nota: ${item.observaciones}</small>` : '';

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
        <div>
          <strong style="font-size: 1rem;">${item.nombre}</strong>
          ${optsStr}
          ${noteStr}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-weight: 700; color: var(--accent);">$${item.precio.toFixed(2)}</span>
          <button style="background: transparent; border: none; color: var(--danger); font-size: 1.2rem; cursor: pointer;" onclick="removeFromCart(${index})">&times;</button>
        </div>
      </div>
    `;
  });

  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  container.innerHTML = html;
  document.getElementById("summary-subtotal").innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById("summary-tax").innerText = `$${tax.toFixed(2)}`;
  document.getElementById("summary-total").innerText = `$${total.toFixed(2)}`;

  document.getElementById("cart-modal").classList.add("active");
}

function closeCartModal() {
  document.getElementById("cart-modal").classList.remove("active");
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartBar();
  if (cart.length === 0) closeCartModal();
  else openCartModal();
}

async function submitOrder() {
  if (cart.length === 0) return;

  const payload = {
    numero_mesa: currentMesa,
    codigo_qr: "QR_MESA_5_VERIFIED",
    tipo: "mesa",
    detalles: cart.map(item => ({
      producto_id: item.producto_id,
      cantidad: 1,
      personalizaciones: { opciones: item.personalizaciones },
      observaciones: item.observaciones
    }))
  };

  try {
    const res = await fetch("/api/v1/cliente/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al emitir el pedido");
    }

    const order = await res.json();
    activeOrderId = order.id;

    // Reset cart
    cart = [];
    updateCartBar();
    closeCartModal();

    // Show Tracking Modal
    document.getElementById("tracking-order-id").innerText = `#${order.id}`;
    document.getElementById("tracking-mesa").innerText = `${order.numero_mesa} - Total: $${order.total.toFixed(2)}`;
    updateTrackingUI("PENDIENTE");
    document.getElementById("tracking-modal").classList.add("active");

    showToast("¡Pedido realizado con éxito!", "success");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function updateTrackingUI(statusStr) {
  const badge = document.getElementById("order-status-badge");
  const msg = document.getElementById("tracking-msg");

  badge.className = `badge badge-${statusStr}`;
  if (statusStr === "PENDIENTE") {
    badge.innerText = "⏳ PENDIENTE";
    msg.innerText = "Tu pedido ha sido enviado a la cocina. Se iniciará su preparación en breve.";
  } else if (statusStr === "EN_PREPARACION") {
    badge.innerText = "🔥 EN PREPARACIÓN";
    msg.innerText = "¡Los cocineros están preparando tu pedido en este momento!";
  } else if (statusStr === "LISTO") {
    badge.innerText = "✅ LISTO PARA ENTREGAR";
    msg.innerText = "¡Tu pedido está listo! El mesero lo llevará a tu mesa pronto.";
  } else if (statusStr === "COBRADO" || statusStr === "ENTREGADO") {
    badge.innerText = "🎉 COBRADO / ENTREGADO";
    msg.innerText = "¡Gracias por tu compra! Esperamos que disfrutes tu comida.";
  }
}

function closeTrackingModal() {
  document.getElementById("tracking-modal").classList.remove("active");
}
