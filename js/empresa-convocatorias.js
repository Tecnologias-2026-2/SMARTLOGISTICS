// Empresa · Convocatorias (RF-14 y RF-23): listado real de convocatorias
// (incluye las creadas y editadas en el navegador) y calificación post-servicio.

const POSTINGS_KEY = "smart-logistics:convocatorias-nuevas";
const EDITS_KEY = "smart-logistics:convocatorias-editadas";
const RATINGS_KEY = "smart-logistics:calificaciones-evento-corporativo";

const body = document.querySelector("#postings-body");
const notice = document.querySelector("#postings-notice");

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    console.warn(`No se pudo leer "${key}" del navegador.`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar "${key}" en el navegador.`, error);
  }
}

function showNotice(title, text) {
  document.querySelector("#postings-notice-title").textContent = title;
  document.querySelector("#postings-notice-text").textContent = text;
  notice.hidden = false;
}

const CATEGORY_TAG = { Montaje: "soft-blue", Evento: "soft-purple", Almacén: "soft-green", Reparto: "soft-orange" };
const CATEGORY_ICON = { Montaje: "🔧", Evento: "🎪", Almacén: "📦", Reparto: "🚚" };

// ---------- Cambios hechos en "Editar convocatoria" ----------
const edits = readJSON(EDITS_KEY, {});
Object.entries(edits).forEach(([id, posting]) => {
  const row = body.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;
  row.querySelector(".company-event-name strong").textContent = posting.title;
  row.querySelector(".company-event-name small").textContent = posting.location;
  row.querySelector(".company-date").textContent = posting.date;
  const tag = row.querySelector(".company-tag");
  tag.textContent = posting.category;
  tag.className = `company-tag company-tag--${CATEGORY_TAG[posting.category] || "soft-blue"}`;
  const total = row.querySelector(".company-vacancies span");
  total.textContent = `/${posting.workers}`;
  const covered = Number(row.querySelector(".company-vacancies strong").textContent);
  const bar = row.querySelector(".scale");
  bar.setAttribute("aria-label", `${covered} de ${posting.workers} plazas cubiertas`);
  bar.querySelector("span").style.width = `${Math.min(100, (covered / posting.workers) * 100)}%`;
});

// ---------- Convocatorias creadas en "Crear convocatoria" ----------
function textCell(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

readJSON(POSTINGS_KEY, []).forEach((posting) => {
  const row = document.createElement("tr");
  row.dataset.id = posting.id;

  const name = document.createElement("td");
  name.className = "company-event-name";
  name.append(textCell("span", "company-icon", CATEGORY_ICON[posting.category] || "📣"));
  name.firstChild.setAttribute("aria-hidden", "true");
  const info = document.createElement("div");
  info.append(textCell("strong", "", posting.title), textCell("small", "", posting.location));
  name.append(info);

  const category = document.createElement("td");
  category.append(textCell("span", `company-tag company-tag--${CATEGORY_TAG[posting.category] || "soft-blue"}`, posting.category));

  const places = document.createElement("td");
  places.innerHTML = `<div class="company-vacancies"><strong>0</strong><span></span></div>
    <div class="scale" aria-label="0 de ${posting.workers} plazas cubiertas"><span style="width: 0%;"></span></div>`;
  places.querySelector(".company-vacancies span").textContent = `/${posting.workers}`;

  const candidates = document.createElement("td");
  candidates.innerHTML = '<span class="company-count"><span aria-hidden="true">👥</span>0</span>';

  const status = document.createElement("td");
  status.innerHTML = '<span class="status-pill status-pill--active"><span aria-hidden="true">•</span> Activa</span>';

  const actions = document.createElement("td");
  actions.className = "company-actions";
  actions.innerHTML = '<a href="candidatos.html" class="action-btn action-btn--primary">Candidatos</a>';

  row.append(name, category, textCell("td", "company-date", posting.dateLabel), places, candidates, status, actions);
  body.prepend(row);
});

const total = body.querySelectorAll("tr").length;
document.querySelector("#postings-count").textContent =
  `${total} ${total === 1 ? "convocatoria publicada" : "convocatorias publicadas"}`;

// ---------- Calificación post-servicio (RF-23) ----------
const ratingDialog = document.querySelector("#rating-dialog");
const ratingForm = document.querySelector("#rating-form");
const workerSelect = document.querySelector("#rating-worker");
const ratingError = document.querySelector("#rating-error");
const openRatingButton = document.querySelector("#open-rating");

document.querySelectorAll(".star-input").forEach((group) => {
  const criterion = group.dataset.criterion;
  const options = group.querySelector(".star-input__options");
  for (let value = 1; value <= 5; value += 1) {
    const id = `${criterion}-${value}`;
    options.insertAdjacentHTML("beforeend",
      `<input type="radio" id="${id}" name="${criterion}" value="${value}">
       <label for="${id}" title="${value} de 5"><span aria-hidden="true">★</span><span class="visually-hidden">${value} de 5</span></label>`);
  }
});

function syncRatedWorkers() {
  const ratings = readJSON(RATINGS_KEY, {});
  let pending = 0;
  [...workerSelect.options].forEach((option) => {
    if (!option.value) return;
    const name = option.textContent.replace(" (ya calificado)", "");
    option.disabled = Boolean(ratings[option.value]);
    option.textContent = option.disabled ? `${name} (ya calificado)` : name;
    if (!option.disabled) pending += 1;
  });
  openRatingButton.disabled = pending === 0;
  openRatingButton.textContent = pending === 0 ? "Calificado ✓" : "Calificar";
}

openRatingButton.addEventListener("click", () => {
  ratingForm.reset();
  ratingError.hidden = true;
  ratingDialog.showModal();
});

document.querySelectorAll("[data-close-rating]").forEach((button) => {
  button.addEventListener("click", () => ratingDialog.close());
});

ratingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(ratingForm);
  const missing = [];
  if (!workerSelect.value) missing.push("el trabajador");
  ["puntualidad", "eficiencia", "actitud"].forEach((criterion) => {
    if (!data.get(criterion)) missing.push(criterion);
  });
  if (missing.length) {
    ratingError.textContent = `Falta calificar: ${missing.join(", ")}. Todos los criterios son obligatorios.`;
    ratingError.hidden = false;
    return;
  }
  const ratings = readJSON(RATINGS_KEY, {});
  if (ratings[workerSelect.value]) {
    ratingError.textContent = "Este trabajador ya tiene una evaluación para esta convocatoria.";
    ratingError.hidden = false;
    return;
  }
  const scores = ["puntualidad", "eficiencia", "actitud"].map((criterion) => Number(data.get(criterion)));
  const average = (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  const workerName = workerSelect.selectedOptions[0].textContent;
  ratings[workerSelect.value] = {
    role: data.get("role"), scores, average,
    comment: document.querySelector("#rating-comment").value.trim(),
    date: new Date().toISOString()
  };
  writeJSON(RATINGS_KEY, ratings);
  ratingDialog.close();
  syncRatedWorkers();
  showNotice("Calificación registrada", `${workerName} recibió un puntaje de ${average} y su reputación se actualizó.`);
});

syncRatedWorkers();
