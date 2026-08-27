let toonProducts = [];
let toonCategories = [];
let toonPromos = [];
let toonCart = [];
let guiaItems = [];
let currentGuiaIndex = 0;
let currentPromoIndex = 0;
let activeCategoryFilter = null;
let currentSelectedModalProduct = null;
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

// PERSISTENCIA DE ESTADO Y DATOS EN LOCALSTORAGE (F5 REFRESH PROTECTED)
function saveCartToStorage() {
  try {
    localStorage.setItem("app_cart", JSON.stringify(toonCart));
  } catch(e){}
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem("app_cart");
    if (saved) {
      toonCart = JSON.parse(saved) || [];
      updateCartNavBadge();
    }
  } catch(e){}
}

function saveActiveOrderToStorage(orderId) {
  try {
    if (orderId) localStorage.setItem("app_active_order_id", String(orderId));
    else localStorage.removeItem("app_active_order_id");
  } catch(e){}
}

function restoreActiveOrderTracking() {
  try {
    const activeId = localStorage.getItem("app_active_order_id");
    if (activeId) {
      currentPendingOrderId = parseInt(activeId);
      if (typeof trackClientOrderLive === 'function') trackClientOrderLive(activeId);
    }
  } catch(e){}
}

function saveSelectedMesaToStorage(num) {
  try {
    if (num) localStorage.setItem("app_mesa_num", String(num));
  } catch(e){}
}

function restoreSelectedMesa() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("mesa")) {
      currentDetectedMesa = urlParams.get("mesa");
      saveSelectedMesaToStorage(currentDetectedMesa);
    } else {
      const saved = localStorage.getItem("app_mesa_num");
      if (saved) currentDetectedMesa = saved;
      else currentDetectedMesa = "1";
    }
    updateHeaderTableBadgeUI();
  } catch(e){}
}

function openHeaderTableInfoModal() {
  const num = currentDetectedMesa || "1";
  if (document.getElementById("table-info-modal-title")) document.getElementById("table-info-modal-title").innerText = `MESA #${num} DETALLES`;
  if (document.getElementById("table-info-modal-num")) document.getElementById("table-info-modal-num").innerText = `Mesa #${num}`;
  if (document.getElementById("table-info-modal-qr-img")) document.getElementById("table-info-modal-qr-img").src = `/api/v1/cliente/qr/${num}`;
  openModal("header-table-info-modal");
}

