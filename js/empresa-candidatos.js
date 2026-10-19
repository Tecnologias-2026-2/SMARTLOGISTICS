// Empresa · Candidatos: búsqueda, filtros, selección, descarte,
// asignación directa (RF-19 a RF-21) y perfil del candidato.

const STORAGE_KEY = "smart-logistics:candidatos-feria";
const TOTAL_PLACES = 12;

const CANDIDATES = {
  carlos: {
    initials: "CR", color: "purple", name: "Carlos Rodríguez", role: "Auxiliar Logístico",
    rating: 4.8, logistics: 4.9, coordination: 4.6, years: 3, jobs: 47, companies: 12, punctuality: "96%",
    skills: ["Montaje de stands", "Carga y descarga", "Logística de eventos"],
    history: [
      ["🔧", "Auxiliar de Montaje – Expo Construcción", "Eventos Nova · 10 Ago 2026", "4.9"],
      ["📦", "Operario de Almacén – Despachos", "LogiMax S.A.S. · 25 Jul 2026", "4.8"],
      ["🎪", "Personal Logístico – Feria del Hogar", "Eventos Nova · 12 Jul 2026", "5.0"],
      ["🚚", "Auxiliar de Reparto – Campaña Navidad", "DeliverCo Colombia · 20 Jun 2026", "4.7"]
    ]
  },
  luisa: {
    initials: "LM", color: "pink", name: "Luisa Martínez", role: "Coordinadora de Eventos",
    rating: 4.6, logistics: 4.7, coordination: 4.8, years: 5, jobs: 82, companies: 18, punctuality: "98%",
    skills: ["Coordinación de equipos", "Manejo de personal", "Excel avanzado"],
    history: [
      ["🔧", "Auxiliar de Montaje – Expo Construcción", "Eventos Nova · 10 Ago 2026", "4.9"],
      ["📦", "Operario de Almacén – Despachos", "LogiMax S.A.S. · 25 Jul 2026", "4.8"],
      ["🎪", "Personal Logístico – Feria del Hogar", "Eventos Nova · 12 Jul 2026", "5.0"],
      ["🚚", "Auxiliar de Reparto – Campaña Navidad", "DeliverCo Colombia · 20 Jun 2026", "4.7"]
    ]
  },
  andres: {
    initials: "AG", color: "indigo", name: "Andrés García", role: "Auxiliar de Almacén",
    rating: 4.3, logistics: 4.4, coordination: 4.1, years: 2, jobs: 28, companies: 7, punctuality: "91%",
    skills: ["Manejo de inventario", "Montacargas", "Carga y descarga"],
    history: [
      ["📦", "Operario de Almacén – Despachos", "LogiMax S.A.S. · 25 Jul 2026", "4.4"],
      ["🚚", "Auxiliar de Reparto – Campaña Navidad", "DeliverCo Colombia · 20 Jun 2026", "4.3"],
      ["📦", "Auxiliar de Bodega – Inventario Semestral", "Almacenes Express · 18 May 2026", "4.2"]
    ]
  },
  maria: {
    initials: "MT", color: "violet", name: "María Torres", role: "Auxiliar Logística",
    rating: 4.9, logistics: 5.0, coordination: 4.8, years: 6, jobs: 103, companies: 21, punctuality: "99%",
    skills: ["Logística de eventos", "Control de accesos", "Atención al cliente"],
    history: [
      ["🎪", "Personal Logístico – Feria del Hogar", "Eventos Nova · 12 Jul 2026", "5.0"],
      ["🔧", "Auxiliar de Montaje – Congreso Médico", "Corporate Events & Co. · 5 Jun 2026", "4.9"],
      ["🎪", "Auxiliar Logística – Festival de Verano", "Eventos Nova · 20 May 2026", "4.8"]
    ]
  },
  diego: {
    initials: "DV", color: "green", name: "Diego Vargas", role: "Auxiliar Logístico",
    rating: 4.1, logistics: 4.2, coordination: 3.9, years: 1, jobs: 14, companies: 4, punctuality: "88%",
    skills: ["Carga y descarga", "Montaje de stands"],
    history: [
      ["🔧", "Auxiliar de Montaje – Expo Construcción", "Eventos Nova · 10 Ago 2026", "4.0"],
      ["🚚", "Auxiliar de Reparto – Última Milla", "DeliverCo Colombia · 2 Jul 2026", "4.2"]
    ]
  },
  sandra: {
    initials: "SP", color: "blue", name: "Sandra Pérez", role: "Operaria de Almacén",
    rating: 4.5, logistics: 4.6, coordination: 4.3, years: 4, jobs: 61, companies: 9, punctuality: "94%",
    skills: ["Manejo de inventario", "Picking y packing", "Excel básico"],
    history: [
      ["📦", "Operario de Almacén – Despachos", "LogiMax S.A.S. · 25 Jul 2026", "4.5"],
      ["📦", "Operaria de Almacén – Inventario Semestral", "Almacenes Express · 18 May 2026", "4.6"]
    ]
  }
};

