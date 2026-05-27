# Graph Report - AtrevidaFront  (2026-05-26)

## Corpus Check
- 115 files · ~2,970,162 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 779 nodes · 1115 edges · 72 communities (57 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `836af7b1`
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]

## God Nodes (most connected - your core abstractions)
1. `DiaSemana` - 21 edges
2. `compilerOptions` - 16 edges
3. `useLocales()` - 15 edges
4. `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` - 12 edges
5. `Variables CSS del Sistema de Diseño:` - 12 edges
6. `Banexcoin Frontend Style Guide` - 12 edges
7. `useReservationForm()` - 11 edges
8. `ReservaBD` - 11 edges
9. `High-Agency Frontend Skill` - 11 edges
10. `ReservaDetalle` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AdminReservasPage()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/page.tsx → lib/hooks/useLocales.ts
- `EditarReservaContent()` --calls--> `useReservas()`  [EXTRACTED]
  app/admin/reservas/editar/[id]/page.tsx → lib/hooks/useReservas.ts
- `EditarReservaContent()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/editar/[id]/page.tsx → lib/hooks/useLocales.ts
- `TimeSlotAdmin()` --calls--> `esHoraDisponible()`  [EXTRACTED]
  components/Calendar/TimeSlotAdmin.tsx → lib/utils/calendarHelpers.ts
- `TimeSlotAdmin()` --calls--> `esHoraDisponible()`  [EXTRACTED]
  components/Calendar/TimeSlotAdminAdmin.tsx → lib/utils/calendarHelpers.ts

## Communities (72 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (20): CATEGORIAS_ORDEN, actualizarReservaNotificadoDB(), AdminReservasAprobacionPage(), ApprovalDraft, ESTADO_OPTIONS, EstadoFiltro, EstadoGestion, formatDate() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (11): ActualizarEstadoReservaDBData, ActualizarReservaNotificadoDBData, CrearReservaDBData, CrearReservaResult, getReservasCalendario(), GetReservasCalendarioParams, GetReservasSheetsParams, ReservasResumenSemana (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (13): 10. PUNTOS CLAVE IDENTIFICADOS, 1. ESTRUCTURA DE CARPETAS DEL PROYECTO, 2. RUTAS DEL ADMIN Y PÁGINAS, 3. LAYOUT GLOBAL PARA EL ADMIN, ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT, API Routes:, code:block1 (AtrevidaFront/), code:block20 (/admin) (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (37): 1. app/globals.css, 2. app/layout.tsx, 3. postcss.config.mjs, 4. next.config.ts, 5. package.json, ADMIN DASHBOARD, ADMIN LOGIN, ADMIN RESERVAS - CREAR (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): Accessibility & Reduced‑Motion, Banexcoin Frontend Style Guide, Buttons, Cards, code:css (:root {), code:css (@media (prefers-reduced-motion: reduce) {), code:css (* { scrollbar-width: thin; scrollbar-color: rgb(var(--color‑), code:html (<link rel="stylesheet") (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (30): 10. FINAL PRE-FLIGHT CHECK, 1. ACTIVE BASELINE CONFIGURATION, 2. DEFAULT ARCHITECTURE & CONVENTIONS, 3. DESIGN ENGINEERING DIRECTIVES (Bias Correction), 4. CREATIVE PROACTIVITY (Anti-Slop Implementation), 5. PERFORMANCE GUARDRAILS, 6. TECHNICAL REFERENCE (Dial Definitions), 7. AI TELLS (Forbidden Patterns) (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (11): INFO_ITEMS, LOCATIONS, CrearReservaPage(), LINKS_NAV, LINKS_SERVICIOS, NAV_LINKS, STATS, VALORES (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (18): TimeSlotPicker(), TimeSlotPickerProps, actualizarEstadoReservaDB(), getReservaByID(), DIAS_COMPLETO, DIAS_SEMANA, HORAS, EditarReservaContent() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (17): getLocalesDB(), Calendar(), CalendarProps, CalendarAdmin(), CalendarAdminProps, CalendarPublico(), CalendarPublicoProps, CustomSelect() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (26): 1. ¿Cuál es la estructura de carpetas del proyecto?, 1. **RESUMEN_EJECUTIVO.md** ⭐ COMIENZA AQUÍ, 2. **ATREVIDA_STRUCTURE_REPORT.md**, 2. ¿Dónde están localizadas las rutas y páginas del admin?, 3. ¿Existe algún layout global para el admin?, 3. **VISUAL_SUMMARY.txt**, 4. **ARCHIVOS_CLAVE.md**, 4. ¿Dónde están estilos globales, Tailwind, providers y temas? (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (25): 1. ¿Cuál es la estructura de carpetas del proyecto?, 2. ¿Dónde están las rutas del admin?, 3. ¿Existe layout global para el admin?, 4. ¿Dónde están archivos de estilos globales, Tailwind y providers?, 5. ¿Hay sistema de theming/tema actual?, 6. ¿Qué componentes se usan en el admin?, 7. ¿Hay estilos CSS que heredan tema oscuro público?, Autenticación Actual: (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): dependencies, gsap, lucide-react, next, react, react-dom, devDependencies, eslint (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (12): code:css (--af-radius-pill: 9999px;), code:css (--af-ease: cubic-bezier(0.16, 1, 0.3, 1);), code:css (--af-glass: rgba(9, 9, 11, 0.80);), code:css (--color-background: #09090b;          /* Fondo oscuro casi n), code:css (--af-accent-primary: #dc2626;         /* Rojo profundo */), code:css (--af-muted: rgba(250, 250, 250, 0.65);    /* Texto semitrans), code:css (--af-surface-1: rgba(15, 15, 15, 0.50);   /* Vidrio suave */), code:css (--af-border: rgba(228, 228, 231, 0.10);       /* Borde sutil) (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (50): CalendarGridProps, DIA_CORTO, DIAS, CalendarGridProps, DIA_CORTO, DIAS, ReservationCardProps, SlotBadges() (+42 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (5): NAV_LINKS, AdminTheme, AdminThemeToggle(), AdminThemeToggleProps, OPTIONS

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (5): getReservaDateTimeMs(), getReservaEndMs(), getReservaStartMs(), normalizeTimeForDate(), RelativeDay

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (12): activarServicioEnLocal(), actualizarServicio(), crearServicioDB(), eliminarServicioDB(), getServiciosDB(), CategoriaOption, ConfirmState, FORM_INITIAL (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (7): crearLocalDB(), Espacio, FormErrors, LocalRow, toast, ToastState, ToastType

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (7): ActivarServicioEnLocalData, ActualizarLocalData, ActualizarServicioData, CrearLocalData, CrearServicioData, GetCombosParams, GetServiciosParams

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): apiClient, ApiError, getAuthToken(), request(), RequestOptions

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (11): Action Elements, Brand & Style, Colors, Components, Elevation & Depth, Glass Containers, Inputs & Interaction, Layout & Spacing (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (11): DayInfo, DaySelector(), DaySelectorProps, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, ReservationFormInitialData (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (5): geist, geistMono, metadata, HIDDEN_PREFIXES, WhatsappFabProps

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (7): graphify, Key Notes, Project Commands, Structure, Tech Stack, This is NOT the Next.js you know, UI/UX Guidance

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (14): useReservationForm(), useCrearReserva(), useReservas(), CATEGORIAS_ORDEN, getDateDay(), getTodayISO(), getWeekIndexForDate(), useReservationForm() (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, ReservationFormInitialData, getReservationDateRestriction(), getReservationSlotRestriction(), normalizeBolivianPhone() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (3): actualizarLocal(), getLocalByID(), Espacio

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (10): enabledPlugins, code-review@claude-plugins-official, code-simplifier@claude-plugins-official, frontend-design@claude-plugins-official, superpowers@claude-plugins-official, hooks, PostToolUse, PreToolUse (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (8): actualizarReservaDB(), ActualizarReservaDBData, getReservasDB(), GetReservasDBParams, UseReservasParams, UseReservasReturn, UseReservasFiltradasReturn, ReservasBDApiResponse

### Community 31 - "Community 31"
Cohesion: 0.60
Nodes (3): GET(), PATCH(), POST()

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (9): 6. COMPONENTES DEL ADMIN, Componentes Admin Específicos:, Componentes Compartidos Utilizados en Admin:, `components/AdminHeader/Header.tsx` (199 líneas), `components/AdminReservas/EditarReservaModal.module.css`, `components/AdminReservas/ReservasTable.tsx` (160 líneas), `components/Calendar/CalendarAdmin.tsx`, `components/Custom/CustomSelect.tsx` (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (9): 8. RESUMEN DE ARCHIVOS PRINCIPALES, API Routes (7 endpoints):, code:block16 (/admin/login           → page.tsx + page.module.css), code:block17 (AdminHeader/Header.tsx), code:block18 (/api/admin/login), code:block19 (app/globals.css (452 líneas - CSS Variables + utilidades)), Componentes Admin (4 componentes):, Configuración Global: (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): Architecture, Auth, code:bash (npm run dev      # Dev server at http://localhost:3000), Commands, Component Conventions, graphify, Key Files, Reservation System (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (8): getReservasResumenDB(), ReservasResumenData, AdminDashboardPage(), EMPTY_RESUMEN, getWeekBars(), KPI_PRIMARY, KPI_SECONDARY, KpiCard

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (5): eliminarReservaDB(), ReservaTipoBackend, useReservasFiltradas(), AdminReservasPage(), ReservaRow

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (7): crearReservaDB(), ReservaTipoBody, CrearReservaData, CrearReservaResult, UseCrearReservaReturn, EstadoReserva, ReservaFormData

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (4): crearCategoriaDB(), getCategoriasDB(), Categoria, FormErrors

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (7): 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS, Animaciones Globales:, Archivo Global CSS (`app/globals.css` - 452 líneas):, Clases CSS Globales Disponibles:, code:javascript ({), Next.js Config (`next.config.ts`):, PostCSS Config (`postcss.config.mjs`):

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): 5. SISTEMA DE THEMING/TEMA ACTUAL, Análisis del Theming:, code:css (::-webkit-scrollbar-thumb {), code:css (::selection {), CONCLUSIÓN SOBRE THEMING:

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (4): ESTADO_CLASS, formatTimestamp(), ReservaDetailModal(), ReservaDetailModalProps

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (4): 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO, Características CSS del Admin:, CSS Modules del Admin:, Herencia del Tema Oscuro:

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (4): 9. TECNOLOGÍAS Y LIBRERÍAS, Architecture Pattern:, Dependencies:, DevDependencies:

## Knowledge Gaps
- **365 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+360 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DiaSemana` connect `Community 8` to `Community 7`, `Community 14`, `Community 23`, `Community 26`, `Community 27`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `ReservaBD` connect `Community 71` to `Community 0`, `Community 1`, `Community 68`, `Community 7`, `Community 14`, `Community 16`, `Community 30`, `Community 26`, `Community 62`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` connect `Community 2` to `Community 66`, `Community 67`, `Community 34`, `Community 69`, `Community 70`, `Community 42`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _365 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09788359788359788 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._