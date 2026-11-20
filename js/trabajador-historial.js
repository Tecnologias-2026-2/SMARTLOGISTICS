// Trabajador · Historial laboral (RF-11): experiencia acumulada con evento,
// empresa, fecha, categoría, remuneración y calificación.

(async () => {
  const ctx = await SL.iniciarPanel("TRABAJADOR");
  SL.llenarCampos(SL.indicadores(ctx.trabajador));

  const body = document.querySelector("#history-body");
  try {
    const jobs = await sb.from("historial_laboral")
      .select("*")
      .eq("id_trabajador", ctx.uid)
      .order("fecha", { ascending: false })
      .then(SL.datos);

    if (!jobs.length) {
      body.innerHTML = '<tr><td colspan="6" class="sl-empty">Aún no tienes trabajos calificados. Cuando una empresa califique tu servicio, aparecerá aquí.</td></tr>';
      return;
    }
    body.innerHTML = jobs.map((job) => {
      const cat = SL.categoria(job.categoria);
      const rating = job.calificacion == null ? "—" : SL.calificacion(job.calificacion);
      return `
        <tr>
          <td><span class="history-job"><span class="history-job__icon" aria-hidden="true">${cat.icon}</span>${SL.escapeHTML(job.evento)}</span></td>
          <td>${SL.escapeHTML(job.empresa)}</td>
          <td>${SL.fecha(job.fecha)}</td>
          <td><span class="history-category history-category--${cat.color}">${cat.label}</span></td>
          <td class="history-pay">${job.remuneracion ? SL.dinero(job.remuneracion) : "—"}</td>
          <td><span class="history-rating" aria-label="${rating} de 5 estrellas">★★★★★ <span>${rating}</span></span></td>
        </tr>`;
    }).join("");
  } catch (error) {
    console.error("No fue posible cargar el historial.", error);
    body.innerHTML = `<tr><td colspan="6" class="sl-empty">${SL.escapeHTML(SL.mensajeError(error))}</td></tr>`;
  }
})();
