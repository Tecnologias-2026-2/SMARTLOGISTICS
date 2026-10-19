const filterButtons = [...document.querySelectorAll(".application-filter")];
const APPLICATIONS_STORAGE_KEY = "smart-logistics:worker-applications";
const applicationList = document.querySelector(".application-list");
const applicationCount = document.querySelector("#application-count");
let applicationCards = [...applicationList.querySelectorAll(".application-card")];
const assignmentTitle = document.querySelector("#assignment-title");
const assignmentMessage = document.querySelector("#assignment-message");
const assignmentActions = document.querySelector("#assignment-actions");
const assignmentCard = document.querySelector("#assignment-card");
const assignmentDetailsDialog = document.querySelector("#assignment-details-dialog");
const applicationSummaryDialog = document.querySelector("#application-summary-dialog");
const applicationSummaryTitle = document.querySelector("#application-summary-title");
const applicationSummaryCompany = document.querySelector("#application-summary-company");
const applicationSummaryStatus = document.querySelector("#application-summary-status");
const applicationSummaryFacts = document.querySelector("#application-summary-facts");
const applicationSummaryNote = document.querySelector("#application-summary-note");
const cancelApplicationDialog = document.querySelector("#cancel-application-dialog");
const cancelApplicationName = document.querySelector("#cancel-application-name");
const confirmCancelApplicationButton = document.querySelector("#confirm-cancel-application");
let applicationToCancel = null;
let activeStatus = "all";

function getDirectAssignment() {
  return {
    id: "asignacion-directa-concierto",
    title: "Auxiliares Logísticos – Concierto Internacional",
    company: "Eventos Nova",
    date: "🗓️ 30 Sep 2026",
    location: "📍 Bogotá, El Campín",
    hours: "◷ 10:00 – 22:00",
    pay: "$95.000 COP",
    status: "selected",
    appliedAt: new Date().toISOString()
  };
}

function readApplications() {
  const storedApplications = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
  if (!storedApplications) return [];

  const applications = JSON.parse(storedApplications);
  if (!Array.isArray(applications)) {
    throw new Error("El almacenamiento de postulaciones no tiene un formato válido.");
  }
  return applications;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function addApplicationDetailsButton(card) {
  const status = card.querySelector(":scope > .application-status");
  if (!status || card.querySelector(".application-details-button")) return;

  const actions = document.createElement("div");
  actions.className = "application-card__status-actions";
  status.replaceWith(actions);
  actions.append(status);

  const detailsButton = createTextElement("button", "application-details-button", "Ver detalles de postulación");
  detailsButton.type = "button";
  actions.append(detailsButton);
}

function showApplicationSummary(card) {
  applicationSummaryTitle.textContent = card.querySelector(".application-card__body h2").textContent.trim();
  applicationSummaryCompany.textContent = card.querySelector(".application-card__company").textContent.trim();
  applicationSummaryStatus.textContent = card.querySelector(".application-status").textContent.trim();
  applicationSummaryStatus.className = `application-summary-dialog__status application-summary-dialog__status--${card.dataset.status}`;
  applicationSummaryFacts.replaceChildren();
  const meta = [...card.querySelectorAll(".application-card__meta span")].map((item) => item.textContent.trim());
  const facts = [
    ["Fecha", meta[0] || "No disponible"],
    ["Ubicación", meta[1] || "No disponible"],
    ["Horario", meta[2] || "No disponible"],
    ["Remuneración", card.querySelector(".application-card__pay").textContent.trim()]
  ];
  facts.forEach(([label, value]) => {
    const row = document.createElement("p");
    row.append(
      createTextElement("strong", "", label),
      createTextElement("span", "", value)
    );
    applicationSummaryFacts.append(row);
  });
  const note = card.querySelector(".application-card__note");
  applicationSummaryNote.textContent = note ? note.textContent.trim() : "";
  applicationSummaryDialog.showModal();
}

function createApplicationCard(application) {
  const card = document.createElement("article");
  card.className = "application-card";
  card.dataset.status = application.status;
  card.dataset.offerId = application.id;

  const statusDetails = {
    review: {
      icon: "⌛",
      label: "En revisión",
      note: "Tu candidatura está siendo evaluada por la empresa."
    },
    selected: {
      icon: "🎉",
      label: "● Seleccionado",
      note: "¡Felicitaciones! Has aceptado esta asignación directa."
    },
    rejected: {
      icon: "✖",
      label: application.id === "asignacion-directa-concierto" ? "● Rechazado" : "● No seleccionado",
      note: application.id === "asignacion-directa-concierto"
        ? "Rechazaste esta asignación directa."
        : "No fuiste seleccionado en esta oportunidad. ¡Sigue intentando!"
    }
  }[application.status];
  if (!statusDetails) throw new Error("La postulación tiene un estado no válido.");

  const icon = createTextElement("span", `application-card__icon application-card__icon--${application.status}`, statusDetails.icon);
  icon.setAttribute("aria-hidden", "true");
  const body = document.createElement("div");
  body.className = "application-card__body";
  body.append(
    createTextElement("h2", "", application.title),
    createTextElement("p", "application-card__company", application.company)
  );

  const meta = document.createElement("div");
  meta.className = "application-card__meta";
  [
    application.date,
    application.location,
    application.hours
  ].forEach((value) => meta.append(createTextElement("span", "", value)));
  body.append(meta, createTextElement("strong", "application-card__pay", application.pay));

  card.append(
    icon,
    body,
    createTextElement("span", `application-status application-status--${application.status}`, statusDetails.label),
    createTextElement("p", "application-card__note", statusDetails.note)
  );
  addApplicationDetailsButton(card);
  if (application.status === "review") {
    const cancelButton = createTextElement("button", "application-cancel-button", "Cancelar postulación");
    cancelButton.type = "button";
    cancelButton.addEventListener("click", () => {
      applicationToCancel = application.id;
      cancelApplicationName.textContent = application.title;
      cancelApplicationDialog.showModal();
    });
    body.append(cancelButton);
  }
  return card;
}

function loadSavedApplications() {
  const applications = readApplications();
  applications.forEach((application) => {
    if (!application || typeof application.id !== "string" || typeof application.title !== "string") {
      throw new Error("Se encontró una postulación guardada con datos incompletos.");
    }

    applicationList.querySelectorAll("[data-offer-id]").forEach((card) => {
      if (card.dataset.offerId === application.id) card.remove();
    });
    applicationList.append(createApplicationCard(application));
  });
  if (applications.some((application) => application.id === "asignacion-directa-concierto")) {
    assignmentCard.hidden = true;
  }
  applicationCards = [...applicationList.querySelectorAll(".application-card")];
  applicationCards.forEach(addApplicationDetailsButton);
  applicationCount.textContent = `${applicationCards.length} ${applicationCards.length === 1 ? "postulación" : "postulaciones"} en total`;
}

function updateFilterCounts() {
  const counts = applicationCards.reduce((totals, card) => {
    totals[card.dataset.status] += 1;
    return totals;
  }, { review: 0, selected: 0, rejected: 0 });
  const labels = {
    review: `En revisión (${counts.review})`,
    selected: `Seleccionado (${counts.selected})`,
    rejected: `No seleccionado (${counts.rejected})`
  };

  filterButtons.forEach((button) => {
    if (button.dataset.status !== "all") {
      button.textContent = labels[button.dataset.status];
    }
  });
}

function updateVisibleApplications() {
  applicationCards.forEach((card) => {
    card.hidden = activeStatus !== "all" && card.dataset.status !== activeStatus;
  });
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

applicationList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const detailsButton = event.target.closest(".application-details-button");
  if (!detailsButton) return;
  const card = detailsButton.closest(".application-card");
  if (card) showApplicationSummary(card);
});

