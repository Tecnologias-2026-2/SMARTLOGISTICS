// Menú hamburguesa para pantallas pequeñas (landing y zonas con sesión).
// En escritorio el botón está oculto por CSS y el menú se muestra completo.

document.querySelectorAll("[data-menu-toggle]").forEach((toggle) => {
  const menu = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Al elegir una opción el menú se cierra (útil para los enlaces a secciones)
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  // Escape cierra el menú y devuelve el foco al botón
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });
});
