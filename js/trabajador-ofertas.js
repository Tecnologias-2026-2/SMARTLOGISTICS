const APPLICATIONS_STORAGE_KEY = "smart-logistics:worker-applications";
const searchInput = document.querySelector("#offer-search");
const sortSelect = document.querySelector("#offer-sort");
const categoryButtons = [...document.querySelectorAll(".category-filter")];
const offerList = document.querySelector("#offer-list");
const offerCount = document.querySelector("#offer-count");
const emptyMessage = document.querySelector("#offers-empty");
const offerCards = [...offerList.querySelectorAll(".listing-card")];
const listView = document.querySelector("#offers-list-view");
const detailViews = [...document.querySelectorAll(".job-detail")];
const applicationDialog = document.querySelector("#application-dialog");
const confirmationPanel = document.querySelector("#application-confirmation");
const successPanel = document.querySelector("#application-success");
const applicationOfferTitle = document.querySelector("#application-offer-title");
const applicationCompany = document.querySelector("#application-company");
const applicationDetails = document.querySelector("#application-details");
const applicationError = document.querySelector("#application-error");
const confirmApplicationButton = document.querySelector("#confirm-application");
let selectedOffer = null;
let activeCategory = "all";

function readApplications() {
  const storedApplications = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
  if (!storedApplications) return [];

  const applications = JSON.parse(storedApplications);
  if (!Array.isArray(applications)) {
    throw new Error("El almacenamiento de postulaciones no tiene un formato válido.");
  }
  return applications;
}

function getOfferDetails(detail) {
  const facts = [...detail.querySelectorAll(".job-fact strong")].map((fact) => fact.textContent.trim());
  return {
    id: detail.dataset.offerId,
    title: detail.querySelector("h1").textContent.trim(),
    company: detail.dataset.company,
    pay: facts[0],
    location: facts[1],
    date: facts[2],
    hours: facts[3],
    status: "review",
    appliedAt: new Date().toISOString()
  };
}

function updateApplyButtons() {
  const applications = readApplications();
  detailViews.forEach((detail) => {
    const button = detail.querySelector("[data-apply]");
    const alreadyApplied = applications.some((application) => application.id === detail.dataset.offerId);
    button.disabled = alreadyApplied;
    button.textContent = alreadyApplied ? "Ya postulaste" : "Postularme";
  });
}

function openApplicationDialog(detail) {
  try {
    const applications = readApplications();
    selectedOffer = getOfferDetails(detail);
    const alreadyApplied = applications.some((application) => application.id === selectedOffer.id);
    if (alreadyApplied) {
      updateApplyButtons();
      return;
    }

    applicationCompany.textContent = selectedOffer.company;
    applicationOfferTitle.textContent = selectedOffer.title;
    applicationDetails.replaceChildren();
    [
      ["Remuneración", selectedOffer.pay],
      ["Ubicación", selectedOffer.location],
      ["Fecha", selectedOffer.date],
      ["Horario", selectedOffer.hours]
    ].forEach(([label, value]) => {
      const row = document.createElement("p");
      const name = document.createElement("strong");
      name.textContent = label;
      row.append(name, document.createTextNode(value));
      applicationDetails.append(row);
    });
    applicationError.hidden = true;
    confirmationPanel.hidden = false;
    successPanel.hidden = true;
    applicationDialog.showModal();
  } catch (error) {
    applicationError.textContent = "No se pudieron cargar tus postulaciones. Recarga la página e inténtalo de nuevo.";
    applicationError.hidden = false;
    confirmationPanel.hidden = false;
    successPanel.hidden = true;
    applicationDialog.showModal();
    console.error("No fue posible abrir la confirmación de postulación.", error);
  }
}

function updateView() {
  const detailId = {
    "#detalle-montaje": "offer-detail-view",
    "#detalle-reparto": "delivery-detail-view",
    "#detalle-almacen": "warehouse-detail-view",
    "#detalle-evento-corporativo": "corporate-event-detail-view",
    "#detalle-concierto": "concert-detail-view"
  }[window.location.hash];
  const activeDetail = detailViews.find((detail) => detail.id === detailId);
  listView.hidden = Boolean(activeDetail);
  detailViews.forEach((detail) => {
    detail.hidden = detail !== activeDetail;
  });

  if (activeDetail) {
    activeDetail.querySelector("h1").focus({ preventScroll: true });
    document.querySelector(".dashboard__main").scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
}

function updateOffers() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
  const sortOrder = sortSelect.value;
  const matchingCards = offerCards.filter((card) => {
    const matchesCategory = activeCategory === "all" || card.dataset.category === activeCategory;
    const matchesSearch = card.textContent.toLocaleLowerCase("es").includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  matchingCards.sort((first, second) => {
    if (sortOrder === "pay-desc") return Number(second.dataset.pay) - Number(first.dataset.pay);
    if (sortOrder === "pay-asc") return Number(first.dataset.pay) - Number(second.dataset.pay);
    return first.dataset.date.localeCompare(second.dataset.date);
  });

  offerCards.forEach((card) => {
    card.hidden = !matchingCards.includes(card);
  });
  matchingCards.forEach((card) => offerList.append(card));
  offerCount.textContent = `${matchingCards.length} ${matchingCards.length === 1 ? "convocatoria disponible" : "convocatorias disponibles"}`;
  emptyMessage.hidden = matchingCards.length > 0;
}

searchInput.addEventListener("input", updateOffers);
sortSelect.addEventListener("change", updateOffers);
categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    categoryButtons.forEach((categoryButton) => {
      const isSelected = categoryButton === button;
      categoryButton.classList.toggle("is-selected", isSelected);
      categoryButton.setAttribute("aria-pressed", String(isSelected));
    });
    updateOffers();
  });
});

window.addEventListener("hashchange", updateView);
detailViews.forEach((detail) => {
  detail.querySelector("[data-apply]").addEventListener("click", () => openApplicationDialog(detail));
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => applicationDialog.close());
});
confirmApplicationButton.addEventListener("click", () => {
  if (!selectedOffer) return;
  try {
    const applications = readApplications();
    if (!applications.some((application) => application.id === selectedOffer.id)) {
      applications.push(selectedOffer);
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
    }
    updateApplyButtons();
    confirmationPanel.hidden = true;
    successPanel.hidden = false;
  } catch (error) {
    applicationError.textContent = "No se pudo guardar tu postulación. Verifica el almacenamiento del navegador e inténtalo de nuevo.";
    applicationError.hidden = false;
    console.error("No fue posible guardar la postulación.", error);
  }
});
updateView();
updateOffers();
try {
  updateApplyButtons();
} catch (error) {
  console.error("No fue posible cargar las postulaciones guardadas.", error);
}
