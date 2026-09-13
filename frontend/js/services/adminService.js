/**
 * DONDE DAVID - Admin Service
 * Encapsula todas las peticiones del Dashboard Administrativo.
 */
const AdminService = {
  getStats() {
    return APIService.get("/api/v1/admin/dashboard-stats");
  },

  getUsuarios() {
    return APIService.get("/api/v1/admin/usuarios");
  },

  crearUsuario(usuarioData) {
    return APIService.post("/api/v1/admin/usuarios", usuarioData);
  },

  actualizarUsuario(id, usuarioData) {
    return APIService.put(`/api/v1/admin/usuarios/${id}`, usuarioData);
  },

  toggleUsuarioActivo(id) {
    return APIService.put(`/api/v1/admin/usuarios/${id}`);
  },

  getProductos() {
    return APIService.get("/api/v1/admin/productos");
  },

  crearProducto(productoData) {
    return APIService.post("/api/v1/admin/productos", productoData);
  },

  eliminarProducto(id) {
    return APIService.delete(`/api/v1/admin/productos/${id}`);
  },

  getCategorias() {
    return APIService.get("/api/v1/admin/categorias");
  },

  crearCategoria(categoriaData) {
    return APIService.post("/api/v1/admin/categorias", categoriaData);
  },

  getInsumos() {
    return APIService.get("/api/v1/admin/insumos");
  },

  ingresarInsumo(insumoId, cantidad) {
    return APIService.post(`/api/v1/admin/insumos/${insumoId}/ingreso`, { cantidad });
  },

  guardarConfiguraciones(configData) {
    return APIService.post("/api/v1/admin/configuraciones", configData);
  }
};
