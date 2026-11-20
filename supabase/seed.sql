-- =====================================================================
-- Smart Logistics · Datos de demostración
-- Recrea las empresas, trabajadores y convocatorias del prototipo.
-- Las fechas son relativas al día en que se ejecuta, para que la demo
-- siempre tenga ofertas vigentes y un servicio pendiente por calificar.
--
-- Cuentas de demostración (contraseña de todas: SmartDemo2026*)
--   Trabajadores: carlos@smartlogistics.test, luisa@..., andres@..., maria@...,
--                 diego@..., sandra@smartlogistics.test
--   Empresas:     eventosnova@smartlogistics.test, logimax@..., deliverco@...,
--                 corporate@smartlogistics.test
-- =====================================================================

-- ---------- Cuentas (el trigger al_crear_usuario crea perfil, trabajador o empresa) ----------
do $$
declare
  v_clave text := extensions.crypt('SmartDemo2026*', extensions.gen_salt('bf'));
  r record;
begin
  for r in
    select * from (values
      ('11111111-1111-4111-8111-000000000001'::uuid, 'carlos@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"Carlos","apellidos":"Rodríguez","celular":"+57 300 123 4567","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('11111111-1111-4111-8111-000000000002'::uuid, 'luisa@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"Luisa","apellidos":"Martínez","celular":"+57 301 555 1020","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('11111111-1111-4111-8111-000000000003'::uuid, 'andres@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"Andrés","apellidos":"García","celular":"+57 310 222 3344","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('11111111-1111-4111-8111-000000000004'::uuid, 'maria@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"María","apellidos":"Torres","celular":"+57 315 777 8899","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('11111111-1111-4111-8111-000000000005'::uuid, 'diego@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"Diego","apellidos":"Vargas","celular":"+57 320 444 5566","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('11111111-1111-4111-8111-000000000006'::uuid, 'sandra@smartlogistics.test',
       '{"tipo":"TRABAJADOR","nombres":"Sandra","apellidos":"Pérez","celular":"+57 312 888 9900","pais":"Colombia","departamento":"Bogotá"}'::jsonb),
      ('22222222-2222-4222-8222-000000000001'::uuid, 'eventosnova@smartlogistics.test',
       '{"tipo":"EMPRESA","razon_social":"Eventos Nova","sector":"Empresa de eventos","pais":"Colombia","ciudad":"Bogotá","telefono":"+57 300 456 7890","responsable":"Laura Gómez"}'::jsonb),
      ('22222222-2222-4222-8222-000000000002'::uuid, 'logimax@smartlogistics.test',
       '{"tipo":"EMPRESA","razon_social":"LogiMax S.A.S.","sector":"Operador logístico","pais":"Colombia","ciudad":"Bogotá","telefono":"+57 601 345 6789","responsable":"Jorge Ramírez"}'::jsonb),
      ('22222222-2222-4222-8222-000000000003'::uuid, 'deliverco@smartlogistics.test',
       '{"tipo":"EMPRESA","razon_social":"DeliverCo Colombia","sector":"Mensajería y reparto","pais":"Colombia","ciudad":"Bogotá","telefono":"+57 601 765 4321","responsable":"Paula Rojas"}'::jsonb),
      ('22222222-2222-4222-8222-000000000004'::uuid, 'corporate@smartlogistics.test',
       '{"tipo":"EMPRESA","razon_social":"Corporate Events & Co.","sector":"Eventos corporativos","pais":"Colombia","ciudad":"Bogotá","telefono":"+57 601 234 5678","responsable":"Andrea Castro"}'::jsonb)
    ) as t(id, email, meta)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email, v_clave, now(),
      '{"provider":"email","providers":["email"]}', r.meta, now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), r.id, r.id::text,
      jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

-- ---------- Indicadores acumulados de los trabajadores ----------
update public.trabajador t set
  cargo = v.cargo,
  anios_experiencia = v.anios,
  puntualidad_pct = v.puntualidad,
  calificacion_global = v.global,
  reputacion_logistica = v.logistica,
  reputacion_coordinador = v.coordinador,
  calificaciones_logistica = v.n_logistica,
  calificaciones_coordinador = v.n_coordinador,
  trabajos_realizados = v.trabajos,
  empresas_colaboradoras = v.empresas,
  perfil_completo = true