function updateHeaderTableBadgeUI() {
  const badge = document.getElementById("header-table-badge") || document.getElementById("current-table-indicator");
  if (badge) {
    badge.innerText = `📱 QR MESA #${currentDetectedMesa}`;
    badge.style.cursor = "pointer";
    badge.onclick = openHeaderTableInfoModal;
  }
  const checkoutLabel = document.getElementById("checkout-mesa-name");
  if (checkoutLabel) {
    checkoutLabel.innerText = `Mesa #${currentDetectedMesa}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreSelectedMesa();
  loadCartFromStorage();
  restoreActiveOrderTracking();

  // ⚡ PETICIONES PARALELAS Y OPTIMIZADAS (Promise.all)
  Promise.all([
    loadConfigPublica(),
    loadToonCategories(),
    loadToonProducts(),
    loadGuiaItems(),
    loadPromocionesToon()
  ]).then(() => {
    console.log("⚡ Carga paralela optimizada completada.");
    updateProfileUI();
    initSmartRecommendationsAlgorithm();
  }).catch(err => {
    console.error("Error en peticiones iniciales:", err);
  });

  new WSClient((event, data) => {
    if (event === "CAMBIO_ESTADO_PEDIDO") {
      showToast(`⚡ Estado de pedido actualizado: ${data.nuevo_estado || 'EN PROCESO'}`, "info");
      if (currentPendingOrderId) trackClientOrderLive(currentPendingOrderId);
      loadHistorialPedidos();
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

  // Resalte activo en la barra inferior (.bottom-bar li a)
  document.querySelectorAll(".bottom-bar li a, .nav-item").forEach(n => n.classList.remove("active"));
  const idMap = {
    'screen-home': 'nav-link-home',
    'screen-categorias': 'nav-link-menu',
    'screen-menu': 'nav-link-menu',
    'screen-carrito': 'nav-link-cart',
    'screen-historial': 'nav-link-historial',
    'screen-perfil': 'nav-link-perfil'
  };
  const targetLinkId = idMap[screenId];
  if (targetLinkId) {
    const el = document.getElementById(targetLinkId);
    if (el) el.classList.add("active");
  }

  if (screenId === "screen-historial") loadHistorialPedidos();
  if (screenId === "screen-tracking" && currentPendingOrderId) trackClientOrderLive(currentPendingOrderId);
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

let promoCarouselTimer = null;
let promoCurrentIndex = 0;

function renderPromoBanner() {
  const container = document.getElementById("home-promo-banner-container");
  if (!container) return;

  // Promociones dinámicas de Backend (Admin CRUD) o lista muestra
  let list = toonPromos && toonPromos.length > 0 ? toonPromos : [
    {
      id: 1,
      titulo: "COMBO EXPLOSIVO DAVID 🍔",
      descripcion: "2 Hamburguesas Artesanales + Papas Rústicas + 2 Bebidas Heladas",
      banner_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000",
      descuento_pct: 20,
      codigo_cupon: "TOON20"
    },
    {
      id: 2,
      titulo: "SUPER HOT DOGS CROCANTES 🌭",
      descripcion: "Doble salchicha premium, lluvia de papas, queso fundido y tocineta",
      banner_url: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=1000",
      descuento_pct: 15,
      codigo_cupon: "HOT15"
    },
    {
      id: 3,
      titulo: "SHAKES & POSTRES GOURMET 🍰",
      descripcion: "Malteada Oreo gigante con crema batida y brownie artesanal de chocolate",
      banner_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=1000",
      descuento_pct: 10,
      codigo_cupon: "DULCE10"
    }
  ];

  if (promoCurrentIndex >= list.length) promoCurrentIndex = 0;
  const p = list[promoCurrentIndex];
  const isVideo = p.banner_url && (p.banner_url.endsWith(".mp4") || p.banner_url.endsWith(".webm"));

  // Puntos indicadores deslizantes
  let dotsHtml = list.map((_, idx) => `
    <span class="carousel-dot ${idx === promoCurrentIndex ? 'active' : ''}" onclick="event.stopPropagation(); setCarouselSlide(${idx})" style="width: ${idx === promoCurrentIndex ? '22px' : '8px'}; height: 8px; border-radius: 10px; background: ${idx === promoCurrentIndex ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)'}; cursor: pointer; transition: all 0.3s ease; display: inline-block;"></span>
  `).join('');

  container.innerHTML = `
    <div style="position: relative; border-radius: 20px; overflow: hidden; height: 260px; border: 2px solid var(--gold-accent); box-shadow: 0 12px 35px rgba(255,183,3,0.35); cursor: pointer;" onclick="handleCarouselClick(${p.id})">
      
      <!-- Fondo Multimedia Foto o Video HD -->
      ${isVideo ? `
        <video src="${p.banner_url}" autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85);"></video>
      ` : `
        <img src="${p.banner_url}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85); transition: transform 0.6s ease;" alt="${p.titulo}">
      `}

      <!-- Capa de Información y Controles -->
      <div style="position: absolute; inset: 0; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(0deg, rgba(8,12,20,0.92) 0%, rgba(8,12,20,0.2) 50%, rgba(0,0,0,0.4) 100%);">
        
        <!-- Badge de Descuento / Cupón Editable Admin -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.78rem; font-weight: 900; background: var(--neon-red); color: #fff; padding: 0.3rem 0.85rem; border-radius: 20px; box-shadow: 0 4px 15px rgba(255,71,87,0.4);">
            🔥 PROMO DE LA CASA ${p.descuento_pct ? `(-${p.descuento_pct}% OFF)` : ''}
          </span>
          <span style="font-size: 0.78rem; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid var(--cyan-accent); color: var(--cyan-accent); padding: 0.3rem 0.75rem; border-radius: 20px; font-weight: 900;">
            CÓDIGO: ${p.codigo_cupon || 'DAVID'}
          </span>
        </div>

        <!-- Flechas de Navegación Manual -->
        <button onclick="event.stopPropagation(); prevCarouselSlide(${list.length})" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.65); color: var(--gold-accent); border: 1px solid var(--gold-accent); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); z-index: 10;">‹</button>
        <button onclick="event.stopPropagation(); nextCarouselSlide(${list.length})" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.65); color: var(--gold-accent); border: 1px solid var(--gold-accent); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); z-index: 10;">›</button>

        <!-- Detalles del Banner y Puntos Indicadores -->
        <div>
          <h3 style="font-size: 1.45rem; font-weight: 900; color: #fff; margin: 0 0 0.2rem 0; text-shadow: 0 3px 10px rgba(0,0,0,0.9); line-height: 1.1;">
            ${p.titulo}
          </h3>
          <p style="font-size: 0.85rem; color: #cbd5e1; margin: 0 0 0.65rem 0; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 2px 6px rgba(0,0,0,0.9);">
            ${p.descripcion || ''}
          </p>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              ${dotsHtml}
            </div>
            <button class="btn-gold" style="padding: 0.45rem 1rem; font-size: 0.82rem; font-weight: 900; display: flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 15px rgba(255,188,13,0.4);">
              <span>🛒 PEDIR ESTA PROMO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Iniciar timer deslizante automático cada 4 segundos
  if (!promoCarouselTimer) {
    promoCarouselTimer = setInterval(() => {
      promoCurrentIndex = (promoCurrentIndex + 1) % list.length;
      renderPromoBanner();
    }, 4000);
  }
}

function setCarouselSlide(index) {
  promoCurrentIndex = index;
  renderPromoBanner();
}

function nextCarouselSlide(maxLen) {
  promoCurrentIndex = (promoCurrentIndex + 1) % maxLen;
  renderPromoBanner();
}

function prevCarouselSlide(maxLen) {
  promoCurrentIndex = (promoCurrentIndex - 1 + maxLen) % maxLen;
  renderPromoBanner();
}

function handleCarouselClick(promoId) {
  if (toonProducts && toonProducts.length > 0) {
    openProductModal(toonProducts[0].id);
  } else {
    showScreen("screen-menu");
  }
}

