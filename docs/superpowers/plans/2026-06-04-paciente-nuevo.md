# visible_paciente_nuevo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter public booking form services by `visible_paciente_nuevo=true` and add admin toggle per service/sucursal.

**Architecture:** Add `paciente_nuevo` query param through the API client and public hook, pass `true` from the public form only. Admin config page gets a new inline toggle column that calls a new PATCH endpoint via `apiClient` directly (authenticated, no proxy needed).

**Tech Stack:** Next.js 16.2.2 App Router, React 19, TypeScript strict, `apiClient` from `lib/api/client.ts`

> **Note:** This project has no test framework. Verification steps use `npm run lint` (catches TypeScript errors) and manual browser testing.

---

### Task 1: Extend API layer — add `paciente_nuevo` param and `togglePacienteNuevo`

**Files:**
- Modify: `lib/api/servicios.ts`

- [ ] **Step 1: Add `paciente_nuevo` to `GetServiciosParams` and `getServiciosDB`**

In `lib/api/servicios.ts`, update `GetServiciosParams` and `getServiciosDB`:

```ts
export interface GetServiciosParams {
  local?: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
  requiere_evaluacion?: boolean;
  paciente_nuevo?: boolean;          // ← add this line
}
```

In `getServiciosDB`, add the new param inside the `params` object:

```ts
export async function getServiciosDB(params: GetServiciosParams) {
  return apiClient.get('/bd/servicios', {
    params: {
      local: params.local,
      nombre: params.nombre,
      categoria: params.categoria,
      sesiones: params.sesiones,
      requiere_evaluacion: params.requiere_evaluacion?.toString(),
      paciente_nuevo: params.paciente_nuevo?.toString(),   // ← add this line
    },
  });
}
```

- [ ] **Step 2: Add `togglePacienteNuevo` function**

Append to `lib/api/servicios.ts` after `eliminarServicioDB`:

```ts
/** PATCH /bd/servicios/{id}/local/{localId}/paciente-nuevo — toggle visibility for new patients. */
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

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npm run lint
```

Expected: no errors related to `servicios.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/api/servicios.ts
git commit -m "feat: add paciente_nuevo param and togglePacienteNuevo to servicios API"
```

---

### Task 2: Update `useServiciosPublicos` hook to accept `pacienteNuevo` param

**Files:**
- Modify: `lib/hooks/useServiciosPublicos.ts`

- [ ] **Step 1: Add `pacienteNuevo` param to hook signature and fetch call**

Change the `useServiciosPublicos` function signature and its internal `load` callback:

```ts
export function useServiciosPublicos(sucursal: string, pacienteNuevo?: boolean) {
  const [servicios, setServicios] = useState<ServicioPublico[]>(() => staticFallback(sucursal));
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (local: string) => {
    if (!local) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ local });
      if (pacienteNuevo) qs.set('paciente_nuevo', 'true');   // ← add this line
      const res = await fetch(`/api/bd/servicios?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: { servicios?: ServicioDBRow[] } };
      const rawRows = (json.data?.servicios ?? []).filter(r => r.activo !== false);
      // Deduplicate by nombre — backend may return same service for multiple locals
      const seen = new Set<string>();
      const rows = rawRows.filter(r => {
        if (seen.has(r.nombre)) return false;
        seen.add(r.nombre);
        return true;
      });
      if (rows.length > 0) {
        setServicios([...rows.map(mapRow), TRATAMIENTO]);
      } else {
        setServicios(staticFallback(local));
      }
    } catch {
      setServicios(staticFallback(local));
    } finally {
      setLoading(false);
    }
  }, [pacienteNuevo]);   // ← add pacienteNuevo to deps

  useEffect(() => {
    load(sucursal);
  }, [sucursal, load]);

  return { servicios, loading };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run lint
```

Expected: no errors related to `useServiciosPublicos.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useServiciosPublicos.ts
git commit -m "feat: add pacienteNuevo param to useServiciosPublicos hook"
```

---

### Task 3: Pass `pacienteNuevo=true` from public booking form

**Files:**
- Modify: `components/ReservationForm/useReservationForm.ts`

- [ ] **Step 1: Pass `true` to `useServiciosPublicos`**

On line 102 of `components/ReservationForm/useReservationForm.ts`, change:

```ts
// before
const { servicios, loading: loadingServicios } = useServiciosPublicos(sucursal);

