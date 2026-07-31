let toonProducts = [];
let toonCategories = [];
let toonPromos = [];
let toonCart = [];
let guiaItems = [];
let currentGuiaIndex = 0;
let currentPromoIndex = 0;
let activeCategoryFilter = null;
let currentSelectedModalProduct = null;
let currentModalQty = 1;
let currentDetectedMesa = null;
let currentPendingOrderId = null;
let tasaCambioBs = 36.50;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("mesa")) {
    currentDetectedMesa = urlParams.get("mesa");
    document.getElementById("current-table-indicator").innerText = `📱 QR MESA #${currentDetectedMesa}`;
    document.getElementById("checkout-mesa-name").innerText = `Mesa #${currentDetectedMesa}`;
  } else {
    document.getElementById("current-table-indicator").innerText = `📱 QR RESTAURANTE`;
    document.getElementById("checkout-mesa-name").innerText = `Mesa por defecto #1`;
    currentDetectedMesa = "1";
  }

  loadConfigPublica();
  loadToonCategories();
  loadToonProducts();
  loadGuiaItems();
  loadPromocionesToon();

  new WSClient((event, data) => {
    if (event === "CAMBIO_ESTADO_PEDIDO") {
      showToast(`Estado de pedido actualizado: ${data.nuevo_estado}`, "info");
    }
  });
});

async function loadConfigPublica() {
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
  return `$${usdAmount.toFixed(2)} <span style="font-size: 0.85rem; color: var(--gold-accent); font-weight: 700;">(Bs. ${bsAmount})</span>`;
}

