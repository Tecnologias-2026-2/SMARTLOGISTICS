// Empresa · Editar convocatoria (RF-14): edición campo a campo y guardado.
// Se abre como editar-convocatoria.html?id=<convocatoria>.

const EDITS_KEY = "smart-logistics:convocatorias-editadas";
const CATEGORIES = ["Evento", "Almacén", "Montaje", "Reparto"];

const POSTINGS = {
  montaje: {
    title: "Auxiliares de Montaje – Feria Tecnológica", category: "Montaje", location: "Bogotá, Corferias",
    workers: 12, date: "15 Sep 2026", hours: "08:00 – 18:00", pay: "$80.000 COP",
    description: "Se requieren auxiliares de montaje para la instalación de stands y estructuras de la Feria Tecnológica Colombia 2026. El trabajo incluye armado de estructuras metálicas, montaje de mobiliario, instalación de señalética y verificación de los espacios antes de la apertura.",
    requirements: ["Experiencia mínima de 1 año en montaje de eventos", "Capacidad para trabajo físico moderado", "Disponibilidad de 08:00 a 18:00", "Responsabilidad y puntualidad", "Trabajo en equipo"]
  },
  concierto: {
    title: "Auxiliares Logísticos – Concierto Internacional", category: "Evento", location: "Bogotá, El Campín",
    workers: 25, date: "30 Sep 2026", hours: "10:00 – 22:00", pay: "$95.000 COP",
    description: "Apoyo en la logística general del concierto, control de accesos, manejo de materiales escénicos y soporte a producción.",
    requirements: ["Experiencia en eventos masivos", "Capacidad para trabajar bajo presión", "Disponibilidad de 10:00 a 22:00", "Curso de primeros auxilios deseable"]
  }
};

const ICONS = { location: "📍 ", workers: "👥 ", date: "📅 ", hours: "⏱️ " };

const params = new URLSearchParams(window.location.search);
const postingId = POSTINGS[params.get("id")] ? params.get("id") : "montaje";

function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem(EDITS_KEY)) || {};
  } catch (error) {
    console.warn("No se pudieron leer los cambios guardados.", error);
    return {};
  }
}

const posting = { ...POSTINGS[postingId], ...(loadEdits()[postingId] || {}) };
const form = document.querySelector("#edit-posting-form");
const rows = [...document.querySelectorAll(".detail-row")];

function escapeHTML(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

function renderValue(row) {
  const key = row.dataset.field;
  const target = row.querySelector("[data-value]");
  const value = posting[key];
  if (key === "category") {
    target.innerHTML = `<span class="tag">${escapeHTML(value)}</span>`;
  } else if (key === "requirements") {
    target.innerHTML = `<ul>${value.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
  } else if (key === "workers") {
    target.textContent = `${ICONS.workers}${value} trabajadores`;
  } else {
    target.textContent = `${ICONS[key] || ""}${value}`;
  }
  target.classList.toggle("detail-row__value--pay", key === "pay");
}

function openEditor(row) {
  const key = row.dataset.field;
  const kind = row.dataset.kind;
  const id = `edit-${key}`;
  let control;
  if (kind === "category") {
    control = `<select id="${id}">${CATEGORIES.map((c) => `<option${c === posting.category ? " selected" : ""}>${c}</option>`).join("")}</select>`;
  } else if (kind === "textarea") {
    control = `<textarea id="${id}">${escapeHTML(posting[key])}</textarea>`;
  } else if (kind === "list") {
    control = `<textarea id="${id}" aria-describedby="${id}-hint">${escapeHTML(posting[key].join("\n"))}</textarea>
      <p class="posting-field__error" id="${id}-hint" class="posting-field__hint">Escribe un requisito por línea.</p>`;
  } else if (kind === "number") {
    control = `<input id="${id}" type="number" min="1" step="1" value="${posting[key]}">`;
  } else {
    control = `<input id="${id}" type="text" value="${escapeHTML(String(posting[key]))}">`;
  }
  const label = row.querySelector(".detail-row__label").textContent;
  row.querySelector("[data-value]").innerHTML =
    `<div class="posting-field"><label class="visually-hidden" for="${id}">${label}</label>${control}</div>`;
  const button = row.querySelector(".detail-row__edit");
  button.textContent = "✓ Listo";
  button.dataset.editing = "true";
  row.querySelector(`#${id}`).focus();
}

function closeEditor(row) {
  const key = row.dataset.field;
  const input = row.querySelector(`#edit-${key}`);
  if (input) {
    const raw = input.value.trim();
    if (row.dataset.kind === "list") {
      const items = raw.split("\n").map((line) => line.trim()).filter(Boolean);
      if (items.length) posting[key] = items;
    } else if (row.dataset.kind === "number") {
      const n = Number(raw);
      if (Number.isInteger(n) && n > 0) posting[key] = n;
    } else if (raw) {
      posting[key] = raw;
    }
  }
  renderValue(row);
  const button = row.querySelector(".detail-row__edit");
  button.textContent = "✏️ Editar";
  delete button.dataset.editing;
}

rows.forEach((row) => {
  renderValue(row);
  row.querySelector(".detail-row__edit").addEventListener("click", (event) => {
    if (event.currentTarget.dataset.editing) closeEditor(row);
    else openEditor(row);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  rows.filter((row) => row.querySelector(".detail-row__edit").dataset.editing).forEach(closeEditor);
  try {
    const edits = loadEdits();
    edits[postingId] = posting;
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  } catch (error) {
    console.warn("No se pudieron guardar los cambios en el navegador.", error);
  }
  const summary = document.querySelector("#saved-summary");
  summary.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = posting.title;
  summary.append(title);
  [`🏷️ ${posting.category}`, `📍 ${posting.location}`, `📅 ${posting.date} · ${posting.hours}`,
    `👥 ${posting.workers} trabajadores · ${posting.pay}`].forEach((text) => {
    const line = document.createElement("span");
    line.textContent = text;
    summary.append(line);
  });
  document.querySelector("#saved-dialog").showModal();
});
