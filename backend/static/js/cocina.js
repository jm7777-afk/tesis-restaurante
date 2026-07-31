let kdsOrders = [];
let timerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  // Check auth
  const user = Auth.getUser();
  if (!user || (user.rol !== "cocina" && user.rol !== "admin" && user.rol !== "supervisor")) {
    window.location.href = "/static/index.html";
    return;
  }

  loadKDSOrders();

  // Listen to WebSocket events
  new WSClient((event, data) => {
    if (event === "NUEVO_PEDIDO") {
      playChimeSound();
      showToast(`¡Nuevo pedido de ${data.numero_mesa}!`, "warning");
      loadKDSOrders();
    } else if (event === "CAMBIO_ESTADO_PEDIDO") {
      loadKDSOrders();
    }
  });

  // Start live timers update every 5 seconds
  timerInterval = setInterval(renderKDSOrders, 5000);
});

async function loadKDSOrders() {
  try {
    const res = await fetch("/api/v1/cocina/pedidos", {
      headers: Auth.getHeaders()
    });
    if (!res.ok) throw new Error("Error al cargar pedidos de cocina");
    kdsOrders = await res.json();
    renderKDSOrders();
  } catch (err) {
    console.error(err);
    showToast(err.message, "danger");
  }
}

function renderKDSOrders() {
  const container = document.getElementById("kds-grid");
  document.getElementById("kds-order-count").innerText = `Comandas activas: ${kdsOrders.length}`;

  if (kdsOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
        <span style="font-size: 3rem;">✨</span>
        <h2 style="margin-top: 1rem;">No hay comandas pendientes</h2>
        <p>¡Buen trabajo! La cocina está despejada.</p>
      </div>
    `;
    return;
  }

  let html = "";
  kdsOrders.forEach(order => {
    const elapsedMinutes = getElapsedMinutes(order.fecha_creacion);
    const isUrgent = elapsedMinutes >= 15;
    const timerClass = isUrgent ? 'timer-badge timer-urgent' : 'timer-badge';

    let itemsHtml = "";
    order.detalles.forEach(d => {
      let customText = "";
      if (d.personalizaciones) {
        try {
          const parsed = JSON.parse(d.personalizaciones);
          if (parsed.opciones && parsed.opciones.length > 0) {
            customText += `<br><small style="color: var(--accent);">+ ${parsed.opciones.join(', ')}</small>`;
          }
        } catch(e) {}
      }
      if (d.observaciones) {
        customText += `<br><small style="color: var(--danger);">Nota: ${d.observaciones}</small>`;
      }

      itemsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed var(--border-color);">
          <div>
            <strong>${d.cantidad}x ${d.producto ? d.producto.nombre : 'Producto'}</strong>
            ${customText}
          </div>
          <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="updateItemStatus(${d.id}, '${d.estado === 'LISTO' ? 'PENDIENTE' : 'LISTO'}')">
            ${d.estado === 'LISTO' ? '✅ Listo' : '⏳ Pendiente'}
          </button>
        </div>
      `;
    });

    html += `
      <div class="kds-card status-${order.estado}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1.2rem; font-weight: 700;">#${order.id} - ${order.numero_mesa}</h3>
          <span class="${timerClass}">⏱️ Hace ${elapsedMinutes} min</span>
        </div>

        <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: var(--radius-sm); margin: 0.5rem 0;">
          ${itemsHtml}
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: auto;">
          ${order.estado === 'PENDIENTE' ? `
            <button class="btn btn-primary" style="flex: 1;" onclick="updateOrderStatus(${order.id}, 'EN_PREPARACION')">
              🔥 Iniciar Prep.
            </button>
          ` : ''}
          
          <button class="btn btn-success" style="flex: 1;" onclick="updateOrderStatus(${order.id}, 'LISTO')">
            ✅ Marcar Todo Listo
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getElapsedMinutes(dateStr) {
  if (!dateStr) return 0;
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now - created;
  return Math.max(0, Math.floor(diffMs / 60000));
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/v1/cocina/pedidos/${orderId}/estado?estado=${newStatus}`, {
      method: "PUT",
      headers: Auth.getHeaders()
    });
    if (!res.ok) throw new Error("Error al actualizar el estado");
    showToast(`Comanda #${orderId} actualizada a ${newStatus}`, "success");
    loadKDSOrders();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function updateItemStatus(itemId, newStatus) {
  try {
    const res = await fetch(`/api/v1/cocina/detalles/${itemId}/estado?estado=${newStatus}`, {
      method: "PUT",
      headers: Auth.getHeaders()
    });
    if (!res.ok) throw new Error("Error al actualizar estado del ítem");
    loadKDSOrders();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Synthesize audio chime alert for new incoming orders
function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio notice blocked or unsupported.");
  }
}
