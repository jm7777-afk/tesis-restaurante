/**
 * DONDE DAVID - Caja Service
 * Encapsula todas las peticiones del portal POS Registradora Touch.
 */
const CajaService = {
  getTurnoActivo() {
    return APIService.get("/api/v1/caja/turno-activo");
  },

  abrirTurno(montoApertura) {
    return APIService.post("/api/v1/caja/abrir-turno", { monto_apertura: montoApertura });
  },

  cerrarTurno(montoCierre) {
    return APIService.post("/api/v1/caja/cerrar-turno", { monto_cierre: montoCierre });
  },

  getPedidosPendientes() {
    return APIService.get("/api/v1/caja/pedidos-pendientes");
  },

  getPedidosCobrados() {
    return APIService.get("/api/v1/caja/pedidos-cobrados");
  },

  cobrarPedido(pedidoId, cobrarData) {
    return APIService.post(`/api/v1/caja/pedidos/${pedidoId}/cobrar`, cobrarData);
  },

  crearYCobrarRapido(posData) {
    return APIService.post("/api/v1/caja/crear-y-cobrar-rapido", posData);
  },

  getFactura(pedidoId) {
    return APIService.get(`/api/v1/caja/pedidos/${pedidoId}/factura`);
  },

  despacharMototaxi(pedidoId) {
    return APIService.post(`/api/v1/caja/pedidos/${pedidoId}/cambiar-estado`, { estado: "EN_CAMINO" });
  }
};
