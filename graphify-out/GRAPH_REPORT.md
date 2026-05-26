# Graph Report - AtrevidaFront  (2026-05-25)

## Corpus Check
- 113 files · ~2,967,068 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 759 nodes · 1166 edges · 53 communities (44 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c00e7ad3`
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
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `DiaSemana` - 37 edges
2. `ReservaDetalle` - 17 edges
3. `compilerOptions` - 16 edges
4. `useLocales()` - 16 edges
5. `Banexcoin Frontend Style Guide` - 12 edges
6. `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` - 12 edges
7. `Variables CSS del Sistema de Diseño:` - 12 edges
8. `useReservationForm()` - 11 edges
9. `EstadoReserva` - 11 edges
10. `ReservaBD` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AdminReservasPage()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/page.tsx → lib/hooks/useLocales.ts
- `EditarReservaContent()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/editar/[id]/page.tsx → lib/hooks/useLocales.ts
- `ReservasTableProps` --references--> `ReservaBD`  [EXTRACTED]
  components/AdminReservas/ReservasTable.tsx → types/reserva.ts
- `DaySelectorProps` --references--> `DiaSemana`  [EXTRACTED]
  components/AdminReservationForm/DaySelector.tsx → types/reserva.ts
- `TimeSlotPickerProps` --references--> `SlotStatus`  [EXTRACTED]
  components/AdminReservationForm/TimeSlotPicker.tsx → lib/utils/hoursAvailability.ts

## Communities (53 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (48): CATEGORIAS_ORDEN, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, TimeSlotPicker(), TimeSlotPickerProps, ReservationFormInitialData (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (47): ReservasTable(), ReservasTableProps, apiClient, ApiError, getAuthToken(), request(), RequestOptions, ActualizarEstadoReservaDBData (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (44): 10. PUNTOS CLAVE IDENTIFICADOS, 1. ESTRUCTURA DE CARPETAS DEL PROYECTO, 2. RUTAS DEL ADMIN Y PÁGINAS, 3. LAYOUT GLOBAL PARA EL ADMIN, 5. SISTEMA DE THEMING/TEMA ACTUAL, 6. COMPONENTES DEL ADMIN, 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO, 8. RESUMEN DE ARCHIVOS PRINCIPALES (+36 more)

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
Cohesion: 0.06
Nodes (11): INFO_ITEMS, LOCATIONS, CrearReservaPage(), LINKS_NAV, LINKS_SERVICIOS, NAV_LINKS, STATS, VALORES (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (5): crearLocalDB(), getLocalesDB(), Espacio, FormErrors, LocalRow

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (14): CustomSelect(), CustomSelectProps, SelectOption, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, TimeSlotPicker() (+6 more)

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
Cohesion: 0.11
Nodes (19): 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS, Animaciones Globales:, Archivo Global CSS (`app/globals.css` - 452 líneas):, Clases CSS Globales Disponibles:, code:css (--af-radius-pill: 9999px;), code:css (--af-ease: cubic-bezier(0.16, 1, 0.3, 1);), code:css (--af-glass: rgba(9, 9, 11, 0.80);), code:javascript ({) (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (22): agruparReservas(), TimeSlot(), TimeSlotProps, FiltrosReserva, getTipoColor(), getTipoLabel(), LocalData, normalizeTipo() (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (3): AdminTheme, AdminThemeToggle(), AdminThemeToggleProps

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (12): Calendar(), CalendarAdmin(), CalendarPublico(), Local, useLocales(), UseLocalesReturn, useReservasCalendario(), UseReservasCalendarioParams (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (9): ActivarServicioEnLocalData, ActualizarLocalData, actualizarServicio(), ActualizarServicioData, CrearLocalData, CrearServicioData, GetCombosParams, getServiciosDB() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (6): actualizarLocal(), getLocalByID(), Espacio, toast, ToastState, ToastType

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (12): CalendarAdminProps, ReservationCardProps, SlotBadges(), SlotBadgesProps, TimeSlotAdmin(), TimeSlotAdminProps, TimeSlotAdmin(), TimeSlotAdminProps (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (10): activarServicioEnLocal(), crearServicioDB(), eliminarServicioDB(), CategoriaOption, ConfirmState, FORM_INITIAL, FormErrors, FormState (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (11): Action Elements, Brand & Style, Colors, Components, Elevation & Depth, Glass Containers, Inputs & Interaction, Layout & Spacing (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (11): DayInfo, DaySelector(), DaySelectorProps, CalendarProps, CalendarGridProps, CalendarGridProps, CalendarPublicoProps, DayInfo (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (5): geist, geistMono, metadata, HIDDEN_PREFIXES, WhatsappFabProps

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (7): graphify, Key Notes, Project Commands, Structure, Tech Stack, This is NOT the Next.js you know, UI/UX Guidance

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (8): Column, DataTable(), DataTableProps, FormModal(), FormModalProps, RowAction, RowActionsMenu(), RowActionsMenuProps

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (6): PageHeader(), PageHeaderProps, crearCategoriaDB(), getCategoriasDB(), Categoria, FormErrors

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (7): TimeSlotPublico(), TimeSlotPublicoProps, contarSlotsPorTipo(), contarSlotsPorTipoEnHora(), obtenerDisponibilidadEnHora(), obtenerEtiquetaDisponibilidad(), tieneDisponibilidad()

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (10): enabledPlugins, code-review@claude-plugins-official, code-simplifier@claude-plugins-official, frontend-design@claude-plugins-official, superpowers@claude-plugins-official, hooks, PostToolUse, PreToolUse (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (5): DIA_CORTO, DIAS, DIA_CORTO, DIAS, ReservaPorHora

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (3): GET(), PATCH(), POST()

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): Architecture, Auth, code:bash (npm run dev      # Dev server at http://localhost:3000), Commands, Component Conventions, graphify, Key Files, Reservation System (+1 more)

## Knowledge Gaps
- **329 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+324 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DiaSemana` connect `Community 23` to `Community 0`, `Community 1`, `Community 8`, `Community 14`, `Community 16`, `Community 20`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `toast` connect `Community 19` to `Community 0`, `Community 1`, `Community 7`, `Community 21`, `Community 27`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` connect `Community 2` to `Community 13`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _329 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.055905220288781934 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.050595238095238096 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._