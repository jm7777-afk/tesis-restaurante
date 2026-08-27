class WSClient {
  constructor(onEventCallback, options = {}) {
    this.onEventCallback = onEventCallback;
    this.options = options;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.shouldReconnect = true;
    this.connect();
    this.setupHeartbeat();
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("🟢 Conexión WebSocket establecida exitosamente.");
      this.reconnectAttempts = 0;
      this.updateConnectionStatus("connected");
      if (this.options.onOpen) this.options.onOpen();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "pong") {
          this.lastPong = Date.now();
          return;
        }
        if (this.onEventCallback) {
          this.onEventCallback(payload.event, payload.data);
        }
      } catch (e) {
        console.error("Error al procesar mensaje WebSocket:", e);
      }
    };

    this.socket.onclose = () => {
      console.log("🔴 WebSocket desconectado.");
      this.updateConnectionStatus("disconnected");
      if (this.shouldReconnect) {
        this.handleDisconnect();
      }
      if (this.options.onClose) this.options.onClose();
    };

    this.socket.onerror = (error) => {
      console.error("❌ Error WebSocket:", error);
      this.updateConnectionStatus("error");
      if (this.options.onError) this.options.onError(error);
    };
  }

  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`🔄 Reconectando WebSocket en ${delay}ms (Intento ${this.reconnectAttempts + 1})`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error("❌ Se alcanzó el límite de reintentos WebSocket.");
      this.updateConnectionStatus("failed");
    }
  }

  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  updateConnectionStatus(status) {
    const statusEl = document.getElementById("connection-status");
    if (statusEl) {
      const statusMap = {
        connected: { icon: "🟢", text: "En Vivo" },
        disconnected: { icon: "🔴", text: "Desconectado" },
        error: { icon: "🟡", text: "Error" },
        failed: { icon: "⛔", text: "Conexión Perdida" }
      };
      const info = statusMap[status] || statusMap.disconnected;
      statusEl.innerHTML = `${info.icon} ${info.text}`;
    }
  }
}

function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const iconMap = {
    success: "✅",
    danger: "❌",
    warning: "⚠️",
    info: "🔔"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.6rem;">
      <span style="font-size:1.1rem;">${iconMap[type] || '🔔'}</span>
      <span style="font-weight:700;">${message}</span>
    </div>
    <span style="cursor:pointer; font-weight:900; opacity:0.7; font-size:1.2rem; padding-left:0.5rem;" onclick="this.parentElement.remove()">&times;</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }
  }, 4000);
}
