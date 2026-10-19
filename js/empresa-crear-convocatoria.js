// Empresa · Crear convocatoria (RF-13): validación y publicación.
// La convocatoria publicada se guarda en el navegador para que aparezca
// en el listado de convocatorias (empresa/convocatorias.html).

const POSTINGS_KEY = "smart-logistics:convocatorias-nuevas";
const form = document.querySelector("#create-posting-form");
const publishedDialog = document.querySelector("#published-dialog");

const field = (id) => document.querySelector(`#${id}`);

function setError(id, message) {
  const input = field(id);
  const error = field(`${id}-error`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  error.textContent = message || "";
  error.hidden = !message;
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function validate() {
  const errors = {};
  ["job-title", "category", "workers", "location", "date", "start-time", "end-time", "salary", "description"]
    .forEach((id) => {
      if (!field(id).value.trim()) errors[id] = "Este campo es obligatorio.";
    });

  const workers = Number(field("workers").value);
  if (!errors.workers && (!Number.isInteger(workers) || workers < 1)) {
    errors.workers = "Ingresa un número entero de trabajadores mayor que cero.";
  }
  if (!errors.date && field("date").value < todayISO()) {
    errors.date = "La fecha no puede ser anterior a hoy.";
  }
  if (!errors["end-time"] && !errors["start-time"] && field("end-time").value <= field("start-time").value) {
    errors["end-time"] = "La hora de fin debe ser posterior a la hora de inicio.";
  }
  if (!errors.salary && !/\d/.test(field("salary").value)) {
    errors.salary = "Indica el pago en pesos colombianos, por ejemplo $80.000.";
  }

  ["job-title", "category", "workers", "location", "date", "start-time", "end-time", "salary", "description"]
    .forEach((id) => setError(id, errors[id]));
  return errors;
}

function formatPay(value) {
  const digits = value.replace(/\D/g, "");
  return `$${Number(digits).toLocaleString("es-CO")}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "")
    .replace(/ de /g, " ")
    .replace(/^(\d+) (\w)/, (_, d, m) => `${d} ${m.toUpperCase()}`);
}

function savePosting(posting) {
  try {
    const stored = JSON.parse(localStorage.getItem(POSTINGS_KEY)) || [];
    stored.push(posting);
    localStorage.setItem(POSTINGS_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn("No se pudo guardar la convocatoria en el navegador.", error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const errors = validate();
  const firstInvalid = Object.keys(errors)[0];
  if (firstInvalid) {
    field(firstInvalid).focus();
    return;
  }

  const posting = {
    id: `nueva-${Date.now()}`,
    title: field("job-title").value.trim(),
    category: field("category").value,
    location: field("location").value.trim(),
    date: field("date").value,
    dateLabel: formatDate(field("date").value),
    start: field("start-time").value,
    end: field("end-time").value,
    workers: Number(field("workers").value),
    pay: formatPay(field("salary").value),
    description: field("description").value.trim(),
    requirements: field("requirements").value.trim()
  };
  savePosting(posting);

  const summary = document.querySelector("#published-summary");
  summary.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = posting.title;
  summary.append(title);
  [
    `🏷️ ${posting.category}`,
    `📍 ${posting.location}`,
    `📅 ${posting.dateLabel} · ${posting.start} – ${posting.end}`,
    `👥 ${posting.workers} trabajadores · ${posting.pay} COP`
  ].forEach((text) => {
    const line = document.createElement("span");
    line.textContent = text;
    summary.append(line);
  });
  const status = document.createElement("span");
  status.className = "status-pill status-pill--active";
  status.innerHTML = '<span aria-hidden="true">●</span> Activa';
  status.style.alignSelf = "flex-start";
  summary.append(status);

  form.reset();
  publishedDialog.showModal();
});

// Al corregir un campo se limpia su mensaje de error
form.addEventListener("input", (event) => {
  if (event.target.getAttribute("aria-invalid") === "true") setError(event.target.id, "");
});

// La fecha mínima seleccionable es hoy
field("date").min = todayISO();
