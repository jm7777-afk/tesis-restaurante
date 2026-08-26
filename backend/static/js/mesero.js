let meseroMesas = [];
let meseroPedidos = [];
let selectedPedidoForSwap = null;
let tasaCambioBs = 36.50;

document.addEventListener("DOMContentLoaded", () => {
  loadConfigPublica();
  loadMeseroData();

  new WSClient((event, data) => {
    if (event === "NUEVO_PEDIDO" || event === "CAMBIO_ESTADO_PEDIDO" || event === "PAGO_CONFIRMADO") {
      loadMeseroData();
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
  return `$${usdAmount.toFixed(2)} (Bs. ${bsAmount})`;
}

async function loadMeseroData() {
  await loadMesas();
  await loadPedidosActivos();
}

async function loadMesas() {
  try {
    const res = await fetch("/api/v1/mesero/mesas", { headers: Auth.getHeaders() });
    if (res.ok) {
      meseroMesas = await res.json();
      renderMesas();
    }
  } catch (err) {
    console.error("Error al cargar mesas:", err);
  }
}

function renderMesas() {
  const container = document.getElementById("mesero-mesas-grid");
  let html = "";
  meseroMesas.forEach(m => {
    html += `
      <div class="mesa-card-mesero ${m.estado}">
        <strong style="font-size: 1.2rem; color: #fff;">Mesa #${m.numero_mesa}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin: 0.3rem 0;">${m.cliente_actual || 'Disponible'}</div>
        <span class="badge" style="background: ${m.estado === 'OCUPADA' ? 'var(--neon-red)' : 'var(--neon-green)'}; color: #fff; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px;">
          ${m.estado}
        </span>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function loadPedidosActivos() {
  try {
    const res = await fetch("/api/v1/mesero/pedidos-activos", { headers: Auth.getHeaders() });
    if (res.ok) {
      meseroPedidos = await res.json();
      renderPedidosActivos();
    }
  } catch (err) {
    console.error("Error al cargar pedidos mesero:", err);
  }
}

function renderPedidosActivos() {
  const container = document.getElementById("mesero-pedidos-list");
  if (meseroPedidos.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 2rem; background: var(--toon-card); border-radius: var(--radius-md); grid-column: span 3;">No hay pedidos pendientes de entrega en mesa.</div>`;
    return;
  }

  let html = "";
  meseroPedidos.forEach(p => {
    // Separa bebidas de comida
    const bebidas = [];
    const comidas = [];

    p.detalles.forEach(d => {
      const prodName = d.producto ? d.producto.nombre : '';
      const catName = (d.producto && d.producto.categoria) ? d.producto.categoria.nombre.toLowerCase() : '';
      
      if (catName.includes("bebida") || prodName.toLowerCase().includes("refresco") || prodName.toLowerCase().includes("jugo") || prodName.toLowerCase().includes("agua") || prodName.toLowerCase().includes("cerveza")) {
        bebidas.push(`${d.cantidad}x ${prodName}`);
      } else {
        comidas.push(`${d.cantidad}x ${prodName}`);
      }
    });

    const isListo = p.estado === "LISTO";

    html += `
      <div style="background: var(--toon-card); border: 1px solid ${isListo ? 'var(--neon-green)' : 'var(--toon-border)'}; border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 1.2rem; color: #fff;">#${p.id} - ${p.numero_mesa}</strong>
            <span class="badge" style="background: ${isListo ? 'var(--neon-green)' : 'var(--gold-accent)'}; color: #000; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px;">
              ${p.estado}
            </span>
          </div>
          <div style="font-size: 0.85rem; color: #fff; margin-top: 0.3rem;">Cliente: <strong>${p.nombre_factura || p.nombre_cliente_delivery || 'Comensal'}</strong></div>
          <div style="font-size: 0.85rem; color: var(--gold-accent); font-weight: 800;">Total: ${formatPriceDual(p.total)}</div>
          
          <!-- Bloque de Destacado de BEBIDAS para Entregas Rápidas en Mesa -->
          ${bebidas.length > 0 ? `
            <div style="background: rgba(0,245,212,0.1); border: 1px solid var(--cyan-accent); border-radius: 8px; padding: 0.5rem 0.75rem; margin: 0.6rem 0;">
              <strong style="color: var(--cyan-accent); font-size: 0.78rem; display: block;">🥤 BEBIDAS (ENTREGA INMEDIATA):</strong>
              <div style="color: #fff; font-size: 0.82rem; font-weight: 700;">${bebidas.join(', ')}</div>
            </div>
          ` : ''}

          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0;"><strong>🍽️ Platos:</strong> ${comidas.join(', ') || 'Sin comida'}</p>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem; border-top: 1px dashed var(--toon-border); padding-top: 0.75rem;">
          <button class="btn-gold" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--gold-accent); color: var(--gold-accent);" onclick="openCambiarMesaModal(${p.id}, '${p.numero_mesa}')">🔄 Cambiar Mesa</button>
          <button class="btn-gold" style="flex: 1; padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="marcarPedidoEntregado(${p.id})">✅ Entregado</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openCambiarMesaModal(pedidoId, currentMesaStr) {
  selectedPedidoForSwap = meseroPedidos.find(p => p.id === pedidoId);
  if (!selectedPedidoForSwap) return;

  document.getElementById("swap-order-label").innerText = `Reasignar Pedido #${pedidoId} (Actualmente en ${currentMesaStr})`;
  
  const select = document.getElementById("swap-nueva-mesa-select");
  let opts = "";
  meseroMesas.forEach(m => {
    opts += `<option value="${m.numero_mesa}">Mesa #${m.numero_mesa} (${m.estado})</option>`;
  });
  select.innerHTML = opts;

  openModal("cambiar-mesa-modal");
}

async function submitCambiarMesa() {
  if (!selectedPedidoForSwap) return;
  const nuevaMesa = parseInt(document.getElementById("swap-nueva-mesa-select").value);

  try {
    const res = await fetch(`/api/v1/mesero/pedidos/${selectedPedidoForSwap.id}/cambiar-mesa`, {
      method: "POST",
      headers: Auth.getHeaders(),
      body: JSON.stringify({ nueva_mesa: nuevaMesa })
    });

    if (!res.ok) throw new Error("Error al reasignar mesa");
    const data = await res.json();
    showToast(data.mensaje, "success");
    closeModal("cambiar-mesa-modal");
    loadMeseroData();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function marcarPedidoEntregado(pedidoId) {
  try {
    const res = await fetch(`/api/v1/mesero/pedidos/${pedidoId}/marcar-entregado`, {
      method: "POST",
      headers: Auth.getHeaders()
    });
    if (!res.ok) throw new Error("Error al actualizar estado");
    showToast(`Pedido #${pedidoId} entregado a la mesa`, "success");
    loadMeseroData();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }
