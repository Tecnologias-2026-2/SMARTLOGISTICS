# 🌐 Smart Logistics

Plataforma web que conecta a **trabajadores logísticos** con las **empresas** que necesitan personal por jornada para eventos, operaciones de almacén, montajes y reparto. Convierte la experiencia laboral dispersa del trabajador en una **reputación verificable** y le da a la empresa un criterio objetivo para elegir a su personal.

| | Enlace |
|---|---|
| 🚀 Sitio publicado | https://tecnologias-2026-2.github.io/SMARTLOGISTICS/ |
| 🎨 Prototipo en Figma | https://www.figma.com/design/9Deq4FV8q5Fo29FYCCl4Mm/Untitled?node-id=8-3&t=aw6M8h1xU90aWpyA-0 |
| 📄 Documento de ingeniería | [docs/Smart_Logistics_Documento_Ingenieria.pdf](docs/Smart_Logistics_Documento_Ingenieria.pdf) |

> Proyecto del curso **Tecnologías del Internet** · 2026-2

---

## 👥 Integrantes

| Nombre completo | Código |
|---|---|
| Samuel Cortés Páez | 120850 |
| Jonatan David Benavides Mora | 1202860 |
| Andrés Sánchez | 1202828 |

---

## 🎯 1. Objetivo General

Smart Logistics busca conectar a los trabajadores logísticos con las empresas que requieren personal para eventos, almacén, montajes y reparto, resolviendo la **ausencia de un respaldo formal y verificable de la experiencia laboral** en un sector donde la vinculación se hace por jornada, de forma verbal y por canales dispersos como grupos de WhatsApp. Esa informalidad impide que el trabajador demuestre su trayectoria y que la empresa la valide antes de contratar. Para lograrlo, la plataforma opera con una **cuenta de doble modo** —trabajador y empresa— que concentra en un solo sistema el perfil profesional, las convocatorias, las postulaciones, el historial de trabajos y las calificaciones.

---

## 🌍 2. Contexto de Uso

### ¿Quién va a usar el sistema?

| Actor | Tipo | Descripción | Interés principal |
|---|---|---|---|
| **Trabajador logístico** | Primario | Persona que presta servicios por jornada: montaje, operación de almacén, logística de eventos y reparto de última milla. | Conseguir trabajo de forma continua y acreditar su experiencia. |
| **Coordinador de empresa** | Primario | Usuario en modo empresa: publica convocatorias, revisa candidatos, selecciona personal y evalúa el servicio. | Encontrar personal confiable y dejar registro objetivo de su desempeño. |
| **Empresa contratante** | Secundario | Organización que agrupa a uno o varios coordinadores y bajo la cual se publican las convocatorias. | Reducir el riesgo operativo del personal contratado. |
| **Servicio de notificaciones** | Sistema externo | Componente de terceros que entrega los avisos al navegador y a los dispositivos móviles. | Entregar el aviso en el menor tiempo posible. |

### ¿Cómo se va a utilizar el sistema?

- **Desde el escritorio (web):** el coordinador publica convocatorias, compara candidatos y registra las evaluaciones al cierre de la jornada, tareas que requieren pantalla amplia.
- **Desde el celular:** el trabajador consulta ofertas y su reputación mientras se desplaza, entre turnos o en el sitio de la operación, con poco tiempo y a menudo con una sola mano libre.
- **Cuenta de doble modo:** el mismo usuario alterna entre *modo trabajador* y *modo empresa* sin cerrar la sesión, por lo que puede contratar y ser contratado dentro de la plataforma.

Por eso el diseño es **responsivo**, con flujos cortos, botones amplios y textos breves.

### Problemática que atiende

| Carencia | Situación actual | Consecuencia |
|---|---|---|
| Informalidad en la vinculación | La convocatoria y la confirmación se hacen por llamada o WhatsApp, sin registro. | No hay evidencia de quién fue convocado, quién confirmó ni quién asistió. |
| Ausencia de historial verificable | La experiencia se sustenta en referencias verbales o certificados aislados. | El trabajador no puede demostrar su trayectoria y la empresa no puede validarla. |
| Evaluación no sistemática | El desempeño queda solo en la memoria del coordinador. | Un buen trabajador no acumula reputación y un mal desempeño no queda registrado. |
| Búsqueda ineficiente de personal | La empresa recurre siempre a los mismos contactos o publica sin filtros. | Se pierde talento disponible y la selección no se basa en desempeño previo. |

