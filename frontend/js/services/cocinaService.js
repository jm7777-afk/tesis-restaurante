/**
 * DONDE DAVID - Cocina Service
 * Encapsula todas las peticiones del portal Monitor KDS Cocina.
 */
const CocinaService = {
  getPedidosActivos() {
    return APIService.get("/api/v1/cocina/pedidos");
  },

  cambiarEstadoPedido(pedidoId, nuevoEstado) {
    return APIService.put(`/api/v1/cocina/pedidos/${pedidoId}/estado?estado=${nuevoEstado}`);
  },

  cambiarEstadoItem(itemId, nuevoEstado) {
    return APIService.put(`/api/v1/cocina/detalles/${itemId}/estado?estado=${nuevoEstado}`);
  }
};
