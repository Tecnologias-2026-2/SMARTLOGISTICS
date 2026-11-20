// Empresa · Candidatos: búsqueda y filtros (RF-19), selección o descarte
// (RF-20), asignación directa con aviso de cruce de horario (RF-21) y perfil
// del candidato. Se abre como candidatos.html?id=<convocatoria>.

const listView = document.querySelector("#candidates-list-view");
const profileView = document.querySelector("#candidate-profile");
const tableBody = document.querySelector("#candidates-body");
const searchInput = document.querySelector("#candidate-search");
const minRatingSelect = document.querySelector("#candidate-min-rating");
const postingSelect = document.querySelector("#posting-select");
const tabs = [...document.querySelectorAll(".candidates-tab")];
const emptyMessage = document.querySelector("#candidates-empty");
const notice = document.querySelector("#candidates-notice");
const dialog = document.querySelector("#candidate-dialog");
const confirmButton = document.querySelector("#dialog-confirm");
const dialogWarning = document.querySelector("#dialog-warning");
const assignDialog = document.querySelector("#assign-dialog");
const assignForm = document.querySelector("#assign-form");
const assignSelect = document.querySelector("#assign-worker");
const assignWarning = document.querySelector("#assign-warning");
const assignError = document.querySelector("#assign-error");
const openAssignButton = document.querySelector("#open-assign");

let ctx = null;
let postings = [];
let posting = null;
let candidates = [];
let activeFilter = "all";
let pendingAction = null;
const profileCache = new Map();

const isOpen = () => posting && SL.estadoConvocatoria(posting).clave === "active";
const findCandidate = (workerId) => candidates.find((candidate) => candidate.id_trabajador === workerId);

// ---------- Avisos ----------
function showNotice(title, text, isError = false) {
  document.querySelector("#candidates-notice-title").textContent = title;
  document.querySelector("#candidates-notice-text").textContent = text;
  document.querySelector("#candidates-notice .notice-banner__icon").textContent = isError ? "!" : "✓";
  notice.hidden = false;
}

// ---------- Datos ----------
async function loadPostings() {
  postings = await Empresa.convocatorias(ctx.empresa.id);
  postings.sort((a, b) => {
    const aOpen = a.fecha >= SL.hoyISO();
    const bOpen = b.fecha >= SL.hoyISO();
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return aOpen ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha);
  });
  postingSelect.replaceChildren(...postings.map((item) =>
    new Option(`${item.titulo} · ${SL.fecha(item.fecha)}`, item.id)));
}

async function loadCandidates() {
  candidates = await sb.from("postulacion")
    .select("*, trabajador(*, perfil(nombres, apellidos, avatar_url))")
    .eq("id_convocatoria", posting.id)
    .order("created_at")
    .then(SL.datos);
  // Recarga las plazas por si cambiaron
  posting = await sb.from("convocatoria").select("*").eq("id", posting.id).single().then(SL.datos);
}

// ---------- Tabla ----------
function renderHeader() {
  const covered = posting.plazas_totales - posting.plazas_disponibles;
  document.querySelector("#posting-name").textContent = posting.titulo;
  document.querySelector("#covered-places").textContent = `${covered}/${posting.plazas_totales}`;
  const state = SL.estadoConvocatoria(posting);
  document.querySelector("#available-places").textContent = state.clave === "active"
    ? `${posting.plazas_disponibles} ${posting.plazas_disponibles === 1 ? "plaza disponible" : "plazas disponibles"}`
    : `Convocatoria ${state.label.toLocaleLowerCase("es")}`;
  document.querySelector("#candidates-table-caption").textContent = `Candidatos postulados a ${posting.titulo}`;
  openAssignButton.disabled = !isOpen();
}

function renderActions(candidate) {
  const state = Empresa.estadoCandidato(candidate);
  const id = candidate.id_trabajador;
  const parts = [`<a class="candidate-action candidate-action--link" href="#candidato-${id}">Ver perfil</a>`];
  if (candidate.estado === "EN_REVISION" && isOpen()) {
    if (candidate.respuesta_trabajador === "PENDIENTE") {
      parts.push('<button class="candidate-action candidate-action--outline" type="button" disabled>Asignación enviada</button>');
    } else {
      parts.push(
        `<button class="candidate-action candidate-action--primary" type="button" data-action="select" data-id="${id}">Seleccionar</button>`,
        `<button class="candidate-action candidate-action--muted" type="button" data-action="discard" data-id="${id}">Descartar</button>`,
        `<button class="candidate-action candidate-action--outline" type="button" data-action="assign" data-id="${id}">Asignar directamente</button>`
      );
    }
  }
  return { state, html: parts.join("") };
}