async function loadPromocionesToon() {
  try {
    const res = await fetch("/api/v1/cliente/promociones");
    if (res.ok) {
      toonPromos = await res.json();
      if (toonPromos.length > 0) {
        renderPromoBanner();
        setInterval(() => {
          currentPromoIndex = (currentPromoIndex + 1) % toonPromos.length;
          renderPromoBanner();
        }, 5000);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPromoBanner() {
  if (!toonPromos[currentPromoIndex]) return;
  const p = toonPromos[currentPromoIndex];
  document.getElementById("promo-title").innerText = p.titulo;
  document.getElementById("promo-desc").innerText = p.descripcion || '';
  document.getElementById("promo-price").innerHTML = `BOOM! ${p.descuento_pct ? `-${p.descuento_pct}% OFF` : ''} <span style="font-size: 0.85rem; background: #000; padding: 0.2rem 0.5rem; border-radius: 6px;">CÓDIGO: ${p.codigo_cupon || 'PROMO'}</span>`;
}

async function loadGuiaItems() {
  try {
    const res = await fetch("/api/v1/cliente/guia");
    if (res.ok) {
      guiaItems = await res.json();
    }
  } catch (err) {
    console.error(err);
  }
}

function openGuiaModal() {
  if (!guiaItems || guiaItems.length === 0) {
    showToast("Guía no disponible en este momento.", "warning");
    return;
  }
  currentGuiaIndex = 0;
  renderGuiaSlide();
  document.getElementById("guia-modal").classList.add("open");
}

function closeGuiaModal() {
  document.getElementById("guia-modal").classList.remove("open");
}

function renderGuiaSlide() {
  if (!guiaItems[currentGuiaIndex]) return;
  const item = guiaItems[currentGuiaIndex];
  const container = document.getElementById("guia-carousel-container");

  let mediaTag = "";
  if (item.tipo_media === "video" || item.media_url.endsWith(".mp4")) {
    mediaTag = `<video src="${item.media_url}" class="carousel-slide-media" controls autoplay muted loop></video>`;
  } else {
    mediaTag = `<img src="${item.media_url}" class="carousel-slide-media" alt="${item.titulo}">`;
  }

  container.innerHTML = `
    ${mediaTag}
    <h3 style="font-size: 1.25rem; font-weight: 900; color: var(--gold-accent); margin: 0.85rem 0 0.4rem 0;">${item.titulo}</h3>
    <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4; margin: 0;">${item.descripcion || ''}</p>
  `;

  document.getElementById("guia-slide-indicator").innerText = `${currentGuiaIndex + 1} / ${guiaItems.length}`;
}

function nextGuiaSlide() {
  currentGuiaIndex = (currentGuiaIndex + 1) % guiaItems.length;
  renderGuiaSlide();
}

function prevGuiaSlide() {
  currentGuiaIndex = (currentGuiaIndex - 1 + guiaItems.length) % guiaItems.length;
  renderGuiaSlide();
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (screenId === "screen-home") document.querySelectorAll(".nav-item")[0]?.classList.add("active");
  else if (screenId === "screen-categorias") document.querySelectorAll(".nav-item")[1]?.classList.add("active");
  else if (screenId === "screen-carrito") document.querySelectorAll(".nav-item")[2]?.classList.add("active");
  else if (screenId === "screen-historial") document.querySelectorAll(".nav-item")[3]?.classList.add("active");
  else if (screenId === "screen-perfil") document.querySelectorAll(".nav-item")[4]?.classList.add("active");

  if (screenId === "screen-historial") loadHistorialPedidos();
}

async function loadToonCategories() {
  try {
    const res = await fetch("/api/v1/cliente/categorias");
    toonCategories = await res.json();
    renderPhotoCategories();
  } catch (err) {
    console.error(err);
  }
}

async function loadToonProducts() {
  try {
    const res = await fetch("/api/v1/cliente/productos");
    toonProducts = await res.json();
    renderToonProducts();
  } catch (err) {
    console.error(err);
  }
}

function renderPhotoCategories() {
  let html = "";
  toonCategories.forEach(c => {
    const imgUrl = c.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    html += `
      <div class="cat-photo-card ${activeCategoryFilter === c.id ? 'active' : ''}" onclick="filterCategoryToon(${c.id})">
        <img src="${imgUrl}" alt="${c.nombre}">
        <div class="cat-photo-overlay">
          <div class="cat-photo-title">${c.nombre}</div>
        </div>
      </div>
    `;
  });
  document.getElementById("home-categories-grid").innerHTML = html;
  document.getElementById("full-categories-grid").innerHTML = html;
}

function filterCategoryToon(catId) {
  if (activeCategoryFilter === catId) activeCategoryFilter = null;
  else activeCategoryFilter = catId;

  renderPhotoCategories();
  renderToonProducts();
  showScreen("screen-menu");
}

function renderToonProducts() {
  let list = toonProducts;
  if (activeCategoryFilter) {
    list = toonProducts.filter(p => p.categoria_id === activeCategoryFilter);
  }

  let html = "";
  list.forEach(p => {
    const img = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    html += `
      <div class="product-toon-card" onclick="openProductModal(${p.id})">
        <div class="product-img-container">
          <img src="${img}" alt="${p.nombre}">
          <span class="product-badge">🔥 TOON</span>
        </div>
        <div class="product-info">
          <div class="product-title">${p.nombre}</div>
          <div class="product-desc">${p.descripcion || ''}</div>
          <div class="product-price-bar">
            <span class="product-price">${formatPriceDual(p.precio)}</span>
            <button class="btn-gold" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">➕ DETALLES</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("home-featured-grid").innerHTML = html;
  document.getElementById("menu-products-grid").innerHTML = html;
}

function filterMenuProducts() {
  const query = document.getElementById("menu-search-input").value.toLowerCase();
  const filtered = toonProducts.filter(p => p.nombre.toLowerCase().includes(query) || (p.descripcion && p.descripcion.toLowerCase().includes(query)));
  
  let html = "";
  filtered.forEach(p => {
    const img = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    html += `
      <div class="product-toon-card" onclick="openProductModal(${p.id})">
        <div class="product-img-container">
          <img src="${img}" alt="${p.nombre}">
        </div>
        <div class="product-info">
          <div class="product-title">${p.nombre}</div>
          <div class="product-desc">${p.descripcion || ''}</div>
          <div class="product-price-bar">
            <span class="product-price">${formatPriceDual(p.precio)}</span>
            <button class="btn-gold" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">➕ DETALLES</button>
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById("menu-products-grid").innerHTML = html;
}

function openProductModal(prodId) {
  currentSelectedModalProduct = toonProducts.find(p => p.id === prodId);
  if (!currentSelectedModalProduct) return;

  currentModalQty = 1;
  document.getElementById("modal-qty-val").innerText = "1";
  document.getElementById("modal-product-img").src = currentSelectedModalProduct.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
  document.getElementById("modal-product-title").innerText = currentSelectedModalProduct.nombre;
  document.getElementById("modal-product-price").innerHTML = formatPriceDual(currentSelectedModalProduct.precio);
  document.getElementById("modal-product-desc").innerText = currentSelectedModalProduct.descripcion || '';

  // Render Dynamic Ingredients if available
  const container = document.getElementById("modal-ingredients-container");
  let ings = ["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada"];
  if (currentSelectedModalProduct.ingredientes_json) {
    try {
      ings = JSON.parse(currentSelectedModalProduct.ingredientes_json);
    } catch(e){}
  }

  let html = `<div class="option-group-title">🛠️ REMOVER INGREDIENTES</div>`;
  ings.forEach((ing, i) => {
    html += `
      <label class="custom-checkbox-label">
        <span>❌ Sin ${ing}</span>
        <input type="checkbox" class="dyn-ing-no" value="Sin ${ing}">
      </label>
    `;
  });

  html += `<div class="option-group-title">🧀 EXTRAS RECOMENDADOS</div>
    <label class="custom-checkbox-label"><span>Extra Queso Cheddar (+$1.00 / Bs. ${(1.0 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="modal-opt-extra-queso" value="1.0"></label>
    <label class="custom-checkbox-label"><span>Extra Tocino Crujiente (+$1.50 / Bs. ${(1.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="modal-opt-extra-tocino" value="1.5"></label>
    <label class="custom-checkbox-label"><span>Extra Carne 150g (+$2.50 / Bs. ${(2.5 * tasaCambioBs).toFixed(2)})</span><input type="checkbox" id="modal-opt-extra-carne" value="2.5"></label>
  `;

  container.innerHTML = html;
  document.getElementById("product-detail-modal").classList.add("open");
}

function closeProductModal() {
  document.getElementById("product-detail-modal").classList.remove("open");
}

function adjustModalQty(val) {
  currentModalQty = Math.max(1, currentModalQty + val);
  document.getElementById("modal-qty-val").innerText = currentModalQty;
}

function addModalProductToCart() {
  if (!currentSelectedModalProduct) return;

  let extraPrice = 0.0;
  let opts = [];

  document.querySelectorAll(".dyn-ing-no:checked").forEach(cb => {
    opts.push(cb.value);
  });

  if (document.getElementById("modal-opt-extra-queso")?.checked) { opts.push("Extra Queso"); extraPrice += 1.0; }
  if (document.getElementById("modal-opt-extra-tocino")?.checked) { opts.push("Extra Tocino"); extraPrice += 1.5; }
  if (document.getElementById("modal-opt-extra-carne")?.checked) { opts.push("Extra Carne"); extraPrice += 2.5; }

  const unitPrice = currentSelectedModalProduct.precio + extraPrice;

  toonCart.push({
    producto_id: currentSelectedModalProduct.id,
    nombre: currentSelectedModalProduct.nombre,
    precio_unitario: unitPrice,
    cantidad: currentModalQty,
    subtotal: unitPrice * currentModalQty,
    opciones: opts
  });

  updateCartNavBadge();
  closeProductModal();
  showToast(`¡Agregado al carrito: ${currentSelectedModalProduct.nombre}!`, "success");
  renderToonCart();
}

function updateCartNavBadge() {
  const totalCount = toonCart.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById("nav-cart-badge").innerText = totalCount;
}

function renderToonCart() {
  const container = document.getElementById("toon-cart-items");
  if (toonCart.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">🛒 Tu carrito de compras está vacío.<br><button class="btn-gold" style="margin-top: 1rem;" onclick="showScreen('screen-home')">IR AL MENÚ</button></div>`;
    document.getElementById("cart-subtotal").innerText = "$0.00 (Bs. 0.00)";
    document.getElementById("cart-tax").innerText = "$0.00 (Bs. 0.00)";
    document.getElementById("cart-total").innerText = "$0.00 (Bs. 0.00)";
    return;
  }

  let subtotal = 0.0;
  let html = "";
  toonCart.forEach((item, idx) => {
    subtotal += item.subtotal;
    html += `
      <div style="background: var(--toon-card); border: 1px solid var(--toon-border); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="font-size: 1rem;">${item.nombre} (x${item.cantidad})</strong>
          ${item.opciones.length > 0 ? `<br><small style="color: var(--gold-accent);">${item.opciones.join(', ')}</small>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span style="font-weight: 900; color: var(--gold-accent); font-size: 1.1rem;">${formatPriceDual(item.subtotal)}</span>
          <button style="background: transparent; border: none; color: var(--neon-red); font-size: 1.2rem; cursor: pointer;" onclick="removeToonCartItem(${idx})">&times;</button>
        </div>
      </div>
    `;
  });

  const tax = subtotal * 0.16;
  const isDelivery = document.getElementById("checkout-type").value === "delivery";
  const isLlevar = document.getElementById("checkout-type").value === "llevar";
  const delivCost = isDelivery ? 5.0 : 0.0;
  const empaqueCost = isLlevar ? 1.0 : 0.0;
  const total = subtotal + tax + delivCost + empaqueCost;

  container.innerHTML = html;
  document.getElementById("cart-subtotal").innerHTML = formatPriceDual(subtotal);
  document.getElementById("cart-tax").innerHTML = formatPriceDual(tax);
  if (document.getElementById("cart-delivery-cost")) document.getElementById("cart-delivery-cost").innerHTML = formatPriceDual(delivCost);
  if (document.getElementById("cart-empaque-cost")) document.getElementById("cart-empaque-cost").innerHTML = formatPriceDual(empaqueCost);
  document.getElementById("cart-total").innerHTML = formatPriceDual(total);
}

function removeToonCartItem(idx) {
  toonCart.splice(idx, 1);
  updateCartNavBadge();
  renderToonCart();
}

function toggleCheckoutFields() {
  const type = document.getElementById("checkout-type").value;
  const sectionMesa = document.getElementById("section-checkout-mesa");
  const sectionDelivery = document.getElementById("section-checkout-delivery");
  const deliveryRow = document.getElementById("cart-delivery-row");
  const empaqueRow = document.getElementById("cart-empaque-row");

  if (type === "mesa") {
    sectionMesa.style.display = "block";
    sectionDelivery.style.display = "none";
    if (deliveryRow) deliveryRow.style.display = "none";
    if (empaqueRow) empaqueRow.style.display = "none";
  } else if (type === "delivery") {
    sectionMesa.style.display = "none";
    sectionDelivery.style.display = "block";
    if (deliveryRow) deliveryRow.style.display = "flex";
    if (empaqueRow) empaqueRow.style.display = "none";
  } else {
    sectionMesa.style.display = "none";
    sectionDelivery.style.display = "none";
    if (deliveryRow) deliveryRow.style.display = "none";
    if (empaqueRow) empaqueRow.style.display = "flex";
  }
  renderToonCart();
}

async function submitFinalOrder() {
  if (toonCart.length === 0) {
    showToast("Tu carrito está vacío. Agrega productos primero.", "warning");
    return;
  }

  const orderType = document.getElementById("checkout-type").value;
  const selectedModoPago = document.querySelector('input[name="modo_pago"]:checked')?.value || "PAGAR_ANTES";

  let mesaName = `Mesa ${currentDetectedMesa || 1}`;
  let delivNombre = null;
  let delivTel = null;
  let delivDir = null;

  if (orderType === "delivery") {
    delivNombre = document.getElementById("deliv-nombre").value;
    delivTel = document.getElementById("deliv-telefono").value;
    delivDir = document.getElementById("deliv-direccion").value;

    if (!delivNombre || !delivDir || !delivTel) {
      showToast("Por favor completa los datos obligatorios de entrega para Delivery.", "danger");
      return;
    }
    mesaName = "Delivery";
  }

  const payload = {
    numero_mesa: mesaName,
    tipo: orderType,
    modo_pago: selectedModoPago,
    nombre_cliente_delivery: delivNombre,
    telefono_delivery: delivTel,
    direccion_delivery: delivDir,
    detalles: toonCart.map(item => ({
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
    if (!res.ok) throw new Error("Error al registrar el pedido");
    const order = await res.json();

    currentPendingOrderId = order.id;
    toonCart = [];
    updateCartNavBadge();

    document.getElementById("track-order-num").innerText = `PEDIDO #${order.id}`;
    document.getElementById("track-order-status").innerText = order.modo_pago === "PAGAR_DESPUES" ? "CUENTA ABIERTA EN MESA" : "RECIBIDO EN COCINA";
    document.getElementById("track-order-info").innerText = order.tipo === "delivery" ? `Entregando en: ${order.direccion_delivery}` : `Procesando para ${order.numero_mesa}`;

    // Prompt for OTP Verification if Delivery or Mobile
    if (order.tipo === "delivery" || delivTel) {
      openOtpModal(order.id, order.codigo_otp || "123456");
    } else {
      showToast("¡Pedido emitido exitosamente!", "success");
      showScreen("screen-tracking");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openOtpModal(orderId, code) {
  currentPendingOrderId = orderId;
  document.getElementById("otp-simulated-code").innerText = `Código sim enviado por WhatsApp: ${code}`;
  document.getElementById("otp-input-code").value = code;
  document.getElementById("otp-modal").classList.add("open");
}

async function submitOtpVerification() {
  const codeInput = document.getElementById("otp-input-code").value;
  if (!codeInput) {
    showToast("Ingresa el código OTP de 6 dígitos", "warning");
    return;
  }

  try {
    const res = await fetch("/api/v1/cliente/pedidos/verificar-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedido_id: currentPendingOrderId,
        codigo_otp: codeInput
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Código OTP incorrecto");
    }

    showToast("✅ Teléfono verificado con éxito por OTP", "success");
    document.getElementById("otp-modal").classList.remove("open");
    showScreen("screen-tracking");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function loadHistorialPedidos() {
  try {
    const res = await fetch("/api/v1/cliente/pedidos/historial", {
      headers: Auth.getHeaders()
    });
    if (!res.ok) return;
    const pedidos = await res.json();
    
    let html = "";
    if (!pedidos || pedidos.length === 0) {
      html = `<p style="color: var(--text-muted); text-align: center;">No tienes pedidos anteriores registrados.</p>`;
    } else {
      pedidos.forEach(p => {
        html += `
          <div style="background: var(--toon-card); border: 1px solid var(--toon-border); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 0.85rem;">
            <div style="display: flex; justify-content: space-between; font-weight: 800;">
              <span>PEDIDO #${p.id} (${p.numero_mesa})</span>
              <span>${formatPriceDual(p.total)}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">Estado: <strong style="color: var(--neon-green);">${p.estado}</strong></div>
          </div>
        `;
      });
    }
    document.getElementById("historial-orders-list").innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}
