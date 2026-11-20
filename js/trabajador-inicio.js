// Trabajador · Inicio (RF-10): indicadores de actividad, reputación por rol
// y ofertas recomendadas a las que aún no se ha postulado.

(async () => {
  const ctx = await SL.iniciarPanel("TRABAJADOR");
  const { perfil, trabajador } = ctx;
  const valores = SL.indicadores(trabajador);

  const horaActual = new Date().getHours();
  document.querySelector("#welcome-greeting").textContent =
    horaActual < 12 ? "Buenos días" : horaActual < 19 ? "Buenas tardes" : "Buenas noches";
  document.querySelector("#welcome-rating").setAttribute("aria-label", `Calificación global: ${valores.global} de 5`);

  SL.llenarCampos({
    ...valores,
    nombre: perfil.nombres,
    meta: [trabajador.cargo, trabajador.ubicacion].filter(Boolean).join(" · ")
  });

  const lista = document.querySelector("#recommended-list");
  try {
    const [ofertas, propias] = await Promise.all([
      sb.from("convocatoria")
        .select("id, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin, remuneracion, plazas_disponibles, empresa(razon_social, verificada)")
        .eq("estado", "ACTIVA")
        .gte("fecha", SL.hoyISO())
        .gt("plazas_disponibles", 0)
        .order("fecha")
        .limit(12)
        .then(SL.datos),
      sb.from("postulacion").select("id_convocatoria").eq("id_trabajador", ctx.uid).then(SL.datos)
    ]);
    const postuladas = new Set(propias.map((p) => p.id_convocatoria));
    const recomendadas = ofertas.filter((oferta) => !postuladas.has(oferta.id)).slice(0, 3);

    if (!recomendadas.length) {
      lista.innerHTML = '<p class="sl-empty">Por ahora no hay ofertas nuevas para ti. ¡Vuelve pronto!</p>';
      return;
    }
    lista.innerHTML = recomendadas.map((oferta) => {
      const cat = SL.categoria(oferta.categoria);
      return `
        <a class="offer-card" href="ofertas.html#oferta-${oferta.id}">
          <span class="offer-card__icon" aria-hidden="true">${cat.icon}</span>
          <div class="offer-card__details">
            <div class="offer-card__title-row">
              <h3>${SL.escapeHTML(oferta.titulo)}</h3>
              <span class="offer-tag offer-tag--${cat.color}">${cat.label}</span>
            </div>
            <p class="offer-card__company">${SL.escapeHTML(oferta.empresa.razon_social)}${oferta.empresa.verificada ? ' <span class="verified">✓ Verificada</span>' : ""}</p>
            <div class="offer-card__meta">
              <span>📍 ${SL.escapeHTML(oferta.ubicacion)}</span><span>🗓️ ${SL.fecha(oferta.fecha)}</span><span>◷ ${SL.horario(oferta)}</span>
            </div>
            <strong class="offer-card__pay">${SL.dinero(oferta.remuneracion)} COP</strong>
          </div>
          <span class="offer-card__availability">${oferta.plazas_disponibles} plazas disp.</span>
        </a>`;
    }).join("");
  } catch (error) {
    console.error("No fue posible cargar las ofertas recomendadas.", error);
    lista.innerHTML = `<p class="sl-empty">${SL.escapeHTML(SL.mensajeError(error))}</p>`;
  }
})();
