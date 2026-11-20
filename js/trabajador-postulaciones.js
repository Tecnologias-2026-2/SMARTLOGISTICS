// Trabajador · Mis postulaciones: seguimiento por estado (RF-18), cancelación
// de postulaciones en revisión y respuesta a asignaciones directas (RF-22).

const filterButtons = [...document.querySelectorAll(".application-filter")];
const applicationList = document.querySelector(".application-list");
const applicationCount = document.querySelector("#application-count");
const emptyMessage = document.querySelector("#applications-empty");
const assignmentCard = document.querySelector("#assignment-card");
const assignmentMessage = document.querySelector("#assignment-message");
const assignmentDetailsDialog = document.querySelector("#assignment-details-dialog");
const applicationSummaryDialog = document.querySelector("#application-summary-dialog");
const cancelApplicationDialog = document.querySelector("#cancel-application-dialog");
const cancelApplicationName = document.querySelector("#cancel-application-name");
const confirmCancelApplicationButton = document.querySelector("#confirm-cancel-application");
const rejectDialog = document.querySelector("#reject-assignment-dialog");
const rejectForm = document.querySelector("#reject-assignment-form");
const rejectReason = document.querySelector("#reject-reason");
const rejectError = document.querySelector("#reject-error");

let ctx = null;
let applications = [];
let pendingAssignment = null;
let applicationToCancel = null;
let activeStatus = "all";

// ---------- Estado visible de cada postulación ----------
function viewStatus(application) {
  const direct = application.origen === "ASIGNACION_DIRECTA";
  if (application.estado === "SELECCIONADO") {
    return {
      key: "selected", icon: "🎉", label: "● Seleccionado",
      note: direct ? "¡Aceptaste esta asignación directa! Ya estás confirmado." : "¡Felicitaciones! Has sido seleccionado para este trabajo."
    };
  }
  if (application.estado === "NO_SELECCIONADO") {
    const rejectedByMe = application.respuesta_trabajador === "RECHAZADA";
    return {
      key: "rejected", icon: "✖",
      label: rejectedByMe ? "● Rechazado" : "● No seleccionado",
      note: rejectedByMe
        ? `Rechazaste esta asignación directa${application.motivo_rechazo ? `: ${application.motivo_rechazo}` : "."}`
        : "No fuiste seleccionado en esta oportunidad. ¡Sigue intentando!"
    };
  }
  return { key: "review", icon: "⌛", label: "En revisión", note: "Tu candidatura está siendo evaluada por la empresa." };
}

function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createApplicationCard(application) {
  const offer = application.convocatoria;
  const status = viewStatus(application);
  const card = document.createElement("article");
  card.className = "application-card";
  card.dataset.status = status.key;
  card.dataset.id = application.id;

  const icon = textElement("span", `application-card__icon application-card__icon--${status.key}`, status.icon);
  icon.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "application-card__body";
  body.append(
    textElement("h2", "", offer.titulo),
    textElement("p", "application-card__company", offer.empresa.razon_social)
  );
  const meta = document.createElement("div");
  meta.className = "application-card__meta";
  [`🗓️ ${SL.fecha(offer.fecha)}`, `📍 ${offer.ubicacion}`, `◷ ${SL.horario(offer)}`]
    .forEach((value) => meta.append(textElement("span", "", value)));
  body.append(meta, textElement("strong", "application-card__pay", `${SL.dinero(offer.remuneracion)} COP`));

  if (status.key === "review" && application.origen === "POSTULACION" && offer.fecha >= SL.hoyISO()) {
    const cancelButton = textElement("button", "application-cancel-button", "Cancelar postulación");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => {
      applicationToCancel = application;
      cancelApplicationName.textContent = offer.titulo;
      confirmCancelApplicationButton.disabled = false;
      cancelApplicationDialog.showModal();
    });
    body.append(cancelButton);
  }

  const actions = document.createElement("div");
  actions.className = "application-card__status-actions";
  actions.append(textElement("span", `application-status application-status--${status.key}`, status.label));
  const detailsButton = textElement("button", "application-details-button", "Ver detalles de postulación");
  detailsButton.type = "button";
  detailsButton.addEventListener("click", () => showApplicationSummary(application));
  actions.append(detailsButton);

  card.append(icon, body, actions, textElement("p", "application-card__note", status.note));
  return card;
}

