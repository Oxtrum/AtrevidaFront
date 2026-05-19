# Graph Report - .  (2026-05-19)

## Corpus Check
- 86 files · ~1,718,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 308 nodes · 472 edges · 31 communities (22 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_Calendar Grid|Calendar Grid]]
- [[_COMMUNITY_TimeSlot Picker & Reservation Page|TimeSlot Picker & Reservation Page]]
- [[_COMMUNITY_Public Home Page|Public Home Page]]
- [[_COMMUNITY_Reservas Backend Logic|Reservas Backend Logic]]
- [[_COMMUNITY_Reservation Form State|Reservation Form State]]
- [[_COMMUNITY_Calendar Components|Calendar Components]]
- [[_COMMUNITY_Header & Theme Toggle|Header & Theme Toggle]]
- [[_COMMUNITY_Day Selector & Admin Form|Day Selector & Admin Form]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_API Route A|API Route A]]
- [[_COMMUNITY_API Route B|API Route B]]
- [[_COMMUNITY_TimeSlot Display|TimeSlot Display]]
- [[_COMMUNITY_Data Table|Data Table]]
- [[_COMMUNITY_Admin Layout|Admin Layout]]
- [[_COMMUNITY_Form Modal|Form Modal]]
- [[_COMMUNITY_Page Header|Page Header]]
- [[_COMMUNITY_Reservas Table|Reservas Table]]
- [[_COMMUNITY_Reservation Card|Reservation Card]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_Input Component|Input Component]]

## God Nodes (most connected - your core abstractions)
1. `useLocales()` - 15 edges
2. `HORAS` - 9 edges
3. `CustomSelect()` - 7 edges
4. `toast` - 7 edges
5. `useReservas()` - 7 edges
6. `useReservasCalendario()` - 7 edges
7. `esHoraDisponible()` - 7 edges
8. `contarSlotsPorTipo()` - 6 edges
9. `SlotStatus` - 6 edges
10. `useReservationForm()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `EditarReservaContent()` --calls--> `useLocales()`  [EXTRACTED]
  app/admin/reservas/editar/[id]/page.tsx → lib/hooks/useLocales.ts
- `useReservationForm()` --calls--> `useLocales()`  [EXTRACTED]
  components/AdminReservationForm/useReservationForm.ts → lib/hooks/useLocales.ts
- `TimeSlotAdmin()` --calls--> `esHoraDisponible()`  [EXTRACTED]
  components/Calendar/TimeSlotAdmin.tsx → lib/utils/calendarHelpers.ts
- `TimeSlotAdmin()` --calls--> `esHoraDisponible()`  [EXTRACTED]
  components/Calendar/TimeSlotAdminAdmin.tsx → lib/utils/calendarHelpers.ts
- `useReservationForm()` --calls--> `useLocales()`  [EXTRACTED]
  components/ReservationForm/useReservationForm.ts → lib/hooks/useLocales.ts

## Communities (31 total, 9 thin omitted)

### Community 0 - "API Client"
Cohesion: 0.05
Nodes (31): apiClient, ApiError, RequestOptions, actualizarLocal(), ActualizarLocalData, ActualizarServicioData, crearCategoriaDB(), CrearLocalData (+23 more)

### Community 1 - "Calendar Grid"
Cohesion: 0.09
Nodes (21): CalendarGridProps, DIA_CORTO, DIAS, CalendarGridProps, DIA_CORTO, DIAS, SlotBadges(), SlotBadgesProps (+13 more)

### Community 2 - "TimeSlot Picker & Reservation Page"
Cohesion: 0.14
Nodes (20): CATEGORIAS_ORDEN, TimeSlotPicker(), TimeSlotPickerProps, useReservationForm(), DIAS_COMPLETO, DIAS_SEMANA, HORAS, useCrearReserva() (+12 more)

### Community 3 - "Public Home Page"
Cohesion: 0.08
Nodes (8): INFO_ITEMS, LINKS_NAV, LINKS_SERVICIOS, NAV_LINKS, STATS, VALORES, SERVICIOS, TESTIMONIOS

### Community 4 - "Reservas Backend Logic"
Cohesion: 0.11
Nodes (16): actualizarReservaDB(), ActualizarReservaDBData, crearReservaDB(), CrearReservaDBData, CrearReservaResult, getReservaByID(), getReservasCalendario(), GetReservasCalendarioParams (+8 more)

### Community 5 - "Reservation Form State"
Cohesion: 0.12
Nodes (15): ReservationFormInitialData, CrearReservaContent(), CrearReservaPage(), CustomSelect(), CustomSelectProps, SelectOption, DayInfo, DaySelector() (+7 more)

### Community 6 - "Calendar Components"
Cohesion: 0.16
Nodes (14): Calendar(), CalendarProps, CalendarAdmin(), CalendarAdminProps, CalendarPublico(), CalendarPublicoProps, Local, useLocales() (+6 more)

### Community 7 - "Header & Theme Toggle"
Cohesion: 0.11
Nodes (8): NAV_LINKS, AdminTheme, AdminThemeToggle(), AdminThemeToggleProps, OPTIONS, KPI_PRIMARY, KPI_SECONDARY, WEEK_BARS

### Community 8 - "Day Selector & Admin Form"
Cohesion: 0.18
Nodes (10): DayInfo, DaySelector(), DaySelectorProps, ReservationFormProps, ServiceGroup, ServiceSelect(), ServiceSelectProps, CustomSelect() (+2 more)

### Community 9 - "Root Layout"
Cohesion: 0.40
Nodes (3): geist, geistMono, metadata

### Community 10 - "API Route A"
Cohesion: 0.60
Nodes (3): GET(), PATCH(), POST()

### Community 12 - "TimeSlot Display"
Cohesion: 0.67
Nodes (3): agruparReservas(), TimeSlot(), TimeSlotProps

## Knowledge Gaps
- **94 isolated node(s):** `geist`, `geistMono`, `metadata`, `metadata`, `OPTIONS` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HORAS` connect `TimeSlot Picker & Reservation Page` to `Calendar Grid`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `useLocales()` connect `Calendar Components` to `TimeSlot Picker & Reservation Page`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `toast` connect `TimeSlot Picker & Reservation Page` to `API Client`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `geist`, `geistMono`, `metadata` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._
- **Should `Calendar Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.09411764705882353 - nodes in this community are weakly interconnected._
- **Should `TimeSlot Picker & Reservation Page` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._