---

## 📋 3. Requerimientos del Sistema

Los requerimientos se agrupan en cuatro módulos: **M1** Acceso y cuenta, **M2** Perfil y reputación, **M3** Convocatorias, postulación y selección, y **M4** Calificaciones y notificaciones. La columna *Vista* indica la pantalla del prototipo (V-01 a V-23) donde se materializa cada uno.

### 3.1 Requerimientos Funcionales

| ID | Nombre | El sistema debe… | Vista |
|---|---|---|---|
| RF-01 | Acceso público a la plataforma | Ofrecer una página pública con la propuesta de valor, el funcionamiento en tres pasos y los accesos a inicio de sesión y registro. | V-01 |
| RF-02 | Registro de trabajador | Permitir crear una cuenta capturando nombres, apellidos, correo, celular, país, departamento, contraseña y su verificación. | V-04 |
| RF-03 | Fotografía de perfil profesional | Explicar los beneficios de la foto, permitir cargarla desde la galería u omitir el paso, validando formato (JPG/PNG), peso (≤ 5 MB) y resolución mínima (400×400 px). | V-05 a V-07 |
| RF-04 | Inicio de sesión | Autenticar con correo y contraseña, con accesos diferenciados para trabajador y empresa, y dirigir al panel del modo activo. | V-02, V-03 |
| RF-05 | Recuperación de contraseña | Enviar al correo registrado un enlace seguro de un solo uso con caducidad de 30 minutos. | V-08, V-09 |
| RF-06 | Cambio entre modo trabajador y empresa | Permitir alternar de modo sin cerrar la sesión, cambiando el menú y el panel disponibles. | Transversal |
| RF-07 | Cierre de sesión | Cerrar la sesión e invalidar el token, volviendo al inicio de sesión del modo en uso. | Transversal |
| RF-08 | Consulta del perfil profesional | Mostrar foto, cargo, ubicación, correo, indicadores de actividad, habilidades y experiencia reciente con su calificación. | V-16 |
| RF-09 | Edición del perfil y habilidades | Permitir modificar los datos editables del perfil y administrar la lista de habilidades (el correo no es editable). | V-17 |
| RF-10 | Panel de actividad del trabajador | Presentar turnos realizados, empresas colaboradoras, % de puntualidad, reputación por rol y ofertas recomendadas. | V-10 |
| RF-11 | Consulta del historial laboral | Mostrar la experiencia acumulada en una tabla con evento, empresa, fecha, función y calificación. | V-14 |
| RF-12 | Perfil público de la empresa | Mostrar razón social, sector, ubicación, distintivo de verificación, convocatorias, contratados y valoración. | V-23 |
| RF-13 | Publicación de convocatoria | Permitir publicar una convocatoria con cargo, categoría, ubicación, fecha, horario, plazas, remuneración, descripción y requisitos. | V-19 |
| RF-14 | Gestión de convocatorias publicadas | Listar las convocatorias de la empresa con su estado y permitir verlas, editarlas y gestionar sus candidatos. | V-20 |
| RF-15 | Consulta y filtrado de ofertas | Listar las convocatorias activas, buscarlas por evento, empresa o ubicación, ordenarlas y filtrarlas por categoría. | V-11 |
| RF-16 | Detalle de una oferta | Mostrar empresa, remuneración, ubicación, fecha, horario, plazas, descripción y requisitos. | V-12 |
| RF-17 | Postulación a una convocatoria | Permitir postularse a una convocatoria activa con plazas, dejando la postulación «En revisión» (una sola por convocatoria). | V-12 |
| RF-18 | Seguimiento de postulaciones | Mostrar las postulaciones con su estado: En revisión, Seleccionado o No seleccionado. | V-13 |
| RF-19 | Consulta y filtrado de candidatos | Listar los candidatos con nombre, cargo, calificación, experiencia y estado, y filtrarlos por calificación mínima. | V-21 |
| RF-20 | Selección o descarte de candidatos | Permitir seleccionar o descartar candidatos, descontar la plaza y notificar el resultado. | V-21 |
| RF-21 | Asignación directa | Permitir asignar a un trabajador que no se postuló, advirtiendo cruces de horario. | V-21 |
| RF-22 | Respuesta a una asignación directa | Permitir al trabajador aceptar o rechazar (indicando el motivo) y notificar al coordinador. | V-13, V-15 |
| RF-23 | Calificación post-servicio | Permitir evaluar puntualidad, eficiencia y actitud de 1 a 5, indicando el rol evaluado y un comentario. | V-22 |
| RF-24 | Cálculo de la reputación | Recalcular automáticamente la reputación por rol (coordinador y logística) y la calificación global. | V-10, V-16 |
| RF-25 | Notificaciones | Notificar nuevas convocatorias, cambios de estado y calificaciones, y filtrarlas entre todas y no leídas. | V-15 |
| RF-26 | Panel de actividad de la empresa | Presentar convocatorias activas, plazas disponibles, total de candidatos y seleccionados, con los recientes. | V-18 |