document.querySelector("#keep-application").addEventListener("click", () => {
  applicationToCancel = null;
  cancelApplicationDialog.close();
});

document.querySelector("#view-assignment-details").addEventListener("click", () => {
  assignmentDetailsDialog.showModal();
});

[document.querySelector("#close-assignment-details"), document.querySelector("#dismiss-assignment-details")].forEach((button) => {
  button.addEventListener("click", () => assignmentDetailsDialog.close());
});

[document.querySelector("#close-application-summary"), document.querySelector("#dismiss-application-summary")].forEach((button) => {
  button.addEventListener("click", () => applicationSummaryDialog.close());
});

confirmCancelApplicationButton.addEventListener("click", () => {
  if (!applicationToCancel) return;
  try {
    const remainingApplications = readApplications().filter((application) => application.id !== applicationToCancel);
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(remainingApplications));
    applicationList.querySelectorAll("[data-offer-id]").forEach((card) => {
      if (card.dataset.offerId === applicationToCancel) card.remove();
    });
    applicationToCancel = null;
    cancelApplicationDialog.close();
    applicationCards = [...applicationList.querySelectorAll(".application-card")];
    applicationCount.textContent = `${applicationCards.length} ${applicationCards.length === 1 ? "postulación" : "postulaciones"} en total`;
    updateFilterCounts();
    updateVisibleApplications();
  } catch (error) {
    console.error("No fue posible cancelar la postulación.", error);
    cancelApplicationName.textContent = "No se pudo cancelar la postulación. Inténtalo de nuevo.";
  }
});

document.querySelector("#accept-assignment").addEventListener("click", () => {
  try {
    const applications = readApplications();
    if (!applications.some((application) => application.id === "asignacion-directa-concierto")) {
      applications.push(getDirectAssignment());
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
      applicationList.append(createApplicationCard(applications[applications.length - 1]));
      applicationCards = [...applicationList.querySelectorAll(".application-card")];
      applicationCount.textContent = `${applicationCards.length} ${applicationCards.length === 1 ? "postulación" : "postulaciones"} en total`;
      updateFilterCounts();
      updateVisibleApplications();
    }
    assignmentCard.hidden = true;
  } catch (error) {
    assignmentMessage.textContent = "No se pudo aceptar la asignación. Inténtalo de nuevo.";
    console.error("No fue posible aceptar la asignación directa.", error);
  }
});

document.querySelector("#reject-assignment").addEventListener("click", () => {
  try {
    const applications = readApplications();
    if (!applications.some((application) => application.id === "asignacion-directa-concierto")) {
      const rejectedAssignment = getDirectAssignment();
      rejectedAssignment.status = "rejected";
      applications.push(rejectedAssignment);
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
      applicationList.append(createApplicationCard(rejectedAssignment));
      applicationCards = [...applicationList.querySelectorAll(".application-card")];
      applicationCount.textContent = `${applicationCards.length} ${applicationCards.length === 1 ? "postulación" : "postulaciones"} en total`;
      updateFilterCounts();
      updateVisibleApplications();
    }
    assignmentCard.hidden = true;
  } catch (error) {
    assignmentMessage.textContent = "No se pudo rechazar la asignación. Inténtalo de nuevo.";
    console.error("No fue posible rechazar la asignación directa.", error);
  }
});

try {
  loadSavedApplications();
} catch (error) {
  applicationCount.textContent = "No se pudieron cargar las postulaciones guardadas.";
  console.error("No fue posible cargar las postulaciones guardadas.", error);
}
updateFilterCounts();
updateVisibleApplications();