function renderPhotoCategories() {
  const container = document.getElementById("home-categories-grid");
  if (!container) return;

  const catIcons = {
    "Hamburguesas": "🍔",
    "Hot Dogs": "🌭",
    "Papas": "🍟",
    "Bebidas": "🥤",
    "Postres": "🍰",
    "Alitas": "🍗",
    "Combos": "🎁"
  };

  const isAllActive = !activeCategoryFilter;

  let html = `
    <div style="display: flex; gap: 0.55rem; overflow-x: auto; padding-bottom: 0.35rem; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
      <div class="cat-pill-item ${isAllActive ? 'active' : ''}" style="background: ${isAllActive ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.05)'}; color: ${isAllActive ? '#000000' : 'var(--text-muted)'}; border: 1px solid ${isAllActive ? 'var(--gold-accent)' : 'var(--toon-border)'}; padding: 0.45rem 0.95rem; border-radius: 25px; font-weight: 800; font-size: 0.8rem; white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s ease;" onclick="filterCategoryToon(null)">
        <span>🔥</span>
        <span>TODOS</span>
      </div>
  `;

  toonCategories.forEach(c => {
    const icon = catIcons[c.nombre] || "🍽️";
    const isActive = activeCategoryFilter === c.id;
    html += `
      <div class="cat-pill-item ${isActive ? 'active' : ''}" style="background: ${isActive ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.05)'}; color: ${isActive ? '#000000' : 'var(--text-muted)'}; border: 1px solid ${isActive ? 'var(--gold-accent)' : 'var(--toon-border)'}; padding: 0.45rem 0.95rem; border-radius: 25px; font-weight: 800; font-size: 0.8rem; white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s ease;" onclick="filterCategoryToon(${c.id})">
        <span>${icon}</span>
        <span>${c.nombre.toUpperCase()}</span>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  
  if (document.getElementById("full-categories-grid")) {
    document.getElementById("full-categories-grid").innerHTML = html;
  }
}

function filterCategoryToon(catId) {
  activeCategoryFilter = catId;
  renderPhotoCategories();
  renderToonProducts();
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
  saveCartToStorage();
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
    setTimeout(() => initDeliveryInteractiveMap(), 150);
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

/* ==================== FLUJO DE MODALIDAD, MAPA Y PASARELA DE PAGO CLIENTE (ESTILO CASHEA) ==================== */
let selectedModality = 'mesa';
let selectedMesaPaymentMode = 'PAGAR_ANTES';
let leafletMap = null;
let leafletMarker = null;
let selectedDeliveryCoords = { lat: 10.4806, lng: -66.9036 };
let currentRatingStars = 5;

function openOrderModalityModal() {
  openModal("order-modality-modal");
}

function selectOrderModality(modality) {
  selectedModality = modality;
  closeModal("order-modality-modal");

  if (modality === "mesa") {
    if (!currentDetectedMesa) {
      showToast("Por favor escanea el código QR de tu mesa", "info");
      openQrScannerModal();
    } else {
      openModal("mesa-payment-option-modal");
    }
  } else if (modality === "llevar") {
    selectedMesaPaymentMode = "PAGAR_ANTES";
    openClientPaymentGateway();
  } else if (modality === "delivery") {
    const u = Auth.getUser();
    if (!u) {
      showToast("¡Regístrate para acumular puntos de fidelidad en tu delivery!", "info");
    }
    openDeliveryMapModal();
  }
}

function chooseMesaPaymentMode(mode) {
  selectedMesaPaymentMode = mode;
  closeModal("mesa-payment-option-modal");
  
  if (mode === "PAGAR_ANTES") {
    openClientPaymentGateway();
  } else {
    submitFinalOrderWithMode("PAGAR_DESPUES");
  }
}

function openDeliveryMapModal() {
  openModal("delivery-map-modal");
  setTimeout(() => {
    initLeafletDeliveryMap();
  }, 300);
}

function initLeafletDeliveryMap() {
  const container = document.getElementById("leaflet-map-container");
  if (!container || leafletMap) return;

  leafletMap = L.map("leaflet-map-container").setView([10.4806, -66.9036], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(leafletMap);

  leafletMarker = L.marker([10.4806, -66.9036], { draggable: true }).addTo(leafletMap);

  leafletMarker.on("dragend", function (e) {
    const latlng = e.target.getLatLng();
    selectedDeliveryCoords = { lat: latlng.lat, lng: latlng.lng };
    if (document.getElementById("map-address-input")) {
      document.getElementById("map-address-input").value = `Coordenadas GPS: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    }
  });
}

function confirmDeliveryMapLocation() {
  const addr = document.getElementById("map-address-input")?.value || "Ubicación fijada por Mapa GPS";
  closeModal("delivery-map-modal");
  openClientPaymentGateway();
}

let currentGatewayTab = 'card';

function switchGatewayTab(tab) {
  currentGatewayTab = tab;
  document.querySelectorAll(".payment-method-tab").forEach(t => t.classList.remove("active"));
  
  const activeTabBtn = document.getElementById(`tab-pay-${tab}`);
  if (activeTabBtn) activeTabBtn.classList.add("active");

  if (document.getElementById("gateway-sec-card")) document.getElementById("gateway-sec-card").style.display = tab === 'card' ? 'block' : 'none';
  if (document.getElementById("gateway-sec-pm")) document.getElementById("gateway-sec-pm").style.display = tab === 'pm' ? 'block' : 'none';
  if (document.getElementById("gateway-sec-zelle")) document.getElementById("gateway-sec-zelle").style.display = tab === 'zelle' ? 'block' : 'none';
  if (document.getElementById("gateway-sec-cash")) document.getElementById("gateway-sec-cash").style.display = tab === 'cash' ? 'block' : 'none';
}

function updateCardPreview() {
  const num = document.getElementById("card-input-num")?.value || "";
  const exp = document.getElementById("card-input-exp")?.value || "";
  const name = document.getElementById("card-input-name")?.value || "";

  if (document.getElementById("preview-card-num")) {
    document.getElementById("preview-card-num").innerText = num ? num : "4532 •••• •••• 4242";
  }
  if (document.getElementById("preview-card-exp")) {
    document.getElementById("preview-card-exp").innerText = exp || "12/28";
  }
  if (document.getElementById("preview-card-name")) {
    document.getElementById("preview-card-name").innerText = name ? name.toUpperCase() : "NOMBRE DEL CLIENTE";
  }
}