> El criterio de verificación de cada requerimiento está en el capítulo 4 del [documento de ingeniería](docs/Smart_Logistics_Documento_Ingenieria.pdf).

### 3.2 Requerimientos No Funcionales

| ID | Atributo | Descripción | Prioridad |
|---|---|---|---|
| RNF-01 | Usabilidad | Interfaz en español con vocabulario comprensible para trabajadores de cualquier nivel educativo. | Alta |
| RNF-02 | Usabilidad | La web debe ser responsiva (móvil *mobile-first*), con área táctil mínima de 44×44 px y máximo tres niveles de navegación. | Alta |
| RNF-03 | Accesibilidad | Contraste mínimo 4.5:1 (WCAG 2.1 AA) y etiqueta accesible en todo elemento interactivo. | Media |
| RNF-04 | Escalabilidad | Soportar escalamiento horizontal y vertical ante picos de convocatorias en temporada alta. | Alta |
| RNF-05 | Escalabilidad | Capa de presentación preparada para i18n/l10n, con textos y formato de moneda externalizados. | Media |
| RNF-06 | Disponibilidad | Disponibilidad mínima del 99.5 % mensual. | Alta |
| RNF-07 | Rendimiento | Entregar las notificaciones en un máximo de 5 segundos desde el evento. | Alta |
| RNF-08 | Rendimiento | Consultas de ofertas, candidatos y panel en menos de 2 s (percentil 95). | Media |
| RNF-09 | Seguridad | Contraseñas almacenadas con hash y sal (bcrypt o superior), nunca en texto plano. | Alta |
| RNF-10 | Seguridad | Toda comunicación cliente-servidor sobre HTTPS/TLS 1.2 o superior. | Alta |
| RNF-11 | Privacidad | Cumplir la Ley 1581 de 2012 (Habeas Data) y su decreto reglamentario. | Alta |
| RNF-12 | Privacidad | Los comentarios individuales de las calificaciones no se exponen públicamente sin consentimiento. | Alta |
| RNF-13 | Mantenibilidad | Arquitectura en capas (presentación, aplicación, dominio y persistencia). | Media |
| RNF-14 | Trazabilidad | Todo cambio de estado de una postulación y toda calificación quedan registrados con fecha, hora y responsable. | Alta |

---

## 🧠 4. Diagramas UML

Todos los diagramas están en [`docs/diagramas/`](docs/diagramas). Los casos de uso siguen una numeración uno a uno con los requerimientos: el caso de uso **CU-n** corresponde al requerimiento **RF-n**.

### Diagrama de Casos de Uso

Muestran qué puede lograr cada actor con el sistema, agrupados por módulo.

**M1. Acceso y cuenta (RF-01 a RF-07):** acceso público, registro con fotografía, inicio de sesión diferenciado, recuperación de contraseña, cambio de modo y cierre de sesión.

![Casos de uso — Acceso y cuenta](docs/diagramas/casos-de-uso/m1-acceso-y-cuenta.png)

**M2. Perfil y reputación (RF-08 a RF-12 y RF-26):** consulta y edición del perfil, panel de actividad, historial laboral y perfil público de la empresa.

