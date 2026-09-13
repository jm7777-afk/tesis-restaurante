/**
 * DONDE DAVID - Cliente Service
 * Encapsula todas las peticiones del portal Cliente QR & Delivery.
 */
const ClienteService = {
  getCategorias() {
    return APIService.get("/api/v1/cliente/categorias");
  },

  getProductos(categoriaId = null) {
    const query = categoriaId ? `?categoria_id=${categoriaId}` : "";
    return APIService.get(`/api/v1/cliente/productos${query}`);
  },

  getConfiguracionesPublicas() {
    return APIService.get("/api/v1/cliente/configuraciones-publicas");
  },

  getPromociones() {
    return APIService.get("/api/v1/cliente/promociones");
  },

  crearPedido(pedidoData) {
    return APIService.post("/api/v1/cliente/pedidos", pedidoData);
  },

  verificarOTP(pedidoId, codigoOTP) {
    return APIService.post("/api/v1/cliente/pedidos/verificar-otp", {
      pedido_id: pedidoId,
      codigo_otp: codigoOTP
    });
  },

  getHistorialPedidos() {
    return APIService.get("/api/v1/cliente/pedidos/historial");
  },

  getDetallePedido(pedidoId) {
    return APIService.get(`/api/v1/cliente/pedidos/${pedidoId}`);
  },

  enviarResena(resenaData) {
    return APIService.post("/api/v1/cliente/resenas", resenaData);
  }
};
