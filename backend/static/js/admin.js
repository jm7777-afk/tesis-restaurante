let categoriesList = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.getUser();
  if (!user || (user.rol !== "admin" && user.rol !== "supervisor")) {
    window.location.href = "/static/index.html";
    return;
  }
  document.getElementById("admin-user-label").innerText = `Admin: ${user.nombre} (${user.rol})`;

  loadDashboardStats();
  loadUsers();
  loadProducts();
  loadCategories();

  // Listen to WebSocket events to update dashboard in real-time
  new WSClient((event, data) => {
    if (event === "PAGO_CONFIRMADO" || event === "NUEVO_PEDIDO") {
      loadDashboardStats();
    }
  });
});

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  event.target.classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

function openModal(id) { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }

async function loadDashboardStats() {
  try {
    const res = await fetch("/api/v1/admin/dashboard-stats", { headers: Auth.getHeaders() });
    if (res.ok) {
      const data = await res.json();
      document.getElementById("stat-users").innerText = data.total_usuarios;
      document.getElementById("stat-products").innerText = data.total_productos;
      document.getElementById("stat-orders").innerText = data.total_pedidos;
      document.getElementById("stat-sales").innerText = `$${data.total_ventas.toFixed(2)}`;

      renderTopProducts(data.top_productos);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderTopProducts(list) {
  const container = document.getElementById("top-products-container");
  if (!list || list.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">Aún no hay ventas registradas.</p>`;
    return;
  }

  const maxUnits = Math.max(...list.map(i => i.unidades), 1);
  let html = "";
  list.forEach((item, index) => {
    const pct = Math.round((item.unidades / maxUnits) * 100);
    html += `
      <div style="margin-bottom: 1.2rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 0.3rem;">
          <strong>${index + 1}. ${item.nombre}</strong>
          <span style="color: var(--accent); font-weight: 700;">${item.unidades} un. ($${item.total.toFixed(2)})</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); height: 10px; border-radius: 5px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 5px; transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ==================== USERS ====================
async function loadUsers() {
  try {
    const res = await fetch("/api/v1/admin/usuarios", { headers: Auth.getHeaders() });
    if (res.ok) {
      const users = await res.json();
      renderUsers(users);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderUsers(users) {
  const tbody = document.getElementById("users-tbody");
  let html = "";
  users.forEach(u => {
    html += `
      <tr>
        <td>#${u.id}</td>
        <td><strong>${u.nombre} ${u.apellido}</strong></td>
        <td>${u.nombre_usuario}</td>
        <td>${u.email}</td>
        <td><span class="badge badge-EN_PREPARACION">${u.rol}</span></td>
        <td>${u.activo ? '🟢 Activo' : '🔴 Inactivo'}</td>
        <td>
          <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="deleteUser(${u.id})">Desactivar</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function submitCreateUser(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById("user-name").value,
    apellido: document.getElementById("user-lastname").value,
    email: document.getElementById("user-email").value,
    nombre_usuario: document.getElementById("user-username").value,
    password: document.getElementById("user-password").value,
    rol: document.getElementById("user-role").value,
    activo: true
  };

  try {
    const res = await fetch("/api/v1/admin/usuarios", {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail);
    }
    showToast("Usuario creado con éxito", "success");
    closeModal("user-modal");
    loadUsers();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteUser(userId) {
  if (!confirm("¿Deseas desactivar este usuario?")) return;
  try {
    const res = await fetch(`/api/v1/admin/usuarios/${userId}`, {
      method: "DELETE",
      headers: Auth.getHeaders()
    });
    if (res.ok) {
      showToast("Usuario desactivado", "success");
      loadUsers();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
  try {
    const res = await fetch("/api/v1/admin/productos", { headers: Auth.getHeaders() });
    if (res.ok) {
      const prods = await res.json();
      renderProducts(prods);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderProducts(prods) {
  const tbody = document.getElementById("products-tbody");
  let html = "";
  prods.forEach(p => {
    const imgUrl = p.imagen_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500";
    html += `
      <tr>
        <td>#${p.id}</td>
        <td><img src="${imgUrl}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;"></td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.categoria ? p.categoria.nombre : '--'}</td>
        <td style="font-weight: 700; color: var(--accent);">$${p.precio.toFixed(2)}</td>
        <td>${p.stock} un.</td>
        <td>
          <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="deleteProduct(${p.id})">Desactivar</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function openProductModal() {
  const select = document.getElementById("prod-cat-select");
  let html = "";
  categoriesList.forEach(c => {
    html += `<option value="${c.id}">${c.nombre}</option>`;
  });
  select.innerHTML = html;
  openModal("product-modal");
}

async function submitCreateProduct(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById("prod-name").value,
    categoria_id: parseInt(document.getElementById("prod-cat-select").value),
    descripcion: document.getElementById("prod-desc").value,
    precio: parseFloat(document.getElementById("prod-price").value),
    stock: parseInt(document.getElementById("prod-stock").value),
    imagen_url: document.getElementById("prod-img").value || null,
    activo: true
  };

  try {
    const res = await fetch("/api/v1/admin/productos", {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Error al crear producto");
    showToast("Producto registrado exitosamente", "success");
    closeModal("product-modal");
    loadProducts();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteProduct(prodId) {
  if (!confirm("¿Deseas deshabilitar este producto?")) return;
  try {
    const res = await fetch(`/api/v1/admin/productos/${prodId}`, {
      method: "DELETE",
      headers: Auth.getHeaders()
    });
    if (res.ok) {
      showToast("Producto deshabilitado", "success");
      loadProducts();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// ==================== CATEGORIES ====================
async function loadCategories() {
  try {
    const res = await fetch("/api/v1/admin/categorias", { headers: Auth.getHeaders() });
    if (res.ok) {
      categoriesList = await res.json();
      renderCategories(categoriesList);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderCategories(cats) {
  const tbody = document.getElementById("categories-tbody");
  let html = "";
  cats.forEach(c => {
    html += `
      <tr>
        <td>#${c.id}</td>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.descripcion || ''}</td>
        <td>${c.orden}</td>
        <td>${c.activo ? '🟢 Activa' : '🔴 Inactiva'}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function submitCreateCategory(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById("cat-name").value,
    descripcion: document.getElementById("cat-desc").value,
    orden: parseInt(document.getElementById("cat-order").value) || 1,
    activo: true
  };

  try {
    const res = await fetch("/api/v1/admin/categorias", {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Error al crear categoría");
    showToast("Categoría creada exitosamente", "success");
    closeModal("category-modal");
    loadCategories();
  } catch (err) {
    showToast(err.message, "danger");
  }
}
