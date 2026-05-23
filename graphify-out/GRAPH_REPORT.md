# Graph Report - AtrevidaFront  (2026-05-23)

## Corpus Check
- 112 files · ~2,965,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 728 nodes · 1057 edges · 55 communities (41 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93b96f57`
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]

## God Nodes (most connected - your core abstractions)
1. `DiaSemana` - 24 edges
2. `compilerOptions` - 16 edges
3. `useLocales()` - 15 edges
4. `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` - 12 edges
5. `Variables CSS del Sistema de Diseño:` - 12 edges
6. `Banexcoin Frontend Style Guide` - 12 edges
7. `useReservationForm()` - 11 edges
8. `High-Agency Frontend Skill` - 11 edges
9. `ReservaDetalle` - 10 edges
10. `ARCHIVOS CLAVE - RUTAS ABSOLUTAS Y CONTENIDOS` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AdminReservasPage()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/page.tsx → lib/hooks/useLocales.ts
- `Calendar()` --calls--> `useLocales()`  [EXTRACTED]
  components/Calendar/Calendar.tsx → lib/hooks/useLocales.ts
- `CalendarAdmin()` --calls--> `useLocales()`  [EXTRACTED]
  components/Calendar/CalendarAdmin.tsx → lib/hooks/useLocales.ts
- `CalendarPublico()` --calls--> `useLocales()`  [EXTRACTED]
  components/Calendar/CalendarPublico.tsx → lib/hooks/useLocales.ts
- `TimeSlotAdmin()` --calls--> `esHoraDisponible()`  [EXTRACTED]
  components/Calendar/TimeSlotAdmin.tsx → lib/utils/calendarHelpers.ts

## Communities (55 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (7): crearLocalDB(), Espacio, FormErrors, LocalRow, toast, ToastState, ToastType

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (44): ReservasTableProps, CalendarGridProps, DIA_CORTO, DIAS, ReservationCardProps, SlotBadges(), SlotBadgesProps, agruparReservas() (+36 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (11): DayInfo, DaySelector(), DaySelectorProps, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, ReservationFormInitialData (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (8): INFO_ITEMS, LOCATIONS, LINKS_NAV, LINKS_SERVICIOS, STATS, VALORES, SERVICIOS, TESTIMONIOS

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (39): apiClient, ApiError, getAuthToken(), request(), RequestOptions, ActualizarEstadoReservaDBData, actualizarReservaDB(), ActualizarReservaDBData (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (32): getReservasCalendario(), Calendar(), CalendarProps, CalendarAdmin(), CalendarAdminProps, CalendarGridProps, DIA_CORTO, DIAS (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (4): crearCategoriaDB(), getCategoriasDB(), Categoria, FormErrors

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (5): NAV_LINKS, AdminTheme, AdminThemeToggle(), AdminThemeToggleProps, OPTIONS

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (50): CATEGORIAS_ORDEN, TimeSlotPicker(), TimeSlotPickerProps, useReservationForm(), actualizarEstadoReservaDB(), AdminReservasAprobacionPage(), ApprovalDraft, ESTADO_OPTIONS (+42 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (5): geist, geistMono, metadata, HIDDEN_PREFIXES, WhatsappFabProps

### Community 10 - "Community 10"
Cohesion: 0.60
Nodes (3): GET(), PATCH(), POST()

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (44): 10. PUNTOS CLAVE IDENTIFICADOS, 1. ESTRUCTURA DE CARPETAS DEL PROYECTO, 2. RUTAS DEL ADMIN Y PÁGINAS, 3. LAYOUT GLOBAL PARA EL ADMIN, 5. SISTEMA DE THEMING/TEMA ACTUAL, 6. COMPONENTES DEL ADMIN, 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO, 8. RESUMEN DE ARCHIVOS PRINCIPALES (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (37): 1. app/globals.css, 2. app/layout.tsx, 3. postcss.config.mjs, 4. next.config.ts, 5. package.json, ADMIN DASHBOARD, ADMIN LOGIN, ADMIN RESERVAS - CREAR (+29 more)

### Community 31 - "Community 31"
Cohesion: 0.06
Nodes (34): Accessibility & Reduced‑Motion, Banexcoin Frontend Style Guide, Buttons, Cards, code:css (:root {), code:css (@media (prefers-reduced-motion: reduce) {), code:css (* { scrollbar-width: thin; scrollbar-color: rgb(var(--color‑), code:html (<link rel="stylesheet") (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (30): 10. FINAL PRE-FLIGHT CHECK, 1. ACTIVE BASELINE CONFIGURATION, 2. DEFAULT ARCHITECTURE & CONVENTIONS, 3. DESIGN ENGINEERING DIRECTIVES (Bias Correction), 4. CREATIVE PROACTIVITY (Anti-Slop Implementation), 5. PERFORMANCE GUARDRAILS, 6. TECHNICAL REFERENCE (Dial Definitions), 7. AI TELLS (Forbidden Patterns) (+22 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (26): 1. ¿Cuál es la estructura de carpetas del proyecto?, 1. **RESUMEN_EJECUTIVO.md** ⭐ COMIENZA AQUÍ, 2. **ATREVIDA_STRUCTURE_REPORT.md**, 2. ¿Dónde están localizadas las rutas y páginas del admin?, 3. ¿Existe algún layout global para el admin?, 3. **VISUAL_SUMMARY.txt**, 4. **ARCHIVOS_CLAVE.md**, 4. ¿Dónde están estilos globales, Tailwind, providers y temas? (+18 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (25): 1. ¿Cuál es la estructura de carpetas del proyecto?, 2. ¿Dónde están las rutas del admin?, 3. ¿Existe layout global para el admin?, 4. ¿Dónde están archivos de estilos globales, Tailwind y providers?, 5. ¿Hay sistema de theming/tema actual?, 6. ¿Qué componentes se usan en el admin?, 7. ¿Hay estilos CSS que heredan tema oscuro público?, Autenticación Actual: (+17 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (23): dependencies, gsap, lucide-react, next, react, react-dom, devDependencies, eslint (+15 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (19): 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS, Animaciones Globales:, Archivo Global CSS (`app/globals.css` - 452 líneas):, Clases CSS Globales Disponibles:, code:css (--af-radius-pill: 9999px;), code:css (--af-ease: cubic-bezier(0.16, 1, 0.3, 1);), code:css (--af-glass: rgba(9, 9, 11, 0.80);), code:javascript ({) (+11 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (10): ActivarServicioEnLocalData, ActualizarLocalData, ActualizarServicioData, CrearLocalData, CrearServicioData, GetCombosParams, getLocalesDB(), GetServiciosParams (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (11): Action Elements, Brand & Style, Colors, Components, Elevation & Depth, Glass Containers, Inputs & Interaction, Layout & Spacing (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (11): activarServicioEnLocal(), actualizarServicio(), crearServicioDB(), eliminarServicioDB(), getServiciosDB(), CategoriaOption, FORM_INITIAL, FormErrors (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): graphify, Key Notes, Project Commands, Structure, Tech Stack, This is NOT the Next.js you know, UI/UX Guidance

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (3): actualizarLocal(), getLocalByID(), Espacio

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (5): hooks, PostToolUse, PreToolUse, Stop, UserPromptSubmit

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **346 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+341 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DiaSemana` connect `Community 5` to `Community 8`, `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `toast` connect `Community 0` to `Community 4`, `Community 6`, `Community 8`, `Community 42`, `Community 45`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT` connect `Community 12` to `Community 37`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _346 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05764145954521417 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05224963715529753 - nodes in this community are weakly interconnected._