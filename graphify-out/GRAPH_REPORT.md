# Graph Report - AtrevidaFront  (2026-06-02)

## Corpus Check
- 131 files · ~2,980,849 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1045 nodes · 1833 edges · 80 communities (68 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d8997e6`
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
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
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `DiaSemana` - 40 edges
2. `ReservaDetalle` - 22 edges
3. `PageHeader()` - 20 edges
4. `useLocales()` - 18 edges
5. `EstadoReserva` - 18 edges
6. `ReservaBD` - 18 edges
7. `toast` - 17 edges
8. `compilerOptions` - 16 edges
9. `CustomSelect()` - 14 edges
10. `FormModal()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `DaySelectorProps` --references--> `DiaSemana`  [EXTRACTED]
  components/ReservationForm/DaySelector.tsx → types/reserva.ts
- `Home()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/page.tsx → lib/seo.ts
- `robots()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/robots.ts → lib/seo.ts
- `ReservasPage()` --calls--> `absoluteUrl()`  [EXTRACTED]
  app/reservas/page.tsx → lib/seo.ts
- `ReservaRow` --references--> `EstadoReserva`  [EXTRACTED]
  app/atrevida-gestion/reservas/page.tsx → types/reserva.ts

## Communities (80 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): Admin Design System Implementation Plan, code:css (/* Typography scale */), code:css (.panel {), code:bash (npm run lint), code:tsx (import styles from './StatCard.module.css';), code:css (.grid {), code:bash (npm run lint), code:ts (export { SectionLabel } from './SectionLabel';) (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (17): actualizarEstadoReservaDB(), ActualizarEstadoReservaDBData, actualizarReservaNotificadoDB(), ActualizarReservaNotificadoDBData, crearReservaDB(), CrearReservaDBData, CrearReservaResult, GetReservasCalendarioParams (+9 more)

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
Cohesion: 0.05
Nodes (23): geist, geistMono, metadata, Home(), robots(), routes, INFO_ITEMS, LOCATIONS (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): Admin Combos Management Implementation Plan, code:typescript (// ─── Combo Servicios ─────────────────────────────────────), code:bash (npm run lint), code:bash (npm run lint), code:typescript (import { Tags, Building2, Scissors } from 'lucide-react';), code:typescript (import { Tags, Building2, Scissors, Package2 } from 'lucide-), code:typescript ({), code:bash (npm run lint) (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (18): actualizarComboServicio(), crearComboServicio(), eliminarComboServicio(), getCombosDB(), getComboServiciosDB(), ComboItem, ComboServicioDetalle, ComboServicioForm (+10 more)

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
Cohesion: 0.23
Nodes (9): DataTable(), DataTableProps, FormModal(), FormModalProps, crearCategoriaDB(), getCategoriasDB(), Categoria, CategoriasPage() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (14): ReservationCardProps, SlotBadges(), SlotBadgesProps, TimeSlotAdmin(), TimeSlotAdminProps, TimeSlotAdmin(), TimeSlotAdminProps, TimeSlotPublicoProps (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (21): activarServicioEnLocal(), ActivarServicioEnLocalData, ActualizarLocalData, actualizarServicio(), ActualizarServicioData, ComboServicioCreateData, ComboServicioUpdateData, CrearLocalData (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.26
Nodes (7): actualizarLocal(), getLocalByID(), EditarLocalPage(), Espacio, toast, ToastState, ToastType

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): computedHash, skillPath, source, sourceType, computedHash, skillPath, source, sourceType (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (11): RowActionsMenu(), ReservaDetailModal(), eliminarReservaDB(), ReservaTipoBackend, useReservasFiltradas(), AdminReservasPage(), ReservaRow, Button() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (41): cambiarPassword(), getUsuarios(), LoginResponse, registrarUsuario(), toggleUsuarioActivo(), UsuarioResumen, UsuariosListResponse, apiClient (+33 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (11): Action Elements, Brand & Style, Colors, Components, Elevation & Depth, Glass Containers, Inputs & Interaction, Layout & Spacing (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (8): Column, NAV_LINKS, crearLocalDB(), getLocalesDB(), Espacio, FormErrors, LocalesPage(), LocalRow

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (7): graphify, Key Notes, Project Commands, Structure, Tech Stack, This is NOT the Next.js you know, UI/UX Guidance

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (25): CATEGORIAS_ORDEN, AdminReservasAprobacionPage(), ApprovalDraft, ESTADO_OPTIONS, EstadoFiltro, EstadoGestion, formatDate(), getClientInitials() (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (12): ESTADO_CLASS, formatTimestamp(), ReservaDetailModalProps, ReservasTable(), ReservasTableProps, actualizarReservaDB(), ActualizarReservaDBData, GetReservasDBParams (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (10): enabledPlugins, code-review@claude-plugins-official, code-simplifier@claude-plugins-official, frontend-design@claude-plugins-official, superpowers@claude-plugins-official, hooks, PostToolUse, PreToolUse (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (11): AdminPanel, AdminPanelProps, PageHeader(), PageHeaderProps, renderTitle(), RowAction, RowActionsMenuProps, SectionLabel() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (3): GET(), PATCH(), POST()

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (9): Aplicación por página, Clases globales compartidas (en `app/atrevida-gestion/atrevida-gestion.css`), code:css ([data-admin="true"] .admin-shell {), Contexto, Decisiones tomadas, Diseño, Notas de implementación, Spec: Unificación de layout del panel admin (atrevida-gestion) (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (9): 6. COMPONENTES DEL ADMIN, Componentes Admin Específicos:, Componentes Compartidos Utilizados en Admin:, `components/AdminHeader/Header.tsx` (199 líneas), `components/AdminReservas/EditarReservaModal.module.css`, `components/AdminReservas/ReservasTable.tsx` (160 líneas), `components/Calendar/CalendarAdmin.tsx`, `components/Custom/CustomSelect.tsx` (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (4): AdminTheme, AdminThemeToggle(), AdminThemeToggleProps, AdminLoginPage()

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (9): 8. RESUMEN DE ARCHIVOS PRINCIPALES, API Routes (7 endpoints):, code:block16 (/admin/login           → page.tsx + page.module.css), code:block17 (AdminHeader/Header.tsx), code:block18 (/api/admin/login), code:block19 (app/globals.css (452 líneas - CSS Variables + utilidades)), Componentes Admin (4 componentes):, Configuración Global: (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (7): 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS, Animaciones Globales:, Archivo Global CSS (`app/globals.css` - 452 líneas):, Clases CSS Globales Disponibles:, code:javascript ({), Next.js Config (`next.config.ts`):, PostCSS Config (`postcss.config.mjs`):

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (5): 5. SISTEMA DE THEMING/TEMA ACTUAL, Análisis del Theming:, code:css (::-webkit-scrollbar-thumb {), code:css (::selection {), CONCLUSIÓN SOBRE THEMING:

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (13): Admin Theming, AdminConfig Component Kit, API Response Shape, Architecture, Auth, code:bash (npm run dev      # Dev server at http://localhost:3000), code:ts ({ code: number; data: T; error: boolean; message: string | n), Commands (+5 more)

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (4): 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO, Características CSS del Admin:, CSS Modules del Admin:, Herencia del Tema Oscuro:

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (4): 9. TECNOLOGÍAS Y LIBRERÍAS, Architecture Pattern:, Dependencies:, DevDependencies:

### Community 61 - "Community 61"
Cohesion: 0.05
Nodes (79): DayInfo, DaySelector(), DaySelectorProps, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, TimeSlotPicker() (+71 more)

### Community 62 - "Community 62"
Cohesion: 0.30
Nodes (12): getReservasDB(), AdminReservasProximasPage(), formatDate(), getClientInitials(), getDateISOWithOffset(), getReminderWhatsappHref(), getReservaDateTimeMs(), getReservaEndMs() (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.53
Nodes (5): agruparReservas(), TimeSlot(), TimeSlotProps, normalizeTipo(), TimeSlotInfo

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): StatCard(), StatCardProps, StatGrid(), StatGridProps

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (19): ServicioDBRow, ServicioPublico, staticFallback(), TRATAMIENTO, FiltrosReserva, getServiciosPorSucursal(), LocalData, ReservasBDResponse (+11 more)

### Community 67 - "Community 67"
Cohesion: 0.31
Nodes (6): TimeSlotPublico(), contarSlotsPorTipo(), contarSlotsPorTipoEnHora(), obtenerDisponibilidadEnHora(), obtenerEtiquetaDisponibilidad(), tieneDisponibilidad()

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (17): 1. Page shell (ya existe, sin componente), 2. `PageHero` (renombrar/extender el actual `PageHeader`), 3. `SectionLabel`, 4. `AdminPanel`, 5. `StatCard` + `StatGrid`, 6. Tokens tipográficos (nuevos, en `atrevida-gestion.css`), code:block1 (<div className={styles.pageContainer}>), code:block2 (--admin-fs-title: clamp(1.6rem, 3vw, 2.1rem);   /* weight 70) (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (14): getReservasCalendario(), CalendarGridProps, DIA_CORTO, DIAS, CalendarGridProps, DIA_CORTO, DIAS, UseReservasCalendarioParams (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): code:tsx (import { CheckSquare } from 'lucide-react';), code:tsx (<div ref={headerRef}>), code:tsx (<StatGrid>), code:tsx (<SectionLabel icon={<Filter size={12} strokeWidth={2} />}>Bú), code:tsx (<AdminPanel accentStripe>), code:bash (npm run lint), Task 1.10 — Aprobación de reservas

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (6): code:tsx (import { Calendar } from 'lucide-react';), code:tsx (<div ref={headerRef}>), code:tsx (<StatGrid>), code:tsx (<AdminPanel>), code:bash (npm run lint), Task 1.11 — Citas próximas

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (5): code:tsx (import { Tags } from 'lucide-react';), code:tsx (<PageHeader), code:bash (npm run lint), PHASE 1 — Migración de páginas, Task 1.3 — Categorías

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (4): code:tsx (import { AdminPanel } from '@/components/AdminConfig';), code:tsx (<AdminPanel accentStripe>), code:bash (npm run lint), Task 1.5 — Reservas (migrar paneles)

### Community 75 - "Community 75"
Cohesion: 0.40
Nodes (5): code:tsx (import { Package2 } from 'lucide-react';), code:tsx (<PageHeader), code:tsx (<AdminPanel accentStripe>), code:bash (npm run lint), Task 1.6 — Combos

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (5): code:tsx (import { Scissors } from 'lucide-react';), code:tsx (<PageHeader), code:tsx (<AdminPanel accentStripe>), code:bash (npm run lint), Task 1.7 — Servicios

### Community 77 - "Community 77"
Cohesion: 0.40
Nodes (5): code:tsx (import { LayoutDashboard } from 'lucide-react';), code:tsx (<div ref={headerRef}>), code:tsx (<StatGrid>), code:bash (npm run lint), Task 1.9 — Dashboard

### Community 78 - "Community 78"
Cohesion: 0.50
Nodes (4): code:tsx (import { Users } from 'lucide-react';), code:tsx (<PageHeader), code:bash (npm run lint), Task 1.1 — Clientes

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (4): code:tsx (import { ShieldCheck } from 'lucide-react';), code:tsx (<PageHeader), code:bash (npm run lint), Task 1.2 — Usuarios

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (4): code:tsx (import { Building2 } from 'lucide-react';), code:tsx (<PageHeader), code:bash (npm run lint), Task 1.4 — Locales

### Community 81 - "Community 81"
Cohesion: 0.50
Nodes (4): code:tsx (<PageHeader), code:tsx (<SectionLabel withLine>Módulos</SectionLabel>), code:bash (npm run lint), Task 1.8 — Configuración hub

## Knowledge Gaps
- **433 isolated node(s):** `eslintConfig`, `name`, `version`, `private`, `dev` (+428 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DiaSemana` connect `Community 61` to `Community 1`, `Community 66`, `Community 67`, `Community 70`, `Community 15`, `Community 19`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `PageHeader()` connect `Community 30` to `Community 8`, `Community 14`, `Community 16`, `Community 17`, `Community 19`, `Community 21`, `Community 23`, `Community 26`, `Community 62`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `name`, `version` to the rest of the system?**
  _433 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._