function copyBankData() {
  const text = "DONDE DAVID C.A.\nBanco: Banesco (0134)\nRIF: J-50123984-0\nTeléfono: 0414-555-4321";
  try {
    navigator.clipboard.writeText(text);
  } catch(e){}
  showToast("📋 Datos bancarios copiados al portapapeles", "success");
}

function openClientPaymentGateway() {
  const subtotal = toonCart.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = subtotal * 0.16;
  const extra = selectedModality === "delivery" ? 5.0 : (selectedModality === "llevar" ? 1.0 : 0.0);
  const total = subtotal + tax + extra;

  if (document.getElementById("gateway-total-display")) {
    document.getElementById("gateway-total-display").innerHTML = formatPriceDual(total);
  }
  openModal("client-payment-gateway-modal");
}

let currentSelectedMetodoPagoLabel = 'Pago Móvil';

function submitClientGatewayPayment() {
  let payMethodLabel = "Efectivo en Caja";

  if (currentGatewayTab === "pm") {
    const pmDigits = document.getElementById("pm-ref-input")?.value.trim() || "";
    if (pmDigits.length < 4) {
      showToast("Por favor ingrese los 4 dígitos de la referencia de Pago Móvil", "warning");
      return;
    }
    payMethodLabel = `Pago Móvil (Ref: ...${pmDigits})`;
  } else if (currentGatewayTab === "card") {
    payMethodLabel = "Tarjeta POS en Caja";
  } else if (currentGatewayTab === "zelle") {
    const zRef = document.getElementById("zelle-ref-input")?.value.trim() || "ZELLE";
    payMethodLabel = `Zelle (Ref: ${zRef})`;
  } else if (currentGatewayTab === "cash") {
    const cashVal = document.getElementById("cash-bill-input")?.value.trim() || "";
    payMethodLabel = `Efectivo en Caja ${cashVal ? '(' + cashVal + ')' : ''}`;
  }

  currentSelectedMetodoPagoLabel = payMethodLabel;

  const btn = document.getElementById("btn-submit-payment-gateway");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>🔄 ENVIANDO A CAJA...</span>`;
  }

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🔒 CONFIRMAR Y ENVIAR A CAJA</span>`;
    }
    closeModal("client-payment-gateway-modal");
    submitFinalOrderWithMode("PAGAR_ANTES");
  }, 800);
}

let currentCustomerGPS = null;
let deliveryMap = null;
let deliveryMarker = null;

