// Trabajador · Mi perfil: consulta (RF-08), edición de datos y habilidades
// (RF-09), reputación por rol (RF-24) y experiencia reciente.

const profileEditorDialog = document.querySelector("#profile-editor-dialog");
const profileEditorForm = document.querySelector("#profile-editor-form");
const profileEditorError = document.querySelector("#profile-editor-error");
const profileFields = {
  firstName: document.querySelector("#edit-first-name"),
  lastName: document.querySelector("#edit-last-name"),
  role: document.querySelector("#edit-role"),
  location: document.querySelector("#edit-location"),
  phone: document.querySelector("#edit-phone")
};
const skillsEditorDialog = document.querySelector("#skills-editor-dialog");
const skillsEditorList = document.querySelector("#skills-editor-list");
const skillsEditorError = document.querySelector("#skills-editor-error");
const newSkillInput = document.querySelector("#new-skill");
const profileSkillList = document.querySelector("#profile-skill-list");
const reputationDetailsDialog = document.querySelector("#reputation-details-dialog");

let ctx = null;
let contact = {};
let savedSkills = [];
let editedSkills = [];

// ---------- Pintar el perfil ----------
function renderProfile() {
  const { perfil, trabajador } = ctx;
  const values = SL.indicadores(trabajador);
  document.querySelector("#profile-full-name").textContent = SL.nombreCompleto(perfil);
  SL.pintarAvatar(document.querySelector("#profile-avatar"), perfil);
  SL.llenarCampos({
    ...values,
    cargo: trabajador.cargo,
    ubicacion: trabajador.ubicacion || "Sin ubicación",
    email: contact.email || ctx.user.email,
    celular: contact.celular || "Sin número"
  });
  document.querySelector("#reputation-score-badge").setAttribute("aria-label", `${values.global} de 5`);

  // Barras de indicadores (escala relativa para el diseño)
  const bars = {
    puntualidad: Number(trabajador.puntualidad_pct) || 0,
    trabajos: Math.min(100, (trabajador.trabajos_realizados || 0)),
    empresas: Math.min(100, (trabajador.empresas_colaboradoras || 0) * 3),
    anios: Math.min(100, (trabajador.anios_experiencia || 0) * 10)
  };
  document.querySelectorAll("[data-barra]").forEach((bar) => {
    bar.style.width = `${bars[bar.dataset.barra]}%`;
  });

  // Nombre y cargo también en el menú lateral
  const identity = document.querySelector(".sidebar__identity");
  if (identity) {
    identity.children[0].textContent = SL.nombreCompleto(perfil);
    identity.children[1].textContent = trabajador.cargo;
  }
}

function renderSkills(list, skills, removable) {
  list.replaceChildren();
  if (!skills.length && !removable) {
    const empty = document.createElement("li");
    empty.textContent = "Aún no agregas habilidades.";
    list.append(empty);
    return;
  }
  skills.forEach((skill, index) => {
    const item = document.createElement("li");
    item.textContent = skill;
    if (removable) {
      const removeButton = document.createElement("button");
      removeButton.className = "skills-editor__remove";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", `Quitar ${skill}`);
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        editedSkills.splice(index, 1);
        renderSkills(skillsEditorList, editedSkills, true);
      });
      item.append(removeButton);
    }
    list.append(item);
  });
}

function renderRecentJobs(jobs) {
  const list = document.querySelector("#recent-job-list");
  if (!jobs.length) {
    list.innerHTML = '<li class="sl-empty">Tu experiencia aparecerá aquí cuando una empresa califique tu servicio.</li>';
    return;
  }
  list.innerHTML = jobs.map((job) => {
    const cat = SL.categoria(job.categoria);
    const rating = job.calificacion == null ? "—" : SL.calificacion(job.calificacion);
    return `
      <li>
        <span class="recent-job__icon" aria-hidden="true">${cat.icon}</span>
        <div><strong>${SL.escapeHTML(job.evento)}</strong><span>${SL.escapeHTML(job.empresa)} · ${SL.fecha(job.fecha)}</span></div>
        <span class="recent-job__rating" aria-label="Calificación ${rating} de 5"><span aria-hidden="true">★★★★★</span> <span class="recent-job__rating-value">${rating}</span></span>
      </li>`;
  }).join("");
}

// ---------- Editar habilidades ----------
document.querySelector("#open-skills-editor").addEventListener("click", () => {
  editedSkills = [...savedSkills];
  renderSkills(skillsEditorList, editedSkills, true);
  skillsEditorError.hidden = true;
  newSkillInput.value = "";
  skillsEditorDialog.showModal();
  newSkillInput.focus();
});

