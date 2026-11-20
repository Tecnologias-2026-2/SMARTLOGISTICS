// Zona de acceso conectada a Supabase Auth: inicio de sesión (RF-04),
// registro (RF-02), recuperación de contraseña (RF-05), fotografía de
// perfil (RF-03) y validación de formularios.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RECOVERY_EMAIL_KEY = "smart-logistics:correo-recuperacion";
const MODO = /-empresa\.html$/.test(window.location.pathname) ? "EMPRESA" : "TRABAJADOR";
const LOGIN_PAGE = MODO === "EMPRESA" ? "login-empresa.html" : "login-trabajador.html";

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

// Mensaje general del formulario (errores del servidor o confirmaciones)
function setFormStatus(form, message, ok = false) {
  let status = form.querySelector(".form__status");
  if (!status) {
    status = document.createElement("p");
    status.className = "form__status";
    status.setAttribute("role", "alert");
    form.querySelector('[type="submit"]').before(status);
  }
  status.textContent = message || "";
  status.classList.toggle("form__status--ok", ok);
  status.hidden = !message;
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
  if (kind === "register" || kind === "new-password") {
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

// ---------- Acciones de cada formulario ----------
const ACTIONS = {
  // RF-04 · Inicio de sesión con acceso diferenciado por modo
  async login(form) {
    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const table = MODO === "EMPRESA" ? "coordinador" : "trabajador";
    const { data: row, error: rowError } = await sb.from(table).select("id").eq("id", data.user.id).maybeSingle();
    if (rowError) throw rowError;
    if (!row) {
      await sb.auth.signOut();
      throw new Error(MODO === "EMPRESA"
        ? "Esta cuenta no es de empresa. Inicia sesión como trabajador."
        : "Esta cuenta es de empresa. Inicia sesión como empresa.");
    }
    window.location.href = form.dataset.next;
  },

  // RF-02 · Registro de trabajador o de empresa
  async register(form) {
    const values = Object.fromEntries(new FormData(form));
    const { email, password, password2, ...profile } = values;
    Object.keys(profile).forEach((key) => { profile[key] = String(profile[key]).trim(); });
    profile.tipo = MODO;

    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: profile,
        emailRedirectTo: new URL(LOGIN_PAGE, window.location.href).href
      }
    });
    if (error) throw error;
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error("Ya existe una cuenta con este correo. Inicia sesión.");
    }
    if (!data.session) {
      setFormStatus(form, "¡Cuenta creada! Te enviamos un correo para confirmarla. Ábrelo y luego inicia sesión.", true);
      return { keepDisabled: true };
    }
    window.location.href = form.dataset.next;
  },

  // RF-05 · Enlace de recuperación de contraseña
  async recover(form) {
    const email = form.querySelector("#email").value.trim();
    await sendRecoveryEmail(email);
    try {
      sessionStorage.setItem(RECOVERY_EMAIL_KEY, email);
    } catch (error) {
      console.warn("No se pudo recordar el correo de recuperación.", error);
    }
    window.location.href = form.dataset.next;
  },

  // RF-05 · Nueva contraseña desde el enlace del correo
  async "new-password"(form) {
    const password = form.querySelector("#password").value;
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    await sb.auth.signOut();
    const mode = new URLSearchParams(window.location.search).get("modo") === "empresa" ? "empresa" : "trabajador";
    setFormStatus(form, "Tu contraseña se actualizó. Te llevamos al inicio de sesión…", true);
    setTimeout(() => { window.location.href = `login-${mode}.html`; }, 1800);
    return { keepDisabled: true };
  }
};

function sendRecoveryEmail(email) {
  const mode = MODO === "EMPRESA" ? "empresa" : "trabajador";
  const redirectTo = new URL(`nueva-contrasena.html?modo=${mode}`, window.location.href).href;
  return sb.auth.resetPasswordForEmail(email, { redirectTo }).then(({ error }) => {
    if (error) throw error;
  });
}

