// Empresa · Crear convocatoria (RF-13): validación y publicación en la base
// de datos mediante la función guardar_convocatoria.

const CATEGORY_VALUES = { "Evento": "EVENTO", "Almacén": "ALMACEN", "Montaje": "MONTAJE", "Reparto": "REPARTO" };
const form = document.querySelector("#create-posting-form");
const panelReady = SL.iniciarPanel("EMPRESA");
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

function showSubmitError(message) {
  let error = form.querySelector(".posting-form__error");
  if (!error) {
    error = document.createElement("p");
    error.className = "posting-field__error posting-form__error";
    error.setAttribute("role", "alert");
    form.querySelector(".posting-actions").before(error);
  }
  error.textContent = message || "";
  error.hidden = !message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showSubmitError("");
  const errors = validate();
  const firstInvalid = Object.keys(errors)[0];
  if (firstInvalid) {
    field(firstInvalid).focus();
    return;
  }

  const posting = {
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
    requirements: field("requirements").value.split(/\r?\n|;/).map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean)
  };

  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  await panelReady;
  const { error } = await sb.rpc("guardar_convocatoria", {
    p_id: null,
    p_titulo: posting.title,
    p_categoria: CATEGORY_VALUES[posting.category],
    p_ubicacion: posting.location,
    p_fecha: posting.date,
    p_hora_inicio: posting.start,
    p_hora_fin: posting.end,
    p_plazas: posting.workers,
    p_remuneracion: Number(field("salary").value.replace(/\D/g, "")),
    p_descripcion: posting.description,
    p_requisitos: posting.requirements
  });
  submit.disabled = false;
  if (error) {
    showSubmitError(SL.mensajeError(error));
    return;
  }

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