![Casos de uso — Perfil y reputación](docs/diagramas/casos-de-uso/m2-perfil-y-reputacion.png)

**M3. Convocatorias, postulación y selección (RF-13 a RF-22):** el trabajador busca ofertas y se postula; el coordinador publica, filtra candidatos, selecciona o asigna directamente.

![Casos de uso — Convocatorias, postulación y selección](docs/diagramas/casos-de-uso/m3-convocatorias-postulacion-seleccion.png)

**M4. Calificaciones y notificaciones (RF-23 a RF-25):** el coordinador califica el servicio, lo que *incluye* el recálculo de la reputación y el envío de notificaciones a través del servicio externo.

![Casos de uso — Calificaciones y notificaciones](docs/diagramas/casos-de-uso/m4-calificaciones-y-notificaciones.png)

### Diagrama de Secuencia

Muestran la interacción entre la vista, el controlador REST, el servicio de dominio, el repositorio y la base de datos. Cada mensaje corresponde a una llamada real entre las capas de la arquitectura.

**Inicio de sesión y carga del panel (RF-04, RF-10):** verificación del hash de la contraseña, creación de la sesión y consulta de los indicadores y las ofertas recomendadas del panel del trabajador.

![Secuencia — Inicio de sesión y carga del panel](docs/diagramas/secuencia/01-inicio-sesion-y-panel.png)

**Registro con validación de la fotografía (RF-02, RF-03):** bifurcación entre cargar la imagen (validada en formato, peso y resolución) y omitir el paso, que marca el perfil como incompleto.

![Secuencia — Registro con validación de la fotografía](docs/diagramas/secuencia/02-registro-validacion-fotografia.png)

**Postulación a una convocatoria (RF-15, RF-16, RF-17):** filtrado de ofertas, consulta del detalle y creación de la postulación, con las validaciones que impiden postularse dos veces y verifican que queden plazas.

![Secuencia — Postulación a una convocatoria](docs/diagramas/secuencia/03-postulacion-convocatoria.png)

**Selección de candidatos y asignación directa (RF-19 a RF-22):** reúne los dos caminos para cubrir una plaza: seleccionar a un postulado o asignar directamente a un trabajador, que luego acepta o rechaza.

![Secuencia — Selección de candidatos y asignación directa](docs/diagramas/secuencia/04-seleccion-y-asignacion-directa.png)

**Calificación y recálculo de la reputación (RF-23, RF-24):** inserción de la calificación, recálculo de la reputación por rol, actualización de los indicadores y creación del registro de historial laboral.

![Secuencia — Calificación y recálculo de la reputación](docs/diagramas/secuencia/05-calificacion-y-reputacion.png)

<details>
<summary><strong>Diagramas de actividades</strong> (5 procesos principales)</summary>

Cada diagrama separa en calles lo que hace cada actor y lo que hace el sistema, y hace explícitos los puntos de decisión.

**1. Registro de trabajador y creación del perfil (RF-02, RF-03)**

![Actividades — Registro de trabajador](docs/diagramas/actividades/01-registro-trabajador.png)

**2. Autenticación e ingreso según el modo (RF-04, RF-05, RF-06)**

![Actividades — Autenticación según el modo](docs/diagramas/actividades/02-autenticacion-segun-modo.png)

**3. Flujo 1: publicación, postulación y selección (RF-13, RF-15 a RF-20)**

![Actividades — Flujo 1](docs/diagramas/actividades/03-flujo1-publicacion-postulacion-seleccion.png)

**4. Flujo 2: asignación directa y respuesta del trabajador (RF-21, RF-22)**

![Actividades — Flujo 2](docs/diagramas/actividades/04-flujo2-asignacion-directa.png)

**5. Calificación post-servicio y actualización de la reputación (RF-23, RF-24)**

![Actividades — Calificación y reputación](docs/diagramas/actividades/05-calificacion-y-reputacion.png)

</details>

### Arquitectura

La solución se organiza en cuatro capas: **presentación** (clientes web y móvil), **aplicación** (controladores de la API REST, consumida por HTTPS), **dominio** (reglas de negocio en servicios) y **persistencia** (repositorios sobre la base de datos).

