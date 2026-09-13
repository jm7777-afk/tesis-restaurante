/**
 * DONDE DAVID - Global Environment & API Configuration
 * Soporta configuración dinámica de URLs para despliegue desacoplado.
 */
const CONFIG = {
  // Determina dinámicamente la URL Base del Backend API
  API_BASE_URL: (function() {
    if (window.ENV && window.ENV.API_BASE_URL) {
      return window.ENV.API_BASE_URL.replace(/\/$/, "");
    }
    // Si estamos en desarrollo local
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
    // En producción desacoplada (o mismo dominio vía proxy)
    return window.location.origin;
  })(),

  // Determina dinámicamente la URL Base de WebSockets
  WS_BASE_URL: (function() {
    if (window.ENV && window.ENV.WS_BASE_URL) {
      return window.ENV.WS_BASE_URL.replace(/\/$/, "");
    }
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${wsProtocol}//127.0.0.1:8000/ws`;
    }
    return `${wsProtocol}//${window.location.host}/ws`;
  })()
};
