class WSClient {
  constructor(onEventCallback) {
    this.onEventCallback = onEventCallback;
    this.socket = null;
    this.reconnectTimer = null;
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("🟢 Conexión WebSocket establecida con el servidor.");
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (this.onEventCallback) {
          this.onEventCallback(payload.event, payload.data);
        }
      } catch (e) {
        console.error("Error al procesar mensaje WebSocket:", e);
      }
    };

    this.socket.onclose = () => {
      console.warn("🔴 Conexión WebSocket cerrada. Reintentando en 3 segundos...");
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (err) => {
      console.error("Error WebSocket:", err);
    };
  }
}

function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>🔔 ${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
