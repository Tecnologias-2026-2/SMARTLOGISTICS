// Empresa · Convocatorias: gestión de las convocatorias publicadas (RF-14) y
// calificación post-servicio de los trabajadores seleccionados (RF-23).

const body = document.querySelector("#postings-body");
const notice = document.querySelector("#postings-notice");
const ratingDialog = document.querySelector("#rating-dialog");
const ratingForm = document.querySelector("#rating-form");
const workerSelect = document.querySelector("#rating-worker");
const ratingError = document.querySelector("#rating-error");
const ratingSubtitle = document.querySelector("#rating-subtitle");

let ctx = null;
let postings = [];
let ratingPosting = null;
let ratingCandidates = [];

function showNotice(title, text) {
  document.querySelector("#postings-notice-title").textContent = title;
  document.querySelector("#postings-notice-text").textContent = text;
  notice.hidden = false;
  notice.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// Una convocatoria se califica cuando ya se prestó el servicio y tiene seleccionados
const canRate = (posting) => posting.fecha <= SL.hoyISO() && posting.plazas_totales - posting.plazas_disponibles > 0;

function renderRows() {
  body.innerHTML = postings.map((posting) => {
    const cat = SL.categoria(posting.categoria);
    const state = SL.estadoConvocatoria(posting);
    const covered = posting.plazas_totales - posting.plazas_disponibles;
    const percent = Math.min(100, (covered / posting.plazas_totales) * 100);
    const actions = [`<a href="candidatos.html?id=${posting.id}" class="action-btn action-btn--primary">Candidatos</a>`];
    if (state.clave !== "finished") {
      actions.push(`<a href="editar-convocatoria.html?id=${posting.id}" class="action-btn action-btn--edit">Editar</a>`);
    }
    if (canRate(posting)) {
      actions.push(`<button type="button" class="action-btn action-btn--rate" data-rate="${posting.id}">Calificar</button>`);
    }
    return `
      <tr data-id="${posting.id}">
        <td class="company-event-name">
          <span class="company-icon${posting.categoria === "EVENTO" ? " company-icon--event" : ""}" aria-hidden="true">${cat.icon}</span>
          <div>
            <strong>${SL.escapeHTML(posting.titulo)}</strong>
            <small>${SL.escapeHTML(posting.ubicacion)}</small>
          </div>
        </td>
        <td><span class="company-tag company-tag--soft-${cat.color}">${cat.label}</span></td>
        <td class="company-date">${SL.fecha(posting.fecha)}</td>
        <td>
          <div class="company-vacancies"><strong>${covered}</strong><span>/${posting.plazas_totales}</span></div>
          <div class="scale" aria-label="${covered} de ${posting.plazas_totales} plazas cubiertas"><span style="width: ${percent}%;"></span></div>
        </td>
        <td><a class="company-count" href="candidatos.html?id=${posting.id}"><span aria-hidden="true">👥</span>${posting.candidatos}</a></td>
        <td><span class="status-pill status-pill--${state.clave}"><span aria-hidden="true">•</span> ${state.label}</span></td>
        <td class="company-actions">${actions.join("")}</td>
      </tr>`;
  }).join("");
  document.querySelector("#postings-count").textContent =
    `${postings.length} ${postings.length === 1 ? "convocatoria publicada" : "convocatorias publicadas"}`;
  document.querySelector("#postings-empty").hidden = postings.length > 0;
}

// ---------- Calificación post-servicio (RF-23) ----------
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

async function loadRatingCandidates(posting) {
  ratingCandidates = await sb.from("postulacion")
    .select("id, id_trabajador, trabajador(perfil(nombres, apellidos)), calificacion(id)")
    .eq("id_convocatoria", posting.id)
    .eq("estado", "SELECCIONADO")
    .order("created_at")
    .then(SL.datos);
  workerSelect.replaceChildren(new Option("Selecciona un trabajador", "", true, true));
  workerSelect.options[0].disabled = true;
  let pending = 0;
  ratingCandidates.forEach((application) => {
    const rated = Array.isArray(application.calificacion) ? application.calificacion.length > 0 : Boolean(application.calificacion);
    const name = SL.nombreCompleto(application.trabajador.perfil);
    const option = new Option(rated ? `${name} (ya calificado)` : name, application.id);
    option.disabled = rated;
    if (!rated) pending += 1;
    workerSelect.append(option);
  });
  return pending;
}

body.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-rate]");
  if (!button) return;
  ratingPosting = postings.find((posting) => String(posting.id) === button.dataset.rate);
  button.disabled = true;
  try {
    const pending = await loadRatingCandidates(ratingPosting);
    if (!pending) {
      showNotice("Servicio calificado", "Ya calificaste a todos los trabajadores seleccionados en esta convocatoria.");
      return;
    }
    ratingForm.reset();
    ratingError.hidden = true;
    ratingSubtitle.textContent = `${ratingPosting.titulo} · ${SL.fecha(ratingPosting.fecha)}`;
    ratingDialog.showModal();
  } catch (error) {
    showNotice("No se pudo abrir la calificación", SL.mensajeError(error));
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-close-rating]").forEach((button) => {
  button.addEventListener("click", () => ratingDialog.close());
});

ratingForm.addEventListener("submit", async (event) => {
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

  const submit = ratingForm.querySelector('[type="submit"]');
  submit.disabled = true;
  const workerName = workerSelect.selectedOptions[0].textContent;
  const { data: score, error } = await sb.rpc("calificar", {
    p_postulacion: Number(workerSelect.value),
    p_rol: data.get("role") === "coordinador" ? "COORDINADOR" : "LOGISTICA",
    p_puntualidad: Number(data.get("puntualidad")),
    p_eficiencia: Number(data.get("eficiencia")),
    p_actitud: Number(data.get("actitud")),
    p_comentario: document.querySelector("#rating-comment").value.trim() || null
  });
  submit.disabled = false;
  if (error) {
    ratingError.textContent = SL.mensajeError(error);
    ratingError.hidden = false;
    return;
  }
  ratingDialog.close();
  showNotice("Calificación registrada", `${workerName} recibió un puntaje de ${SL.calificacion(score)} y su reputación se actualizó.`);
});

// ---------- Carga inicial ----------
(async () => {
  ctx = await SL.iniciarPanel("EMPRESA");
  try {
    postings = await Empresa.convocatorias(ctx.empresa.id);
    renderRows();
    const params = new URLSearchParams(window.location.search);
    if (params.get("publicada")) {
      showNotice("Convocatoria publicada", "Los trabajadores ya pueden verla y postularse.");
    } else if (params.get("editada")) {
      showNotice("Cambios guardados", "La convocatoria se actualizó correctamente.");
    }
  } catch (error) {
    console.error("No fue posible cargar las convocatorias.", error);
    document.querySelector("#postings-count").textContent = SL.mensajeError(error);
  }
})();