function initDeliveryInteractiveMap(initialLat = 10.4806, initialLng = -66.9036) {
  const container = document.getElementById("delivery-google-map");
  if (!container || typeof L === "undefined") return;

  if (deliveryMap) {
    deliveryMap.setView([initialLat, initialLng], 15);
    if (deliveryMarker) deliveryMarker.setLatLng([initialLat, initialLng]);
    setTimeout(() => deliveryMap.invalidateSize(), 300);
    return;
  }

  deliveryMap = L.map('delivery-google-map').setView([initialLat, initialLng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© Google Maps / OpenStreetMap'
  }).addTo(deliveryMap);

  const customIcon = L.divIcon({
    className: 'custom-gps-pin',
    html: '<div style="font-size: 2.4rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.7)); transform: translate(-50%, -100%);">📍</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 36]
  });

  deliveryMarker = L.marker([initialLat, initialLng], { draggable: true, icon: customIcon }).addTo(deliveryMap);

  function updateAddressFromMarker(lat, lng) {
    const mapsUrl = `https://maps.google.com/?q=${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
    const textVal = `📍 GPS: Lat ${parseFloat(lat).toFixed(6)}, Lng ${parseFloat(lng).toFixed(6)} (${mapsUrl})`;
    
    const input = document.getElementById("deliv-direccion");
    if (input) input.value = textVal;

    const badge = document.getElementById("gps-status-badge");
    if (badge) {
      badge.style.display = "block";
      badge.innerHTML = `🌐 <strong>GPS Google Maps:</strong> Lat ${parseFloat(lat).toFixed(6)}, Lng ${parseFloat(lng).toFixed(6)} • <a href="${mapsUrl}" target="_blank" style="color: var(--gold-accent); text-decoration: underline; font-weight: 800;">Probar en Google Maps</a>`;
    }
  }

  deliveryMarker.on('dragend', function (e) {
    const latLng = e.target.getLatLng();
    updateAddressFromMarker(latLng.lat, latLng.lng);
  });

  deliveryMap.on('click', function (e) {
    deliveryMarker.setLatLng(e.latlng);
    updateAddressFromMarker(e.latlng.lat, e.latlng.lng);
  });

  updateAddressFromMarker(initialLat, initialLng);
  setTimeout(() => deliveryMap.invalidateSize(), 300);
}

function getDeviceGPSLocationOneClick() {
  const btn = document.getElementById("btn-detect-1click-gps");
  const badge = document.getElementById("gps-status-badge");
  const dirInput = document.getElementById("deliv-direccion");

  if (!navigator.geolocation) {
    showToast("⚠️ Tu dispositivo o navegador no admite geolocalización GPS automática.", "warning");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span style="font-size: 1.4rem; animation: spin 1s infinite linear;">📡</span> <span>BUSCANDO TU POSICIÓN EXACTA GPS...</span>`;
  }

  showToast("📡 Obteniendo coordenadas exactas por GPS en 1-clic...", "info");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

      currentCustomerGPS = { lat, lng, googleMapsUrl };

      if (dirInput) {
        dirInput.value = `📍 Ubicación GPS Exacta: Lat ${lat}, Lng ${lng} (${googleMapsUrl})`;
      }

      if (badge) {
        badge.style.display = "block";
        badge.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.3rem;">
            <strong style="color: var(--cyan-accent); font-size: 0.9rem;">📍 ¡UBICACIÓN GPS CAPTURADA CON ÉXITO EN 1-CLIC!</strong>
            <span style="background: var(--accent-green); color: #000; font-weight: 900; font-size: 0.68rem; padding: 0.15rem 0.5rem; border-radius: 10px;">EN VIVO</span>
          </div>
          <div style="font-size: 0.82rem; color: #fff; margin-bottom: 0.3rem;">
            <strong>Coordenadas:</strong> Lat ${lat}, Lng ${lng}
          </div>
          <a href="${googleMapsUrl}" target="_blank" style="color: var(--gold-accent); text-decoration: underline; font-weight: 800; font-size: 0.78rem; display: inline-block;">
            🗺️ Probar enlace oficial en Google Maps →
          </a>
        `;
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span style="font-size: 1.4rem;">✅</span> <span>UBICACIÓN GPS CAPTURADA (TOCA PARA REFRESCAR)</span>`;
        btn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
      }

      if (typeof initDeliveryInteractiveMap === "function") {
        initDeliveryInteractiveMap(parseFloat(lat), parseFloat(lng));
      }

      showToast("📍 ¡Ubicación GPS capturada en 1-clic exitosamente!", "success");
    },
    (error) => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span style="font-size: 1.4rem;">📍</span> <span>REINTENTAR DETECCIÓN GPS EN 1-CLIC</span>`;
      }

      let errMsg = "No se pudo obtener la posición GPS.";
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = "⚠️ Permiso de ubicación denegado. Por favor activa el GPS en tu celular.";
      } else if (error.code === error.TIMEOUT) {
        errMsg = "⏱️ Tiempo de espera agotado al obtener el GPS.";
      }

      showToast(errMsg, "danger");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function getDeviceGPSLocation() {
  getDeviceGPSLocationOneClick();
}

async function submitFinalOrderWithMode(modoPago) {
  const u = Auth.getUser();

  if (selectedModality === "delivery") {
    const name = (u ? `${u.nombre} ${u.apellido}` : document.getElementById("deliv-nombre")?.value.trim()) || "";
    const phone = (u ? u.telefono : document.getElementById("deliv-telefono")?.value.trim()) || "";
    const address = (document.getElementById("deliv-direccion")?.value || document.getElementById("map-address-input")?.value || "").trim();

    if (!name || name === "Cliente Delivery" || !phone || !address || address === "Ubicación cliente") {
      showToast("⚠️ Para envíos por Delivery debes registrar tu Nombre, Teléfono y Dirección/GPS de entrega.", "warning");
      openOrderModalityModal();
      return;
    }
  }

  const mesaName = selectedModality === "mesa" ? `Mesa ${currentDetectedMesa || 1}` : (selectedModality === "delivery" ? "Delivery" : "Mostrador (Para Llevar)");

  const payload = {
    numero_mesa: mesaName,
    tipo: selectedModality,
    modo_pago: modoPago,
    metodo_pago: currentSelectedMetodoPagoLabel,
    nombre_cliente_delivery: u ? `${u.nombre} ${u.apellido}` : (document.getElementById("deliv-nombre")?.value || "Cliente Delivery"),
    telefono_delivery: u ? u.telefono : (document.getElementById("deliv-telefono")?.value || "+58 414 123 4567"),
    direccion_delivery: document.getElementById("deliv-direccion")?.value || document.getElementById("map-address-input")?.value || "Ubicación cliente",
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

    if (!res.ok) throw new Error("Error al registrar pedido");
    const order = await res.json();
    currentPendingOrderId = order.id;
    saveActiveOrderToStorage(order.id);

    toonCart = [];
    saveCartToStorage();
    updateCartNavBadge();

    showToast(`⚡ ¡Pedido #${order.id} registrado con éxito!`, "success");
    
    // Redirigir al seguimiento en vivo
    trackClientOrderLive(order.id);
    showScreen("screen-tracking");
    setTimeout(() => {
      openServiceRatingModal();
    }, 1200);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openServiceRatingModal() {
  setRatingStars(5);
  openModal("service-rating-modal");
}

function setRatingStars(count) {
  currentRatingStars = count;
  const stars = document.querySelectorAll("#star-rating-picker span");
  stars.forEach((s, idx) => {
    s.style.opacity = idx < count ? "1" : "0.3";
  });
}

async function submitServiceRating() {
  const comment = document.getElementById("rating-comment-input")?.value || "Excelente atención y comida deliciosa";
  const u = Auth.getUser();
  const name = u ? `${u.nombre} ${u.apellido}` : "Cliente Satisfecho";

  try {
    await fetch("/api/v1/cliente/resenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_cliente: name,
        comentario: comment,
        estrellas: currentRatingStars
      })
    });
    showToast("🌟 ¡Gracias por calificar nuestro servicio!", "success");
    closeModal("service-rating-modal");
    showScreen("screen-tracking");
  } catch(e) {
    closeModal("service-rating-modal");
    showScreen("screen-tracking");
  }
}