const STATUS_LABELS = { review: "En revisión", selected: "Seleccionado", discarded: "Descartado" };

const listView = document.querySelector("#candidates-list-view");
const profileView = document.querySelector("#candidate-profile");
const rows = [...document.querySelectorAll("#candidates-body tr")];
const searchInput = document.querySelector("#candidate-search");
const minRatingSelect = document.querySelector("#candidate-min-rating");
const tabs = [...document.querySelectorAll(".candidates-tab")];
const emptyMessage = document.querySelector("#candidates-empty");
const notice = document.querySelector("#candidates-notice");
const dialog = document.querySelector("#candidate-dialog");
const confirmButton = document.querySelector("#dialog-confirm");

let activeFilter = "all";
let pendingAction = null;

// ---------- Estado (se guarda en el navegador para conservarlo al navegar) ----------
function defaultState() {
  return Object.fromEntries(rows.map((row) => [row.dataset.id, { status: row.dataset.status, assigned: false }]));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") return { ...defaultState(), ...saved };
  } catch (error) {
    console.warn("No se pudo leer el estado guardado de candidatos.", error);
  }
  return defaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el estado de candidatos.", error);
  }
}

const state = loadState();

// ---------- Render de la tabla ----------
function renderActions(id) {
  const { status, assigned } = state[id];
  const container = document.querySelector(`tr[data-id="${id}"] [data-actions]`);
  const parts = [`<a class="candidate-action candidate-action--link" href="#candidato-${id}">Ver perfil</a>`];
  if (status === "review") {
    parts.push(
      `<button class="candidate-action candidate-action--primary" type="button" data-action="select" data-id="${id}">Seleccionar</button>`,
      `<button class="candidate-action candidate-action--muted" type="button" data-action="discard" data-id="${id}">Descartar</button>`,
      assigned
        ? `<button class="candidate-action candidate-action--outline" type="button" disabled>Asignación enviada</button>`
        : `<button class="candidate-action candidate-action--outline" type="button" data-action="assign" data-id="${id}">Asignar directamente</button>`
    );
  }
  container.innerHTML = parts.join("");
}

function renderRow(row) {
  const { status } = state[row.dataset.id];
  row.dataset.status = status;
  const pill = row.querySelector("[data-status-label]");
  pill.className = `status-pill status-pill--${status}`;
  pill.innerHTML = `<span aria-hidden="true">●</span> ${STATUS_LABELS[status]}`;
  renderActions(row.dataset.id);
}

function updateCounts() {
  const counts = { all: rows.length, review: 0, selected: 0, discarded: 0 };
  Object.values(state).forEach(({ status }) => { counts[status] += 1; });
  document.querySelectorAll("[data-count]").forEach((node) => {
    node.textContent = counts[node.dataset.count];
  });
  const covered = counts.selected;
  document.querySelector("#covered-places").textContent = `${covered}/${TOTAL_PLACES}`;
  const available = TOTAL_PLACES - covered;
  document.querySelector("#available-places").textContent =
    `${available} ${available === 1 ? "plaza disponible" : "plazas disponibles"}`;
}

