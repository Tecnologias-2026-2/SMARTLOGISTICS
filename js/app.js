// Utilidades compartidas por las páginas con sesión: protección de rutas,
// datos del menú lateral, cierre de sesión y formato de fechas, dinero y
// categorías.

const SL = (() => {
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const CATEGORIAS = {
    EVENTO: { label: "Evento", icon: "🎪", color: "purple", filtro: "evento" },
    ALMACEN: { label: "Almacén", icon: "📦", color: "green", filtro: "almacen" },
    MONTAJE: { label: "Montaje", icon: "🔧", color: "blue", filtro: "montaje" },
    REPARTO: { label: "Reparto", icon: "🚚", color: "orange", filtro: "reparto" }
  };

  const COLORES_AVATAR = ["purple", "pink", "indigo", "violet", "green", "blue"];

  // ---------- Formato ----------
  function fecha(iso) {
    if (!iso) return "";
    const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
    return `${day} ${MESES[month - 1]} ${year}`;
  }

  function hora(valor) {
    return valor ? valor.slice(0, 5) : "";
  }

  function horario(convocatoria) {
    return `${hora(convocatoria.hora_inicio)} – ${hora(convocatoria.hora_fin)}`;
  }

  function dinero(valor) {
    return `$${Math.round(Number(valor) || 0).toLocaleString("es-CO")}`;
  }

  function hoyISO() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function calificacion(valor) {
    return Number(valor || 0).toFixed(1);
  }

  function porcentaje(valor) {
    return `${Math.round(Number(valor) || 0)}%`;
  }

  function nombreCompleto(perfil) {
    return perfil ? `${perfil.nombres} ${perfil.apellidos || ""}`.trim() : "";
  }

  function iniciales(perfil) {
    if (!perfil) return "?";
    const letras = `${(perfil.nombres || "").charAt(0)}${(perfil.apellidos || "").charAt(0)}`;
    return (letras || "?").toLocaleUpperCase("es");
  }

  function colorAvatar(id) {
    const texto = String(id || "");
    let suma = 0;
    for (const letra of texto) suma += letra.charCodeAt(0);
    return COLORES_AVATAR[suma % COLORES_AVATAR.length];
  }

  function categoria(valor) {
    return CATEGORIAS[valor] || { label: valor, icon: "📣", color: "blue", filtro: "" };
  }

  function escapeHTML(texto) {
    const span = document.createElement("span");
    span.textContent = texto == null ? "" : String(texto);
    return span.innerHTML;
  }

  // Ordena una lista embebida (requisitos, habilidades) por su campo "orden"
  function ordenar(lista) {
    return [...(lista || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  // Estado visible de una convocatoria según su fecha y plazas
  function estadoConvocatoria(convocatoria) {
    if (convocatoria.estado === "CANCELADA") return { clave: "closed", label: "Cancelada" };
    if (convocatoria.fecha < hoyISO()) return { clave: "finished", label: "Finalizada" };
    if (convocatoria.estado === "CERRADA" || convocatoria.plazas_disponibles === 0) {
      return { clave: "closed", label: "Completa" };
    }
    return { clave: "active", label: "Activa" };
  }

  // Indicadores del trabajador ya formateados para mostrar
  function indicadores(trabajador) {
    const sinTrabajos = !trabajador.trabajos_realizados;
    return {
      global: sinTrabajos ? "—" : calificacion(trabajador.calificacion_global),
      logistica: trabajador.calificaciones_logistica ? calificacion(trabajador.reputacion_logistica) : "—",
      coordinador: trabajador.calificaciones_coordinador ? calificacion(trabajador.reputacion_coordinador) : "—",
      puntualidad: sinTrabajos ? "—" : porcentaje(trabajador.puntualidad_pct),
      trabajos: String(trabajador.trabajos_realizados || 0),
      empresas: String(trabajador.empresas_colaboradoras || 0),
      anios: String(trabajador.anios_experiencia || 0)
    };
  }

  // Rellena todos los [data-campo] de un contenedor con los valores dados
  function llenarCampos(valores, raiz = document) {
    raiz.querySelectorAll("[data-campo]").forEach((nodo) => {
      const valor = valores[nodo.dataset.campo];
      if (valor !== undefined && valor !== null) nodo.textContent = `${valor}${nodo.dataset.sufijo || ""}`;
    });
  }

  // Avatar: fotografía si existe, si no las iniciales (o el icono dado)
  function pintarAvatar(nodo, perfil, textoAlternativo) {
    if (!nodo) return;
    if (perfil && perfil.avatar_url) {
      const img = document.createElement("img");
      img.src = perfil.avatar_url;
      img.alt = "";
      img.className = "sl-avatar-img";
      nodo.replaceChildren(img);
    } else {
      nodo.textContent = textoAlternativo ?? iniciales(perfil);
    }
  }

  // Convierte un error de Supabase en un mensaje para el usuario
  function mensajeError(error) {
    if (!error) return "";
    const mensaje = error.message || String(error);
    const traducciones = {
      "Invalid login credentials": "Correo o contraseña incorrectos.",
      "Email not confirmed": "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
      "User already registered": "Ya existe una cuenta con este correo. Inicia sesión.",
      "Failed to fetch": "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo."
    };
    for (const [original, traducido] of Object.entries(traducciones)) {
      if (mensaje.includes(original)) return traducido;
    }
    if (/rate limit/i.test(mensaje)) return "Hiciste demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.";
    if (/Password should be/i.test(mensaje)) return "La contraseña debe tener mínimo 8 caracteres.";
    return mensaje;
  }

  // Lanza el error de una respuesta de Supabase o devuelve sus datos
  function datos({ data, error }) {
    if (error) throw error;
    return data;
  }

  // ---------- Sesión ----------
  const LOGIN = {
    TRABAJADOR: "../auth/login-trabajador.html",
    EMPRESA: "../auth/login-empresa.html"
  };

  function redirigir(url) {
    window.location.replace(url);
    return new Promise(() => {});
  }

  // Exige sesión del modo indicado; devuelve el contexto del usuario
  async function iniciarPanel(modo) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return redirigir(LOGIN[modo]);

    const uid = session.user.id;
    const contexto = { uid, user: session.user };
    try {
      contexto.perfil = datos(await sb.from("perfil").select("*").eq("id", uid).single());
      if (modo === "TRABAJADOR") {
        contexto.trabajador = datos(await sb.from("trabajador").select("*").eq("id", uid).maybeSingle());
        if (!contexto.trabajador) {
          await sb.auth.signOut();
          return redirigir(LOGIN.TRABAJADOR);
        }
      } else {
        const coordinador = datos(await sb.from("coordinador").select("*, empresa(*)").eq("id", uid).maybeSingle());
        if (!coordinador) {
          await sb.auth.signOut();
          return redirigir(LOGIN.EMPRESA);
        }
        contexto.coordinador = coordinador;
        contexto.empresa = coordinador.empresa;
      }
    } catch (error) {
      console.error("No fue posible cargar la sesión.", error);
      mostrarErrorGlobal("No pudimos cargar tu cuenta. Recarga la página.");
      throw error;
    }

    pintarMenu(contexto, modo);
    return contexto;
  }

  function pintarMenu(contexto, modo) {
    const identidad = document.querySelector(".sidebar__identity");
    if (identidad) {
      const [nombre, detalle] = identidad.children;
      if (modo === "EMPRESA") {
        nombre.textContent = contexto.empresa.razon_social;
        detalle.textContent = contexto.coordinador.cargo;
      } else {
        nombre.textContent = nombreCompleto(contexto.perfil);
        detalle.textContent = contexto.trabajador.cargo;
      }
    }
    if (modo === "TRABAJADOR") {
      pintarAvatar(document.querySelector(".sidebar__avatar"), contexto.perfil, "👤");
    }
  }

  function mostrarErrorGlobal(texto) {
    const main = document.querySelector("main");
    if (!main) return;
    const aviso = document.createElement("p");
    aviso.className = "sl-global-error";
    aviso.setAttribute("role", "alert");
    aviso.textContent = texto;
    main.prepend(aviso);
  }

  // Cerrar sesión (RF-07): invalida el token y vuelve al inicio de sesión
  document.addEventListener("click", async (event) => {
    const enlace = event.target.closest(".sidebar__logout");
    if (!enlace || !window.sb) return;
    event.preventDefault();
    try {
      await sb.auth.signOut();
    } finally {
      window.location.href = enlace.href;
    }
  });

  return {
    fecha, hora, horario, dinero, hoyISO, calificacion, porcentaje, nombreCompleto, iniciales,
    colorAvatar, categoria, escapeHTML, ordenar, estadoConvocatoria, indicadores, llenarCampos,
    pintarAvatar, mensajeError, datos, iniciarPanel, mostrarErrorGlobal, CATEGORIAS
  };
})();
