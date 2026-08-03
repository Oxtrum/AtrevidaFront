# Graph Report - AtrevidaFront  (2026-08-03)

## Corpus Check
- 164 files · ~3,020,213 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1351 nodes · 2154 edges · 105 communities (91 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5658adfc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]

## God Nodes (most connected - your core abstractions)
1. `CustomSelect()` - 22 edges
2. `useAdminLocalScopeState()` - 21 edges
3. `DiaSemana` - 20 edges
4. `toast` - 19 edges
5. `useLocales()` - 17 edges
6. `compilerOptions` - 16 edges
7. `ReservaDetalle` - 13 edges
8. `ApiResponse` - 13 edges
9. `withNombreLocalScope()` - 12 edges
10. `getStoredAdminWorkplace()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `PaquetesPage()` --calls--> `useAdminLocalScopeState()`  [EXTRACTED]
  app/atrevida-gestion/configuracion/paquetes/page.tsx → lib/auth/useAdminLocalScope.ts
- `robots()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/robots.ts → lib/seo.ts
- `Home()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/page.tsx → lib/seo.ts
- `ReservasPage()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/reservas/page.tsx → lib/seo.ts
- `LocalesPage()` --calls--> `useAdminLocalScopeState()`  [EXTRACTED]
  app/atrevida-gestion/configuracion/locales/page.tsx → lib/auth/useAdminLocalScope.ts

