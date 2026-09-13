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
    if (event === "NUEVO_PEDIDO" || event === "PAGO_CONFIRMADO") {
      playChimeSound();
      showToast(`¡Nuevo pedido / pago de ${data.numero_mesa || 'Caja'}!`, "warning");
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
  if (!container) return;

  const countEl = document.getElementById("kds-order-count");
  if (countEl) {
    countEl.innerText = `Comandas activas: ${kdsOrders.length}`;
  }

  if (kdsOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-text-secondary);">
        <span style="font-size: 3.5rem;">✨</span>
        <h2 style="margin-top: 1rem; color: #FFFFFF; font-weight: 800;">No hay comandas pendientes</h2>
        <p style="color: var(--color-text-secondary);">¡Excelente trabajo! La cocina está al día.</p>
      </div>
    `;
    return;
  }

  // Clasificación en 3 columnas KDS
  const pendientes = kdsOrders.filter(o => o.estado === "PENDIENTE" || o.estado === "COBRADO");
  const preparando = kdsOrders.filter(o => o.estado === "EN_PREPARACION");
  const listos = kdsOrders.filter(o => o.estado === "LISTO");

  function buildColumnHtml(title, icon, ordersList, bgBadge, nextStatus, nextBtnLabel, btnClass) {
    let orderCardsHtml = "";
    if (ordersList.length === 0) {
      orderCardsHtml = `<div style="text-align: center; padding: 2rem; color: var(--color-text-secondary); font-size: 0.85rem; border: 1px dashed var(--color-border); border-radius: var(--radius-sm);">Sin comandas</div>`;
    } else {
      ordersList.forEach(order => {
        const elapsedMinutes = getElapsedMinutes(order.fecha_creacion);
        const isUrgent = elapsedMinutes >= 15;
        const timerClass = isUrgent ? 'timer-badge timer-urgent' : 'timer-badge';
        const urgentBorder = isUrgent ? 'urgent' : '';

        let itemsHtml = "";
        order.detalles.forEach(d => {
          let customText = "";
          // Muestra de Ingredientes Base del Producto
          if (d.producto && d.producto.ingredientes_json) {
            try {
              const ingList = typeof d.producto.ingredientes_json === 'string' 
                ? JSON.parse(d.producto.ingredientes_json) 
                : d.producto.ingredientes_json;
              if (Array.isArray(ingList) && ingList.length > 0) {
                customText += `<br><small style="color: #94A3B8; font-size: 0.78rem;">🥩 <em>Ingredientes: ${ingList.join(', ')}</em></small>`;
              } else if (typeof ingList === 'string' && ingList.trim()) {
                customText += `<br><small style="color: #94A3B8; font-size: 0.78rem;">🥩 <em>Ingredientes: ${ingList}</em></small>`;
              }
            } catch(e) {
              if (typeof d.producto.ingredientes_json === 'string' && d.producto.ingredientes_json.trim()) {
                customText += `<br><small style="color: #94A3B8; font-size: 0.78rem;">🥩 <em>Ingredientes: ${d.producto.ingredientes_json}</em></small>`;
              }
            }
          }
          if (d.personalizaciones) {
            try {
              const parsed = JSON.parse(d.personalizaciones);
              if (parsed.opciones && parsed.opciones.length > 0) {
                customText += `<br><small style="color: var(--brand-orange); font-weight: 800;">✨ Modificaciones: ${parsed.opciones.join(', ')}</small>`;
              }
            } catch(e) {}
          }
          if (d.observaciones) {
            customText += `<br><small style="color: var(--brand-red); font-weight: 800;">⚠️ Nota Cliente: ${d.observaciones}</small>`;
          }

          itemsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px dashed rgba(226, 232, 240, 0.15);">
              <div>
                <strong style="color: #FFFFFF; font-size: 0.95rem;">${d.cantidad}x ${d.producto ? d.producto.nombre : 'Producto'}</strong>
                ${customText}
              </div>
              <button class="btn btn-outline" style="min-height: 32px; padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="updateItemStatus(${d.id}, '${d.estado === 'LISTO' ? 'PENDIENTE' : 'LISTO'}')">
                ${d.estado === 'LISTO' ? '✅ Listo' : '⏳ Pendiente'}
              </button>
            </div>
          `;
        });

        orderCardsHtml += `
          <div class="kds-card status-${order.estado} ${urgentBorder}" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 1.15rem; font-weight: 800; color: #FFFFFF;">#${order.id} - ${order.numero_mesa}</h3>
              <span class="${timerClass}">⏱️ ${elapsedMinutes}m</span>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: var(--radius-sm); margin: 0.5rem 0;">
              ${itemsHtml}
            </div>

            ${nextStatus ? `
              <button class="btn ${btnClass}" style="width: 100%; margin-top: auto;" onclick="updateOrderStatus(${order.id}, '${nextStatus}')">
                ${nextBtnLabel}
              </button>
            ` : `
              <div style="text-align: center; font-size: 0.8rem; color: var(--color-success); font-weight: 800; padding: 0.4rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
                ✅ DESPACHADO / ESPERANDO MESERO
              </div>
            `}
          </div>
        `;
      });
    }

    return `
      <div style="background: rgba(7, 26, 61, 0.6); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 2px solid var(--color-border); padding-bottom: 0.6rem;">
          <h2 style="font-size: 1.1rem; font-weight: 900; color: #FFFFFF; display: flex; align-items: center; gap: 0.5rem;">
            <span>${icon}</span> <span>${title}</span>
          </h2>
          <span style="background: ${bgBadge}; color: #000; font-weight: 900; font-size: 0.8rem; padding: 0.2rem 0.65rem; border-radius: 20px;">${ordersList.length}</span>
        </div>
        <div>
          ${orderCardsHtml}
        </div>
      </div>
    `;
  }

  const htmlHtml = `
    <div class="kds-columns-layout" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;">
      ${buildColumnHtml("RECIBIDOS", "📥", pendientes, "var(--color-yellow)", "EN_PREPARACION", "🔥 INICIAR PREPARACIÓN", "btn-cta")}
      ${buildColumnHtml("PREPARANDO", "👨‍🍳", preparando, "var(--color-primary)", "LISTO", "✅ MARCAR PEDIDO LISTO", "btn-success")}
      ${buildColumnHtml("LISTOS", "🏁", listos, "var(--color-success)", null, null, null)}
    </div>
  `;

  container.innerHTML = htmlHtml;
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

function setKDSGridScale(scaleClass) {
  const grid = document.getElementById("kds-grid");
  if (!grid) return;
  grid.classList.remove("scale-sm", "scale-md", "scale-lg");
  grid.classList.add(scaleClass);
  showToast(`📐 Escala de pantalla KDS fijada`, "info");
}
