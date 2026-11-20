// Empresa · Inicio (RF-26): convocatorias activas, plazas disponibles,
// total de candidatos y seleccionados, con las convocatorias y candidatos recientes.

(async () => {
  const ctx = await SL.iniciarPanel("EMPRESA");
  const { empresa } = ctx;

  document.querySelector("#business-verified").hidden = !empresa.verificada;
  document.querySelector("#business-rating").setAttribute("aria-label", `Valoración de empresa: ${SL.calificacion(empresa.valoracion)} de 5`);
  SL.llenarCampos({
    razon_social: empresa.razon_social,
    meta: [empresa.sector, [empresa.ciudad, empresa.pais].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    valoracion: empresa.valoracion > 0 ? SL.calificacion(empresa.valoracion) : "—"
  });

  try {
    const [postings, selected, candidates] = await Promise.all([
      Empresa.convocatorias(empresa.id),
      Empresa.seleccionados(empresa.id),
      sb.from("postulacion")
        .select("id, estado, respuesta_trabajador, created_at, id_trabajador, convocatoria!inner(id, id_empresa, titulo), trabajador(calificacion_global, trabajos_realizados, perfil(nombres, apellidos, avatar_url))")
        .eq("convocatoria.id_empresa", empresa.id)
        .order("created_at", { ascending: false })
        .limit(4)
        .then(SL.datos)
    ]);

    const active = postings.filter((posting) => SL.estadoConvocatoria(posting).clave === "active");
    SL.llenarCampos({
      activas: String(active.length),
      plazas: String(active.reduce((sum, posting) => sum + posting.plazas_disponibles, 0)),
      candidatos: String(postings.reduce((sum, posting) => sum + posting.candidatos, 0)),
      seleccionados: String(selected)
    });

    // Convocatorias recientes: primero las próximas
    const recent = [...postings]
      .sort((a, b) => (a.fecha >= SL.hoyISO()) === (b.fecha >= SL.hoyISO()) ? a.fecha.localeCompare(b.fecha) : (a.fecha >= SL.hoyISO() ? -1 : 1))
      .slice(0, 3);
    document.querySelector("#recent-postings").innerHTML = recent.length
      ? recent.map((posting) => {
        const cat = SL.categoria(posting.categoria);
        const state = SL.estadoConvocatoria(posting);
        return `
          <li class="business-job-card">
            <span class="business-job-card__icon" aria-hidden="true">${cat.icon}</span>
            <div class="business-job-card__details">
              <strong><a href="candidatos.html?id=${posting.id}">${SL.escapeHTML(posting.titulo)}</a></strong>
              <span>${SL.fecha(posting.fecha)} <span aria-hidden="true">·</span> ${posting.candidatos} candidatos</span>
            </div>
            <div class="business-job-card__availability">
              <span class="business-job-status"><span aria-hidden="true">•</span> ${state.label}</span>
              <span>${posting.plazas_disponibles} plazas</span>
            </div>
          </li>`;
      }).join("")
      : '<li class="sl-empty">Aún no publicas convocatorias. <a href="crear-convocatoria.html">Crea la primera</a>.</li>';

    document.querySelector("#recent-candidates").innerHTML = candidates.length
      ? candidates.map((application) => {
        const worker = application.trabajador;
        const person = worker.perfil;
        const state = Empresa.estadoCandidato(application);
        const rating = worker.trabajos_realizados ? SL.calificacion(worker.calificacion_global) : "—";
        return `
          <li class="business-candidate">
            <span class="business-candidate__avatar business-candidate__avatar--${SL.colorAvatar(application.id_trabajador)}" aria-hidden="true">${SL.escapeHTML(SL.iniciales(person))}</span>
            <div class="business-candidate__identity">
              <strong><a href="candidatos.html?id=${application.convocatoria.id}#candidato-${application.id_trabajador}">${SL.escapeHTML(SL.nombreCompleto(person))}</a></strong>
              <span class="business-candidate__rating" aria-label="Calificación ${rating} de 5"><span aria-hidden="true">★★★★★</span> ${rating}</span>
            </div>
            <span class="business-candidate__status business-candidate__status--${state.clave === "selected" ? "selected" : "review"}"><span aria-hidden="true">•</span> ${state.label}</span>
          </li>`;
      }).join("")
      : '<li class="sl-empty">Todavía no tienes candidatos.</li>';
  } catch (error) {
    console.error("No fue posible cargar el panel de la empresa.", error);
    SL.mostrarErrorGlobal(SL.mensajeError(error));
  }
})();