## Communities (105 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (22): geist, geistMono, metadata, Home(), robots(), routes, INFO_ITEMS, LOCATIONS (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (37): 1. app/globals.css, 2. app/layout.tsx, 3. postcss.config.mjs, 4. next.config.ts, 5. package.json, ADMIN DASHBOARD, ADMIN LOGIN, ADMIN RESERVAS - CREAR (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): Accessibility & Reduced‑Motion, Banexcoin Frontend Style Guide, Buttons, Cards, code:css (:root {), code:css (@media (prefers-reduced-motion: reduce) {), code:css (* { scrollbar-width: thin; scrollbar-color: rgb(var(--color‑), code:html (<link rel="stylesheet") (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (23): ActiveFilters, addTable(), AddTableOptions, ALL_BORDERS, buildFilters(), buildMonthlyFileName(), buildRangeFileName(), CHART_COLORS (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (16): SlotBadges(), SlotBadgesProps, TimeSlotAdmin(), TimeSlotAdminProps, TimeSlotAdmin(), TimeSlotAdminProps, TimeSlotPublico(), TimeSlotPublicoProps (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (30): 10. FINAL PRE-FLIGHT CHECK, 1. ACTIVE BASELINE CONFIGURATION, 2. DEFAULT ARCHITECTURE & CONVENTIONS, 3. DESIGN ENGINEERING DIRECTIVES (Bias Correction), 4. CREATIVE PROACTIVITY (Anti-Slop Implementation), 5. PERFORMANCE GUARDRAILS, 6. TECHNICAL REFERENCE (Dial Definitions), 7. AI TELLS (Forbidden Patterns) (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (22): ReservationCardProps, agruparReservas(), TimeSlot(), TimeSlotProps, FiltrosReserva, getTipoBackendFromServicio(), getTipoColor(), getTipoFromServicio() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (26): 1. ¿Cuál es la estructura de carpetas del proyecto?, 1. **RESUMEN_EJECUTIVO.md** ⭐ COMIENZA AQUÍ, 2. **ATREVIDA_STRUCTURE_REPORT.md**, 2. ¿Dónde están localizadas las rutas y páginas del admin?, 3. ¿Existe algún layout global para el admin?, 3. **VISUAL_SUMMARY.txt**, 4. **ARCHIVOS_CLAVE.md**, 4. ¿Dónde están estilos globales, Tailwind, providers y temas? (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.23
Nodes (13): Calendar(), CalendarProps, CalendarAdmin(), CalendarAdminProps, CalendarPublico(), CalendarPublicoProps, useLocales(), useReservasCalendario() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (25): dependencies, exceljs, gsap, lucide-react, next, react, react-dom, recharts (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (25): 1. ¿Cuál es la estructura de carpetas del proyecto?, 2. ¿Dónde están las rutas del admin?, 3. ¿Existe layout global para el admin?, 4. ¿Dónde están archivos de estilos globales, Tailwind y providers?, 5. ¿Hay sistema de theming/tema actual?, 6. ¿Qué componentes se usan en el admin?, 7. ¿Hay estilos CSS que heredan tema oscuro público?, Autenticación Actual: (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (22): CATEGORIAS_ORDEN, AdminReservasAprobacionPage(), ApprovalDraft, CompletionDraft, CompletionReasonMode, ESTADO_OPTIONS, EstadoFiltro, EstadoGestion (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (23): code:ts (export interface GetServiciosParams {), code:bash (npm run lint), code:bash (npm run dev), code:bash (git add components/ReservationForm/useReservationForm.ts), code:ts (import {), code:ts (interface ServicioRow extends Record<string, unknown> {), code:ts (const handleTogglePacienteNuevo = (row: ServicioRow) => {), code:ts ({) (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (13): AdminReservationForm(), normalizeClientPhone(), normalizeSearch(), ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, ReservationFormInitialData (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (10): DayInfo, DaySelector(), DaySelectorProps, CalendarGridProps, DIA_CORTO, DIAS, DayInfo, DaySelectorProps (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (16): ActualizarEstadoReservaDBData, actualizarReservaDB(), ActualizarReservaDBData, actualizarReservaNotificadoDB(), ActualizarReservaNotificadoDBData, CrearReservaDBData, CrearReservaResult, GetReservasCalendarioParams (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (23): actualizarPaquete(), crearPaquete(), CrearPaqueteBody, eliminarPaquete(), getPaquetesDB(), GetPaquetesParams, PaqueteDetalle, PaqueteLocal (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (13): ApiError, ChangeLocalState, ConfirmState, DEFAULT_NEW_USER_FORM, EMPTY_PW_FORM, getUserLocalLabel(), NewUserErrors, NewUserForm (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (13): actualizarComboServicio(), crearComboServicio(), eliminarComboServicio(), getComboServiciosDB(), ComboItem, ComboServicioDetalle, ComboServicioForm, ComboServicioFormErrors (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (16): Admin Theming, AdminConfig Component Kit, API Response Shape, Architecture, Auth, code:bash (npm run dev      # Dev server at http://localhost:3000), code:ts ({ code: number; data: T; error: boolean; message: string | n), Commands (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (17): Admin Combos Management Implementation Plan, code:typescript (// ─── Combo Servicios ─────────────────────────────────────), code:bash (npm run lint), code:bash (npm run lint), code:typescript (import { Tags, Building2, Scissors } from 'lucide-react';), code:typescript (import { Tags, Building2, Scissors, Package2 } from 'lucide-), code:typescript ({), code:bash (npm run lint) (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (8): NotificationBell(), apiClient, marcarReservaNotificacionLeida(), marcarReservasNotificacionesLeidas(), MarcarReservasNotificacionesLeidasResponse, ReservaNotificacion, ReservasNotificacionesData, ReservasNotificacionesResponse

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (13): ActualizarClienteData, actualizarClienteDB(), ClientesListResponse, CrearClienteData, crearClienteDB(), eliminarClienteDB(), getClientesDB(), GetClientesParams (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (53): AdminAccessButtonProps, AuthMode, getAuthToken(), request(), RequestOptions, resolveAuthMode(), getAdminLocalScope(), metadata (+45 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (10): CajaPage(), ClienteOption, formatMoney(), FormErrors, getTodayStamp(), LocalOption, NewClientErrors, NewClientForm (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (13): activarServicioEnLocal(), actualizarServicio(), crearServicioDB(), eliminarServicioDB(), togglePacienteNuevo(), CategoriaOption, ConfirmState, FORM_INITIAL (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (14): 1. `lib/api/servicios.ts`, 2. `lib/hooks/useServiciosPublicos.ts`, 3. `components/ReservationForm/useReservationForm.ts`, 4. `app/atrevida-gestion/configuracion/servicios/page.tsx`, Changes, code:ts (// before), code:ts (visible_paciente_nuevo?: boolean;), code:ts ({) (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (13): 10. PUNTOS CLAVE IDENTIFICADOS, 1. ESTRUCTURA DE CARPETAS DEL PROYECTO, 2. RUTAS DEL ADMIN Y PÁGINAS, 3. LAYOUT GLOBAL PARA EL ADMIN, ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT, API Routes:, code:block1 (AtrevidaFront/), code:block20 (/admin) (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (58): TimeSlotPicker(), TimeSlotPickerProps, useReservationForm(), actualizarEstadoReservaDB(), getReservaByID(), calcularHoraFin(), DIAS_COMPLETO, DIAS_SEMANA (+50 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (15): withLocalIdScope(), getPagosDB(), ActivarServicioEnLocalData, ActualizarLocalData, ActualizarServicioData, ComboServicioCreateData, ComboServicioUpdateData, CrearLocalData (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (11): cambiarPassword(), CambiarPasswordPayload, cambiarUsuarioLocal(), CambiarUsuarioLocalPayload, getUsuarios(), LoginResponse, registrarUsuario(), RolCodigo (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (9): CrearPagoData, DetalleServicio, GetPagosParams, PagosListResponse, PagosResumenParams, PagosResumenResponse, ReporteFinanciero, ServicioResumenFinanciero (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (12): code:css (--af-radius-pill: 9999px;), code:css (--af-ease: cubic-bezier(0.16, 1, 0.3, 1);), code:css (--af-glass: rgba(9, 9, 11, 0.80);), code:css (--color-background: #09090b;          /* Fondo oscuro casi n), code:css (--af-accent-primary: #dc2626;         /* Rojo profundo */), code:css (--af-muted: rgba(250, 250, 250, 0.65);    /* Texto semitrans), code:css (--af-surface-1: rgba(15, 15, 15, 0.50);   /* Vidrio suave */), code:css (--af-border: rgba(228, 228, 231, 0.10);       /* Borde sutil) (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): Action Elements, Brand & Style, Colors, Components, Elevation & Depth, Glass Containers, Inputs & Interaction, Layout & Spacing (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (18): noteStyle, PlanSelectorProps, crearPagoDB(), cambiarEstadoPlan(), cobrarPlan(), CrearPlanData, getPlanByID(), getPlanesDB() (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.21
Nodes (5): getReservaDateTimeMs(), getReservaEndMs(), getReservaStartMs(), normalizeTimeForDate(), RelativeDay

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (10): actualizarCategoriaDB(), asociarCategoriaLocalDB(), crearCategoriaDB(), desasociarCategoriaLocalDB(), eliminarCategoriaDB(), getLocalesDeCategoriaDB(), Categoria, ConfirmState (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (4): NAV_LINKS, AdminTheme, AdminThemeToggle(), AdminThemeToggleProps

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (10): enabledPlugins, code-review@claude-plugins-official, code-simplifier@claude-plugins-official, frontend-design@claude-plugins-official, superpowers@claude-plugins-official, hooks, PostToolUse, PreToolUse (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): getReservasResumenDB(), ReservasResumenData, AdminDashboardPage(), EMPTY_RESUMEN, getWeekBars(), KPI_SECONDARY, KpiCard, makeKpiPrimary()

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (9): ActualizarComboData, ComboServicioLineaInput, CrearComboData, TipoPrecio, ComboCatalogo, ComboLocal, CombosApiResponse, CombosData (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (9): 8. RESUMEN DE ARCHIVOS PRINCIPALES, API Routes (7 endpoints):, code:block16 (/admin/login           → page.tsx + page.module.css), code:block17 (AdminHeader/Header.tsx), code:block18 (/api/admin/login), code:block19 (app/globals.css (452 líneas - CSS Variables + utilidades)), Componentes Admin (4 componentes):, Configuración Global: (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (9): 6. COMPONENTES DEL ADMIN, Componentes Admin Específicos:, Componentes Compartidos Utilizados en Admin:, `components/AdminHeader/Header.tsx` (199 líneas), `components/AdminReservas/EditarReservaModal.module.css`, `components/AdminReservas/ReservasTable.tsx` (160 líneas), `components/Calendar/CalendarAdmin.tsx`, `components/Custom/CustomSelect.tsx` (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (12): CustomSelect(), CustomSelectProps, SelectOption, normalize(), Params, RenderOption, SearchableGroup, SearchableOption (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (10): ESTADO_CLASS, formatTimestamp(), ReservaDetailModal(), ReservaDetailModalProps, ReservasTableProps, ReservaBD, buildReminderWhatsappHref(), formatFechaLarga() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (5): eliminarReservaDB(), ReservaTipoBackend, useReservasFiltradas(), AdminReservasPage(), ReservaRow

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (7): graphify, Key Notes, Project Commands, Structure, Tech Stack, This is NOT the Next.js you know, UI/UX Guidance

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (7): 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS, Animaciones Globales:, Archivo Global CSS (`app/globals.css` - 452 líneas):, Clases CSS Globales Disponibles:, code:javascript ({), Next.js Config (`next.config.ts`):, PostCSS Config (`postcss.config.mjs`):

### Community 50 - "Community 50"
Cohesion: 0.24
Nodes (7): Pago, ESTADO_LABELS, ESTADO_OPTIONS, formatMoney(), PagoRow, PagosPage(), formatDateTime()

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): crearReservaDB(), ReservaTipoBody, CrearReservaData, CrearReservaResult, UseCrearReservaReturn, EstadoReserva, ReservaFormData

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (10): crearLocalDB(), getLocalesDB(), useAdminLocalScopeState(), EditarLocalPage(), Espacio, FormErrors, LocalesPage(), LocalRow (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (5): actualizarLocal(), getLocalByID(), Espacio, ToastState, ToastType

### Community 56 - "Community 56"
Cohesion: 0.60
Nodes (3): GET(), PATCH(), POST()

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (5): 5. SISTEMA DE THEMING/TEMA ACTUAL, Análisis del Theming:, code:css (::-webkit-scrollbar-thumb {), code:css (::selection {), CONCLUSIÓN SOBRE THEMING:

### Community 59 - "Community 59"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): PageHeader(), PageHeaderProps, renderTitle()

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (4): 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO, Características CSS del Admin:, CSS Modules del Admin:, Herencia del Tema Oscuro:

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): 9. TECNOLOGÍAS Y LIBRERÍAS, Architecture Pattern:, Dependencies:, DevDependencies:

### Community 71 - "Community 71"
Cohesion: 0.14
Nodes (13): 1. Backend — schema y snapshot, 2. Backend — endpoint marcar sesión, 3. Frontend — form de combo (agrupar por sesión), 4. Frontend — vista de progreso (`app/atrevida-gestion/paquetes-activos`), 5. Desacople de reservas (una sola fuente de verdad), code:bash (cd AtrevidaBack && go build ./... && git diff --exit-code do), code:bash (cd AtrevidaFront && npm run lint), Componentes (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (3): hasValue(), LoginPayload, POST()

### Community 86 - "Community 86"
Cohesion: 0.17
Nodes (12): code:go (// contarSesiones cuenta las sesiones distintas presentes en), code:go (COALESCE((SELECT COUNT(DISTINCT cs.sesion_numero) FROM combo), code:bash (cd AtrevidaBack && go build ./... && go generate ./...), code:bash (PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atre), code:bash (cd AtrevidaBack && git add -A), code:go (SesionNumero int `db:"sesion_numero" json:"sesion_numero" ex), code:go (SesionNumero int), code:go (// Numero de sesion (1-based) a la que pertenece el servicio) (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.18
Nodes (10): code:bash (npm run lint), Plan — Paquetes admin robustez front-only, Tarea 1 — Renombrar ruta `combos` → `paquetes`, Tarea 2 — ComboFormModal: cargar líneas en modo editar, Tarea 3 — ComboFormModal: diff + guardar líneas en editar, Tarea 4 — ComboFormModal: pulido visual líneas de servicio, Tarea 5 — `page.tsx`: eliminar flujo de servicio separado, fila solo-lectura, Tarea 6 — PlanSelector: agregar filtro por local (#C capa 1) (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (10): 1. `#C` + `#F` robustos — doble guard en reservas, 2. Admin form — unificar edición de servicios, 3. Admin form — pulido visual (estilos reutilizables), 4. Renombrar ruta `combos` → `paquetes`, Archivos tocados, Contexto, Diseño, Paquetes/Planes admin — robustez front-only (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.20
Nodes (9): Contexto, Fuera de alcance, Interfaz del hook, Parte A — Buscador + teclado en los selects, Parte B — Consistencia de estilos, form público, Reglas, Selects con buscador + teclado, y estilos consistentes del form público, Verificación (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (8): Contexto, CRUD de combo en el admin, Data layer — `lib/api/combos.ts`, Decisiones (cerradas con el usuario), Fuera de alcance, Reusos, UI — `configuracion/combos/page.tsx` + `ComboFormModal`, Verificación

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (6): crearPlan(), ComboOpt, LocalOpt, normalizeSearch(), Props, ReservarPlanModal()

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (8): code:go (MarcarSesion(planID, numero int, realizado bool) (int, error), code:go (// MarcarSesion marca (o desmarca) todas las líneas de una s), code:go (func (s *PlanesService) MarcarSesion(planID, numero int, rea), code:go (type marcarSesionRequest struct {), code:go (bd.PATCH("/planes/:id/sesiones/:numero", h.AuthRequired, h.A), code:bash (curl -s -X PATCH "http://localhost:8080/bd/planes/<P>/sesion), code:bash (cd AtrevidaBack && git add -A), Task 4: Endpoint marcar sesión

### Community 93 - "Community 93"
Cohesion: 0.25
Nodes (8): code:go (if reservaConsume(true, input.Estado) {), code:go (return reservaID, tx.Commit()), code:go (func (r *ReservasRepo) AnularReserva(id int) error {), code:go (var planID sql.NullInt64), code:go (// Ajusta el plan según la transición...), code:bash (PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atre), code:bash (cd AtrevidaBack && git add repositories/pgsql/reservas_repo.), Task 5: Desacoplar reservas del consumo del plan (revertir Fase 1)

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (4): CalendarGridProps, DIA_CORTO, DIAS, ReservaPorHora

### Community 95 - "Community 95"
Cohesion: 0.33
Nodes (4): WhatsappIcon(), WhatsappIconProps, HIDDEN_PREFIXES, WhatsappFabProps

### Community 96 - "Community 96"
Cohesion: 0.29
Nodes (6): Contexto, Diseño, Fuera de alcance, Paquetes públicos (combos) — sección landing, Requisitos, Verificación

### Community 97 - "Community 97"
Cohesion: 0.29
Nodes (6): Caja y Pagos, Catálogo de paquetes (`/configuracion/paquetes`), Config hub, Paquetes Activos (`/paquetes-activos`), Sidebar renames, DataTable for paquetes, hide tiempo, Sidebar renombres

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (6): withNombreLocalScope(), getReservasNotificaciones(), getPagosResumenDB(), getReservasCalendario(), getCombosDB(), getServiciosDB()

### Community 99 - "Community 99"
Cohesion: 0.33
Nodes (6): code:ts (export interface PlanServicioDetalle {), code:tsx (const sesiones = useMemo(() => {), code:tsx (<div className={styles.progreso}>Progreso: {hechas}/{sesione), code:tsx (const toggleSesion = async (numero: number, realizado: boole), code:bash (cd AtrevidaFront && git add lib/api/planes.ts app/atrevida-g), Task 7: Front — vista de progreso y marcar sesión

### Community 100 - "Community 100"
Cohesion: 0.40
Nodes (5): code:sql (-- Agrupa los servicios del combo/plan en sesiones y registr), code:sql (ALTER TABLE plan_servicios), code:bash (cd AtrevidaBack && git add migrations/000041_planes_seguimie), Global Constraints, Task 1: Migración 000041 — columnas de seguimiento

### Community 101 - "Community 101"
Cohesion: 0.40
Nodes (5): code:go (SesionNumero   int        `db:"sesion_numero" json:"sesion_n), code:go (SesionNumero int), code:bash (PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atre), code:bash (cd AtrevidaBack && git add -A), Task 3: Snapshot del plan arrastra sesion_numero + realizado en detalle

### Community 102 - "Community 102"
Cohesion: 0.40
Nodes (4): code:tsx (const sesiones = useMemo(() => {), code:css (.sesionBloque {), code:bash (cd AtrevidaFront && git add lib/api/combos.ts app/atrevida-g), Task 6: Front — form de combo agrupado por sesión

### Community 103 - "Community 103"
Cohesion: 0.50
Nodes (3): Notas de verificación, Seguimiento de planes por sesiones — Implementation Plan, Self-Review

## Knowledge Gaps
- **635 isolated node(s):** `eslintConfig`, `config`, `target`, `lib`, `allowJs` (+630 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CustomSelect()` connect `Community 13` to `Community 3`, `Community 36`, `Community 38`, `Community 8`, `Community 41`, `Community 11`, `Community 45`, `Community 47`, `Community 17`, `Community 18`, `Community 50`, `Community 19`, `Community 25`, `Community 26`, `Community 91`, `Community 29`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `toast` connect `Community 36` to `Community 3`, `Community 38`, `Community 47`, `Community 17`, `Community 18`, `Community 19`, `Community 52`, `Community 54`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 91`, `Community 29`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useAdminLocalScopeState()` connect `Community 52` to `Community 36`, `Community 41`, `Community 11`, `Community 47`, `Community 17`, `Community 54`, `Community 24`, `Community 25`, `Community 26`, `Community 29`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `config`, `target` to the rest of the system?**
  _635 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05757575757575758 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._