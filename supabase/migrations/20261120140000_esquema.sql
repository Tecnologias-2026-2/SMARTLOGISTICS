-- =====================================================================
-- Smart Logistics · 01 · Esquema de datos (capa de persistencia)
-- Modelo entidad-relación del documento de ingeniería sobre Supabase.
-- USUARIO.password_hash y SESION los gestiona Supabase Auth
-- (auth.users con bcrypt y auth.sessions con JWT), por eso no se crean aquí.
-- =====================================================================

-- ---------- Tipos ----------
create type public.modo_usuario as enum ('TRABAJADOR', 'EMPRESA');
create type public.categoria_convocatoria as enum ('EVENTO', 'ALMACEN', 'MONTAJE', 'REPARTO');
create type public.estado_convocatoria as enum ('ACTIVA', 'CERRADA', 'CANCELADA');
create type public.origen_postulacion as enum ('POSTULACION', 'ASIGNACION_DIRECTA');
create type public.estado_postulacion as enum ('EN_REVISION', 'SELECCIONADO', 'NO_SELECCIONADO');
create type public.respuesta_asignacion as enum ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');
create type public.rol_evaluado as enum ('LOGISTICA', 'COORDINADOR');

-- ---------- Identidad ----------
create table public.perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nombres text not null,
  apellidos text not null default '',
  avatar_url text,
  modo_activo public.modo_usuario not null default 'TRABAJADOR',
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO', 'INACTIVO')),
  created_at timestamptz not null default now()
);
comment on table public.perfil is 'USUARIO: datos públicos de la cuenta, común a los dos modos.';

create table public.contacto (
  id uuid primary key references public.perfil (id) on delete cascade,
  email text not null,
  celular text,
  pais text,
  departamento text
);
comment on table public.contacto is 'Datos personales de contacto (Ley 1581 de 2012): solo los ve su dueño.';

create table public.empresa (
  id bigint generated always as identity primary key,
  nit text unique,
  razon_social text not null,
  sector text not null,
  ciudad text,
  pais text,
  telefono text,
  correo text,
  descripcion text,
  verificada boolean not null default false,
  valoracion numeric(3, 2) not null default 0 check (valoracion between 0 and 5),
  created_at timestamptz not null default now()
);

create table public.coordinador (
  id uuid primary key references public.perfil (id) on delete cascade,
  id_empresa bigint not null references public.empresa (id) on delete cascade,
  cargo text not null default 'Coordinador de empresa'
);
create index coordinador_id_empresa_idx on public.coordinador (id_empresa);

create table public.trabajador (
  id uuid primary key references public.perfil (id) on delete cascade,
  cargo text not null default 'Auxiliar Logístico',
  ubicacion text,
  anios_experiencia integer not null default 0 check (anios_experiencia >= 0),
  puntualidad_pct numeric(5, 2) not null default 0 check (puntualidad_pct between 0 and 100),
  calificacion_global numeric(3, 2) not null default 0 check (calificacion_global between 0 and 5),
  reputacion_logistica numeric(3, 2) not null default 0 check (reputacion_logistica between 0 and 5),
  reputacion_coordinador numeric(3, 2) not null default 0 check (reputacion_coordinador between 0 and 5),
  calificaciones_logistica integer not null default 0,
  calificaciones_coordinador integer not null default 0,
  trabajos_realizados integer not null default 0,
  empresas_colaboradoras integer not null default 0,
  perfil_completo boolean not null default false
);

-- ---------- Oferta ----------
create table public.convocatoria (
  id bigint generated always as identity primary key,
  id_empresa bigint not null references public.empresa (id) on delete cascade,
  creada_por uuid references public.perfil (id) on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  categoria public.categoria_convocatoria not null,
  ubicacion text not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  plazas_totales integer not null check (plazas_totales > 0),
  plazas_disponibles integer not null check (plazas_disponibles >= 0),
  remuneracion integer not null check (remuneracion > 0),
  descripcion text not null,
  estado public.estado_convocatoria not null default 'ACTIVA',
  candidatos integer not null default 0,
  created_at timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  check (plazas_disponibles <= plazas_totales)
);
create index convocatoria_id_empresa_idx on public.convocatoria (id_empresa);
create index convocatoria_creada_por_idx on public.convocatoria (creada_por);
create index convocatoria_fecha_idx on public.convocatoria (fecha);

create table public.requisito (
  id bigint generated always as identity primary key,
  id_convocatoria bigint not null references public.convocatoria (id) on delete cascade,
  descripcion text not null,
  orden integer not null default 0
);
create index requisito_id_convocatoria_idx on public.requisito (id_convocatoria);

-- ---------- Operación ----------
create table public.postulacion (
  id bigint generated always as identity primary key,
  id_convocatoria bigint not null references public.convocatoria (id) on delete cascade,
  id_trabajador uuid not null references public.trabajador (id) on delete cascade,
  origen public.origen_postulacion not null default 'POSTULACION',
  estado public.estado_postulacion not null default 'EN_REVISION',
  respuesta_trabajador public.respuesta_asignacion,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id_convocatoria, id_trabajador)
);
comment on table public.postulacion is 'Entidad central: une una convocatoria con un trabajador (una sola por convocatoria).';
create index postulacion_id_trabajador_idx on public.postulacion (id_trabajador);

