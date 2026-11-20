// Consultas compartidas por las páginas de la empresa.

const Empresa = {
  // Convocatorias de la empresa (más recientes primero)
  convocatorias(idEmpresa) {
    return sb.from("convocatoria")
      .select("*")
      .eq("id_empresa", idEmpresa)
      .order("fecha", { ascending: false })
      .then(SL.datos);
  },

  // Número de trabajadores seleccionados en todas las convocatorias de la empresa
  async seleccionados(idEmpresa) {
    const { count, error } = await sb.from("postulacion")
      .select("id, convocatoria!inner(id_empresa)", { count: "exact", head: true })
      .eq("convocatoria.id_empresa", idEmpresa)
      .eq("estado", "SELECCIONADO");
    if (error) throw error;
    return count || 0;
  },

  // Estado del candidato tal como lo muestra la empresa
  estadoCandidato(postulacion) {
    if (postulacion.estado === "SELECCIONADO") return { clave: "selected", label: "Seleccionado" };
    if (postulacion.estado === "NO_SELECCIONADO") {
      return { clave: "discarded", label: postulacion.respuesta_trabajador === "RECHAZADA" ? "Rechazó asignación" : "Descartado" };
    }
    if (postulacion.respuesta_trabajador === "PENDIENTE") return { clave: "review", label: "Asignación pendiente" };
    return { clave: "review", label: "En revisión" };
  }
};