function showApplicationSummary(application) {
  const offer = application.convocatoria;
  const status = viewStatus(application);
  document.querySelector("#application-summary-title").textContent = offer.titulo;
  document.querySelector("#application-summary-company").textContent = offer.empresa.razon_social;
  const statusNode = document.querySelector("#application-summary-status");
  statusNode.textContent = status.label;
  statusNode.className = `application-summary-dialog__status application-summary-dialog__status--${status.key}`;
  const facts = document.querySelector("#application-summary-facts");
  facts.replaceChildren();
  [
    ["Fecha", SL.fecha(offer.fecha)],
    ["Ubicación", offer.ubicacion],
    ["Horario", SL.horario(offer)],
    ["Remuneración", `${SL.dinero(offer.remuneracion)} COP`],
    ["Postulado el", SL.fecha(application.created_at)]
  ].forEach(([label, value]) => {
    const row = document.createElement("p");
    row.append(textElement("strong", "", label), textElement("span", "", value));
    facts.append(row);
  });
  document.querySelector("#application-summary-note").textContent = status.note;
  applicationSummaryDialog.showModal();
}

// ---------- Asignación directa pendiente ----------
function renderAssignment() {
  pendingAssignment = applications.find((application) =>
    application.origen === "ASIGNACION_DIRECTA" && application.respuesta_trabajador === "PENDIENTE");
  assignmentCard.hidden = !pendingAssignment;
  if (!pendingAssignment) return;

  const offer = pendingAssignment.convocatoria;
  assignmentMessage.textContent = `${offer.empresa.razon_social} te ha asignado directamente.`;
  document.querySelector("#assignment-job").textContent = offer.titulo;
  const meta = document.querySelector("#assignment-meta");
  meta.replaceChildren(
    textElement("span", "", `🗓️ ${SL.fecha(offer.fecha)}`),
    textElement("span", "", `◷ ${SL.horario(offer)}`),
    textElement("span", "", `💰 ${SL.dinero(offer.remuneracion)} COP`)
  );
  document.querySelectorAll("#assignment-actions button").forEach((button) => { button.disabled = false; });

  const cat = SL.categoria(offer.categoria);
  document.querySelector("#assignment-details-icon").textContent = cat.icon;
  document.querySelector("#assignment-details-eyebrow").textContent = `${offer.empresa.razon_social} · ${cat.label}`;
  document.querySelector("#assignment-details-title").textContent = offer.titulo;
  const facts = document.querySelector("#assignment-details-facts");
  facts.replaceChildren();
  [
    ["Fecha", SL.fecha(offer.fecha)],
    ["Horario", SL.horario(offer)],
    ["Ubicación", offer.ubicacion],
    ["Remuneración", `${SL.dinero(offer.remuneracion)} COP`],
    ["Plazas disponibles", `${offer.plazas_disponibles} de ${offer.plazas_totales}`]
  ].forEach(([label, value]) => {
    const row = document.createElement("p");
    row.append(textElement("strong", "", label), textElement("span", "", value));
    facts.append(row);
  });
  document.querySelector("#assignment-details-description").textContent = offer.descripcion;
  document.querySelector("#assignment-details-requirements").innerHTML = SL.ordenar(offer.requisito)
    .map((item) => `<li>${SL.escapeHTML(item.descripcion)}</li>`).join("") || "<li>Sin requisitos adicionales.</li>";
}

