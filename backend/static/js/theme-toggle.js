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
  if (isLight) {
    document.body.classList.remove("light-theme");
    localStorage.setItem("app_theme", "dark");
    showToast("🌙 Modo Oscuro Activado", "info");
  } else {
    document.body.classList.add("light-theme");
    localStorage.setItem("app_theme", "light");
    showToast("☀️ Modo Claro Activado", "info");
  }
}