/* ==================== GUSTICOS VALENCIA INPIRED FUNCTIONS ==================== */
function sendChatbotMessage() {
  const input = document.getElementById("chat-input-msg");
  const container = document.getElementById("chat-messages-container");
  if (!input || !container) return;

  const msg = input.value.trim();
  if (!msg) return;

  const userDiv = document.createElement("div");
  userDiv.style.cssText = "background: var(--gold-gradient); color: #000; font-weight: 800; padding: 0.65rem 0.85rem; border-radius: 12px; font-size: 0.82rem; align-self: flex-end; max-width: 85%; box-shadow: 0 4px 12px rgba(255,188,13,0.3);";
  userDiv.innerText = msg;
  container.appendChild(userDiv);

  input.value = "";
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    let reply = "¡Excelente consulta! Te recomendamos probar nuestra famosa **Hamburguesa Doble Toon** con Tocino o consultar nuestras promociones especiales.";
    const lower = msg.toLowerCase();

    if (lower.includes("promo") || lower.includes("oferta") || lower.includes("combo")) {
      reply = "🔥 ¡Nuestra mejor promo es el **COMBO EXPLOSIVO TOON**! Incluye 2 Hamburguesas + Papas Fritas + 2 Refrescos por solo **$15.00**.";
    } else if (lower.includes("horario") || lower.includes("abierto")) {
      reply = "🕒 Estamos abiertos todos los días de **11:00 AM a 11:00 PM**. Pedidos QR en mesa y Delivery en vivo.";
    } else if (lower.includes("pago") || lower.includes("banco") || lower.includes("zelle")) {
      reply = "💳 Aceptamos Pago Móvil (Banesco/Mercantil), Efectivo ($/Bs), Tarjetas de Crédito/Débito y Zelle.";
    } else if (lower.includes("pedido") || lower.includes("mi orden") || lower.includes("donde viene")) {
      reply = `📋 Tu pedido actual registrado está en proceso. Puedes revisar el estado en vivo desde la pestaña de **Pedidos**.`;
    }

    const botDiv = document.createElement("div");
    botDiv.style.cssText = "background: rgba(255,255,255,0.06); padding: 0.75rem; border-radius: 12px; font-size: 0.85rem; color: #fff; align-self: flex-start; border: 1px solid var(--toon-border); max-width: 88%;";
    botDiv.innerHTML = `🤖 ${reply}`;
    container.appendChild(botDiv);
    container.scrollTop = container.scrollHeight;
  }, 600);
}

async function submitClientUserRegistration() {
  const nombre = document.getElementById("reg-nombre")?.value;
  const apellido = document.getElementById("reg-apellido")?.value;
  const email = document.getElementById("reg-email")?.value;
  const tel = document.getElementById("reg-tel")?.value;
  const username = document.getElementById("reg-username")?.value;
  const pass = document.getElementById("reg-pass")?.value;

  if (!nombre || !email || !username || !pass) {
    showToast("Por favor completa los campos obligatorios de registro.", "warning");
    return;
  }

  try {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre,
        apellido: apellido || "",
        email: email,
        telefono: tel || "",
        nombre_usuario: username,
        password: pass
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al registrar cliente");
    }

    const data = await res.json();
    if (data.access_token) {
      Auth.setToken(data.access_token, data.usuario);
    }

    showToast("🎉 ¡Registro completado con éxito! Ganaste 50 Puntos de Bienvenida 🏆", "success");
    closeModal("client-register-modal");
    updateProfileUI();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function updateProfileUI() {
  const u = Auth.getUser();
  const actionsContainer = document.getElementById("profile-actions-container");

  if (u) {
    const clientCode = `CLI-${String(u.id).padStart(4, '0')}`;
    if (document.getElementById("profile-name")) document.getElementById("profile-name").innerText = `${u.nombre} ${u.apellido || ''}`;
    if (document.getElementById("profile-email")) document.getElementById("profile-email").innerHTML = `<span style="color: var(--cyan-accent); font-weight: 900; background: rgba(0,245,212,0.1); padding: 0.2rem 0.65rem; border-radius: 14px; border: 1px solid var(--cyan-accent); font-size: 0.82rem; display: inline-block; margin-bottom: 0.3rem;">🆔 CÓDIGO CLIENTE: ${clientCode}</span><br><span style="font-size: 0.8rem;">${u.email}</span>`;
    if (document.getElementById("profile-points-display")) document.getElementById("profile-points-display").innerText = `${u.puntos_fidelidad || 50} Puntos 🏆`;
    if (document.getElementById("profile-avatar")) {
      const initials = (u.nombre[0] + (u.apellido ? u.apellido[0] : '')).toUpperCase();
      document.getElementById("profile-avatar").innerText = initials;
    }
    if (document.getElementById("home-welcome-subtitle")) {
      document.getElementById("home-welcome-subtitle").innerText = `👋 Hola, ${u.nombre} (${clientCode}). ¡Tienes ${u.puntos_fidelidad || 50} Puntos! 🏆`;
    }

    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <button class="btn-gold" style="width: 100%; font-size: 1rem;" onclick="showScreen('screen-historial')">
          📋 VER MI HISTORIAL COMPLETO DE PEDIDOS
        </button>
        <button class="btn-gold" style="width: 100%; background: rgba(255, 71, 87, 0.2); color: var(--neon-red); border: 1px solid var(--neon-red);" onclick="Auth.logout()">
          🚪 Cerrar Sesión
        </button>
      `;
    }

    initSmartRecommendationsAlgorithm();
  } else {
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <button class="btn-gold" style="width: 100%; font-size: 1rem;" onclick="openModal('client-login-modal')">
          🔑 INICIAR SESIÓN EN MI CUENTA
        </button>
        <button class="btn-gold" style="width: 100%; background: linear-gradient(135deg, #00f5d4, #00b4d8); color: #000;" onclick="openModal('client-register-modal')">
          📝 REGISTRARME COMO NUEVO CLIENTE (+50 PTS)
        </button>
      `;
    }
  }
}

