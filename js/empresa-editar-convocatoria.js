// Empresa · Editar convocatoria (RF-14): edición campo a campo y guardado en
// la base de datos. Se abre como editar-convocatoria.html?id=<convocatoria>.

const CATEGORIES = ["EVENTO", "ALMACEN", "MONTAJE", "REPARTO"];
const ICONS = { location: "📍 ", workers: "👥 ", date: "📅 ", hours: "⏱️ " };

const params = new URLSearchParams(window.location.search);
const postingId = Number(params.get("id"));
const form = document.querySelector("#edit-posting-form");
const rows = [...document.querySelectorAll(".detail-row")];
let posting = null;

function showError(message) {
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

function renderValue(row) {
  const key = row.dataset.field;
  const target = row.querySelector("[data-value]");
  const value = posting[key];
  if (key === "category") {
    target.innerHTML = `<span class="tag">${SL.categoria(value).label}</span>`;
  } else if (key === "requirements") {
    target.innerHTML = value.length
      ? `<ul>${value.map((item) => `<li>${SL.escapeHTML(item)}</li>`).join("")}</ul>`
      : "Sin requisitos";
  } else if (key === "workers") {
    target.textContent = `${ICONS.workers}${value} trabajadores`;
  } else if (key === "date") {
    target.textContent = `${ICONS.date}${SL.fecha(value)}`;
  } else if (key === "hours") {
    target.textContent = `${ICONS.hours}${value.start} – ${value.end}`;
  } else if (key === "pay") {
    target.textContent = `${SL.dinero(value)} COP`;
  } else {
    target.textContent = `${ICONS[key] || ""}${value}`;
  }
  target.classList.toggle("detail-row__value--pay", key === "pay");
}

function openEditor(row) {
  const key = row.dataset.field;
  const kind = row.dataset.kind;
  const id = `edit-${key}`;
  const value = posting[key];
  let control;
  if (kind === "category") {
    control = `<select id="${id}">${CATEGORIES.map((c) => `<option value="${c}"${c === value ? " selected" : ""}>${SL.categoria(c).label}</option>`).join("")}</select>`;
  } else if (kind === "textarea") {
    control = `<textarea id="${id}">${SL.escapeHTML(value)}</textarea>`;
  } else if (kind === "list") {
    control = `<textarea id="${id}" aria-describedby="${id}-hint">${SL.escapeHTML(value.join("\n"))}</textarea>
      <p class="posting-field__hint" id="${id}-hint">Escribe un requisito por línea.</p>`;
  } else if (kind === "number") {
    control = `<input id="${id}" type="number" min="1" step="1" value="${value}">`;
  } else if (kind === "date") {
    control = `<input id="${id}" type="date" min="${SL.hoyISO()}" value="${value}">`;
  } else if (kind === "hours") {
    control = `<div class="posting-grid">
        <input id="${id}" type="time" value="${value.start}" aria-label="Hora de inicio">
        <input id="${id}-end" type="time" value="${value.end}" aria-label="Hora de fin">
      </div>`;
  } else if (kind === "pay") {
    control = `<input id="${id}" type="text" inputmode="numeric" value="${SL.dinero(value)}">`;
  } else {
    control = `<input id="${id}" type="text" value="${SL.escapeHTML(String(value))}">`;
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
  const kind = row.dataset.kind;
  const input = row.querySelector(`#edit-${key}`);
  if (input) {
    const raw = input.value.trim();
    if (kind === "list") {
      posting[key] = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    } else if (kind === "number") {
      const n = Number(raw);
      if (Number.isInteger(n) && n > 0) posting[key] = n;
    } else if (kind === "hours") {
      const end = row.querySelector(`#edit-${key}-end`).value;
      if (raw && end) posting[key] = { start: raw, end };
    } else if (kind === "pay") {
      const n = Number(raw.replace(/\D/g, ""));
      if (n > 0) posting[key] = n;
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
  row.querySelector(".detail-row__edit").addEventListener("click", (event) => {
    if (!posting) return;
    if (event.currentTarget.dataset.editing) closeEditor(row);
    else openEditor(row);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!posting) return;
  rows.filter((row) => row.querySelector(".detail-row__edit").dataset.editing).forEach(closeEditor);
  if (posting.hours.end <= posting.hours.start) {
    showError("La hora de fin debe ser posterior a la hora de inicio.");
    return;
  }
  showError("");
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  const { error } = await sb.rpc("guardar_convocatoria", {
    p_id: postingId,
    p_titulo: posting.title,
    p_categoria: posting.category,
    p_ubicacion: posting.location,
    p_fecha: posting.date,
    p_hora_inicio: posting.hours.start,
    p_hora_fin: posting.hours.end,
    p_plazas: posting.workers,
    p_remuneracion: posting.pay,
    p_descripcion: posting.description,
    p_requisitos: posting.requirements
  });
  submit.disabled = false;
  if (error) {
    showError(SL.mensajeError(error));
    return;
  }
  const summary = document.querySelector("#saved-summary");
  summary.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = posting.title;
  summary.append(title);
  [`🏷️ ${SL.categoria(posting.category).label}`, `📍 ${posting.location}`,
    `📅 ${SL.fecha(posting.date)} · ${posting.hours.start} – ${posting.hours.end}`,
    `👥 ${posting.workers} trabajadores · ${SL.dinero(posting.pay)} COP`].forEach((text) => {
    const line = document.createElement("span");
    line.textContent = text;
    summary.append(line);
  });
  document.querySelector("#saved-dialog").showModal();
});

// ---------- Carga inicial ----------
(async () => {
  const ctx = await SL.iniciarPanel("EMPRESA");
  if (!postingId) {
    window.location.replace("convocatorias.html");
    return;
  }
  try {
    const data = await sb.from("convocatoria")
      .select("*, requisito(descripcion, orden)")
      .eq("id", postingId)
      .eq("id_empresa", ctx.empresa.id)
      .maybeSingle()
      .then(SL.datos);
    if (!data) {
      SL.mostrarErrorGlobal("No encontramos esta convocatoria en tu empresa.");
      return;
    }
    posting = {
      title: data.titulo,
      category: data.categoria,
      location: data.ubicacion,
      workers: data.plazas_totales,
      date: data.fecha,
      hours: { start: SL.hora(data.hora_inicio), end: SL.hora(data.hora_fin) },
      pay: data.remuneracion,
      description: data.descripcion,
      requirements: SL.ordenar(data.requisito).map((item) => item.descripcion)
    };
    const state = SL.estadoConvocatoria(data);
    const pill = document.querySelector("#posting-status");
    pill.className = `status-pill status-pill--${state.clave}`;
    pill.innerHTML = `<span aria-hidden="true">●</span> ${state.label}`;
    rows.forEach(renderValue);
  } catch (error) {
    console.error("No fue posible cargar la convocatoria.", error);
    SL.mostrarErrorGlobal(SL.mensajeError(error));
  }
})();