![Estructura de la solución](docs/diagramas/arquitectura.png)

---

## 🎨 5. URL del Prototipo

Enlace público del prototipo interactivo en Figma:

**https://www.figma.com/design/9Deq4FV8q5Fo29FYCCl4Mm/Untitled?node-id=8-3&t=aw6M8h1xU90aWpyA-0**

La navegación se organiza en tres zonas: la **zona pública** (presentación, inicio de sesión, registro y recuperación de contraseña), la **zona del modo trabajador** (con eje en el panel de actividad V-10) y la **zona del modo empresa** (con eje en el panel de empresa V-18), conectadas por el control de cambio de modo.

![Mapa de navegación](docs/diagramas/mapa-navegacion.png)

<details>
<summary><strong>Vistas del prototipo</strong></summary>

**Modo trabajador:** panel de actividad (V-10), ofertas laborales (V-11), detalle de oferta (V-12) y mis postulaciones (V-13).

![Vistas del modo trabajador](docs/prototipo/vistas-modo-trabajador.png)

**Modo empresa:** crear convocatoria (V-19) y candidatos (V-21).

![Vistas del modo empresa](docs/prototipo/vistas-modo-empresa.png)

</details>

---

## 🗄️ 6. Diseño de Base de Datos

El modelo es relacional y único para toda la solución. Tiene **13 entidades** organizadas en tres ejes: **identidad** (usuario, trabajador y coordinador), **oferta** (empresa, convocatoria y requisitos) y **operación** (postulación, calificación e historial).

![Modelo entidad-relación](docs/diagramas/modelo-entidad-relacion.png)

### Tablas principales

| Tabla | Propósito | Campos clave |
|---|---|---|
| `USUARIO` | Cuenta de acceso, común a los dos modos. | `email` (único), `password_hash`, `modo_activo`, `avatar_url`, `estado` |
| `TRABAJADOR` | Perfil logístico del usuario y sus indicadores. | `cargo`, `anios_experiencia`, `puntualidad_pct`, `calificacion_global`, `reputacion_coordinador`, `reputacion_logistica`, `perfil_completo` |
| `COORDINADOR` | Vincula a un usuario con la empresa que representa. | `id_usuario` (único), `id_empresa`, `cargo` |
| `EMPRESA` | Organización contratante. | `nit` (único), `razon_social`, `sector`, `verificada`, `valoracion` |
| `CONVOCATORIA` | Oferta de trabajo publicada. | `categoria` (EVENTO, ALMACEN, MONTAJE, REPARTO), `fecha`, `plazas_totales`, `plazas_disponibles`, `remuneracion`, `estado` |
| `REQUISITO` | Requisitos de una convocatoria, como filas independientes. | `id_convocatoria`, `descripcion` |
| `POSTULACION` | **Entidad central**: une una convocatoria con un trabajador. | `origen` (POSTULACION / ASIGNACION_DIRECTA), `estado`, `respuesta_trabajador`, `motivo_rechazo` |
| `CALIFICACION` | Evaluación post-servicio. | `puntualidad`, `eficiencia`, `actitud` (1 a 5), `rol_evaluado`, `puntaje`, `comentario` |
| `HISTORIAL_LABORAL` | Experiencia verificable acumulada del trabajador. | `evento`, `empresa`, `funcion`, `fecha`, `calificacion` |
| `HABILIDAD` / `TRABAJADOR_HABILIDAD` | Catálogo de habilidades y su relación N:M con los trabajadores. | `nombre` (único) |
| `NOTIFICACION` | Avisos al usuario. | `tipo`, `mensaje`, `leida` |
| `SESION` | Sesiones abiertas en cualquiera de los clientes. | `token`, `fecha_inicio`, `fecha_expiracion` |

### Relaciones y reglas