create table public.postulacion_evento (
  id bigint generated always as identity primary key,
  id_postulacion bigint not null references public.postulacion (id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  detalle text,
  responsable uuid,
  created_at timestamptz not null default now()
);
comment on table public.postulacion_evento is 'Trazabilidad (RNF-14): cada cambio de estado con fecha, hora y responsable.';
create index postulacion_evento_id_postulacion_idx on public.postulacion_evento (id_postulacion);

create table public.calificacion (
  id bigint generated always as identity primary key,
  id_postulacion bigint not null unique references public.postulacion (id) on delete cascade,
  evaluador uuid references public.perfil (id) on delete set null,
  rol_evaluado public.rol_evaluado not null,
  puntualidad smallint not null check (puntualidad between 1 and 5),
  eficiencia smallint not null check (eficiencia between 1 and 5),
  actitud smallint not null check (actitud between 1 and 5),
  puntaje numeric(3, 2) generated always as (round((puntualidad + eficiencia + actitud) / 3.0, 2)) stored,
  comentario text,
  created_at timestamptz not null default now()
);
create index calificacion_evaluador_idx on public.calificacion (evaluador);

create table public.historial_laboral (
  id bigint generated always as identity primary key,
  id_trabajador uuid not null references public.trabajador (id) on delete cascade,
  id_convocatoria bigint references public.convocatoria (id) on delete set null,
  evento text not null,
  empresa text not null,
  categoria public.categoria_convocatoria not null,
  funcion text,
  fecha date not null,
  remuneracion integer,
  calificacion numeric(3, 2),
  rol public.rol_evaluado,
  created_at timestamptz not null default now()
);
create index historial_laboral_id_trabajador_idx on public.historial_laboral (id_trabajador);
create index historial_laboral_id_convocatoria_idx on public.historial_laboral (id_convocatoria);

create table public.habilidad (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.trabajador_habilidad (
  id_trabajador uuid not null references public.trabajador (id) on delete cascade,
  id_habilidad bigint not null references public.habilidad (id) on delete cascade,
  orden integer not null default 0,
  primary key (id_trabajador, id_habilidad)
);
create index trabajador_habilidad_id_habilidad_idx on public.trabajador_habilidad (id_habilidad);

create table public.notificacion (
  id bigint generated always as identity primary key,
  id_usuario uuid not null references public.perfil (id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
create index notificacion_id_usuario_idx on public.notificacion (id_usuario);

-- ---------- Permisos ----------
-- El navegador solo LEE tablas (filtradas por RLS). Toda escritura pasa por
-- las funciones de la capa de dominio (migración 02), que validan las reglas.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;

-- ---------- Seguridad por fila (RLS) ----------
alter table public.perfil enable row level security;
alter table public.contacto enable row level security;
alter table public.empresa enable row level security;
alter table public.coordinador enable row level security;
alter table public.trabajador enable row level security;
alter table public.convocatoria enable row level security;
alter table public.requisito enable row level security;
alter table public.postulacion enable row level security;
alter table public.postulacion_evento enable row level security;
alter table public.calificacion enable row level security;
alter table public.historial_laboral enable row level security;
alter table public.habilidad enable row level security;
alter table public.trabajador_habilidad enable row level security;
alter table public.notificacion enable row level security;

-- Empresa del coordinador que hace la petición (null si no es coordinador)
create function public.mi_empresa()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select c.id_empresa from public.coordinador c where c.id = (select auth.uid());
$$;
revoke execute on function public.mi_empresa() from public, anon;
grant execute on function public.mi_empresa() to authenticated;

create policy "Perfiles visibles para usuarios autenticados" on public.perfil
  for select to authenticated using (true);

create policy "Cada usuario ve su propio contacto" on public.contacto
  for select to authenticated using (id = (select auth.uid()));

create policy "Empresas visibles para usuarios autenticados" on public.empresa
  for select to authenticated using (true);

create policy "Cada coordinador ve su propio registro" on public.coordinador
  for select to authenticated using (id = (select auth.uid()));

create policy "Perfiles profesionales visibles para usuarios autenticados" on public.trabajador
  for select to authenticated using (true);

create policy "Convocatorias visibles para usuarios autenticados" on public.convocatoria
  for select to authenticated using (true);

create policy "Requisitos visibles para usuarios autenticados" on public.requisito
  for select to authenticated using (true);

create policy "Postulaciones del trabajador o de la empresa convocante" on public.postulacion
  for select to authenticated using (
    id_trabajador = (select auth.uid())
    or exists (
      select 1 from public.convocatoria c
      where c.id = postulacion.id_convocatoria
        and c.id_empresa = (select public.mi_empresa())
    )
  );

create policy "Trazabilidad visible para quien ve la postulación" on public.postulacion_evento
  for select to authenticated using (
    exists (select 1 from public.postulacion p where p.id = postulacion_evento.id_postulacion)
  );

-- RNF-12: los comentarios solo los ven el trabajador evaluado y la empresa que evaluó
create policy "Calificaciones del trabajador o de la empresa evaluadora" on public.calificacion
  for select to authenticated using (
    exists (select 1 from public.postulacion p where p.id = calificacion.id_postulacion)
  );

create policy "Historial laboral visible para usuarios autenticados" on public.historial_laboral
  for select to authenticated using (true);

create policy "Catálogo de habilidades visible" on public.habilidad
  for select to authenticated using (true);

create policy "Habilidades de trabajadores visibles" on public.trabajador_habilidad
  for select to authenticated using (true);

create policy "Cada usuario ve sus notificaciones" on public.notificacion
  for select to authenticated using (id_usuario = (select auth.uid()));
