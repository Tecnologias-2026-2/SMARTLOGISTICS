// Zona de acceso: mostrar contraseña, validación de formularios (RF-02, RF-04,
// RF-05), cuenta regresiva de reenvío y carga de fotografía (RF-03).
// No hay servidor: al validar, el formulario navega a la siguiente vista.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHOTO_KEY = "smart-logistics:foto-perfil";

// ---------- Mostrar / ocultar contraseña ----------
document.querySelectorAll(".input-group__btn").forEach((button) => {
  const input = button.parentElement.querySelector("input");
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    button.textContent = show ? "🙈" : "👁";
  });
});

// ---------- Mensajes de error accesibles ----------
function errorFor(input) {
  const id = `${input.id}-error`;
  let error = document.getElementById(id);
  if (!error) {
    error = document.createElement("p");
    error.className = "field__error";
    error.id = id;
    error.hidden = true;
    input.closest(".field").append(error);
    input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
  }
  return error;
}

function setError(input, message) {
  const error = errorFor(input);
  error.textContent = message || "";
  error.hidden = !message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm(form) {
  const kind = form.dataset.authForm;
  const errors = new Map();
  form.querySelectorAll("input, select").forEach((input) => {
    if (input.required && !input.value.trim()) errors.set(input, "Este campo es obligatorio.");
  });
  form.querySelectorAll('input[type="email"]').forEach((input) => {
    if (!errors.has(input) && input.value.trim() && !EMAIL_PATTERN.test(input.value.trim())) {
      errors.set(input, "Ingresa un correo válido, por ejemplo nombre@correo.com.");
    }
  });
  if (kind === "register") {
    const password = form.querySelector("#password");
    const confirm = form.querySelector("#password2");
    if (!errors.has(password) && password.value.length < 8) {
      errors.set(password, "La contraseña debe tener mínimo 8 caracteres.");
    }
    if (!errors.has(confirm) && confirm.value !== password.value) {
      errors.set(confirm, "Las contraseñas no coinciden.");
    }
    form.querySelectorAll('input[type="tel"]').forEach((input) => {
      if (!errors.has(input) && input.value.replace(/\D/g, "").length < 7) {
        errors.set(input, "Ingresa un número de contacto válido.");
      }
    });
  }
  form.querySelectorAll("input, select").forEach((input) => {
    if (input.id) setError(input, errors.get(input));
  });
  return [...errors.keys()];
}

document.querySelectorAll("form[data-auth-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalid = validateForm(form);
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    window.location.href = form.dataset.next;
  });
  form.addEventListener("input", (event) => {
    if (event.target.getAttribute("aria-invalid") === "true") setError(event.target, "");
  });
});

// ---------- Reenviar correo con cuenta regresiva ----------
const resendButton = document.querySelector("#resend-button");
if (resendButton) {
  const status = document.querySelector("#resend-status");
  const startCountdown = (seconds) => {
    let remaining = seconds;
    resendButton.disabled = true;
    resendButton.textContent = `Reenviar en ${remaining}s`;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        resendButton.disabled = false;
        resendButton.textContent = "Reenviar correo";
        return;
      }
      resendButton.textContent = `Reenviar en ${remaining}s`;
    }, 1000);
  };
  resendButton.addEventListener("click", () => {
    status.textContent = "Te enviamos un nuevo enlace de recuperación.";
    status.hidden = false;
    startCountdown(60);
  });
  startCountdown(Number(resendButton.dataset.countdown) || 41);
}

// ---------- Fotografía de perfil (RF-03) ----------
const photoInput = document.querySelector("#photo-input");
if (photoInput) {
  const photoError = document.querySelector("#photo-error");
  const dropzone = document.querySelector("#photo-dropzone");

  const showPhotoError = (message) => {
    photoError.textContent = message;
    photoError.hidden = false;
  };

  const handleFile = (file) => {
    photoError.hidden = true;
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showPhotoError("Formato no válido: la fotografía debe ser JPG o PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showPhotoError("La fotografía supera el tamaño máximo de 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("load", () => {
        if (image.naturalWidth < 400 || image.naturalHeight < 400) {
          showPhotoError(`Resolución insuficiente (${image.naturalWidth}×${image.naturalHeight} px): el mínimo es 400×400 px.`);
          return;
        }
        try {
          sessionStorage.setItem(PHOTO_KEY, reader.result);
        } catch (error) {
          console.warn("No se pudo conservar la vista previa de la foto.", error);
        }
        window.location.href = "foto-cargada-trabajador.html";
      });
      image.addEventListener("error", () => showPhotoError("No se pudo leer la imagen. Intenta con otro archivo."));
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  };

  document.querySelector("#pick-photo").addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", () => handleFile(photoInput.files[0]));

  ["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, () => dropzone.classList.remove("is-dragging")));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files[0]);
  });
}

// Vista previa en "Fotografía cargada"
const photoPreview = document.querySelector("#photo-preview");
if (photoPreview) {
  try {
    const dataUrl = sessionStorage.getItem(PHOTO_KEY);
    if (dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "";
      photoPreview.replaceChildren(img);
    }
  } catch (error) {
    console.warn("No se pudo cargar la vista previa de la foto.", error);
  }
}
