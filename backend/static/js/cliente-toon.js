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
    } else if (event === "PRODUCTOS_ACTUALIZADOS" || event === "NUEVO_PRODUCTO") {
      loadToonProducts();
      loadToonCategories();
      showToast("🍔 ¡Menú actualizado en tiempo real!", "info");
    }
  });
});

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item, .side-nav-item").forEach(n => n.classList.remove("active"));
  const idxMap = { 'screen-home': 0, 'screen-categorias': 1, 'screen-carrito': 2, 'screen-historial': 3, 'screen-perfil': 4 };
  const idx = idxMap[screenId];
  if (idx !== undefined) {
    const items = document.querySelectorAll(".nav-item, .side-nav-item");
    if (items[idx]) items[idx].classList.add("active");
  }

  if (screenId === "screen-historial") loadHistorialPedidos();
}

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
  const container = document.getElementById("home-promo-banner-container");
  if (!container) return;

  if (!toonPromos || toonPromos.length === 0) {
    container.innerHTML = `
      <div style="background: linear-gradient(135deg, #ff4757, #ffb703); border-radius: var(--radius-md); padding: 1.25rem; color: #fff; box-shadow: 0 10px 25px rgba(255,71,87,0.4);">
        <span style="font-size: 0.75rem; font-weight: 900; background: #000; padding: 0.2rem 0.6rem; border-radius: 20px;">BOOM! 🔥 PROMO DEL DÍA</span>
        <h3 style="font-size: 1.3rem; font-weight: 900; margin-top: 0.4rem;" id="promo-title">COMBO EXPLOSIVO TOON</h3>
        <p style="font-size: 0.85rem; opacity: 0.95;" id="promo-desc">2 HAMBURGUESAS + PAPAS FRITAS + 2 REFRESCOS</p>
        <div style="font-size: 1.5rem; font-weight: 900; margin-top: 0.5rem;" id="promo-price">$15.00 <span style="font-size: 0.85rem; background: #000; padding: 0.2rem 0.5rem; border-radius: 6px;">CÓDIGO: TOON20</span></div>
      </div>
    `;
    return;
  }

  const p = toonPromos[currentPromoIndex];
  const bgImg = p.banner_url || p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800";

  container.innerHTML = `
    <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; height: 190px; border: 2px solid var(--gold-accent); box-shadow: 0 10px 25px rgba(255,183,3,0.4); cursor: pointer;" onclick="showScreen('screen-menu')">
      <img src="${bgImg}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.65);" alt="${p.titulo}">
      <div style="position: absolute; inset: 0; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(0deg, rgba(8,12,20,0.9) 0%, transparent 60%);">
        <div>
          <span style="font-size: 0.75rem; font-weight: 900; background: var(--neon-red); color: #fff; padding: 0.25rem 0.65rem; border-radius: 20px;">
            🔥 PROMO ADMIN ${p.descuento_pct ? `(-${p.descuento_pct}% OFF)` : ''}
          </span>
          <h3 style="font-size: 1.3rem; font-weight: 900; color: #fff; margin-top: 0.4rem; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${p.titulo}</h3>
          <p style="font-size: 0.85rem; color: #cbd5e1; margin-top: 0.1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.descripcion || ''}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="background: rgba(0,0,0,0.75); border: 1px solid var(--gold-accent); color: var(--gold-accent); padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 800; font-size: 0.8rem;">
            CÓDIGO: ${p.codigo_cupon || 'PROMO'}
          </span>
          <button class="btn-gold" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">⚡ VER PROMO</button>
        </div>
      </div>
    </div>
  `;
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

