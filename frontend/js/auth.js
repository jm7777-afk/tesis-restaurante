const Auth = {
  getToken() {
    return localStorage.getItem("token");
  },
  getUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
  setToken(token) {
    localStorage.setItem("token", token);
  },
  setAuth(token, user) {
    if (token) localStorage.setItem("token", token);
    if (user) localStorage.setItem("user", JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/static/index.html";
  },
  getHeaders() {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  },
  async login(username, password) {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_usuario: username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error de inicio de sesión");
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.usuario);
    return data;
  }
};