| Relación | Cardinalidad | Regla de negocio |
|---|---|---|
| USUARIO — TRABAJADOR | 1 : 0..1 | Un usuario tiene a lo sumo un perfil de trabajador. |
| USUARIO — COORDINADOR | 1 : 0..1 | El coordinador siempre pertenece a una empresa; un usuario puede tener ambos perfiles. |
| TRABAJADOR — HABILIDAD | N : M | Se resuelve con `TRABAJADOR_HABILIDAD`. |
| EMPRESA — CONVOCATORIA | 1 : N | Toda convocatoria pertenece a una única empresa. |
| CONVOCATORIA — REQUISITO | 1 : N | Los requisitos se muestran como lista en la oferta. |
| CONVOCATORIA — POSTULACION | 1 : N | Una convocatoria recibe postulaciones hasta cerrar sus plazas. |
| TRABAJADOR — POSTULACION | 1 : N | Solo una postulación por trabajador y convocatoria. |
| POSTULACION — CALIFICACION | 1 : 0..1 | Una postulación finalizada admite una única evaluación. |
| POSTULACION — HISTORIAL_LABORAL | 1 : 0..1 | El historial se crea cuando la postulación se finaliza y se califica. |
| USUARIO — NOTIFICACION / SESION | 1 : N | Las notificaciones se conservan hasta leerse; se registran todas las sesiones. |

**Integridad:** todas las llaves primarias son UUID; las llaves foráneas hacia `USUARIO` y `EMPRESA` usan `ON DELETE RESTRICT`; los criterios de evaluación se limitan a 1–5 con `CHECK`; y la llave única compuesta `POSTULACION(id_convocatoria, id_trabajador)` impide que un trabajador se postule dos veces a la misma convocatoria.

---

## 🧩 7. Documentación del Sistema

### Estructura de Carpetas

```
SMARTLOGISTICS/
├── index.html              # V-01 · Página pública (landing)
├── auth/                   # Zona pública: acceso y cuenta (módulo M1)
│   ├── login-trabajador.html
│   ├── login-empresa.html
│   ├── registro-trabajador.html
│   ├── registro-empresa.html
│   ├── foto-trabajador.html
│   ├── foto-cargada-trabajador.html
│   ├── recuperar-trabajador.html / recuperar-empresa.html
│   ├── correo-enviado-trabajador.html / correo-enviado-empresa.html
│   └── reenviar-trabajador.html / reenviar-empresa.html
├── css/
│   ├── base.css            # Variables de diseño, reset, logo y botones compartidos
│   ├── landing.css         # Estilos exclusivos de la página pública
│   └── auth.css            # Estilos de inicio de sesión, registro y recuperación
├── assets/
│   └── chevron-down.svg    # Ícono del desplegable, exportado de Figma
└── docs/
    ├── Smart_Logistics_Documento_Ingenieria.pdf
    ├── diagramas/          # Casos de uso, actividades, secuencia, ER, arquitectura y navegación
    └── prototipo/          # Capturas de las vistas del prototipo
```

| Carpeta | Contenido |
|---|---|
| `/` (raíz) | `index.html`, la página pública y punto de entrada del sitio. |
| `/auth` | Las 12 pantallas de la zona pública de acceso: inicio de sesión, registro, fotografía de perfil y recuperación de contraseña, para trabajador y empresa. |
| `/css` | Hojas de estilo. `base.css` define las variables de diseño (colores, radios, sombras) y los componentes comunes; cada zona tiene su propia hoja. |
| `/assets` | Recursos gráficos exportados del diseño. |
| `/docs` | Documento de ingeniería de software, diagramas UML, modelo de datos y capturas del prototipo. |

### Vistas implementadas

| Vista | Pantalla | Archivo | Requerimiento |
|---|---|---|---|
| V-01 | Página pública | [`index.html`](index.html) | RF-01 |
| V-02 | Inicio de sesión del trabajador | [`auth/login-trabajador.html`](auth/login-trabajador.html) | RF-04 |
| V-03 | Inicio de sesión de la empresa | [`auth/login-empresa.html`](auth/login-empresa.html) | RF-04 |
| V-04 | Registro de trabajador | [`auth/registro-trabajador.html`](auth/registro-trabajador.html) | RF-02 |
| — | Registro de empresa | [`auth/registro-empresa.html`](auth/registro-empresa.html) | Complementaria |
| V-05 a V-07 | Fotografía profesional y foto cargada | [`auth/foto-trabajador.html`](auth/foto-trabajador.html), [`auth/foto-cargada-trabajador.html`](auth/foto-cargada-trabajador.html) | RF-03 |
| V-08, V-09 | Recuperar contraseña, correo enviado y reenvío | `auth/recuperar-*.html`, `auth/correo-enviado-*.html`, `auth/reenviar-*.html` | RF-05 |