async function submitClientLogin() {
  const username = document.getElementById("login-username-input")?.value;
  const pass = document.getElementById("login-pass-input")?.value;

  if (!username || !pass) {
    showToast("Ingresa tu usuario y contraseña", "warning");
    return;
  }

  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_usuario: username, password: pass })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Credenciales incorrectas");
    }

    const data = await res.json();
    Auth.setToken(data.access_token, data.usuario);

    showToast(`🔑 ¡Bienvenido de nuevo, ${data.usuario.nombre}!`, "success");
    closeModal("client-login-modal");
    updateProfileUI();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

let lastUserOrderItems = [];
let lastUserOrderTotal = 0;

async function initSmartRecommendationsAlgorithm() {
  const u = Auth.getUser();
  if (!u) return;

  try {
    const res = await fetch("/api/v1/cliente/pedidos/historial", {
      headers: Auth.getHeaders()
    });
    if (!res.ok) return;
    const pedidos = await res.json();

    if (pedidos && pedidos.length > 0) {
      const last = pedidos[0];
      lastUserOrderItems = last.detalles || [];
      lastUserOrderTotal = last.total || 15.0;

      const summaryText = lastUserOrderItems.map(d => `${d.cantidad}x ${d.producto_nombre || 'Producto'}`).join(" + ") || "Tu combinación favorita";
      
      const reorderBox = document.getElementById("reorder-algorithm-container");
      if (reorderBox) {
        reorderBox.style.display = "block";
        document.getElementById("reorder-items-summary").innerText = summaryText;
        document.getElementById("reorder-price-val").innerText = lastUserOrderTotal.toFixed(2);
      }

      const profileReorderBox = document.getElementById("profile-reorder-container");
      if (profileReorderBox) {
        profileReorderBox.style.display = "block";
        document.getElementById("profile-reorder-summary").innerText = summaryText;
        document.getElementById("profile-reorder-price-val").innerText = lastUserOrderTotal.toFixed(2);
      }

      // Generar recomendaciones dinámicas basadas en categorías
      renderSmartRecommendations();
    }
  } catch(e) {
    console.error("Error en algoritmo de recomendaciones:", e);
  }
}

function renderSmartRecommendations() {
  const recomGrid = document.getElementById("smart-recommendations-grid");
  const recomBox = document.getElementById("smart-recommendations-container");
  const profileRecomGrid = document.getElementById("profile-smart-recommendations-grid");
  const profileRecomBox = document.getElementById("profile-smart-recommendations-container");

  if (!toonProducts || toonProducts.length === 0) return;

  const suggested = toonProducts.filter(p => p.stock > 0).slice(0, 3);
  if (suggested.length === 0) return;

  let html = "";
  suggested.forEach(p => {
    html += `
      <div style="min-width: 200px; max-width: 220px; background: var(--toon-card); border: 1px solid var(--toon-border); border-radius: 14px; padding: 0.85rem; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <img src="${p.imagen_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300'}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 10px; margin-bottom: 0.5rem;" alt="${p.nombre}">
        <div style="font-weight: 800; font-size: 0.85rem; color: #fff; line-height: 1.2; height: 2.2rem; overflow: hidden;">${p.nombre}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <span style="font-weight: 900; color: var(--gold-accent); font-size: 0.95rem;">$${p.precio.toFixed(2)}</span>
          <button class="btn-gold" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" onclick="addQuickProductToCart(${p.id})">⚡ Agregar</button>
        </div>
      </div>
    `;
  });

  if (recomGrid && recomBox) {
    recomGrid.innerHTML = html;
    recomBox.style.display = "block";
  }
  if (profileRecomGrid && profileRecomBox) {
    profileRecomGrid.innerHTML = html;
    profileRecomBox.style.display = "block";
  }
}

function addQuickProductToCart(prodId) {
  const p = toonProducts.find(item => item.id === prodId);
  if (!p) return;

  toonCart.push({
    producto_id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    cantidad: 1,
    subtotal: p.precio,
    opciones: []
  });
  updateCartNavBadge();
  showToast(`⚡ ${p.nombre} agregado al carrito`, "success");
}

function repeatLastOrderOneClick() {
  if (!lastUserOrderItems || lastUserOrderItems.length === 0) {
    if (toonProducts && toonProducts.length > 0) {
      addQuickProductToCart(toonProducts[0].id);
    }
  } else {
    lastUserOrderItems.forEach(d => {
      toonCart.push({
        producto_id: d.producto_id,
        nombre: d.producto_nombre || "Producto",
        precio_unitario: d.precio_unitario || d.precio || 5.0,
        cantidad: d.cantidad || 1,
        subtotal: d.subtotal || 5.0,
        opciones: []
      });
    });
    updateCartNavBadge();
  }

  showToast("⚡ ¡Pedido anterior cargado en tu carrito en 1-clic!", "success");
  openOrderModalityModal();
}