function applyFilters() {
  const term = searchInput.value.trim().toLocaleLowerCase("es");
  const minRating = Number(minRatingSelect.value);
  let visible = 0;
  rows.forEach((row) => {
    const matches =
      (activeFilter === "all" || row.dataset.status === activeFilter) &&
      Number(row.dataset.rating) >= minRating &&
      row.textContent.toLocaleLowerCase("es").includes(term);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  emptyMessage.hidden = visible > 0;
}

function renderAll() {
  rows.forEach(renderRow);
  updateCounts();
  applyFilters();
}

// ---------- Avisos ----------
function showNotice(title, text) {
  document.querySelector("#candidates-notice-title").textContent = title;
  document.querySelector("#candidates-notice-text").textContent = text;
  notice.hidden = false;
}

// ---------- Diálogo de confirmación ----------
const DIALOG_COPY = {
  select: {
    title: "Confirmar selección",
    confirm: "Confirmar selección",
    tone: "sl-btn--primary",
    text: (name) => `¿Confirmas la selección de ${name}? Se reducirá una plaza disponible y el trabajador recibirá una notificación.`
  },
  discard: {
    title: "Confirmar descarte",
    confirm: "Confirmar descarte",
    tone: "sl-btn--danger",
    text: (name) => `¿Confirmas el descarte de ${name}? El trabajador recibirá una notificación de no selección.`
  },
  assign: {
    title: "Asignación directa",
    confirm: "Confirmar asignación",
    tone: "sl-btn--primary",
    text: () => "La asignación quedará como \"Pendiente de respuesta\" hasta que el trabajador la acepte o rechace."
  }
};

function openDialog(action, id) {
  const candidate = CANDIDATES[id];
  const copy = DIALOG_COPY[action];
  pendingAction = { action, id };
  document.querySelector("#candidate-dialog-title").textContent = copy.title;
  const avatar = document.querySelector("#dialog-avatar");
  avatar.textContent = candidate.initials;
  avatar.className = `candidate-avatar candidate-avatar--lg candidate-avatar--${candidate.color}`;
  document.querySelector("#dialog-name").textContent = candidate.name;
  document.querySelector("#dialog-role").textContent = candidate.role;
  document.querySelector("#dialog-rating").textContent = candidate.rating.toFixed(1);
  document.querySelector("#dialog-job").hidden = action !== "assign";
  document.querySelector("#dialog-text").textContent = copy.text(candidate.name);
  confirmButton.textContent = copy.confirm;
  confirmButton.className = `sl-btn ${copy.tone}`;
  dialog.returnValue = "";
  dialog.showModal();
}

function confirmAction({ action, id }) {
  const name = CANDIDATES[id].name;
  if (action === "select") {
    const selected = Object.values(state).filter(({ status }) => status === "selected").length;
    if (selected >= TOTAL_PLACES) {
      showNotice("No quedan plazas disponibles", "Libera una plaza antes de seleccionar a otro candidato.");
      return;
    }
    state[id].status = "selected";
    showNotice("Candidato seleccionado", `${name} fue seleccionado y recibirá una notificación.`);
  } else if (action === "discard") {
    state[id].status = "discarded";
    showNotice("Candidato descartado", `${name} recibirá una notificación de no selección.`);
  } else if (action === "assign") {
    state[id].assigned = true;
    showNotice("Asignación directa enviada", "La asignación fue enviada al trabajador. Está pendiente de su respuesta.");
  }
  saveState();
  renderAll();
}

dialog.addEventListener("close", () => {
  if (dialog.returnValue === "confirm" && pendingAction) confirmAction(pendingAction);
  const trigger = pendingAction && document.querySelector(`tr[data-id="${pendingAction.id}"] .candidate-action--link`);
  pendingAction = null;
  if (trigger) trigger.focus();
});

document.querySelector("#candidates-body").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) openDialog(button.dataset.action, button.dataset.id);
});

