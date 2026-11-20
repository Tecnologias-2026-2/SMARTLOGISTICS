// Empresa · Perfil público (RF-12): razón social, sector, ubicación,
// verificación, convocatorias, contratados y valoración.

(async () => {
  const ctx = await SL.iniciarPanel("EMPRESA");
  const { empresa } = ctx;
  const location = [empresa.ciudad, empresa.pais].filter(Boolean).join(", ") || "Sin ubicación";
  const rating = empresa.valoracion > 0 ? SL.calificacion(empresa.valoracion) : "—";

  document.querySelector("#company-verified").hidden = !empresa.verificada;
  document.querySelector("#company-verification").hidden = !empresa.verificada;
  document.querySelector("#company-rating").setAttribute("aria-label", `Calificación: ${rating} de 5`);
  SL.llenarCampos({
    razon_social: empresa.razon_social,
    sector: empresa.sector,
    ubicacion: location,
    descripcion: empresa.descripcion || "Completa la descripción de tu empresa para que los trabajadores te conozcan.",
    valoracion: rating,
    correo: empresa.correo || ctx.user.email,
    telefono: empresa.telefono || "Sin teléfono"
  });

  try {
    const [postings, hired] = await Promise.all([
      Empresa.convocatorias(empresa.id),
      Empresa.seleccionados(empresa.id)
    ]);
    SL.llenarCampos({
      publicadas: String(postings.length),
      contratados: String(hired),
      activas: String(postings.filter((posting) => SL.estadoConvocatoria(posting).clave === "active").length)
    });

    document.querySelector("#company-postings").innerHTML = postings.length
      ? postings.slice(0, 5).map((posting) => {
        const state = SL.estadoConvocatoria(posting);
        return `
          <li>
            <div><strong>${SL.escapeHTML(posting.titulo)}</strong><span>${SL.fecha(posting.fecha)} · ${SL.escapeHTML(posting.ubicacion)}</span></div>
            <span class="company-status company-status--${state.clave}"><span aria-hidden="true">•</span> ${state.label}</span>
          </li>`;
      }).join("")
      : '<li class="sl-empty">Aún no publicas convocatorias.</li>';
  } catch (error) {
    console.error("No fue posible cargar el perfil de la empresa.", error);
    SL.mostrarErrorGlobal(SL.mensajeError(error));
  }
})();