async function trackClientOrderLive(orderId) {
  if (!orderId) return;
  try {
    const res = await fetch(`/api/v1/cliente/pedidos/${orderId}`);
    if (!res.ok) return;
    const order = await res.json();

    if (document.getElementById("track-order-num")) {
      document.getElementById("track-order-num").innerText = `PEDIDO #${order.id} (${order.numero_mesa || 'Mostrador'})`;
    }
    if (document.getElementById("track-order-status")) {
      const statusColors = {
        'PENDIENTE': 'var(--gold-accent)',
        'EN_PREPARACION': 'var(--cyan-accent)',
        'LISTO': '#22c55e',
        'ENTREGADO': '#22c55e',
        'COBRADO': 'var(--cyan-accent)'
      };
      const statusText = {
        'PENDIENTE': '⏳ RECIBIDO EN CAJA (PENDIENTE DE PREPARACIÓN)',
        'EN_PREPARACION': '🍳 EN PREPARACIÓN POR EL CHEF',
        'LISTO': '🔔 ¡LISTO PARA SERVIR / ENTREGAR!',
        'ENTREGADO': '✅ ENTREGADO Y DISFRUTADO',
        'COBRADO': '💳 COBRADO EN CAJA POS'
      };
      const st = order.estado || 'PENDIENTE';
      document.getElementById("track-order-status").innerText = statusText[st] || st;
      document.getElementById("track-order-status").style.color = statusColors[st] || '#fff';
    }
    if (document.getElementById("track-order-info")) {
      const detailsTxt = order.detalles ? order.detalles.map(d => `${d.cantidad}x ${d.producto_nombre || (d.producto ? d.producto.nombre : 'Producto')}`).join(" + ") : '';
      document.getElementById("track-order-info").innerHTML = `
        <div style="font-weight: 800; color: #fff; margin-bottom: 0.4rem;">📦 ${detailsTxt}</div>
        <small style="color: var(--text-muted);">Total: ${formatPriceDual(order.total || 0)} • ${order.tipo ? order.tipo.toUpperCase() : 'MESA'}</small>
      `;
    }
  } catch(e) {
    console.error("Error al rastrear pedido en vivo:", e);
  }
}

async function loadHistorialPedidos() {
  const container = document.getElementById("historial-orders-list") || document.getElementById("historial-pedidos-container") || document.getElementById("client-orders-history-list");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: var(--gold-accent);">
      <div style="font-size: 2rem; animation: spin 1s infinite linear;">⚡</div>
      <p style="margin-top: 0.5rem; font-weight: 800;">Cargando tu historial de pedidos...</p>
    </div>
  `;

  try {
    let pedidos = [];
    const u = Auth.getUser();

    if (u) {
      const res = await fetch("/api/v1/cliente/pedidos/historial", {
        headers: Auth.getHeaders()
      });
      if (res.ok) {
        pedidos = await res.json();
      }
    }

    if ((!pedidos || pedidos.length === 0) && currentPendingOrderId) {
      try {
        const resLocal = await fetch(`/api/v1/cliente/pedidos/${currentPendingOrderId}`);
        if (resLocal.ok) {
          const ord = await resLocal.json();
          pedidos = [ord];
        }
      } catch(e){}
    }

    if (!pedidos || pedidos.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; background: var(--toon-card); border: 1px solid var(--toon-border); border-radius: 20px; margin-top: 1rem;">
          <span style="font-size: 3rem;">📦</span>
          <h4 style="color: #fff; font-size: 1.15rem; font-weight: 900; margin-top: 0.5rem;">AÚN NO HAS REALIZADO PEDIDOS</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.3rem;">¡Explora nuestro delicioso menú y haz tu primera comanda en 1-clic!</p>
          <button class="btn-gold" style="margin-top: 1.25rem; font-size: 0.9rem;" onclick="showScreen('screen-menu')">🍔 VER MENÚ GOURMET</button>
        </div>
      `;
      return;
    }

    let html = "";
    pedidos.forEach(p => {
      const statusBadgeClass = p.estado === 'ENTREGADO' ? 'success' : (p.estado === 'COBRADO' ? 'info' : 'warning');
      const itemsText = p.detalles ? p.detalles.map(d => `${d.cantidad}x ${d.producto_nombre || 'Producto'}`).join(", ") : "Comanda Especial";
      const totalDisplay = formatPriceDual(p.total || 0.0);
      const dateTxt = p.creado_en ? new Date(p.creado_en).toLocaleString() : 'Reciente';

      html += `
        <div style="background: var(--toon-card); border: 1px solid var(--toon-border); border-radius: 16px; padding: 1.1rem; margin-bottom: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
            <div>
              <strong style="color: var(--gold-accent); font-size: 1rem;">PEDIDO #${p.id}</strong>
              <small style="color: var(--text-muted); display: block; font-size: 0.75rem;">${dateTxt} • ${p.numero_mesa || 'Mostrador'}</small>
            </div>
            <span class="badge badge-${statusBadgeClass}" style="font-size: 0.78rem; padding: 0.3rem 0.65rem; border-radius: 12px; font-weight: 800;">
              ${p.estado || 'EN PROCESO'}
            </span>
          </div>

          <div style="font-size: 0.88rem; color: #fff; font-weight: 700; margin-bottom: 0.6rem; line-height: 1.3;">
            🍔 ${itemsText}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.6rem 0.85rem; border-radius: 10px;">
            <div>
              <small style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700;">TOTAL PAGADO:</small>
              <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">${totalDisplay}</div>
            </div>
            <button class="btn-gold" style="padding: 0.35rem 0.85rem; font-size: 0.78rem; font-weight: 900;" onclick="trackClientOrderLive(${p.id}); showScreen('screen-tracking');">
              📡 SEGUIMIENTO
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--neon-red); text-align: center; padding: 1.5rem;">Error al obtener historial: ${err.message}</div>`;
  }
}

