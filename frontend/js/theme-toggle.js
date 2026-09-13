// Global Theme Switcher (Modo Claro / Modo Oscuro)
(function() {
  const savedTheme = localStorage.getItem("app_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
})();

function toggleThemeMode() {
  const isLight = document.body.classList.contains("light-theme");
  const msg = !isLight ? "☀️ Modo Claro Activado" : "🌙 Modo Oscuro Activado";
  if (isLight) {
    document.body.classList.remove("light-theme");
    localStorage.setItem("app_theme", "dark");
  } else {
    document.body.classList.add("light-theme");
    localStorage.setItem("app_theme", "light");
  }
  if (typeof showToast === "function") {
    showToast(msg, "info");
  } else {
    console.log(msg);
  }
}
