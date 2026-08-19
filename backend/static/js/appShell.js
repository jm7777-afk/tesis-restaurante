// appShell.js – renders the AppShell (header + sidebar) for the landing page
// Uses design tokens from index.css and existing CSS classes

function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;
  header.innerHTML = `
    <div class="landing-header">
      <div class="landing-container">
        <div class="landing-nav-inner">
          <!-- Logo -->
          <a href="/" class="nav-brand">
            <span class="logo-icon">🍔</span>
            <div>
              <span style="font-family: var(--font-display); font-size: 1.3rem;">DONDE DAVID</span>
              <small style="display: block; font-size: 0.65rem; color: var(--color-yellow); font-weight: 800; letter-spacing: 0.5px;">FRESH &amp; TASTY!</small>
            </div>
          </a>

          <!-- Desktop Navigation -->
          <ul class="landing-nav-links" style="display: none;">
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#menu">Menú</a></li>
            <li><a href="#promos">Promociones</a></li>
            <li><a href="#como-funciona">Cómo Pedir</a></li>
            <li><a href="#qr-mesa">QR Mesa</a></li>
            <li><a href="#opiniones">Reseñas</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
          <script>
            if (window.innerWidth >= 900) {
              document.querySelector('.landing-nav-links').style.display = 'flex';
            }
          </script>

          <!-- Right Header Actions -->
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <button class="theme-toggle-btn" onclick="toggleThemeMode()" title="Cambiar Tema">🌓 TEMA</button>
            <a href="/static/cliente/app.html?mesa=5" class="btn btn-outline" style="min-height: 40px; padding: 0.4rem 0.9rem; font-size: 0.85rem;" title="Carrito de Compras">
              🛒 <span id="landing-cart-count" class="badge badge-PENDIENTE" style="margin-left: 0.3rem;">0</span>
            </a>
            <a href="/login" class="btn btn-primary" style="min-height: 40px; padding: 0.4rem 1.1rem; font-size: 0.85rem;">
              🔐 Empleados
            </a>
            <!-- Mobile Hamburger Toggle -->
            <button class="btn btn-outline" style="min-height: 40px; padding: 0.4rem; display: inline-flex;" onclick="document.getElementById('mobile-drawer').classList.add('open')" aria-label="Abrir Menú">
              ☰
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <nav class="sidebar" style="width: 240px; background: var(--color-navy); height: 100vh; position: fixed; top: 0; left: 0; padding-top: 72px; overflow-y: auto;">
      <ul style="list-style:none; margin:0; padding:0;">
        <li style="margin: 1rem;">
          <a href="#inicio" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">🏠 Inicio</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#menu" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">🍔 Menú</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#promos" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">🔥 Promociones</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#como-funciona" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">🛠️ Cómo Pedir</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#qr-mesa" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">📱 QR Mesa</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#opiniones" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">💬 Reseñas</a>
        </li>
        <li style="margin: 1rem;">
          <a href="#contacto" class="nav-link" style="color:#fff; text-decoration:none; font-weight:700;">📍 Contacto</a>
        </li>
      </ul>
    </nav>`;
}

// Initialize AppShell on DOMContentLoaded
// Highlight active bottom navigation link based on hash
function updateBottomNavActive() {
  const links = document.querySelectorAll('.bottom-bar a');
  const currentHash = window.location.hash || '#inicio';
  links.forEach(link => {
    if (link.getAttribute('href') === currentHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
// Update on load and hash change
window.addEventListener('hashchange', updateBottomNavActive);
window.addEventListener('load', updateBottomNavActive);

  renderHeader();
  renderSidebar();
});