document.querySelector("#skills-add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const skill = newSkillInput.value.trim();
  if (!skill) {
    newSkillInput.focus();
    return;
  }
  if (editedSkills.some((existing) => existing.toLocaleLowerCase("es") === skill.toLocaleLowerCase("es"))) {
    skillsEditorError.textContent = "Esa habilidad ya está en la lista.";
    skillsEditorError.hidden = false;
    newSkillInput.focus();
    return;
  }
  editedSkills.push(skill);
  renderSkills(skillsEditorList, editedSkills, true);
  skillsEditorError.hidden = true;
  newSkillInput.value = "";
  newSkillInput.focus();
});

[document.querySelector("#close-skills-editor"), document.querySelector("#cancel-skills-edit")].forEach((button) => {
  button.addEventListener("click", () => skillsEditorDialog.close());
});

document.querySelector("#save-skills").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  const { error } = await sb.rpc("guardar_habilidades", { p_habilidades: editedSkills });
  button.disabled = false;
  if (error) {
    skillsEditorError.textContent = SL.mensajeError(error);
    skillsEditorError.hidden = false;
    return;
  }
  savedSkills = [...editedSkills];
  renderSkills(profileSkillList, savedSkills, false);
  skillsEditorDialog.close();
});

// ---------- Detalle de reputación ----------
document.querySelector("#open-reputation-details").addEventListener("click", () => reputationDetailsDialog.showModal());
document.querySelector("#close-reputation-details").addEventListener("click", () => reputationDetailsDialog.close());

// ---------- Editar perfil ----------
document.querySelector("#open-profile-editor").addEventListener("click", () => {
  profileFields.firstName.value = ctx.perfil.nombres;
  profileFields.lastName.value = ctx.perfil.apellidos;
  profileFields.role.value = ctx.trabajador.cargo;
  profileFields.location.value = ctx.trabajador.ubicacion || "";
  profileFields.phone.value = contact.celular || "";
  profileEditorError.hidden = true;
  profileEditorDialog.showModal();
  profileFields.firstName.focus();
});

[document.querySelector("#close-profile-editor"), document.querySelector("#cancel-profile-edit")].forEach((button) => {
  button.addEventListener("click", () => profileEditorDialog.close());
});

profileEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!profileEditorForm.reportValidity()) return;
  const values = Object.fromEntries(Object.entries(profileFields).map(([key, input]) => [key, input.value.trim()]));
  if (Object.values(values).some((value) => !value)) return;

  const submit = profileEditorForm.querySelector('[type="submit"]');
  submit.disabled = true;
  const { error } = await sb.rpc("actualizar_perfil_trabajador", {
    p_nombres: values.firstName,
    p_apellidos: values.lastName,
    p_cargo: values.role,
    p_ubicacion: values.location,
    p_celular: values.phone
  });
  submit.disabled = false;
  if (error) {
    profileEditorError.textContent = SL.mensajeError(error);
    profileEditorError.hidden = false;
    return;
  }
  ctx.perfil.nombres = values.firstName;
  ctx.perfil.apellidos = values.lastName;
  ctx.trabajador.cargo = values.role;
  ctx.trabajador.ubicacion = values.location;
  contact.celular = values.phone;
  renderProfile();
  profileEditorDialog.close();
});

// ---------- Carga inicial ----------
(async () => {
  ctx = await SL.iniciarPanel("TRABAJADOR");
  try {
    const [contactRow, skills, jobs] = await Promise.all([
      sb.from("contacto").select("*").eq("id", ctx.uid).maybeSingle().then(SL.datos),
      sb.from("trabajador_habilidad").select("orden, habilidad(nombre)").eq("id_trabajador", ctx.uid).then(SL.datos),
      sb.from("historial_laboral").select("*").eq("id_trabajador", ctx.uid)
        .order("fecha", { ascending: false }).limit(3).then(SL.datos)
    ]);
    contact = contactRow || {};
    savedSkills = SL.ordenar(skills).map((row) => row.habilidad.nombre);
    renderProfile();
    renderSkills(profileSkillList, savedSkills, false);
    renderRecentJobs(jobs);
  } catch (error) {
    console.error("No fue posible cargar el perfil.", error);
    SL.mostrarErrorGlobal(SL.mensajeError(error));
  }
})();