function renderTable() {
  tableBody.innerHTML = candidates.map((candidate) => {
    const worker = candidate.trabajador;
    const person = worker.perfil;
    const values = SL.indicadores(worker);
    const { state, html } = renderActions(candidate);
    const rating = worker.trabajos_realizados ? Number(worker.calificacion_global) : 0;
    return `
      <tr data-id="${candidate.id_trabajador}" data-status="${state.clave}" data-rating="${rating}">
        <th scope="row">
          <div class="candidate-cell">
            <span class="candidate-avatar candidate-avatar--${SL.colorAvatar(candidate.id_trabajador)}" aria-hidden="true">${SL.escapeHTML(SL.iniciales(person))}</span>
            <span class="candidate-cell__text">
              <strong>${SL.escapeHTML(SL.nombreCompleto(person))}</strong>
              <span>${SL.escapeHTML([worker.cargo, worker.ubicacion].filter(Boolean).join(" · "))}</span>
            </span>
          </div>
        </th>
        <td><span class="rating" aria-label="Calificación ${values.global} de 5"><span class="rating__stars" aria-hidden="true">★★★★★</span> <strong>${values.global}</strong></span></td>
        <td class="candidate-exp">${values.anios} ${values.anios === "1" ? "año" : "años"} · ${values.trabajos} trabajos</td>
        <td><span class="candidate-punctuality">${values.puntualidad}</span></td>
        <td><span class="status-pill status-pill--${state.clave}"><span aria-hidden="true">●</span> ${state.label}</span></td>
        <td><div class="candidate-actions">${html}</div></td>
      </tr>`;
  }).join("");

  const counts = { all: candidates.length, review: 0, selected: 0, discarded: 0 };
  candidates.forEach((candidate) => { counts[Empresa.estadoCandidato(candidate).clave] += 1; });
  document.querySelectorAll("[data-count]").forEach((node) => { node.textContent = counts[node.dataset.count]; });
  applyFilters();
}

