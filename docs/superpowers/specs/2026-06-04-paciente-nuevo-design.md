# visible_paciente_nuevo — Design Spec

**Date:** 2026-06-04  
**Status:** Approved

## Context

Backend added `visible_paciente_nuevo: boolean` field to each servicio. New query param `?paciente_nuevo=true` filters services for new patients. New PATCH endpoint lets admin control visibility per service per sucursal.

Public booking form must only show services enabled for new patients. Admin reservation form must show all services (no filter). Admin config page needs a toggle per service.

## Scope

4 files changed. No new components. No new proxy routes.

## Changes

### 1. `lib/api/servicios.ts`

Add `paciente_nuevo?: boolean` to `GetServiciosParams`. Pass as query param string in `getServiciosDB()`.

Add new function:
```ts
export async function togglePacienteNuevo(
  servicioId: number | string,
  localId: number | string,
  visible: boolean,
) {
  return apiClient.patch(
    `/bd/servicios/${servicioId}/local/${localId}/paciente-nuevo`,
    { visible_paciente_nuevo: visible },
  );
}
```

### 2. `lib/hooks/useServiciosPublicos.ts`

Add optional `pacienteNuevo?: boolean` param to `useServiciosPublicos(sucursal, pacienteNuevo?)`.

When `pacienteNuevo` is `true`, add `paciente_nuevo=true` to `URLSearchParams` in the fetch call to `/api/bd/servicios`.

The proxy route (`app/api/bd/servicios/route.ts`) already forwards all query params — no proxy change needed.

### 3. `components/ReservationForm/useReservationForm.ts`

One-line change on line 102:
```ts
// before
const { servicios, loading: loadingServicios } = useServiciosPublicos(sucursal);
// after
const { servicios, loading: loadingServicios } = useServiciosPublicos(sucursal, true);
```

`components/AdminReservationForm/useReservationForm.ts` is unchanged — it calls `getServiciosDB()` directly without `paciente_nuevo` filter.

### 4. `app/atrevida-gestion/configuracion/servicios/page.tsx`

**`ServicioRow`** — add field:
```ts
visible_paciente_nuevo?: boolean;
```

**Handler** — new `handleTogglePacienteNuevo(row)`:
- Looks up `localId` from `locales.find(l => l.nombre === row.local)?.id`
- If not found, shows error toast and returns
- Uses existing `confirmState` pattern for confirmation dialog
- Calls `togglePacienteNuevo(row.id, localId, !row.visible_paciente_nuevo)`
- On success: toast + `fetchServicios()`

**New column** (inserted before `acciones`):
```ts
{
  key: 'visible_paciente_nuevo',
  label: 'Pac. Nuevo',
  searchable: false,
  render: (_val, row) => (
    <button
      type="button"
      onClick={() => handleTogglePacienteNuevo(row)}
      className={row.visible_paciente_nuevo ? styles.statusActive : styles.statusInactive}
    >
      {row.visible_paciente_nuevo ? 'Visible' : 'Oculto'}
    </button>
  ),
},
```

Reuses existing `styles.statusActive` / `styles.statusInactive` CSS classes. No new styles needed.

## Data Flow

```
Admin toggles "Pac. Nuevo" button
  → confirmState dialog
  → togglePacienteNuevo(id, localId, next) via apiClient
  → PATCH /bd/servicios/:id/local/:localId/paciente-nuevo { visible_paciente_nuevo: bool }
  → fetchServicios() refresh

Public booking form mounts
  → useServiciosPublicos(sucursal, true)
  → GET /api/bd/servicios?local=<sucursal>&paciente_nuevo=true  (via proxy)
  → proxy forwards to backend
  → only services with visible_paciente_nuevo=true returned
```

## Out of Scope

- Admin reservation form filter (intentionally shows all services)
- Static fallback in `useServiciosPublicos` (SERVICIOS_DISPONIBLES) — not filtered; backend is source of truth for this flag