// after
const { servicios, loading: loadingServicios } = useServiciosPublicos(sucursal, true);
```

`components/AdminReservationForm/useReservationForm.ts` does **not** use `useServiciosPublicos` — it calls `getServiciosDB()` directly and must remain unchanged.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual test — public form**

Start dev server:
```bash
npm run dev
```

1. Open `http://localhost:3000/reservas/crear`
2. Select a sucursal
3. Confirm only services with `visible_paciente_nuevo=true` appear in the service dropdown
4. Open Network tab → verify request to `/api/bd/servicios` includes `paciente_nuevo=true`

- [ ] **Step 4: Commit**

```bash
git add components/ReservationForm/useReservationForm.ts
git commit -m "feat: filter public booking services by paciente_nuevo=true"
```

---

### Task 4: Add `visible_paciente_nuevo` toggle column to admin servicios page

**Files:**
- Modify: `app/atrevida-gestion/configuracion/servicios/page.tsx`

- [ ] **Step 1: Import `togglePacienteNuevo`**

At the top of the file, add `togglePacienteNuevo` to the existing import from `@/lib/api/servicios`:

```ts
import {
  getCategoriasDB,
  getLocalesDB,
  getServiciosDB,
  crearServicioDB,
  actualizarServicio,
  eliminarServicioDB,
  activarServicioEnLocal,
  togglePacienteNuevo,    // ← add this
} from '@/lib/api/servicios';
```

- [ ] **Step 2: Add `visible_paciente_nuevo` to `ServicioRow`**

In the `ServicioRow` interface, add the field:

```ts
interface ServicioRow extends Record<string, unknown> {
  id: number;
  nombre: string;
  categoria: string;
  local: string;
  tiempo: string;
  costo: string;
  sesiones: number;
  tipoEspacio: string;
  activo?: boolean;
  requiere_evaluacion?: boolean;
  visible_paciente_nuevo?: boolean;   // ← add this line
}
```

- [ ] **Step 3: Add `handleTogglePacienteNuevo` handler**

Add after the existing `handleToggleActivo` handler (around line 326):

```ts
const handleTogglePacienteNuevo = (row: ServicioRow) => {
  const local = locales.find((l) => l.nombre === row.local);
  if (!local) {
    toast.error('Local no encontrado');
    return;
  }
  const next = !row.visible_paciente_nuevo;
  const verb = next ? 'activar' : 'desactivar';
  setConfirmState({
    message: `¿Seguro que quieres ${verb} "${row.nombre}" para pacientes nuevos en ${row.local}?`,
    onConfirm: async () => {
      try {
        await togglePacienteNuevo(row.id, local.id, next);
        toast.success(next ? 'Visible para pacientes nuevos' : 'Oculto para pacientes nuevos');
        await fetchServicios();
      } catch (err) {
        if (err instanceof Error) console.error('togglePacienteNuevo', err);
        toast.error(`No se pudo ${verb} el servicio para pacientes nuevos.`);
      }
    },
  });
};
```

- [ ] **Step 4: Add `visible_paciente_nuevo` column**

In the `columns` array, insert this column **before** the `acciones` column (which is the last one):

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
      aria-label={row.visible_paciente_nuevo ? 'Desactivar para pacientes nuevos' : 'Activar para pacientes nuevos'}
      title={row.visible_paciente_nuevo ? 'Clic para desactivar para pacientes nuevos' : 'Clic para activar para pacientes nuevos'}
    >
      {row.visible_paciente_nuevo ? 'Visible' : 'Oculto'}
    </button>
  ),
},
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Manual test — admin toggle**

1. Open `http://localhost:3000/atrevida-gestion/configuracion/servicios`
2. Select a local to load services
3. Confirm new "Pac. Nuevo" column appears with "Visible"/"Oculto" buttons
4. Click a toggle button → confirm dialog appears
5. Confirm → verify button state flips and Network tab shows `PATCH /bd/servicios/:id/local/:localId/paciente-nuevo`
6. Return to public form → verify change is reflected

- [ ] **Step 7: Commit**

```bash
git add app/atrevida-gestion/configuracion/servicios/page.tsx
git commit -m "feat: add visible_paciente_nuevo toggle column to admin servicios"
```