function applyFilters() {
  const term = searchInput.value.trim().toLocaleLowerCase("es");
  const minRating = Number(minRatingSelect.value);
  let visible = 0;
  tableBody.querySelectorAll("tr").forEach((row) => {
    const matches =
      (activeFilter === "all" || row.dataset.status === activeFilter) &&
      Number(row.dataset.rating) >= minRating &&
      row.textContent.toLocaleLowerCase("es").includes(term);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  emptyMessage.hidden = visible > 0;
  emptyMessage.textContent = candidates.length
    ? "No hay candidatos que coincidan con la búsqueda o los filtros."
    : "Aún no hay candidatos para esta convocatoria.";
}

async function refresh() {
  await loadCandidates();
  renderHeader();
  renderTable();
}

// ---------- Diálogo de confirmación ----------
const DIALOG_COPY = {
  select: {
    title: "Confirmar selección", confirm: "Confirmar selección", tone: "sl-btn--primary",
    text: (name) => `¿Confirmas la selección de ${name}? Se reducirá una plaza disponible y el trabajador recibirá una notificación.`
  },
  discard: {
    title: "Confirmar descarte", confirm: "Confirmar descarte", tone: "sl-btn--danger",
    text: (name) => `¿Confirmas el descarte de ${name}? El trabajador recibirá una notificación de no selección.`
  },
  assign: {
    title: "Asignación directa", confirm: "Confirmar asignación", tone: "sl-btn--primary",
    text: () => "La asignación quedará como «Pendiente de respuesta» hasta que el trabajador la acepte o la rechace."
  }
};

function fillDialogJob() {
  const job = document.querySelector("#dialog-job");
  job.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = posting.titulo;
  job.append(title);
  [`📅 ${SL.fecha(posting.fecha)}`, `⏱️ ${SL.horario(posting)}`, `📍 ${posting.ubicacion}`, `💰 ${SL.dinero(posting.remuneracion)} COP`]
    .forEach((text) => {
      const line = document.createElement("span");
      line.textContent = text;
      job.append(line);
    });
}

async function scheduleClash(workerId) {
  const { data, error } = await sb.rpc("cruce_horario", { p_convocatoria: posting.id, p_trabajador: workerId });
  if (error) {
    console.warn("No se pudo revisar el cruce de horario.", error);
    return false;
  }
  return data;
}

async function openDialog(action, workerId) {
  const candidate = findCandidate(workerId);
  const person = candidate.trabajador.perfil;
  const copy = DIALOG_COPY[action];
  pendingAction = { action, candidate };
  document.querySelector("#candidate-dialog-title").textContent = copy.title;
  const avatar = document.querySelector("#dialog-avatar");
  avatar.textContent = SL.iniciales(person);
  avatar.className = `candidate-avatar candidate-avatar--lg candidate-avatar--${SL.colorAvatar(workerId)}`;
  document.querySelector("#dialog-name").textContent = SL.nombreCompleto(person);
  document.querySelector("#dialog-role").textContent = candidate.trabajador.cargo;
  document.querySelector("#dialog-rating").textContent = SL.indicadores(candidate.trabajador).global;
  document.querySelector("#dialog-job").hidden = action !== "assign";
  if (action === "assign") fillDialogJob();
  document.querySelector("#dialog-text").textContent = copy.text(SL.nombreCompleto(person));
  confirmButton.textContent = copy.confirm;
  confirmButton.className = `sl-btn ${copy.tone}`;
  dialogWarning.hidden = true;
  dialog.returnValue = "";
  dialog.showModal();

  if (action === "assign" || action === "select") {
    if (await scheduleClash(workerId)) {
      dialogWarning.textContent = "⚠️ Este trabajador ya está seleccionado en otra convocatoria que se cruza con este horario.";
      dialogWarning.hidden = false;
    }
  }
}

async function confirmAction({ action, candidate }) {
  const name = SL.nombreCompleto(candidate.trabajador.perfil);
  let response;
  if (action === "assign") {
    response = await sb.rpc("asignar_directamente", { p_convocatoria: posting.id, p_trabajador: candidate.id_trabajador });
  } else {
    response = await sb.rpc("decidir_postulacion", { p_postulacion: candidate.id, p_seleccionar: action === "select" });
  }
  if (response.error) {
    showNotice("No se pudo completar la acción", SL.mensajeError(response.error), true);
    return;
  }
  if (action === "select") showNotice("Candidato seleccionado", `${name} fue seleccionado y recibirá una notificación.`);
  if (action === "discard") showNotice("Candidato descartado", `${name} recibirá una notificación de no selección.`);
  if (action === "assign") showNotice("Asignación directa enviada", `La asignación fue enviada a ${name}. Está pendiente de su respuesta.`);
  await refresh();
}

dialog.addEventListener("close", () => {
  const action = pendingAction;
  pendingAction = null;
  if (dialog.returnValue === "confirm" && action) {
    confirmAction(action).catch((error) => showNotice("No se pudo completar la acción", SL.mensajeError(error), true));
  }
  const trigger = action && tableBody.querySelector(`tr[data-id="${action.candidate.id_trabajador}"] .candidate-action--link`);
  if (trigger) trigger.focus();
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) openDialog(button.dataset.action, button.dataset.id);
});

// ---------- Asignar a un trabajador que no se postuló (RF-21) ----------
openAssignButton.addEventListener("click", async () => {
  assignError.hidden = true;
  assignWarning.hidden = true;
  assignSelect.replaceChildren(new Option("Cargando trabajadores…", ""));
  assignDialog.showModal();
  try {
    const workers = await sb.from("trabajador")
      .select("id, cargo, calificacion_global, trabajos_realizados, perfil(nombres, apellidos)")
      .order("calificacion_global", { ascending: false })
      .then(SL.datos);
    const taken = new Set(candidates.map((candidate) => candidate.id_trabajador));
    const available = workers.filter((worker) => !taken.has(worker.id));
    assignSelect.replaceChildren(new Option(available.length ? "Selecciona un trabajador" : "No hay más trabajadores disponibles", ""));
    assignSelect.options[0].disabled = true;
    assignSelect.options[0].selected = true;
    available.forEach((worker) => {
      const rating = worker.trabajos_realizados ? ` · ★ ${SL.calificacion(worker.calificacion_global)}` : "";
      assignSelect.append(new Option(`${SL.nombreCompleto(worker.perfil)} · ${worker.cargo}${rating}`, worker.id));
    });
  } catch (error) {
    assignError.textContent = SL.mensajeError(error);
    assignError.hidden = false;
  }
});

assignSelect.addEventListener("change", async () => {
  assignWarning.hidden = true;
  if (assignSelect.value && await scheduleClash(assignSelect.value)) {
    assignWarning.textContent = "⚠️ Este trabajador ya está seleccionado en otra convocatoria que se cruza con este horario.";
    assignWarning.hidden = false;
  }
});

document.querySelectorAll("[data-close-assign]").forEach((button) => {
  button.addEventListener("click", () => assignDialog.close());
});

assignForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!assignSelect.value) {
    assignError.textContent = "Selecciona el trabajador que quieres asignar.";
    assignError.hidden = false;
    return;
  }
  const submit = assignForm.querySelector('[type="submit"]');
  const name = assignSelect.selectedOptions[0].textContent.split(" · ")[0];
  submit.disabled = true;
  const { error } = await sb.rpc("asignar_directamente", { p_convocatoria: posting.id, p_trabajador: assignSelect.value });
  submit.disabled = false;
  if (error) {
    assignError.textContent = SL.mensajeError(error);
    assignError.hidden = false;
    return;
  }
  assignDialog.close();
  showNotice("Asignación directa enviada", `La asignación fue enviada a ${name}. Está pendiente de su respuesta.`);
  await refresh();
});