function getCategoryExtrasList(catId) {
  const catObj = toonCategories.find(c => c.id === catId);
  const catName = catObj ? catObj.nombre.toLowerCase() : "";

  if (catName.includes("hamburguesa")) {
    return [
      { id: "extra-queso", name: "Extra Queso Cheddar", price: 1.0 },
      { id: "extra-tocino", name: "Extra Tocino Crujiente", price: 1.5 },
      { id: "extra-carne", name: "Extra Carne 150g Gourmet", price: 2.5 },
      { id: "extra-aros", name: "Extra Aros de Cebolla", price: 1.2 }
    ];
  } else if (catName.includes("hot") || catName.includes("perro")) {
    return [
      { id: "extra-tocino", name: "Extra Tocino Troceado", price: 1.5 },
      { id: "extra-queso", name: "Extra Queso Fundido", price: 1.0 },
      { id: "extra-maiz", name: "Extra Maíz Dulce", price: 0.8 },
      { id: "extra-papitas", name: "Extra Papitas Crocantes", price: 0.75 }
    ];
  } else if (catName.includes("papa")) {
    return [
      { id: "extra-cheddar", name: "Extra Baño de Queso Cheddar", price: 1.0 },
      { id: "extra-tocino", name: "Extra Tocino Troceado", price: 1.5 },
      { id: "extra-bbq", name: "Extra Salsa BBQ Especial", price: 0.75 },
      { id: "extra-jalapeno", name: "Extra Jalapeños Picantes", price: 0.8 }
    ];
  } else if (catName.includes("bebida") || catName.includes("malteada")) {
    return [
      { id: "extra-hielo", name: "Extra Hielo Helado", price: 0.0 },
      { id: "extra-sirope", name: "Extra Sirope (Chocolate/Caramelo)", price: 0.75 },
      { id: "extra-tamano", name: "Agrandar a Tamaño Gigante", price: 1.5 }
    ];
  } else if (catName.includes("alita")) {
    return [
      { id: "extra-salsa-bbq", name: "Extra Salsa BBQ de la Casa", price: 1.0 },
      { id: "extra-salsa-habanero", name: "Extra Salsa Picante Habanero", price: 1.0 },
      { id: "extra-ranch", name: "Extra Dressing Creamy Ranch", price: 1.0 }
    ];
  } else if (catName.includes("postre")) {
    return [
      { id: "extra-chispas", name: "Extra Chispas de Chocolate", price: 0.75 },
      { id: "extra-bola-helado", name: "Extra Bola de Helado Vainilla", price: 1.5 },
      { id: "extra-sirope-fresa", name: "Extra Sirope de Fresa", price: 0.8 }
    ];
  } else if (catName.includes("combo")) {
    return [
      { id: "combo-papas", name: "Agrandar Papas Fritas a Tamaño Familiar", price: 1.5 },
      { id: "combo-bebida", name: "Agrandar Refrescos a 1 Litro", price: 1.0 },
      { id: "combo-postre", name: "Añadir Postre Helado Toon", price: 2.0 }
    ];
  } else {
    return [
      { id: "extra-queso", name: "Extra Queso", price: 1.0 },
      { id: "extra-tocino", name: "Extra Tocino", price: 1.5 },
      { id: "extra-salsa", name: "Extra Salsa Especial de la Casa", price: 0.75 }
    ];
  }
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
  if (document.getElementById("modal-product-notes")) document.getElementById("modal-product-notes").value = "";

  // 1. Renderizar Todos los Ingredientes del Producto (para remover / mantener)
  const ingContainer = document.getElementById("modal-ingredients-list");
  let defaultIngredients = ["Carne 150g", "Queso Cheddar", "Tomate", "Cebolla Morada", "Pepinillos", "Salsa Especial"];
  if (currentSelectedModalProduct.ingredientes_json) {
    try {
      const parsed = JSON.parse(currentSelectedModalProduct.ingredientes_json);
      if (Array.isArray(parsed) && parsed.length > 0) defaultIngredients = parsed;
    } catch(e){}
  } else if (currentSelectedModalProduct.descripcion) {
    const splitDesc = currentSelectedModalProduct.descripcion.split(/[,+]/).map(s => s.trim()).filter(s => s.length > 2);
    if (splitDesc.length > 1) defaultIngredients = splitDesc;
  }

  if (ingContainer) {
    let ingHtml = "";
    defaultIngredients.forEach((ing, i) => {
      ingHtml += `
        <label class="ing-toggle-item">
          <span>✔️ Con ${ing}</span>
          <input type="checkbox" class="dyn-ing-check" data-name="${ing}" checked>
        </label>
      `;
    });
    ingContainer.innerHTML = ingHtml;
  }

  // 2. Renderizar Extras Recomendados Dinámicos según la Categoría del Producto
  const extContainer = document.getElementById("modal-extras-list");
  const catExtras = getCategoryExtrasList(currentSelectedModalProduct.categoria_id);
  if (extContainer) {
    let extHtml = "";
    catExtras.forEach((ext, idx) => {
      const bsVal = (ext.price * tasaCambioBs).toFixed(2);
      const priceTxt = ext.price > 0 ? `(+$${ext.price.toFixed(2)} / Bs. ${bsVal})` : '(GRATIS)';
      extHtml += `
        <label class="extra-item-row">
          <span>➕ ${ext.name} <small style="color: var(--gold-accent); font-weight:800;">${priceTxt}</small></span>
          <input type="checkbox" class="dyn-extra-check" data-name="${ext.name}" data-price="${ext.price}">
        </label>
      `;
    });
    extContainer.innerHTML = extHtml;
  }

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

  // Registrar ingredientes removidos (desmarcados)
  document.querySelectorAll(".dyn-ing-check:not(:checked)").forEach(cb => {
    const ingName = cb.getAttribute("data-name");
    opts.push(`Sin ${ingName}`);
  });

  // Registrar extras agregados (marcados)
  document.querySelectorAll(".dyn-extra-check:checked").forEach(cb => {
    const extName = cb.getAttribute("data-name");
    const price = parseFloat(cb.getAttribute("data-price")) || 0.0;
    opts.push(`+ ${extName}`);
    extraPrice += price;
  });

  const notesInput = document.getElementById("modal-product-notes");
  if (notesInput && notesInput.value.trim() !== "") {
    opts.push(`Nota: ${notesInput.value.trim()}`);
  }

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
  const totalSum = toonCart.reduce((sum, item) => sum + item.subtotal, 0);

  const badgeEl = document.getElementById("nav-cart-badge");
  if (badgeEl) badgeEl.innerText = totalCount;

  // Carrito Flotante de Alta Visibilidad
  const floatWidget = document.getElementById("floating-cart-btn");
  if (floatWidget) {
    if (totalCount > 0) {
      floatWidget.style.display = "flex";
      floatWidget.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="font-size:1.25rem;">🛒</span>
          <span>VER MI PEDIDO</span>
          <span class="floating-cart-badge">${totalCount} ${totalCount === 1 ? 'ítem' : 'ítems'}</span>
        </div>
        <div style="font-size:1.15rem; font-weight:900; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);">$${totalSum.toFixed(2)}</div>
      `;
    } else {
      floatWidget.style.display = "none";
    }
  }
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

async function loadToonCategories() {
  try {
    const res = await fetch("/api/v1/cliente/categorias");
    if (res.ok) {
      toonCategories = await res.json();
      renderPhotoCategories();
    }
  } catch (err) {
    console.error("Error al cargar categorías:", err);
  }
}

async function loadToonProducts() {
  try {
    const res = await fetch("/api/v1/cliente/productos");
    if (res.ok) {
      toonProducts = await res.json();
      renderToonProducts();
    }
  } catch (err) {
    console.error("Error al cargar productos:", err);
  }
}

async function loadGuiaItems() {
  try {
    const res = await fetch("/api/v1/cliente/guia?tipo=cliente");
    if (res.ok) {
      guiaItems = await res.json();
    }
  } catch (err) {
    console.error("Error al cargar guía:", err);
  }
}