from (values
  ('11111111-1111-4111-8111-000000000001'::uuid, 'Auxiliar Logístico', 3, 96, 4.8, 4.9, 4.6, 40, 7, 47, 12),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'Coordinadora de Eventos', 5, 98, 4.6, 4.7, 4.8, 50, 32, 82, 18),
  ('11111111-1111-4111-8111-000000000003'::uuid, 'Auxiliar de Almacén', 2, 91, 4.3, 4.4, 4.1, 24, 4, 28, 7),
  ('11111111-1111-4111-8111-000000000004'::uuid, 'Auxiliar Logística', 6, 99, 4.9, 5.0, 4.8, 80, 23, 103, 21),
  ('11111111-1111-4111-8111-000000000005'::uuid, 'Auxiliar Logístico', 1, 88, 4.1, 4.2, 3.9, 12, 2, 14, 4),
  ('11111111-1111-4111-8111-000000000006'::uuid, 'Operaria de Almacén', 4, 94, 4.5, 4.6, 4.3, 50, 11, 61, 9)
) as v(id, cargo, anios, puntualidad, global, logistica, coordinador, n_logistica, n_coordinador, trabajos, empresas)
where t.id = v.id;

-- ---------- Datos públicos de las empresas ----------
update public.empresa e set
  nit = v.nit,
  verificada = true,
  valoracion = v.valoracion,
  descripcion = v.descripcion
from (values
  ('eventosnova@smartlogistics.test', '900123456-1', 4.7,
   'Empresa líder en organización de eventos corporativos y ferias empresariales con más de 10 años de experiencia en el mercado colombiano.'),
  ('logimax@smartlogistics.test', '900234567-2', 4.5,
   'Operador logístico especializado en almacenamiento, inventarios y despacho de mercancía.'),
  ('deliverco@smartlogistics.test', '900345678-3', 4.2,
   'Red de reparto de última milla con cobertura en Bogotá y municipios cercanos.'),
  ('corporate@smartlogistics.test', '900456789-4', 4.8,
   'Producción de eventos corporativos, lanzamientos de marca y congresos.')
) as v(correo, nit, valoracion, descripcion)
where e.correo = v.correo;

-- ---------- Convocatorias, postulaciones, historial y habilidades ----------
do $$
declare
  v_hoy date := public.hoy();
  u_carlos uuid := '11111111-1111-4111-8111-000000000001';
  u_luisa uuid := '11111111-1111-4111-8111-000000000002';
  u_andres uuid := '11111111-1111-4111-8111-000000000003';
  u_maria uuid := '11111111-1111-4111-8111-000000000004';
  u_diego uuid := '11111111-1111-4111-8111-000000000005';
  u_sandra uuid := '11111111-1111-4111-8111-000000000006';
  k_nova uuid := '22222222-2222-4222-8222-000000000001';
  k_logimax uuid := '22222222-2222-4222-8222-000000000002';
  k_deliver uuid := '22222222-2222-4222-8222-000000000003';
  k_corp uuid := '22222222-2222-4222-8222-000000000004';
  e_nova bigint;
  e_logimax bigint;
  e_deliver bigint;
  e_corp bigint;
  c_montaje bigint;
  c_concierto bigint;
  c_almacen bigint;
  c_reparto bigint;
  c_corporativo bigint;
  c_navidena bigint;
  r record;