// ---------- Filtros ----------
searchInput.addEventListener("input", applyFilters);
minRatingSelect.addEventListener("change", applyFilters);
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    tabs.forEach((other) => {
      const isActive = other === tab;
      other.classList.toggle("is-active", isActive);
      other.setAttribute("aria-pressed", String(isActive));
    });
    applyFilters();
  });
});

postingSelect.addEventListener("change", async () => {
  posting = postings.find((item) => String(item.id) === postingSelect.value);
  history.replaceState("", document.title, `${window.location.pathname}?id=${posting.id}`);
  notice.hidden = true;
  await refresh();
});

// ---------- Perfil del candidato (#candidato-<id>) ----------
async function fillProfile(candidate) {
  const worker = candidate.trabajador;
  const person = worker.perfil;
  const values = SL.indicadores(worker);
  const state = Empresa.estadoCandidato(candidate);
  const avatar = document.querySelector("#profile-avatar");
  avatar.className = `profile-card__avatar candidate-avatar--${SL.colorAvatar(candidate.id_trabajador)}`;
  SL.pintarAvatar(avatar, person);
  document.querySelector("#profile-name").textContent = SL.nombreCompleto(person);
  document.querySelector("#profile-role").textContent = worker.cargo;
  document.querySelector("#profile-location").textContent = worker.ubicacion || "Sin ubicación";
  const pill = document.querySelector("#profile-status");
  pill.className = `status-pill status-pill--${state.clave}`;
  pill.innerHTML = `<span aria-hidden="true">●</span> ${state.label}`;

  const stars = '<span class="rating__stars" aria-hidden="true">★★★★★</span>';
  document.querySelector("#profile-ratings").innerHTML = [
    ["Global", values.global], ["Logística", values.logistica], ["Coordinación", values.coordinador]
  ].map(([label, value]) => `<div><dd class="rating">${stars} <strong>${value}</strong></dd><dt>${label}</dt></div>`).join("");
  document.querySelector("#profile-stats").innerHTML = [
    ["Años exp.", values.anios], ["Trabajos", values.trabajos], ["Empresas", values.empresas], ["Puntualidad", values.puntualidad]
  ].map(([label, value]) => `<div><dd>${value}</dd><dt>${label}</dt></div>`).join("");

  const outcome = document.querySelector("#profile-outcome");
  outcome.hidden = state.clave === "review";
  outcome.classList.toggle("profile-outcome--discarded", state.clave === "discarded");
  document.querySelector("#profile-outcome .profile-outcome__icon").textContent = state.clave === "discarded" ? "✕" : "✓";
  document.querySelector("#profile-outcome-title").textContent = state.clave === "discarded" ? `Candidato: ${state.label.toLocaleLowerCase("es")}` : "Candidato seleccionado";
  document.querySelector("#profile-outcome-text").textContent = state.clave === "discarded"
    ? `${SL.nombreCompleto(person)} no fue seleccionado para este trabajo.`
    : `${SL.nombreCompleto(person)} ya está confirmado para este trabajo.`;

  const skillsList = document.querySelector("#profile-skills");
  const historyList = document.querySelector("#profile-history");
  if (!profileCache.has(candidate.id_trabajador)) {
    skillsList.innerHTML = "<li>Cargando…</li>";
    historyList.innerHTML = "";
    const [skills, jobs] = await Promise.all([
      sb.from("trabajador_habilidad").select("orden, habilidad(nombre)").eq("id_trabajador", candidate.id_trabajador).then(SL.datos),
      sb.from("historial_laboral").select("*").eq("id_trabajador", candidate.id_trabajador)
        .order("fecha", { ascending: false }).limit(5).then(SL.datos)
    ]);
    profileCache.set(candidate.id_trabajador, { skills: SL.ordenar(skills).map((row) => row.habilidad.nombre), jobs });
  }
  const { skills, jobs } = profileCache.get(candidate.id_trabajador);
  skillsList.innerHTML = skills.length
    ? skills.map((skill) => `<li>${SL.escapeHTML(skill)}</li>`).join("")
    : "<li>Sin habilidades registradas</li>";
  historyList.innerHTML = jobs.length
    ? jobs.map((job) => {
      const cat = SL.categoria(job.categoria);
      const score = job.calificacion == null ? "—" : SL.calificacion(job.calificacion);
      return `
        <li>
          <span class="profile-history__icon" aria-hidden="true">${cat.icon}</span>
          <span class="profile-history__text"><strong>${SL.escapeHTML(job.evento)}</strong><span>${SL.escapeHTML(job.empresa)} · ${SL.fecha(job.fecha)}</span></span>
          <span class="rating" aria-label="Calificación ${score} de 5">${stars} <strong>${score}</strong></span>
        </li>`;
    }).join("")
    : '<li class="sl-empty">Sin trabajos calificados todavía.</li>';
}

