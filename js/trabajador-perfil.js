const PROFILE_STORAGE_KEY = "smart-logistics:worker-profile";
const SKILLS_STORAGE_KEY = "smart-logistics:worker-skills";
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
let savedSkills = Array.from(profileSkillList.querySelectorAll("li"), (item) => item.textContent.trim());
let editedSkills = [];
let currentProfile = {
  firstName: "Carlos",
  lastName: "Rodríguez",
  role: "Auxiliar Logístico",
  location: "Bogotá, Colombia",
  phone: "+57 300 123 4567"
};

function getProfileValues() {
  return { ...currentProfile };
}

function applyProfileValues(profile) {
  currentProfile = { ...profile };
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  document.querySelector("#profile-full-name").textContent = fullName;
  document.querySelector("#sidebar-profile-name").textContent = fullName;
  document.querySelector("#profile-role").textContent = profile.role;
  document.querySelector("#sidebar-profile-role").textContent = profile.role;
  document.querySelector("#profile-location").textContent = profile.location;
  document.querySelector("#profile-phone").textContent = profile.phone;
  document.querySelector("#contact-location").textContent = profile.location;
  document.querySelector("#contact-role").textContent = profile.role;
  document.querySelector(".profile-avatar").textContent = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toLocaleUpperCase("es");
}

function loadSavedProfile() {
  const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!storedProfile) return;
  const profile = JSON.parse(storedProfile);
  if (!profile || Object.keys(profileFields).some((key) => typeof profile[key] !== "string")) {
    throw new Error("El perfil guardado no tiene un formato válido.");
  }
  currentProfile = profile;
  applyProfileValues(profile);
}

function renderSkills(list, skills, removable) {
  list.replaceChildren();
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

function loadSavedSkills() {
  const storedSkills = localStorage.getItem(SKILLS_STORAGE_KEY);
  if (!storedSkills) return;
  const skills = JSON.parse(storedSkills);
  if (!Array.isArray(skills) || skills.some((skill) => typeof skill !== "string" || !skill.trim())) {
    throw new Error("La lista de habilidades guardada no tiene un formato válido.");
  }
  savedSkills = skills.map((skill) => skill.trim());
  renderSkills(profileSkillList, savedSkills, false);
}

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
  if (editedSkills.some((existingSkill) => existingSkill.toLocaleLowerCase("es") === skill.toLocaleLowerCase("es"))) {
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

document.querySelector("#open-reputation-details").addEventListener("click", () => {
  reputationDetailsDialog.showModal();
});
document.querySelector("#close-reputation-details").addEventListener("click", () => {
  reputationDetailsDialog.close();
});

document.querySelector("#save-skills").addEventListener("click", () => {
  try {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(editedSkills));
    savedSkills = [...editedSkills];
    renderSkills(profileSkillList, savedSkills, false);
    skillsEditorDialog.close();
  } catch (error) {
    skillsEditorError.textContent = "No se pudieron guardar las habilidades. Verifica el almacenamiento del navegador e inténtalo de nuevo.";
    skillsEditorError.hidden = false;
    console.error("No fue posible guardar las habilidades.", error);
  }
});

document.querySelector("#open-profile-editor").addEventListener("click", () => {
  try {
    const currentProfile = getProfileValues();
    Object.entries(profileFields).forEach(([key, input]) => {
      input.value = currentProfile[key];
    });
    profileEditorError.hidden = true;
    profileEditorDialog.showModal();
    profileFields.firstName.focus();
  } catch (error) {
    profileEditorError.textContent = "No se pudo abrir el editor de perfil.";
    profileEditorError.hidden = false;
    console.error("No fue posible preparar la edición del perfil.", error);
  }
});

[document.querySelector("#close-profile-editor"), document.querySelector("#cancel-profile-edit")].forEach((button) => {
  button.addEventListener("click", () => profileEditorDialog.close());
});

profileEditorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!profileEditorForm.reportValidity()) return;

  const updatedProfile = Object.fromEntries(
    Object.entries(profileFields).map(([key, input]) => [key, input.value.trim()])
  );
  if (Object.values(updatedProfile).some((value) => !value)) return;

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    applyProfileValues(updatedProfile);
    profileEditorDialog.close();
  } catch (error) {
    profileEditorError.textContent = "No se pudieron guardar los cambios. Verifica el almacenamiento del navegador e inténtalo de nuevo.";
    profileEditorError.hidden = false;
    console.error("No fue posible guardar los cambios del perfil.", error);
  }
});

try {
  loadSavedProfile();
} catch (error) {
  console.error("No fue posible cargar el perfil guardado.", error);
}
try {
  loadSavedSkills();
} catch (error) {
  console.error("No fue posible cargar las habilidades guardadas.", error);
}