Las vistas de las zonas autenticadas (V-10 a V-23, modo trabajador y modo empresa) están diseñadas en el prototipo y se implementarán en las siguientes entregas.

### Decisiones técnicas

- **HTML5 semántico:** `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, formularios con `label` asociados a cada campo e idioma declarado (`lang="es"`).
- **Maquetación solo con Flexbox y CSS Grid:** no se usan `position` ni `float`. Las superposiciones del diseño (por ejemplo, la tarjeta flotante del inicio o el botón dentro del campo de contraseña) se resuelven ubicando dos elementos en la misma celda de Grid.
- **Diseño adaptable:** la web se adapta a escritorio, tableta y celular con puntos de quiebre en 1024 px, 900 px, 768 px, 560 px y 480 px. En celular el panel lateral de acceso se oculta y los formularios pasan a una columna.
- **Accesibilidad básica:** todos los controles son enlaces, botones o campos nativos, por lo que se puede navegar con el teclado (`Tab` / `Enter`); el foco es visible con un contorno de alto contraste (`:focus-visible`); los campos tienen etiquetas y los botones de solo ícono tienen `aria-label`.
- **Variables de diseño:** los colores, radios y sombras de Figma están definidos como propiedades personalizadas de CSS en `css/base.css`, de modo que un cambio se aplica a todo el sitio.
- **Sin dependencias:** HTML y CSS puros; la única fuente externa es la tipografía Inter de Google Fonts.

### Tecnologías

| Herramienta | Uso |
|---|---|
| HTML5 | Estructura semántica de las vistas |
| CSS3 (Flexbox, Grid, variables) | Estilos y maquetación adaptable |
| Figma | Diseño y prototipo interactivo |
| Git y GitHub | Control de versiones y publicación (GitHub Pages) |

### Convenciones del repositorio

- **Ramas:** `main` contiene la versión estable publicada; cada funcionalidad se desarrolla en una rama `feature/…` y se integra mediante *pull request*.
- **Commits:** mensajes en español con prefijo de tipo (`feat`, `fix`, `docs`, `chore`) y alcance, por ejemplo `feat(auth): implementar inicio de sesión`.
- **CSS:** nombres de clase con convención tipo BEM (`bloque__elemento--modificador`).

---

## 🚀 8. Instalación y Ejecución

### Requisitos

- Un navegador moderno (Chrome, Edge, Firefox o Safari).
- Conexión a internet para cargar la tipografía Inter.
- *Opcional:* Node.js o Python para levantar un servidor local.

### Ejecutar en local

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/Tecnologias-2026-2/SMARTLOGISTICS.git
   cd SMARTLOGISTICS
   ```

2. Abrir el sitio de alguna de estas formas:

   - **Sin instalar nada:** abrir `index.html` con doble clic en el navegador.
   - **Con un servidor local (Node.js):**

     ```bash
     npx http-server -p 5173 -c-1
     ```

   - **Con un servidor local (Python):**

     ```bash
     python -m http.server 5173
     ```

3. Si se usó un servidor, entrar a **http://localhost:5173**.

### Publicación

El sitio se publica con **GitHub Pages** desde la rama `main`:

1. En el repositorio, ir a **Settings → Pages**.
2. En *Build and deployment*, elegir **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Guardar. El sitio queda disponible en https://tecnologias-2026-2.github.io/SMARTLOGISTICS/ y se actualiza con cada cambio que llega a `main`.

---

## 📎 Anexos

- 📄 [Documento de ingeniería de software (PDF)](docs/Smart_Logistics_Documento_Ingenieria.pdf)
- 🗂️ [Repositorio de avances y diagramas (Google Drive)](https://drive.google.com/drive/folders/1tFqYAX13ho0kmuT_YQvPGQyS8m5HXMqo)
- 🎬 [Video: relación entre modelos y navegación](https://youtu.be/llWBIBWHomY)