function route() {
  const match = window.location.hash.match(/^#candidato-([0-9a-f-]{36})$/);
  const candidate = match ? findCandidate(match[1]) : null;
  listView.hidden = Boolean(candidate);
  profileView.hidden = !candidate;
  document.querySelector(".dashboard__main").scrollTo(0, 0);
  window.scrollTo(0, 0);
  if (candidate) {
    fillProfile(candidate).catch((error) => console.error("No fue posible cargar el perfil del candidato.", error));
    document.querySelector("#profile-name").focus({ preventScroll: true });
  }
}

profileView.querySelector(".candidate-profile__back").addEventListener("click", (event) => {
  event.preventDefault();
  history.pushState("", document.title, `${window.location.pathname}${window.location.search}`);
  route();
});
window.addEventListener("hashchange", route);

// ---------- Carga inicial ----------
(async () => {
  ctx = await SL.iniciarPanel("EMPRESA");
  try {
    await loadPostings();
    if (!postings.length) {
      document.querySelector("#posting-name").textContent = "Sin convocatorias";
      document.querySelector("#covered-places").textContent = "0/0";
      openAssignButton.disabled = true;
      emptyMessage.hidden = false;
      emptyMessage.innerHTML = 'Aún no publicas convocatorias. <a href="crear-convocatoria.html">Crea la primera</a>.';
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("id");
    posting = postings.find((item) => String(item.id) === requested) || postings[0];
    postingSelect.value = String(posting.id);
    await refresh();
    route();
  } catch (error) {
    console.error("No fue posible cargar los candidatos.", error);
    SL.mostrarErrorGlobal(SL.mensajeError(error));
  }
})();
