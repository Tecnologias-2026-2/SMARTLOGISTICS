-- =====================================================================
-- Smart Logistics · 02 · Reglas de negocio (capas de aplicación y dominio)
-- Cada caso de uso que escribe datos es una función que valida quién la
-- llama y las reglas del dominio antes de tocar las tablas. El navegador
-- las invoca con supabase.rpc('<función>', {...}) a través de la API REST
-- (PostgREST) de Supabase, sobre HTTPS.
-- =====================================================================

-- Fecha de hoy en Colombia
create function public.hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- ---------- Utilidades internas (no expuestas a la API) ----------
create function public.notificar(p_usuario uuid, p_tipo text, p_mensaje text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notificacion (id_usuario, tipo, mensaje) values (p_usuario, p_tipo, p_mensaje);
$$;

create function public.notificar_empresa(p_empresa bigint, p_tipo text, p_mensaje text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notificacion (id_usuario, tipo, mensaje)
  select c.id, p_tipo, p_mensaje from public.coordinador c where c.id_empresa = p_empresa;
$$;

-- ---------- Registro (RF-02): crea el perfil según el modo ----------
create function public.crear_cuenta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_empresa bigint;
begin
  if upper(coalesce(v_meta ->> 'tipo', 'TRABAJADOR')) = 'EMPRESA' then
    insert into public.perfil (id, nombres, apellidos, modo_activo)
    values (new.id, coalesce(nullif(trim(v_meta ->> 'responsable'), ''), split_part(new.email, '@', 1)), '', 'EMPRESA');
    insert into public.contacto (id, email, celular, pais, departamento)
    values (new.id, new.email, v_meta ->> 'telefono', v_meta ->> 'pais', v_meta ->> 'ciudad');
    insert into public.empresa (razon_social, sector, ciudad, pais, telefono, correo)
    values (
      coalesce(nullif(trim(v_meta ->> 'razon_social'), ''), 'Empresa sin nombre'),
      coalesce(nullif(trim(v_meta ->> 'sector'), ''), 'Otro'),
      v_meta ->> 'ciudad', v_meta ->> 'pais', v_meta ->> 'telefono', new.email
    )
    returning id into v_empresa;
    insert into public.coordinador (id, id_empresa) values (new.id, v_empresa);
  else
    insert into public.perfil (id, nombres, apellidos, modo_activo)
    values (
      new.id,
      coalesce(nullif(trim(v_meta ->> 'nombres'), ''), split_part(new.email, '@', 1)),
      coalesce(trim(v_meta ->> 'apellidos'), ''),
      'TRABAJADOR'
    );
    insert into public.contacto (id, email, celular, pais, departamento)
    values (new.id, new.email, v_meta ->> 'celular', v_meta ->> 'pais', v_meta ->> 'departamento');
    insert into public.trabajador (id, ubicacion)
    values (new.id, nullif(concat_ws(', ', nullif(trim(v_meta ->> 'departamento'), ''), nullif(trim(v_meta ->> 'pais'), '')), ''));
  end if;
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_cuenta();

-- ---------- Contador de candidatos por convocatoria ----------
create function public.contar_candidatos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.convocatoria set candidatos = candidatos + 1 where id = new.id_convocatoria;
  else
    update public.convocatoria set candidatos = greatest(candidatos - 1, 0) where id = old.id_convocatoria;
  end if;
  return null;
end;
$$;

create trigger al_cambiar_postulaciones
  after insert or delete on public.postulacion
  for each row execute function public.contar_candidatos();

-- ---------- Trazabilidad de la postulación (RNF-14) ----------
create function public.registrar_traza()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.postulacion_evento (id_postulacion, estado_anterior, estado_nuevo, detalle, responsable)
    values (
      new.id, null, new.estado::text,
      case when new.origen = 'ASIGNACION_DIRECTA' then 'Asignación directa' else 'Postulación' end,
      auth.uid()
    );
  elsif new.estado is distinct from old.estado
     or new.origen is distinct from old.origen
     or new.respuesta_trabajador is distinct from old.respuesta_trabajador then
    insert into public.postulacion_evento (id_postulacion, estado_anterior, estado_nuevo, detalle, responsable)
    values (
      new.id, old.estado::text, new.estado::text,
      nullif(concat_ws(' · ',
        case when new.origen is distinct from old.origen then 'Asignación directa' end,
        case when new.respuesta_trabajador is distinct from old.respuesta_trabajador
             then 'Respuesta del trabajador: ' || new.respuesta_trabajador::text end,
        new.motivo_rechazo
      ), ''),
      auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger al_registrar_traza
  after insert or update on public.postulacion
  for each row execute function public.registrar_traza();

-- =====================================================================
-- Casos de uso
-- =====================================================================

-- RF-17 · Postularse a una convocatoria activa con plazas
create function public.postularse(p_convocatoria bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.convocatoria;
  v_id bigint;
begin
  if not exists (select 1 from public.trabajador t where t.id = auth.uid()) then
    raise exception 'Solo una cuenta de trabajador puede postularse.';
  end if;
  select * into v_conv from public.convocatoria c where c.id = p_convocatoria for update;
  if not found then
    raise exception 'La convocatoria no existe.';
  end if;
  if v_conv.estado <> 'ACTIVA' or v_conv.fecha < public.hoy() then
    raise exception 'Esta convocatoria ya no recibe postulaciones.';
  end if;
  if v_conv.plazas_disponibles = 0 then
    raise exception 'La convocatoria ya no tiene plazas disponibles.';
  end if;
  if exists (
    select 1 from public.postulacion p
    where p.id_convocatoria = p_convocatoria and p.id_trabajador = auth.uid()
  ) then
    raise exception 'Ya tienes una postulación en esta convocatoria.';
  end if;

  insert into public.postulacion (id_convocatoria, id_trabajador)
  values (p_convocatoria, auth.uid())
  returning id into v_id;

  perform public.notificar_empresa(v_conv.id_empresa, 'NUEVA_POSTULACION',
    format('Nuevo candidato para «%s».', v_conv.titulo));
  return v_id;
end;
$$;

-- RF-18 · Cancelar una postulación que sigue en revisión
create function public.cancelar_postulacion(p_postulacion bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.postulacion p
  where p.id = p_postulacion
    and p.id_trabajador = auth.uid()
    and p.estado = 'EN_REVISION'
    and p.origen = 'POSTULACION';
  if not found then
    raise exception 'Solo puedes cancelar postulaciones que siguen en revisión.';
  end if;
end;
$$;

-- RF-20 · Seleccionar o descartar a un candidato
create function public.decidir_postulacion(p_postulacion bigint, p_seleccionar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.postulacion;
  v_conv public.convocatoria;
  v_empresa text;
begin
  select * into v_post from public.postulacion p where p.id = p_postulacion for update;
  if not found then
    raise exception 'La postulación no existe.';
  end if;
  select * into v_conv from public.convocatoria c where c.id = v_post.id_convocatoria for update;
  if v_conv.id_empresa is distinct from public.mi_empresa() then
    raise exception 'Esta postulación no pertenece a tu empresa.';
  end if;
  if v_post.estado <> 'EN_REVISION' then
    raise exception 'Este candidato ya tiene una decisión.';
  end if;
  if v_post.respuesta_trabajador = 'PENDIENTE' then
    raise exception 'El trabajador aún no responde la asignación directa.';
  end if;
  select e.razon_social into v_empresa from public.empresa e where e.id = v_conv.id_empresa;

  if p_seleccionar then
    if v_conv.plazas_disponibles = 0 then
      raise exception 'No quedan plazas disponibles en esta convocatoria.';
    end if;
    update public.postulacion set estado = 'SELECCIONADO', updated_at = now() where id = p_postulacion;
    update public.convocatoria
       set plazas_disponibles = plazas_disponibles - 1,
           estado = case when plazas_disponibles - 1 = 0 then 'CERRADA'::public.estado_convocatoria else estado end
     where id = v_conv.id;
    perform public.notificar(v_post.id_trabajador, 'SELECCIONADO',
      format('¡%s te seleccionó para «%s»!', v_empresa, v_conv.titulo));
  else
    update public.postulacion set estado = 'NO_SELECCIONADO', updated_at = now() where id = p_postulacion;
    perform public.notificar(v_post.id_trabajador, 'NO_SELECCIONADO',
      format('No fuiste seleccionado para «%s». ¡Sigue intentando!', v_conv.titulo));
  end if;
end;
$$;

-- RF-21 · ¿El trabajador ya está seleccionado en otra convocatoria a la misma hora?
create function public.cruce_horario(p_convocatoria bigint, p_trabajador uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conv public.convocatoria;
begin
  select * into v_conv from public.convocatoria c where c.id = p_convocatoria;
  if not found then
    return false;
  end if;
  if v_conv.id_empresa is distinct from public.mi_empresa() and p_trabajador is distinct from auth.uid() then
    raise exception 'No puedes consultar la agenda de este trabajador.';
  end if;
  return exists (
    select 1
    from public.postulacion p
    join public.convocatoria otra on otra.id = p.id_convocatoria
    where p.id_trabajador = p_trabajador
      and p.estado = 'SELECCIONADO'
      and otra.id <> v_conv.id
      and otra.fecha = v_conv.fecha
      and otra.hora_inicio < v_conv.hora_fin
      and v_conv.hora_inicio < otra.hora_fin
  );
end;
$$;

-- RF-21 · Asignación directa (el trabajador puede no haberse postulado)
create function public.asignar_directamente(p_convocatoria bigint, p_trabajador uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.convocatoria;
  v_post public.postulacion;
  v_empresa text;
begin
  select * into v_conv from public.convocatoria c where c.id = p_convocatoria for update;
  if not found or v_conv.id_empresa is distinct from public.mi_empresa() then
    raise exception 'La convocatoria no pertenece a tu empresa.';
  end if;
  if v_conv.estado <> 'ACTIVA' or v_conv.fecha < public.hoy() then
    raise exception 'La convocatoria ya no está activa.';
  end if;
  if v_conv.plazas_disponibles = 0 then
    raise exception 'No quedan plazas disponibles en esta convocatoria.';
  end if;
  if not exists (select 1 from public.trabajador t where t.id = p_trabajador) then
    raise exception 'El trabajador no existe.';
  end if;

  select * into v_post from public.postulacion p
  where p.id_convocatoria = p_convocatoria and p.id_trabajador = p_trabajador
  for update;
  if found then
    if v_post.estado <> 'EN_REVISION' then
      raise exception 'Este trabajador ya tiene una decisión en la convocatoria.';
    end if;
    if v_post.respuesta_trabajador = 'PENDIENTE' then
      raise exception 'Ya enviaste una asignación a este trabajador.';
    end if;
    update public.postulacion
       set origen = 'ASIGNACION_DIRECTA', respuesta_trabajador = 'PENDIENTE', updated_at = now()
     where id = v_post.id;
  else
    insert into public.postulacion (id_convocatoria, id_trabajador, origen, respuesta_trabajador)
    values (p_convocatoria, p_trabajador, 'ASIGNACION_DIRECTA', 'PENDIENTE');
  end if;

  select e.razon_social into v_empresa from public.empresa e where e.id = v_conv.id_empresa;
  perform public.notificar(p_trabajador, 'ASIGNACION_DIRECTA',
    format('%s te asignó directamente a «%s». Acepta o rechaza la asignación.', v_empresa, v_conv.titulo));
  return jsonb_build_object('cruce_horario', public.cruce_horario(p_convocatoria, p_trabajador));
end;
$$;

-- RF-22 · El trabajador acepta o rechaza (con motivo) una asignación directa
create function public.responder_asignacion(p_postulacion bigint, p_acepta boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.postulacion;
  v_conv public.convocatoria;
  v_nombre text;
begin
  select * into v_post from public.postulacion p
  where p.id = p_postulacion and p.id_trabajador = auth.uid()
  for update;
  if not found or v_post.origen <> 'ASIGNACION_DIRECTA' or v_post.respuesta_trabajador is distinct from 'PENDIENTE' then
    raise exception 'No tienes una asignación pendiente con ese identificador.';
  end if;
  select * into v_conv from public.convocatoria c where c.id = v_post.id_convocatoria for update;
  select trim(pf.nombres || ' ' || pf.apellidos) into v_nombre from public.perfil pf where pf.id = auth.uid();

  if p_acepta then
    if v_conv.fecha < public.hoy() then
      raise exception 'La fecha de esta asignación ya pasó.';
    end if;
    if v_conv.plazas_disponibles = 0 then
      raise exception 'La convocatoria ya no tiene plazas disponibles.';
    end if;
    update public.postulacion
       set estado = 'SELECCIONADO', respuesta_trabajador = 'ACEPTADA', updated_at = now()
     where id = p_postulacion;
    update public.convocatoria
       set plazas_disponibles = plazas_disponibles - 1,
           estado = case when plazas_disponibles - 1 = 0 then 'CERRADA'::public.estado_convocatoria else estado end
     where id = v_conv.id;
    perform public.notificar_empresa(v_conv.id_empresa, 'ASIGNACION_ACEPTADA',
      format('%s aceptó la asignación a «%s».', v_nombre, v_conv.titulo));
  else
    if coalesce(trim(p_motivo), '') = '' then
      raise exception 'Indica el motivo del rechazo.';
    end if;
    update public.postulacion
       set estado = 'NO_SELECCIONADO', respuesta_trabajador = 'RECHAZADA',
           motivo_rechazo = trim(p_motivo), updated_at = now()
     where id = p_postulacion;
    perform public.notificar_empresa(v_conv.id_empresa, 'ASIGNACION_RECHAZADA',
      format('%s rechazó la asignación a «%s». Motivo: %s', v_nombre, v_conv.titulo, trim(p_motivo)));
  end if;
end;
$$;

-- RF-23 y RF-24 · Calificación post-servicio y recálculo de la reputación
create function public.calificar(
  p_postulacion bigint,
  p_rol public.rol_evaluado,
  p_puntualidad integer,
  p_eficiencia integer,
  p_actitud integer,
  p_comentario text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.postulacion;
  v_conv public.convocatoria;
  v_trab public.trabajador;
  v_empresa text;
  v_puntaje numeric;
  v_nueva_empresa boolean;
begin
  if p_puntualidad not between 1 and 5 or p_eficiencia not between 1 and 5 or p_actitud not between 1 and 5 then
    raise exception 'Cada criterio se califica de 1 a 5.';
  end if;
  select * into v_post from public.postulacion p where p.id = p_postulacion for update;
  if not found then
    raise exception 'La postulación no existe.';
  end if;
  select * into v_conv from public.convocatoria c where c.id = v_post.id_convocatoria;
  if v_conv.id_empresa is distinct from public.mi_empresa() then
    raise exception 'Solo la empresa convocante puede calificar este servicio.';
  end if;
  if v_post.estado <> 'SELECCIONADO' then
    raise exception 'Solo se califica a trabajadores seleccionados.';
  end if;
  if v_conv.fecha > public.hoy() then
    raise exception 'Podrás calificar cuando se haya prestado el servicio.';
  end if;
  if exists (select 1 from public.calificacion k where k.id_postulacion = p_postulacion) then
    raise exception 'Este trabajador ya tiene una evaluación para esta convocatoria.';
  end if;

  insert into public.calificacion (id_postulacion, evaluador, rol_evaluado, puntualidad, eficiencia, actitud, comentario)
  values (p_postulacion, auth.uid(), p_rol, p_puntualidad, p_eficiencia, p_actitud, nullif(trim(p_comentario), ''))
  returning puntaje into v_puntaje;

  select e.razon_social into v_empresa from public.empresa e where e.id = v_conv.id_empresa;
  select * into v_trab from public.trabajador t where t.id = v_post.id_trabajador for update;
  v_nueva_empresa := not exists (
    select 1 from public.historial_laboral h where h.id_trabajador = v_trab.id and h.empresa = v_empresa
  );

  update public.trabajador t set
    trabajos_realizados = v_trab.trabajos_realizados + 1,
    calificacion_global = round((v_trab.calificacion_global * v_trab.trabajos_realizados + v_puntaje)
                                / (v_trab.trabajos_realizados + 1), 2),
    puntualidad_pct = round((v_trab.puntualidad_pct * v_trab.trabajos_realizados + p_puntualidad * 20)
                            / (v_trab.trabajos_realizados + 1), 2),
    reputacion_logistica = case when p_rol = 'LOGISTICA'
      then round((v_trab.reputacion_logistica * v_trab.calificaciones_logistica + v_puntaje)
                 / (v_trab.calificaciones_logistica + 1), 2)
      else v_trab.reputacion_logistica end,
    calificaciones_logistica = v_trab.calificaciones_logistica + case when p_rol = 'LOGISTICA' then 1 else 0 end,
    reputacion_coordinador = case when p_rol = 'COORDINADOR'
      then round((v_trab.reputacion_coordinador * v_trab.calificaciones_coordinador + v_puntaje)
                 / (v_trab.calificaciones_coordinador + 1), 2)
      else v_trab.reputacion_coordinador end,
    calificaciones_coordinador = v_trab.calificaciones_coordinador + case when p_rol = 'COORDINADOR' then 1 else 0 end,
    empresas_colaboradoras = v_trab.empresas_colaboradoras + case when v_nueva_empresa then 1 else 0 end
  where t.id = v_trab.id;

  insert into public.historial_laboral
    (id_trabajador, id_convocatoria, evento, empresa, categoria, funcion, fecha, remuneracion, calificacion, rol)
  values (
    v_trab.id, v_conv.id, v_conv.titulo, v_empresa, v_conv.categoria,
    case p_rol when 'LOGISTICA' then 'Logística' else 'Coordinación' end,
    v_conv.fecha, v_conv.remuneracion, v_puntaje, p_rol
  );

  perform public.notificar(v_trab.id, 'CALIFICACION',
    format('%s calificó tu servicio en «%s» con %s ★.', v_empresa, v_conv.titulo, to_char(v_puntaje, 'FM0.0')));
  return v_puntaje;
end;
$$;

-- RF-13 y RF-14 · Publicar o editar una convocatoria con sus requisitos
create function public.guardar_convocatoria(
  p_id bigint,
  p_titulo text,
  p_categoria public.categoria_convocatoria,
  p_ubicacion text,
  p_fecha date,
  p_hora_inicio time,
  p_hora_fin time,
  p_plazas integer,
  p_remuneracion integer,
  p_descripcion text,
  p_requisitos text[] default '{}'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa bigint := public.mi_empresa();
  v_conv public.convocatoria;
  v_seleccionados integer;
  v_id bigint;
  v_requisito text;
  v_orden integer := 0;
  v_razon_social text;
begin
  if v_empresa is null then
    raise exception 'Solo un coordinador de empresa puede publicar convocatorias.';
  end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_ubicacion), '') = '' or coalesce(trim(p_descripcion), '') = '' then
    raise exception 'El cargo, la ubicación y la descripción son obligatorios.';
  end if;
  if p_plazas is null or p_plazas < 1 then
    raise exception 'El número de trabajadores debe ser mayor que cero.';
  end if;
  if p_remuneracion is null or p_remuneracion <= 0 then
    raise exception 'La remuneración debe ser mayor que cero.';
  end if;
  if p_hora_fin <= p_hora_inicio then
    raise exception 'La hora de fin debe ser posterior a la hora de inicio.';
  end if;

  if p_id is null then
    if p_fecha < public.hoy() then
      raise exception 'La fecha no puede ser anterior a hoy.';
    end if;
    insert into public.convocatoria
      (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
       plazas_totales, plazas_disponibles, remuneracion, descripcion)
    values
      (v_empresa, auth.uid(), trim(p_titulo), p_categoria, trim(p_ubicacion), p_fecha, p_hora_inicio, p_hora_fin,
       p_plazas, p_plazas, p_remuneracion, trim(p_descripcion))
    returning id into v_id;

    -- RF-25 · Aviso de nueva convocatoria a los trabajadores
    select e.razon_social into v_razon_social from public.empresa e where e.id = v_empresa;
    insert into public.notificacion (id_usuario, tipo, mensaje)
    select t.id, 'NUEVA_CONVOCATORIA', format('%s publicó «%s».', v_razon_social, trim(p_titulo))
    from public.trabajador t;
  else
    select * into v_conv from public.convocatoria c where c.id = p_id for update;
    if not found or v_conv.id_empresa <> v_empresa then
      raise exception 'La convocatoria no pertenece a tu empresa.';
    end if;
    if p_fecha <> v_conv.fecha and p_fecha < public.hoy() then
      raise exception 'La nueva fecha no puede ser anterior a hoy.';
    end if;
    select count(*) into v_seleccionados
    from public.postulacion p
    where p.id_convocatoria = p_id and p.estado = 'SELECCIONADO';
    if p_plazas < v_seleccionados then
      raise exception 'Ya hay % trabajadores seleccionados: las plazas no pueden ser menos.', v_seleccionados;
    end if;
    update public.convocatoria set
      titulo = trim(p_titulo),
      categoria = p_categoria,
      ubicacion = trim(p_ubicacion),
      fecha = p_fecha,
      hora_inicio = p_hora_inicio,
      hora_fin = p_hora_fin,
      plazas_totales = p_plazas,
      plazas_disponibles = p_plazas - v_seleccionados,
      remuneracion = p_remuneracion,
      descripcion = trim(p_descripcion),
      estado = case
        when estado = 'CANCELADA' then estado
        when p_plazas - v_seleccionados = 0 then 'CERRADA'::public.estado_convocatoria
        else 'ACTIVA'::public.estado_convocatoria
      end
    where id = p_id;
    delete from public.requisito r where r.id_convocatoria = p_id;
    v_id := p_id;
  end if;

  foreach v_requisito in array coalesce(p_requisitos, '{}'::text[]) loop
    v_requisito := trim(v_requisito);
    continue when v_requisito = '';
    v_orden := v_orden + 1;
    insert into public.requisito (id_convocatoria, descripcion, orden) values (v_id, v_requisito, v_orden);
  end loop;
  return v_id;
end;
$$;

-- RF-09 · Editar los datos del perfil del trabajador (el correo no es editable)
create function public.actualizar_perfil_trabajador(
  p_nombres text,
  p_apellidos text,
  p_cargo text,
  p_ubicacion text,
  p_celular text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.trabajador t where t.id = auth.uid()) then
    raise exception 'Solo una cuenta de trabajador puede editar este perfil.';
  end if;
  if coalesce(trim(p_nombres), '') = '' or coalesce(trim(p_apellidos), '') = ''
     or coalesce(trim(p_cargo), '') = '' or coalesce(trim(p_ubicacion), '') = '' or coalesce(trim(p_celular), '') = '' then
    raise exception 'Completa todos los campos del perfil.';
  end if;
  update public.perfil set nombres = trim(p_nombres), apellidos = trim(p_apellidos) where id = auth.uid();
  update public.trabajador set cargo = trim(p_cargo), ubicacion = trim(p_ubicacion) where id = auth.uid();
  update public.contacto set celular = trim(p_celular) where id = auth.uid();
end;
$$;

-- RF-09 · Reemplazar la lista de habilidades del trabajador
create function public.guardar_habilidades(p_habilidades text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
  v_id bigint;
  v_orden integer := 0;
begin
  if not exists (select 1 from public.trabajador t where t.id = auth.uid()) then
    raise exception 'Solo una cuenta de trabajador puede editar habilidades.';
  end if;
  delete from public.trabajador_habilidad th where th.id_trabajador = auth.uid();
  foreach v_nombre in array coalesce(p_habilidades, '{}'::text[]) loop
    v_nombre := trim(v_nombre);
    continue when v_nombre = '';
    select h.id into v_id from public.habilidad h where lower(h.nombre) = lower(v_nombre) limit 1;
    if v_id is null then
      insert into public.habilidad (nombre) values (v_nombre) returning id into v_id;
    end if;
    v_orden := v_orden + 1;
    insert into public.trabajador_habilidad (id_trabajador, id_habilidad, orden)
    values (auth.uid(), v_id, v_orden)
    on conflict do nothing;
    v_id := null;
  end loop;
end;
$$;

-- RF-03 · Guardar la URL de la fotografía de perfil (subida a Storage)
create function public.actualizar_avatar(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_url is null or p_url not like 'https://%' then
    raise exception 'La dirección de la fotografía no es válida.';
  end if;
  update public.perfil set avatar_url = p_url where id = auth.uid();
  update public.trabajador set perfil_completo = true where id = auth.uid();
end;
$$;

-- RF-25 · Marcar las notificaciones como leídas
create function public.marcar_notificaciones_leidas()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notificacion set leida = true where id_usuario = auth.uid() and not leida;
$$;

-- ---------- Permisos de ejecución ----------
-- Utilidades internas y triggers: nadie las invoca desde la API
revoke execute on function public.notificar(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.notificar_empresa(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.crear_cuenta() from public, anon, authenticated;
revoke execute on function public.contar_candidatos() from public, anon, authenticated;
revoke execute on function public.registrar_traza() from public, anon, authenticated;

-- Casos de uso: solo usuarios autenticados
revoke execute on function public.hoy() from public, anon;
revoke execute on function public.postularse(bigint) from public, anon;
revoke execute on function public.cancelar_postulacion(bigint) from public, anon;
revoke execute on function public.decidir_postulacion(bigint, boolean) from public, anon;
revoke execute on function public.cruce_horario(bigint, uuid) from public, anon;
revoke execute on function public.asignar_directamente(bigint, uuid) from public, anon;
revoke execute on function public.responder_asignacion(bigint, boolean, text) from public, anon;
revoke execute on function public.calificar(bigint, public.rol_evaluado, integer, integer, integer, text) from public, anon;
revoke execute on function public.guardar_convocatoria(bigint, text, public.categoria_convocatoria, text, date, time, time, integer, integer, text, text[]) from public, anon;
revoke execute on function public.actualizar_perfil_trabajador(text, text, text, text, text) from public, anon;
revoke execute on function public.guardar_habilidades(text[]) from public, anon;
revoke execute on function public.actualizar_avatar(text) from public, anon;
revoke execute on function public.marcar_notificaciones_leidas() from public, anon;

grant execute on function public.hoy() to authenticated;
grant execute on function public.postularse(bigint) to authenticated;
grant execute on function public.cancelar_postulacion(bigint) to authenticated;
grant execute on function public.decidir_postulacion(bigint, boolean) to authenticated;
grant execute on function public.cruce_horario(bigint, uuid) to authenticated;
grant execute on function public.asignar_directamente(bigint, uuid) to authenticated;
grant execute on function public.responder_asignacion(bigint, boolean, text) to authenticated;
grant execute on function public.calificar(bigint, public.rol_evaluado, integer, integer, integer, text) to authenticated;
grant execute on function public.guardar_convocatoria(bigint, text, public.categoria_convocatoria, text, date, time, time, integer, integer, text, text[]) to authenticated;
grant execute on function public.actualizar_perfil_trabajador(text, text, text, text, text) to authenticated;
grant execute on function public.guardar_habilidades(text[]) to authenticated;
grant execute on function public.actualizar_avatar(text) to authenticated;
grant execute on function public.marcar_notificaciones_leidas() to authenticated;

-- ---------- Fotografías de perfil (RF-03): JPG/PNG de hasta 5 MB ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png']);

create policy "Cada usuario ve los archivos de su carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada usuario sube su fotografía" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada usuario reemplaza su fotografía" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada usuario borra su fotografía" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