// ---------- Filtros ----------
searchInput.addEventListener("input", applyFilters);
minRatingSelect.addEventListener("change", applyFilters);
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    tabs.forEach((other) => {
      const isActive = other === tab;
      other.classList.toggle("is-active", isActive);
      other.setAttribute("aria-pressed", String(isActive));
    });
    applyFilters();
  });
});

// ---------- Perfil del candidato (#candidato-<id>) ----------
function fillProfile(id) {
  const c = CANDIDATES[id];
  const { status } = state[id];
  const avatar = document.querySelector("#profile-avatar");
  avatar.textContent = c.initials;
  avatar.className = `profile-card__avatar candidate-avatar--${c.color}`;
  document.querySelector("#profile-name").textContent = c.name;
  document.querySelector("#profile-role").textContent = c.role;
  const pill = document.querySelector("#profile-status");
  pill.className = `status-pill status-pill--${status}`;
  pill.innerHTML = `<span aria-hidden="true">●</span> ${STATUS_LABELS[status]}`;

  const stars = '<span class="rating__stars" aria-hidden="true">★★★★★</span>';
  document.querySelector("#profile-ratings").innerHTML = [
    ["Global", c.rating], ["Logística", c.logistics], ["Coordinación", c.coordination]
  ].map(([label, value]) => `<div><dd class="rating">${stars} <strong>${value.toFixed(1)}</strong></dd><dt>${label}</dt></div>`).join("");

  document.querySelector("#profile-stats").innerHTML = [
    ["Años exp.", c.years], ["Trabajos", c.jobs], ["Empresas", c.companies], ["Puntualidad", c.punctuality]
  ].map(([label, value]) => `<div><dd>${value}</dd><dt>${label}</dt></div>`).join("");

  document.querySelector("#profile-skills").innerHTML = c.skills.map((skill) => `<li>${skill}</li>`).join("");
  document.querySelector("#profile-history").innerHTML = c.history.map(([icon, title, meta, score]) => `
    <li>
      <span class="profile-history__icon" aria-hidden="true">${icon}</span>
      <span class="profile-history__text"><strong>${title}</strong><span>${meta}</span></span>
      <span class="rating" aria-label="Calificación ${score} de 5">${stars} <strong>${score}</strong></span>
    </li>`).join("");

  const outcome = document.querySelector("#profile-outcome");
  outcome.hidden = status === "review";
  outcome.classList.toggle("profile-outcome--discarded", status === "discarded");
  document.querySelector("#profile-outcome .profile-outcome__icon").textContent = status === "discarded" ? "✕" : "✓";
  document.querySelector("#profile-outcome-title").textContent =
    status === "discarded" ? "Candidato descartado" : "Candidato seleccionado";
  document.querySelector("#profile-outcome-text").textContent = status === "discarded"
    ? `${c.name} no fue seleccionado para este trabajo.`
    : `${c.name} ya está confirmado para este trabajo.`;
}

function route() {
  const match = window.location.hash.match(/^#candidato-([a-z]+)$/);
  const id = match && CANDIDATES[match[1]] ? match[1] : null;
  listView.hidden = Boolean(id);
  profileView.hidden = !id;
  const scroller = document.querySelector(".dashboard__main");
  scroller.scrollTo(0, 0);
  window.scrollTo(0, 0);
  if (id) {
    fillProfile(id);
    document.querySelector("#profile-name").focus({ preventScroll: true });
  }
}

profileView.querySelector(".candidate-profile__back").addEventListener("click", (event) => {
  event.preventDefault();
  history.pushState("", document.title, window.location.pathname);
  route();
});

window.addEventListener("hashchange", route);
renderAll();
route();