// ---------- Listado y filtros ----------
function renderList() {
  const visible = applications.filter((application) => application !== pendingAssignment);
  applicationList.replaceChildren(...visible.map(createApplicationCard));
  applicationCount.textContent = `${visible.length} ${visible.length === 1 ? "postulación" : "postulaciones"} en total`;
  emptyMessage.hidden = visible.length > 0 || Boolean(pendingAssignment);

  const counts = { review: 0, selected: 0, rejected: 0 };
  visible.forEach((application) => { counts[viewStatus(application).key] += 1; });
  const labels = {
    review: `En revisión (${counts.review})`,
    selected: `Seleccionado (${counts.selected})`,
    rejected: `No seleccionado (${counts.rejected})`
  };
  filterButtons.forEach((button) => {
    if (button.dataset.status !== "all") button.textContent = labels[button.dataset.status];
  });
  updateVisibleApplications();
}

function updateVisibleApplications() {
  applicationList.querySelectorAll(".application-card").forEach((card) => {
    card.hidden = activeStatus !== "all" && card.dataset.status !== activeStatus;
  });
}

async function loadApplications() {
  applications = await sb.from("postulacion")
    .select("*, convocatoria(*, empresa(razon_social), requisito(descripcion, orden))")
    .eq("id_trabajador", ctx.uid)
    .order("created_at", { ascending: false })
    .then(SL.datos);
  renderAssignment();
  renderList();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeStatus = button.dataset.status;
    filterButtons.forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle("is-selected", selected);
      filter.setAttribute("aria-pressed", String(selected));
    });
    updateVisibleApplications();
  });
});

// ---------- Cancelar postulación ----------
document.querySelector("#keep-application").addEventListener("click", () => {
  applicationToCancel = null;
  cancelApplicationDialog.close();
});

confirmCancelApplicationButton.addEventListener("click", async () => {
  if (!applicationToCancel) return;
  confirmCancelApplicationButton.disabled = true;
  const { error } = await sb.rpc("cancelar_postulacion", { p_postulacion: applicationToCancel.id });
  if (error) {
    cancelApplicationName.textContent = SL.mensajeError(error);
    confirmCancelApplicationButton.disabled = false;
    return;
  }
  applicationToCancel = null;
  cancelApplicationDialog.close();
  await loadApplications();
});

// ---------- Responder asignación directa ----------
async function answerAssignment(accept, reason) {
  const { error } = await sb.rpc("responder_asignacion", {
    p_postulacion: pendingAssignment.id,
    p_acepta: accept,
    p_motivo: reason || null
  });
  if (error) throw error;
  await loadApplications();
}

document.querySelector("#accept-assignment").addEventListener("click", async () => {
  document.querySelectorAll("#assignment-actions button").forEach((button) => { button.disabled = true; });
  try {
    await answerAssignment(true);
  } catch (error) {
    assignmentMessage.textContent = SL.mensajeError(error);
    document.querySelectorAll("#assignment-actions button").forEach((button) => { button.disabled = false; });
  }
});

document.querySelector("#reject-assignment").addEventListener("click", () => {
  rejectForm.reset();
  rejectError.hidden = true;
  rejectDialog.showModal();
  rejectReason.focus();
});

document.querySelector("#keep-assignment").addEventListener("click", () => rejectDialog.close());

rejectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = rejectReason.value.trim();
  if (!reason) {
    rejectError.textContent = "Cuéntale a la empresa por qué no puedes aceptar.";
    rejectError.hidden = false;
    rejectReason.focus();
    return;
  }
  const submit = rejectForm.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await answerAssignment(false, reason);
    rejectDialog.close();
  } catch (error) {
    rejectError.textContent = SL.mensajeError(error);
    rejectError.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#view-assignment-details").addEventListener("click", () => assignmentDetailsDialog.showModal());
[document.querySelector("#close-assignment-details"), document.querySelector("#dismiss-assignment-details")].forEach((button) => {
  button.addEventListener("click", () => assignmentDetailsDialog.close());
});
[document.querySelector("#close-application-summary"), document.querySelector("#dismiss-application-summary")].forEach((button) => {
  button.addEventListener("click", () => applicationSummaryDialog.close());
});

// ---------- Carga inicial ----------
(async () => {
  ctx = await SL.iniciarPanel("TRABAJADOR");
  try {
    await loadApplications();
  } catch (error) {
    console.error("No fue posible cargar las postulaciones.", error);
    applicationCount.textContent = SL.mensajeError(error);
  }
})();
