/**
 * DONDE DAVID - API Service Layer
 * Centraliza las llamadas HTTP con manejo unificado de errores y tokens de autenticación.
 */
const APIService = {
  async request(url, options = {}) {
    const headers = Auth.getHeaders();
    const config = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let errorDetail = "Ocurrió un error al procesar la solicitud.";
        try {
          const errData = await response.json();
          errorDetail = errData.detail || errorDetail;
        } catch (e) {}

        if (response.status === 401) {
          Auth.logout();
          throw new Error("Sesión expirada. Por favor ingresa nuevamente.");
        }
        if (response.status === 403) {
          throw new Error("No tienes permisos suficientes para realizar esta acción.");
        }
        if (response.status === 409) {
          throw new Error(errorDetail);
        }

        throw new Error(errorDetail);
      }

      if (response.status === 204) return true;
      return await response.json();
    } catch (error) {
      console.error(`[API Error] ${url}:`, error);
      throw error;
    }
  },

  get(url) {
    return this.request(url, { method: "GET" });
  },

  post(url, body) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  put(url, body) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },

  delete(url) {
    return this.request(url, { method: "DELETE" });
  }
};
