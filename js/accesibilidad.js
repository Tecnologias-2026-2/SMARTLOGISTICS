// Widget de accesibilidad: tamaño de texto, alto contraste, escala de grises,
// resaltar enlaces, espaciado de texto y detener animaciones.
// Flota en la esquina con la API nativa "popover" (capa superior del navegador),
// así no se necesita "position" en el CSS. Las preferencias se recuerdan por visitante.

(() => {
  const STORAGE_KEY = "smart-logistics:accesibilidad";
  const TEXT_LEVELS = [1, 1.15, 1.3];
  const TOGGLES = [
    { key: "contrast", icon: "◐", label: "Alto contraste" },
    { key: "gray", icon: "◑", label: "Escala de grises" },
    { key: "links", icon: "🔗", label: "Resaltar enlaces" },
    { key: "spacing", icon: "↔", label: "Más espaciado" },
    { key: "motion", icon: "⏸", label: "Detener animaciones" }
  ];
  const root = document.documentElement;
  const supportsPopover = typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;

  function load() {
    try {
      return { text: 0, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    } catch (error) {
      return { text: 0 };
    }
  }

  function save(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      // Sin almacenamiento disponible: las preferencias duran solo esta página.
    }
  }

  const prefs = load();

  function apply() {
    root.style.zoom = TEXT_LEVELS[prefs.text] === 1 ? "" : String(TEXT_LEVELS[prefs.text]);
    TOGGLES.forEach(({ key }) => root.classList.toggle(`a11y-${key}`, Boolean(prefs[key])));
  }

  // Se aplica de inmediato para evitar parpadeos al cambiar de página.
  apply();

  function build() {
    const launcher = document.createElement("div");
    launcher.className = "a11y-launcher";
    launcher.innerHTML = `
      <button type="button" class="a11y-launcher__button" aria-controls="a11y-panel" aria-expanded="false">
        <span aria-hidden="true">♿</span><span class="visually-hidden">Opciones de accesibilidad</span>
      </button>`;

    const panel = document.createElement("section");
    panel.className = "a11y-panel";
    panel.id = "a11y-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "a11y-title");
    panel.innerHTML = `
      <header class="a11y-panel__header">
        <h2 id="a11y-title">Accesibilidad</h2>
        <button type="button" class="a11y-panel__close" data-a11y-close aria-label="Cerrar opciones de accesibilidad">✕</button>
      </header>
      <div class="a11y-panel__text" role="group" aria-labelledby="a11y-text-label">
        <span id="a11y-text-label">Tamaño del texto</span>
        <div class="a11y-panel__stepper">
          <button type="button" data-a11y-text="-1" aria-label="Disminuir tamaño del texto">A−</button>
          <output id="a11y-text-value" aria-live="polite">100%</output>
          <button type="button" data-a11y-text="1" aria-label="Aumentar tamaño del texto">A+</button>
        </div>
      </div>
      <div class="a11y-panel__grid">
        ${TOGGLES.map(({ key, icon, label }) => `
          <button type="button" class="a11y-panel__toggle" data-a11y-toggle="${key}" aria-pressed="false">
            <span aria-hidden="true">${icon}</span>${label}
          </button>`).join("")}
      </div>
      <button type="button" class="a11y-panel__reset" data-a11y-reset>Restablecer</button>`;

    if (supportsPopover) {
      launcher.popover = "manual";
      panel.popover = "auto";
    } else {
      panel.hidden = true;
    }
    document.body.append(launcher, panel);
    if (supportsPopover) launcher.showPopover();

    const openButton = launcher.querySelector("button");

    function render() {
      panel.querySelector("#a11y-text-value").textContent = `${Math.round(TEXT_LEVELS[prefs.text] * 100)}%`;
      panel.querySelectorAll("[data-a11y-toggle]").forEach((button) => {
        button.setAttribute("aria-pressed", String(Boolean(prefs[button.dataset.a11yToggle])));
      });
      panel.querySelector('[data-a11y-text="-1"]').disabled = prefs.text === 0;
      panel.querySelector('[data-a11y-text="1"]').disabled = prefs.text === TEXT_LEVELS.length - 1;
    }

    function setOpen(open) {
      if (supportsPopover) {
        if (open) panel.showPopover();
        else panel.hidePopover();
      } else {
        panel.hidden = !open;
        if (open) panel.querySelector("button").focus();
        else openButton.focus();
        openButton.setAttribute("aria-expanded", String(open));
      }
    }

    openButton.addEventListener("click", () => {
      const isOpen = supportsPopover ? panel.matches(":popover-open") : !panel.hidden;
      setOpen(!isOpen);
    });

    if (supportsPopover) {
      panel.addEventListener("toggle", (event) => {
        const open = event.newState === "open";
        openButton.setAttribute("aria-expanded", String(open));
        if (open) panel.querySelector(".a11y-panel__close").focus();
        else if (panel.contains(document.activeElement) || document.activeElement === document.body) openButton.focus();
      });
    }

    panel.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.matches("[data-a11y-close]")) setOpen(false);
      if (target.dataset.a11yText) {
        prefs.text = Math.min(TEXT_LEVELS.length - 1, Math.max(0, prefs.text + Number(target.dataset.a11yText)));
      }
      if (target.dataset.a11yToggle) {
        const key = target.dataset.a11yToggle;
        prefs[key] = !prefs[key];
      }
      if (target.matches("[data-a11y-reset]")) {
        Object.keys(prefs).forEach((key) => delete prefs[key]);
        prefs.text = 0;
      }
      apply();
      render();
      save(prefs);
    });

    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !supportsPopover) setOpen(false);
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
