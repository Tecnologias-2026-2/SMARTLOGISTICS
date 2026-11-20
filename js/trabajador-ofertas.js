// Trabajador · Ofertas: consulta y filtrado (RF-15), detalle (RF-16) y
// postulación a una convocatoria activa con plazas (RF-17).

const searchInput = document.querySelector("#offer-search");
const sortSelect = document.querySelector("#offer-sort");
const categoryButtons = [...document.querySelectorAll(".category-filter")];
const offerList = document.querySelector("#offer-list");
const offerCount = document.querySelector("#offer-count");
const emptyMessage = document.querySelector("#offers-empty");
const listView = document.querySelector("#offers-list-view");
const detailView = document.querySelector("#offer-detail");
const applyButton = document.querySelector("#apply-button");
const applicationDialog = document.querySelector("#application-dialog");
const confirmationPanel = document.querySelector("#application-confirmation");
const successPanel = document.querySelector("#application-success");
const applicationError = document.querySelector("#application-error");
const confirmApplicationButton = document.querySelector("#confirm-application");

let offers = [];
let appliedIds = new Set();
let selectedOffer = null;
let activeCategory = "all";

const byId = (id) => offers.find((offer) => String(offer.id) === String(id));

// ---------- Listado ----------
function renderCards() {
  offerList.innerHTML = offers.map((offer) => {
    const cat = SL.categoria(offer.categoria);
    const company = offer.empresa;
    return `
      <article class="offer-card listing-card" data-id="${offer.id}" data-category="${cat.filtro}" data-date="${offer.fecha}" data-pay="${offer.remuneracion}">
        <span class="offer-card__icon" aria-hidden="true">${cat.icon}</span>
        <div class="offer-card__details">
          <div class="offer-card__title-row">
            <h2>${SL.escapeHTML(offer.titulo)}</h2>
            <span class="offer-tag offer-tag--${cat.color}">${cat.label}</span>
          </div>
          <p class="offer-card__company">${SL.escapeHTML(company.razon_social)}${company.verificada ? ' <span class="verified">✓ Verificada</span>' : ""} <span class="offer-rating">★ ${SL.calificacion(company.valoracion)}</span></p>
          <div class="offer-card__meta">
            <span>📍 ${SL.escapeHTML(offer.ubicacion)}</span><span>🗓️ ${SL.fecha(offer.fecha)}</span><span>◷ ${SL.horario(offer)}</span>
          </div>
          <div class="listing-card__pay-row">
            <strong class="offer-card__pay">${SL.dinero(offer.remuneracion)} COP</strong><span class="places-pill">${offer.plazas_disponibles}/${offer.plazas_totales} plazas</span>
          </div>
          <a class="offer-detail-link" href="#oferta-${offer.id}">${appliedIds.has(offer.id) ? "Ya postulaste · Ver detalle" : "Ver detalle"} <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
  }).join("");
}

function updateOffers() {
  const cards = [...offerList.querySelectorAll(".listing-card")];
  const searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
  const sortOrder = sortSelect.value;
  const matching = cards.filter((card) => {
    const matchesCategory = activeCategory === "all" || card.dataset.category === activeCategory;
    const matchesSearch = card.textContent.toLocaleLowerCase("es").includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  matching.sort((first, second) => {
    if (sortOrder === "pay-desc") return Number(second.dataset.pay) - Number(first.dataset.pay);
    if (sortOrder === "pay-asc") return Number(first.dataset.pay) - Number(second.dataset.pay);
    return first.dataset.date.localeCompare(second.dataset.date);
  });

  cards.forEach((card) => { card.hidden = !matching.includes(card); });
  matching.forEach((card) => offerList.append(card));
  offerCount.textContent = `${matching.length} ${matching.length === 1 ? "convocatoria disponible" : "convocatorias disponibles"}`;
  emptyMessage.hidden = matching.length > 0;
  emptyMessage.textContent = offers.length
    ? "No encontramos ofertas que coincidan con tu búsqueda."
    : "Por ahora no hay convocatorias activas. ¡Vuelve pronto!";
}

// ---------- Detalle ----------
function fillDetail(offer) {
  const cat = SL.categoria(offer.categoria);
  const company = offer.empresa;
  const rating = SL.calificacion(company.valoracion);
  const text = (id, value) => { document.querySelector(id).textContent = value; };

  text("#detail-icon", cat.icon);
  text("#job-title", offer.titulo);
  const tag = document.querySelector("#detail-tag");
  tag.textContent = cat.label;
  tag.className = `offer-tag offer-tag--${cat.color}`;
  text("#detail-company", company.razon_social);
  document.querySelector("#detail-verified").hidden = !company.verificada;
  document.querySelector("#detail-rating-row").setAttribute("aria-label", `Calificación de empresa: ${rating} de 5`);
  text("#detail-rating", rating);

  text("#fact-pay", `💰 ${SL.dinero(offer.remuneracion)} COP`);
  text("#fact-location", `📍 ${offer.ubicacion}`);
  text("#fact-date", `🗓️ ${SL.fecha(offer.fecha)}`);
  text("#fact-hours", `⏱️ ${SL.horario(offer)}`);
  text("#fact-total", `👥 ${offer.plazas_totales} trabajadores`);
  text("#fact-available", `✅ ${offer.plazas_disponibles} disponibles`);

  text("#detail-description", offer.descripcion);
  const requirements = SL.ordenar(offer.requisito);
  document.querySelector("#detail-requirements").innerHTML = requirements.length
    ? requirements.map((item) => `<li>${SL.escapeHTML(item.descripcion)}</li>`).join("")
    : "<li>Sin requisitos adicionales.</li>";

  text("#panel-company", company.razon_social);
  text("#panel-rating", rating);
  document.querySelector("#panel-verified").hidden = !company.verificada;
  text("#panel-candidates", `${offer.candidatos} ${offer.candidatos === 1 ? "candidato postulado" : "candidatos postulados"} · ${offer.plazas_disponibles} plazas disponibles`);

  text("#bar-pay", `${SL.dinero(offer.remuneracion)} COP`);
  text("#bar-when", `${SL.fecha(offer.fecha)} · ${SL.horario(offer)}`);
  updateApplyButton(offer);
}

function updateApplyButton(offer) {
  const applied = appliedIds.has(offer.id);
  applyButton.disabled = applied || offer.plazas_disponibles === 0;
  applyButton.textContent = applied ? "Ya postulaste" : offer.plazas_disponibles === 0 ? "Sin plazas" : "Postularme";
}

function updateView() {
  const match = window.location.hash.match(/^#oferta-(\d+)$/);
  const offer = match ? byId(match[1]) : null;
  listView.hidden = Boolean(offer);
  detailView.hidden = !offer;
  if (offer) {
    selectedOffer = offer;
    fillDetail(offer);
    document.querySelector("#job-title").focus({ preventScroll: true });
    document.querySelector(".dashboard__main").scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
}

// ---------- Postulación ----------
function openApplicationDialog() {
  if (!selectedOffer || appliedIds.has(selectedOffer.id)) return;
  document.querySelector("#application-company").textContent = selectedOffer.empresa.razon_social;
  document.querySelector("#application-offer-title").textContent = selectedOffer.titulo;
  const details = document.querySelector("#application-details");
  details.replaceChildren();
  [
    ["Remuneración", `${SL.dinero(selectedOffer.remuneracion)} COP`],
    ["Ubicación", selectedOffer.ubicacion],
    ["Fecha", SL.fecha(selectedOffer.fecha)],
    ["Horario", SL.horario(selectedOffer)]
  ].forEach(([label, value]) => {
    const row = document.createElement("p");
    const name = document.createElement("strong");
    name.textContent = label;
    row.append(name, document.createTextNode(value));
    details.append(row);
  });
  applicationError.hidden = true;
  confirmationPanel.hidden = false;
  successPanel.hidden = true;
  confirmApplicationButton.disabled = false;
  applicationDialog.showModal();
}

confirmApplicationButton.addEventListener("click", async () => {
  if (!selectedOffer) return;
  confirmApplicationButton.disabled = true;
  applicationError.hidden = true;
  const { error } = await sb.rpc("postularse", { p_convocatoria: selectedOffer.id });
  if (error) {
    applicationError.textContent = SL.mensajeError(error);
    applicationError.hidden = false;
    confirmApplicationButton.disabled = false;
    return;
  }
  appliedIds.add(selectedOffer.id);
  selectedOffer.candidatos += 1;
  fillDetail(selectedOffer);
  renderCards();
  updateOffers();
  confirmationPanel.hidden = true;
  successPanel.hidden = false;
});

applyButton.addEventListener("click", openApplicationDialog);
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => applicationDialog.close());
});

// ---------- Filtros ----------
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

// ---------- Carga inicial ----------
(async () => {
  const ctx = await SL.iniciarPanel("TRABAJADOR");
  try {
    const [loadedOffers, mine] = await Promise.all([
      sb.from("convocatoria")
        .select("*, empresa(razon_social, verificada, valoracion), requisito(descripcion, orden)")
        .eq("estado", "ACTIVA")
        .gte("fecha", SL.hoyISO())
        .order("fecha")
        .then(SL.datos),
      sb.from("postulacion").select("id_convocatoria").eq("id_trabajador", ctx.uid).then(SL.datos)
    ]);
    offers = loadedOffers;
    appliedIds = new Set(mine.map((application) => application.id_convocatoria));
    renderCards();
    updateOffers();
    updateView();
  } catch (error) {
    console.error("No fue posible cargar las ofertas.", error);
    offerCount.textContent = SL.mensajeError(error);
  }
})();