document.querySelectorAll("form[data-auth-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const invalid = validateForm(form);
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    setFormStatus(form, "");
    submit.disabled = true;
    try {
      const result = await ACTIONS[form.dataset.authForm](form);
      if (!result || !result.keepDisabled) submit.disabled = false;
    } catch (error) {
      console.error(error);
      setFormStatus(form, SL.mensajeError(error));
      submit.disabled = false;
    }
  });
  form.addEventListener("input", (event) => {
    if (event.target.getAttribute("aria-invalid") === "true") setError(event.target, "");
  });
});

// La página de nueva contraseña solo sirve si se llegó desde el enlace del correo
const newPasswordForm = document.querySelector('form[data-auth-form="new-password"]');
if (newPasswordForm) {
  sb.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      setFormStatus(newPasswordForm, "El enlace no es válido o ya expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».");
      newPasswordForm.querySelector('[type="submit"]').disabled = true;
    }
  });
}

// ---------- Correo enviado: muestra el correo enmascarado ----------
function readRecoveryEmail() {
  try {
    return sessionStorage.getItem(RECOVERY_EMAIL_KEY) || "";
  } catch (error) {
    return "";
  }
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 3)}*****@${domain}`;
}

const sentEmail = document.querySelector(".auth-head__text strong");
if (sentEmail && document.querySelector(".info-box")) {
  const email = readRecoveryEmail();
  sentEmail.textContent = email ? maskEmail(email) : "tu correo";
}

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
  resendButton.addEventListener("click", async () => {
    const email = readRecoveryEmail();
    status.hidden = false;
    if (!email) {
      status.textContent = "Vuelve a «¿Olvidaste tu contraseña?» e ingresa tu correo de nuevo.";
      return;
    }
    resendButton.disabled = true;
    try {
      await sendRecoveryEmail(email);
      status.textContent = "Te enviamos un nuevo enlace de recuperación.";
      startCountdown(60);
    } catch (error) {
      status.textContent = SL.mensajeError(error);
      resendButton.disabled = false;
    }
  });
  startCountdown(Number(resendButton.dataset.countdown) || 41);
}

// ---------- Fotografía de perfil (RF-03) ----------
const photoInput = document.querySelector("#photo-input");
if (photoInput) {
  const photoError = document.querySelector("#photo-error");
  const dropzone = document.querySelector("#photo-dropzone");
  const pickButton = document.querySelector("#pick-photo");

  const showPhotoError = (message) => {
    photoError.textContent = message;
    photoError.hidden = false;
  };

  const readImage = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    });
    image.addEventListener("error", () => {
      reject(new Error("No se pudo leer la imagen. Intenta con otro archivo."));
      URL.revokeObjectURL(url);
    });
    image.src = url;
  });

  const uploadPhoto = async (file) => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error("Tu sesión expiró. Inicia sesión para cargar tu fotografía.");
    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${session.user.id}/avatar.${extension}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);
    const { error: rpcError } = await sb.rpc("actualizar_avatar", { p_url: `${publicUrl}?v=${Date.now()}` });
    if (rpcError) throw rpcError;
  };

  const handleFile = async (file) => {
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
    try {
      const { width, height } = await readImage(file);
      if (width < 400 || height < 400) {
        showPhotoError(`Resolución insuficiente (${width}×${height} px): el mínimo es 400×400 px.`);
        return;
      }
      pickButton.disabled = true;
      pickButton.textContent = "Subiendo fotografía…";
      await uploadPhoto(file);
      window.location.href = "foto-cargada-trabajador.html";
    } catch (error) {
      console.error(error);
      showPhotoError(SL.mensajeError(error));
      pickButton.disabled = false;
      pickButton.textContent = "Cargar desde galería";
    }
  };

  pickButton.addEventListener("click", () => photoInput.click());
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
  sb.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data } = await sb.from("perfil").select("avatar_url, nombres, apellidos").eq("id", session.user.id).single();
    if (data && data.avatar_url) SL.pintarAvatar(photoPreview, data);
  });
}