begin
  select id_empresa into e_nova from public.coordinador where id = k_nova;
  select id_empresa into e_logimax from public.coordinador where id = k_logimax;
  select id_empresa into e_deliver from public.coordinador where id = k_deliver;
  select id_empresa into e_corp from public.coordinador where id = k_corp;

  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_nova, k_nova, 'Auxiliares de Montaje – Feria Tecnológica', 'MONTAJE', 'Bogotá, Corferias',
          v_hoy + 15, '08:00', '18:00', 12, 12, 80000,
          'Se requieren auxiliares de montaje para la instalación de stands y estructuras de la Feria Tecnológica Colombia 2026. El trabajo incluye armado de estructuras metálicas, montaje de mobiliario, instalación de señalética y verificación de los espacios asignados.')
  returning id into c_montaje;

  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_nova, k_nova, 'Auxiliares Logísticos – Concierto Internacional', 'EVENTO', 'Bogotá, El Campín',
          v_hoy + 30, '10:00', '22:00', 25, 25, 95000,
          'Gran convocatoria para el concierto internacional más importante del año. Se requiere personal para logística general, control de accesos, manejo de materiales escénicos y apoyo en producción.')
  returning id into c_concierto;

  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_logimax, k_logimax, 'Operarios de Almacén – Temporada Alta', 'ALMACEN', 'Bogotá, Zona Franca',
          v_hoy + 20, '06:00', '14:00', 8, 8, 65000,
          'Buscamos operarios para apoyar la gestión de inventario y despacho de mercancía durante la temporada alta de fin de año. Actividades incluyen recepción de mercancía, clasificación, almacenamiento y preparación de pedidos.')
  returning id into c_almacen;

  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_deliver, k_deliver, 'Auxiliares de Reparto – Última Milla', 'REPARTO', 'Bogotá Norte',
          v_hoy + 18, '07:00', '15:00', 15, 15, 70000,
          'Se requieren auxiliares para apoyo en reparto de última milla en la zona norte de Bogotá. El trabajo consiste en cargue, descargue y entrega de paquetes en las rutas asignadas, con apoyo de aplicación móvil de seguimiento.')
  returning id into c_reparto;

  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_corp, k_corp, 'Personal para Evento Corporativo', 'EVENTO', 'Bogotá, Hotel Tequendama',
          v_hoy + 22, '14:00', '23:00', 6, 6, 90000,
          'Se busca personal logístico para evento corporativo de empresa multinacional. Las actividades incluyen registro de asistentes, logística de materiales, apoyo en sala, coordinación de catering y desmontaje al finalizar el evento.')
  returning id into c_corporativo;

  -- Oferta sin postulaciones de Carlos, para probar la postulación (RF-17)
  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  select e_logimax, k_logimax, 'Auxiliares de Cargue – Centro de Distribución', 'ALMACEN', 'Funza, Parque Industrial',
         v_hoy + 9, '05:00', '13:00', 10, 10, 72000,
         'Apoyo en el cargue y descargue de vehículos, organización de estibas y alistamiento de despachos en el centro de distribución.';
  insert into public.requisito (id_convocatoria, descripcion, orden)
  select c.id, d, o
  from public.convocatoria c,
       unnest(array['Buena condición física', 'Disponibilidad desde las 5:00 a. m.', 'Botas de seguridad']) with ordinality as x(d, o)
  where c.titulo = 'Auxiliares de Cargue – Centro de Distribución';

  -- Servicio ya prestado: queda pendiente de calificar (RF-23)
  insert into public.convocatoria (id_empresa, creada_por, titulo, categoria, ubicacion, fecha, hora_inicio, hora_fin,
                                   plazas_totales, plazas_disponibles, remuneracion, descripcion)
  values (e_nova, k_nova, 'Personal Logístico – Feria Navideña', 'EVENTO', 'Bogotá, Plaza de los Artesanos',
          v_hoy - 4, '09:00', '19:00', 6, 6, 85000,
          'Apoyo logístico en la feria navideña: montaje de puestos, control de ingreso de expositores y atención de visitantes.')
  returning id into c_navidena;

  insert into public.requisito (id_convocatoria, descripcion, orden)
  select c_montaje, d, o from unnest(array[
    'Experiencia mínima de 1 año en montaje de eventos', 'Capacidad para trabajo físico moderado',
    'Disponibilidad de 08:00 a 18:00', 'Responsabilidad y puntualidad', 'Trabajo en equipo'
  ]) with ordinality as x(d, o)
  union all
  select c_concierto, d, o from unnest(array[
    'Experiencia en eventos masivos', 'Capacidad para trabajo bajo presión',
    'Disponibilidad de 10:00 a 22:00', 'Certificado de curso de primeros auxilios (deseable)'
  ]) with ordinality as x(d, o)
  union all
  select c_almacen, d, o from unnest(array[
    'Experiencia en manejo de inventarios', 'Conocimiento básico de WMS o RF',
    'Disponibilidad para turno matutino', 'Certificado de alturas (deseable)'
  ]) with ordinality as x(d, o)
  union all
  select c_reparto, d, o from unnest(array[
    'Experiencia en reparto o mensajería', 'Buen estado físico',
    'Habilidad para manejo de app móvil', 'Conocimiento de la zona norte de Bogotá'
  ]) with ordinality as x(d, o)
  union all
  select c_corporativo, d, o from unnest(array[
    'Presentación formal obligatoria', 'Experiencia en eventos corporativos', 'Inglés básico (deseable)',
    'Excelente actitud de servicio', 'Disponibilidad nocturna'
  ]) with ordinality as x(d, o)
  union all
  select c_navidena, d, o from unnest(array[
    'Experiencia en ferias o eventos', 'Atención al público', 'Disponibilidad de 09:00 a 19:00'
  ]) with ordinality as x(d, o);

  -- Postulaciones (los triggers cuentan candidatos y registran la trazabilidad)
  insert into public.postulacion (id_convocatoria, id_trabajador, origen, estado, respuesta_trabajador) values
    (c_montaje, u_carlos, 'POSTULACION', 'SELECCIONADO', null),
    (c_montaje, u_luisa, 'POSTULACION', 'EN_REVISION', null),
    (c_montaje, u_andres, 'POSTULACION', 'EN_REVISION', null),
    (c_montaje, u_maria, 'POSTULACION', 'EN_REVISION', null),
    (c_montaje, u_diego, 'POSTULACION', 'NO_SELECCIONADO', null),
    (c_montaje, u_sandra, 'POSTULACION', 'EN_REVISION', null),
    (c_concierto, u_carlos, 'ASIGNACION_DIRECTA', 'EN_REVISION', 'PENDIENTE'),
    (c_concierto, u_maria, 'POSTULACION', 'EN_REVISION', null),
    (c_concierto, u_luisa, 'POSTULACION', 'EN_REVISION', null),
    (c_almacen, u_carlos, 'POSTULACION', 'EN_REVISION', null),
    (c_almacen, u_andres, 'POSTULACION', 'SELECCIONADO', null),
    (c_almacen, u_sandra, 'POSTULACION', 'EN_REVISION', null),
    (c_reparto, u_carlos, 'POSTULACION', 'NO_SELECCIONADO', null),
    (c_reparto, u_diego, 'POSTULACION', 'EN_REVISION', null),
    (c_corporativo, u_carlos, 'POSTULACION', 'SELECCIONADO', null),
    (c_corporativo, u_maria, 'POSTULACION', 'SELECCIONADO', null),
    (c_navidena, u_carlos, 'POSTULACION', 'SELECCIONADO', null),
    (c_navidena, u_maria, 'POSTULACION', 'SELECCIONADO', null),
    (c_navidena, u_sandra, 'POSTULACION', 'SELECCIONADO', null),
    (c_navidena, u_luisa, 'POSTULACION', 'NO_SELECCIONADO', null);

  update public.convocatoria c
     set plazas_disponibles = c.plazas_totales - (
       select count(*) from public.postulacion p where p.id_convocatoria = c.id and p.estado = 'SELECCIONADO'
     );

  -- Historial laboral acumulado
  insert into public.historial_laboral (id_trabajador, evento, empresa, categoria, funcion, fecha, remuneracion, calificacion, rol) values
    (u_carlos, 'Auxiliar de Montaje – Expo Construcción', 'Eventos Nova', 'MONTAJE', 'Logística', v_hoy - 102, 80000, 4.9, 'LOGISTICA'),
    (u_carlos, 'Operario de Almacén – Despachos', 'LogiMax S.A.S.', 'ALMACEN', 'Logística', v_hoy - 118, 65000, 4.8, 'LOGISTICA'),
    (u_carlos, 'Personal Logístico – Feria del Hogar', 'Eventos Nova', 'EVENTO', 'Coordinación', v_hoy - 131, 85000, 5.0, 'COORDINADOR'),
    (u_carlos, 'Auxiliar de Reparto – Temporada Escolar', 'DeliverCo Colombia', 'REPARTO', 'Logística', v_hoy - 153, 70000, 4.7, 'LOGISTICA'),
    (u_carlos, 'Auxiliar de Montaje – Congreso Médico', 'Corporate Events & Co.', 'MONTAJE', 'Logística', v_hoy - 168, 90000, 4.9, 'LOGISTICA'),
    (u_carlos, 'Operario de Almacén – Inventario Semestral', 'Almacenes Express', 'ALMACEN', 'Logística', v_hoy - 186, 65000, 4.6, 'LOGISTICA'),
    (u_luisa, 'Coordinadora de Personal – Feria del Hogar', 'Eventos Nova', 'EVENTO', 'Coordinación', v_hoy - 131, 110000, 4.8, 'COORDINADOR'),
    (u_luisa, 'Auxiliar de Montaje – Expo Construcción', 'Eventos Nova', 'MONTAJE', 'Logística', v_hoy - 102, 80000, 4.7, 'LOGISTICA'),
    (u_luisa, 'Coordinadora de Registro – Congreso Médico', 'Corporate Events & Co.', 'EVENTO', 'Coordinación', v_hoy - 168, 120000, 4.9, 'COORDINADOR'),
    (u_andres, 'Operario de Almacén – Despachos', 'LogiMax S.A.S.', 'ALMACEN', 'Logística', v_hoy - 118, 65000, 4.4, 'LOGISTICA'),
    (u_andres, 'Auxiliar de Reparto – Temporada Escolar', 'DeliverCo Colombia', 'REPARTO', 'Logística', v_hoy - 153, 70000, 4.3, 'LOGISTICA'),
    (u_andres, 'Auxiliar de Bodega – Inventario Semestral', 'Almacenes Express', 'ALMACEN', 'Logística', v_hoy - 186, 65000, 4.2, 'LOGISTICA'),
    (u_maria, 'Personal Logístico – Feria del Hogar', 'Eventos Nova', 'EVENTO', 'Logística', v_hoy - 131, 85000, 5.0, 'LOGISTICA'),
    (u_maria, 'Auxiliar de Montaje – Congreso Médico', 'Corporate Events & Co.', 'MONTAJE', 'Logística', v_hoy - 168, 90000, 4.9, 'LOGISTICA'),
    (u_maria, 'Auxiliar Logística – Festival de Verano', 'Eventos Nova', 'EVENTO', 'Logística', v_hoy - 184, 85000, 4.8, 'LOGISTICA'),
    (u_diego, 'Auxiliar de Montaje – Expo Construcción', 'Eventos Nova', 'MONTAJE', 'Logística', v_hoy - 102, 80000, 4.0, 'LOGISTICA'),
    (u_diego, 'Auxiliar de Reparto – Última Milla', 'DeliverCo Colombia', 'REPARTO', 'Logística', v_hoy - 141, 70000, 4.2, 'LOGISTICA'),
    (u_sandra, 'Operaria de Almacén – Despachos', 'LogiMax S.A.S.', 'ALMACEN', 'Logística', v_hoy - 118, 65000, 4.5, 'LOGISTICA'),
    (u_sandra, 'Operaria de Almacén – Inventario Semestral', 'Almacenes Express', 'ALMACEN', 'Logística', v_hoy - 186, 65000, 4.6, 'LOGISTICA');

  -- Habilidades
  for r in
    select * from (values
      (u_carlos, array['Manejo de inventario', 'Montaje de stands', 'Carga y descarga', 'Atención al cliente',
                       'Logística de eventos', 'Excel básico', 'Coordinación de equipos', 'Seguridad industrial']),
      (u_luisa, array['Coordinación de equipos', 'Manejo de personal', 'Excel avanzado']),
      (u_andres, array['Manejo de inventario', 'Montacargas', 'Carga y descarga']),
      (u_maria, array['Logística de eventos', 'Control de accesos', 'Atención al cliente']),
      (u_diego, array['Carga y descarga', 'Montaje de stands']),
      (u_sandra, array['Manejo de inventario', 'Picking y packing', 'Excel básico'])
    ) as t(id, habilidades)
  loop
    insert into public.habilidad (nombre)
    select unnest(r.habilidades)
    on conflict (nombre) do nothing;
    insert into public.trabajador_habilidad (id_trabajador, id_habilidad, orden)
    select r.id, h.id, x.o
    from unnest(r.habilidades) with ordinality as x(nombre, o)
    join public.habilidad h on h.nombre = x.nombre;
  end loop;

  -- Avisos iniciales
  insert into public.notificacion (id_usuario, tipo, mensaje) values
    (u_carlos, 'ASIGNACION_DIRECTA', 'Eventos Nova te asignó directamente a «Auxiliares Logísticos – Concierto Internacional». Acepta o rechaza la asignación.'),
    (u_carlos, 'SELECCIONADO', '¡Corporate Events & Co. te seleccionó para «Personal para Evento Corporativo»!'),
    (k_nova, 'NUEVA_POSTULACION', 'Nuevo candidato para «Auxiliares de Montaje – Feria Tecnológica».');
end $$;
