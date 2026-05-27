# Admin Combos Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/admin/configuracion/combos` — a page that lists combos from the backend with filterable results, lets admins expand each combo inline to see its `combo_servicios` items, and perform full CRUD (add/edit/delete) on those items.

**Architecture:** Approach A — custom expandable table in a single page component, no changes to shared `DataTable`. Combos list uses hand-rolled rows with an expand/collapse toggle. Combo servicios are fetched lazily on first expand and cached client-side. CRUD uses `FormModal`. Combos themselves are read-only (only created via `POST /admin/importar` pipeline).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, GSAP (entry animation), Lucide icons. API via `apiClient`. Components: `Header`, `PageHeader`, `FormModal`, `RowActionsMenu` from `components/AdminConfig/`, `CustomSelect` from `components/Custom/CustomSelectAdmin.tsx`, `toast` from `components/Shared/Toast`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/api/servicios.ts` | Add 4 combo_servicios API functions + 2 interfaces |
| Modify | `app/admin/configuracion/page.tsx` | Add Combos card to OPTIONS array |
| Create | `app/admin/configuracion/combos/page.module.css` | All CSS for combos page |
| Create | `app/admin/configuracion/combos/page.tsx` | Main page: auth, filters, expandable combo list, CRUD |

---

## Task 1: Add combo_servicios API functions

**Files:**
- Modify: `lib/api/servicios.ts`

This project has **no test framework** — verification is `npm run lint` + manual browser check.

- [ ] **Step 1: Append interfaces and functions to `lib/api/servicios.ts`**

After the existing `getCombosDB` function (around line 133), append:

```typescript
// ─── Combo Servicios ──────────────────────────────────────────────

export interface ComboServicioCreateData {
  combo_id: number;
  servicio_id?: number;
  servicio_texto?: string;
  tiempo?: string;
  costo?: number;
  sesiones?: number;
  orden?: number;
}

export interface ComboServicioUpdateData {
  servicio_id?: number;
  servicio_texto?: string;
  tiempo?: string;
  costo?: number;
  sesiones?: number;
  orden?: number;
}

/** GET /bd/combos/{combo_id}/servicios — list items of an active combo. */
export async function getComboServiciosDB(combo_id: number | string) {
  return apiClient.get(`/bd/combos/${combo_id}/servicios`);
}

/** POST /bd/combos/servicios — add an item to a combo. */
export async function crearComboServicio(data: ComboServicioCreateData) {
  return apiClient.post('/bd/combos/servicios', data);
}

/** PATCH /bd/combos/servicios/{id} — update fields of a combo_servicios item. */
export async function actualizarComboServicio(id: number | string, data: ComboServicioUpdateData) {
  return apiClient.patch(`/bd/combos/servicios/${id}`, data);
}

/** DELETE /bd/combos/servicios/{id} — remove a combo_servicios item. */
export async function eliminarComboServicio(id: number | string) {
  return apiClient.delete(`/bd/combos/servicios/${id}`);
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors on `lib/api/servicios.ts`.

---

## Task 2: Add Combos card to configuracion index

**Files:**
- Modify: `app/admin/configuracion/page.tsx`

- [ ] **Step 1: Add `Package2` to the lucide import**

Replace:
```typescript
import { Tags, Building2, Scissors } from 'lucide-react';
```
With:
```typescript
import { Tags, Building2, Scissors, Package2 } from 'lucide-react';
```

- [ ] **Step 2: Add Combos entry to OPTIONS array (after the Servicios entry)**

```typescript
  {
    title: 'Combos',
    description: 'Ver y gestionar servicios dentro de combos',
    icon: <Package2 size={24} strokeWidth={1.5} />,
    href: '/admin/configuracion/combos',
    color: '#10b981',
    colorRgb: '16, 185, 129',
  },
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Verify in browser**

`http://localhost:3000/admin/configuracion` — four cards appear (Categorías, Locales, Servicios, Combos). Combos shows green accent.

---

## Task 3: Create combos page CSS module

**Files:**
- Create: `app/admin/configuracion/combos/page.module.css`

- [ ] **Step 1: Create directory and CSS file**

```bash
mkdir -p app/admin/configuracion/combos
```

Create `app/admin/configuracion/combos/page.module.css`:

```css
/* combos/page.module.css — AtrevidaFit Admin · Combos */

.pageContainer {
  min-height: 100vh;
  background: var(--admin-grad-subtle), var(--admin-bg);
  color: var(--admin-foreground);
  font-family: var(--admin-font-family);
  position: relative;
  overflow-x: hidden;
}

.main {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  padding: 2rem;
}

.contentStack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Filter card ──────────────────────────────────────────────── */

.filterCard {
  background: var(--admin-panel-bg);
  border-radius: var(--admin-radius-xl);
  border: 1px solid var(--admin-border-subtle);
  box-shadow: var(--admin-shadow-sm);
}

.filterCard::before {
  content: '';
  display: block;
  height: 3px;
  background: linear-gradient(90deg, #10b981, #14aeef, #92278f);
}

.filterCardInner {
  padding: 1.25rem 1.5rem;
}

.filterSectionLabel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-weight: 700;
  color: var(--admin-text-dim);
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--admin-border-subtle);
}

.filterSectionLabel svg {
  color: #10b981;
  flex-shrink: 0;
}

.filterBar {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.875rem;
}

.filterGroup {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filterLabel {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--admin-text-dim);
}

/* ── Hint ──────────────────────────────────────────────────────── */

.hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  text-align: center;
}

.hintIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  margin-bottom: 0.25rem;
}

.hintText {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--admin-foreground);
}

.hintSub {
  font-size: 0.78rem;
  color: var(--admin-text-dim);
  max-width: 360px;
}

/* ── Total label ───────────────────────────────────────────────── */

.totalLabel {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
  padding: 0 0.25rem;
}

/* ── Combo list ────────────────────────────────────────────────── */

.comboList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comboRow {
  background: var(--admin-panel-bg);
  border-radius: var(--admin-radius-xl);
  border: 1px solid var(--admin-border-subtle);
  box-shadow: var(--admin-shadow-sm);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.comboRow:hover {
  border-color: rgba(16, 185, 129, 0.25);
}

.comboRowExpanded {
  border-color: rgba(16, 185, 129, 0.35);
}

.comboRowHeader {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1fr auto auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  user-select: none;
}

.comboRowHeader:hover .comboName {
  color: #10b981;
}

.comboName {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--admin-foreground);
  transition: color 0.15s ease;
}

.comboMeta {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
}

.comboBadge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.comboCosto {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--admin-foreground);
}

.expandToggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--admin-border-subtle);
  color: var(--admin-text-dim);
  transition: all 0.2s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.expandToggle:hover {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.expandToggleOpen {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

/* ── Expanded servicios section ───────────────────────────────── */

.serviciosSection {
  border-top: 1px solid var(--admin-border-subtle);
  padding: 1rem 1.25rem 1.25rem;
}

.serviciosSectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.serviciosSectionTitle {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--admin-text-dim);
}

/* ── Servicios sub-table ───────────────────────────────────────── */

.serviciosTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.serviciosTable th {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--admin-text-dim);
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--admin-border-subtle);
}

.serviciosTable td {
  padding: 0.6rem 0.75rem;
  color: var(--admin-foreground);
  border-bottom: 1px solid rgba(255,255,255,0.03);
  vertical-align: middle;
}

.serviciosTable tr:last-child td {
  border-bottom: none;
}

.serviciosTable tr:hover td {
  background: rgba(255,255,255,0.02);
}

.servicioNombre {
  font-weight: 500;
}

.emptyServicios {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.78rem;
  color: var(--admin-text-dim);
}

/* ── Form modal grid ──────────────────────────────────────────── */

.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--admin-text-dim);
}

.colSpan2 {
  grid-column: span 2;
}

.fieldError {
  font-size: 0.7rem;
  color: var(--admin-accent-danger);
  margin-top: 0.125rem;
}

.inputError {
  border-color: var(--admin-accent-danger) !important;
}

.formDivider {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0;
}

.formDividerLabel {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--admin-text-dim);
  white-space: nowrap;
}

.formDivider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--admin-border-subtle);
}
```

---

## Task 4: Create combos page (full implementation)

**Files:**
- Create: `app/admin/configuracion/combos/page.tsx`

- [ ] **Step 1: Create the complete page file**

Create `app/admin/configuracion/combos/page.tsx` with the full implementation:

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Filter, Package2, ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCombosDB,
  getLocalesDB,
  getComboServiciosDB,
  crearComboServicio,
  actualizarComboServicio,
  eliminarComboServicio,
} from '@/lib/api/servicios';
import styles from './page.module.css';

// ─── Types ───────────────────────────────────────────────────────

interface ServicioIncluido {
  nombre: string;
  tiempo: string;
  costo: string;
  sesiones: number;
}

interface ComboItem {
  id: number;
  nombre: string;
  categoria: string;
  local: string;
  costo_total: string;
  sesiones_totales: number;
  servicios_incluidos: ServicioIncluido[];
}

interface LocalOption {
  id: number;
  nombre: string;
}

interface ComboServicioDetalle {
  id: number;
  combo_id: number;
  combo_nombre: string;
  servicio_id?: number | null;
  servicio_texto?: string | null;
  servicio_nombre: string;
  tiempo: string;
  costo: number;
  sesiones: number;
  orden?: number;
}

interface ComboServicioForm {
  servicio_texto: string;
  tiempo: string;
  costo: string;
  sesiones: number;
  orden: string;
}

interface ComboServicioFormErrors {
  servicio_texto?: string;
  tiempo?: string;
  costo?: string;
  sesiones?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

const SERVICIO_FORM_INITIAL: ComboServicioForm = {
  servicio_texto: '',
  tiempo: '',
  costo: '',
  sesiones: 1,
  orden: '',
};

// ─── Component ───────────────────────────────────────────────────

export default function CombosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Combo list state
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  // Filters — local is required to trigger fetch
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSesiones, setFiltroSesiones] = useState('');
  const [filtroNombreDebounced, setFiltroNombreDebounced] = useState('');
  const hasFilter = !!filtroLocal;

  // Expansion state
  const [expandedComboId, setExpandedComboId] = useState<number | null>(null);
  const [comboServicios, setComboServicios] = useState<Record<number, ComboServicioDetalle[]>>({});
  const [comboServiciosLoading, setComboServiciosLoading] = useState<Record<number, boolean>>({});

  // CRUD modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [activeComboId, setActiveComboId] = useState<number | null>(null);
  const [form, setForm] = useState<ComboServicioForm>(SERVICIO_FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<ComboServicioFormErrors>({});
  const isEdit = editingServiceId !== null;

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // ─── Debounce ─────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchCombos = useCallback(async () => {
    if (!filtroLocal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCombosDB({
        local: filtroLocal,
        nombre: filtroNombreDebounced || undefined,
        categoria: filtroCategoria || undefined,
        sesiones: filtroSesiones ? Number(filtroSesiones) : undefined,
      }) as { data?: { combos?: ComboItem[]; total?: number } };
      setCombos(res?.data?.combos ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar combos');
    } finally {
      setLoading(false);
    }
  }, [filtroLocal, filtroNombreDebounced, filtroCategoria, filtroSesiones]);

  const fetchLocales = useCallback(async () => {
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOption[] } };
      setLocales(res?.data?.locales ?? []);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchLocales();
  }, [router, fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchCombos();
    else { setCombos([]); setTotal(0); }
  }, [fetchCombos, hasFilter]);

  // ─── Entry animation ───────────────────────────────────────────

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // ─── Expansion ────────────────────────────────────────────────

  const handleToggleExpand = useCallback(async (comboId: number) => {
    if (expandedComboId === comboId) {
      setExpandedComboId(null);
      return;
    }
    setExpandedComboId(comboId);
    if (comboServicios[comboId]) return; // already loaded
    setComboServiciosLoading((prev) => ({ ...prev, [comboId]: true }));
    try {
      const res = await getComboServiciosDB(comboId) as {
        data?: { servicios?: ComboServicioDetalle[] };
      };
      setComboServicios((prev) => ({ ...prev, [comboId]: res?.data?.servicios ?? [] }));
    } catch {
      setComboServicios((prev) => ({ ...prev, [comboId]: [] }));
    } finally {
      setComboServiciosLoading((prev) => ({ ...prev, [comboId]: false }));
    }
  }, [expandedComboId, comboServicios]);

  const reloadComboServicios = async (comboId: number) => {
    try {
      const res = await getComboServiciosDB(comboId) as {
        data?: { servicios?: ComboServicioDetalle[] };
      };
      setComboServicios((prev) => ({ ...prev, [comboId]: res?.data?.servicios ?? [] }));
    } catch {
      // best-effort
    }
  };

  // ─── CRUD handlers ────────────────────────────────────────────

  const patchForm = (patch: Partial<ComboServicioForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const resetModal = () => {
    setForm(SERVICIO_FORM_INITIAL);
    setFormErrors({});
    setEditingServiceId(null);
    setActiveComboId(null);
  };

  const openAddServicio = (comboId: number) => {
    resetModal();
    setActiveComboId(comboId);
    setModalOpen(true);
  };

  const openEditServicio = (svc: ComboServicioDetalle) => {
    setEditingServiceId(svc.id);
    setActiveComboId(svc.combo_id);
    setFormErrors({});
    setForm({
      servicio_texto: svc.servicio_texto ?? svc.servicio_nombre ?? '',
      tiempo: svc.tiempo ?? '',
      costo: String(svc.costo ?? ''),
      sesiones: svc.sesiones ?? 1,
      orden: svc.orden != null ? String(svc.orden) : '',
    });
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: ComboServicioFormErrors = {};
    if (!form.servicio_texto.trim()) errors.servicio_texto = 'El nombre del servicio es obligatorio';
    if (!form.tiempo.trim()) errors.tiempo = 'El tiempo es obligatorio (formato HH:MM)';
    const costoNum = Number(form.costo);
    if (form.costo === '' || Number.isNaN(costoNum) || costoNum < 0) errors.costo = 'Costo inválido';
    if (!Number.isInteger(form.sesiones) || form.sesiones < 1) errors.sesiones = 'Mínimo 1 sesión';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitServicio = async () => {
    if (!validateForm() || activeComboId == null) return;
    setSaving(true);
    setFormErrors({});
    const costo = Number(form.costo);
    const tiempo = form.tiempo.trim();
    const orden = form.orden !== '' ? Number(form.orden) : undefined;

    try {
      if (isEdit && editingServiceId !== null) {
        await actualizarComboServicio(editingServiceId, {
          servicio_texto: form.servicio_texto.trim(),
          tiempo,
          costo,
          sesiones: form.sesiones,
          orden,
        });
        toast.success('Servicio actualizado');
      } else {
        await crearComboServicio({
          combo_id: activeComboId,
          servicio_texto: form.servicio_texto.trim(),
          tiempo,
          costo,
          sesiones: form.sesiones,
          orden,
        });
        toast.success('Servicio agregado al combo');
      }
      setModalOpen(false);
      resetModal();
      await reloadComboServicios(activeComboId);
    } catch (err) {
      if (err instanceof Error) console.error('comboServicio submit', err);
      toast.error(isEdit ? 'No se pudo actualizar el servicio.' : 'No se pudo agregar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServicio = (svc: ComboServicioDetalle) => {
    setConfirmState({
      message: `¿Eliminar "${svc.servicio_nombre || svc.servicio_texto}" del combo?`,
      onConfirm: async () => {
        try {
          await eliminarComboServicio(svc.id);
          toast.success('Servicio eliminado del combo');
          await reloadComboServicios(svc.combo_id);
        } catch (err) {
          if (err instanceof Error) console.error('eliminarComboServicio', err);
          toast.error('No se pudo eliminar el servicio.');
        }
      },
    });
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Combos"
          subtitle="Visualiza combos y gestiona sus servicios incluidos"
          backHref="/admin/configuracion"
        />

        <div ref={contentRef} className={styles.contentStack}>

          {/* ── Filter card ── */}
          <div className={styles.filterCard}>
            <div className={styles.filterCardInner}>
              <div className={styles.filterSectionLabel}>
                <Filter size={12} />
                Filtros de búsqueda
              </div>
              <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                  <label id="lbl-filtro-local" htmlFor="filtro-local" className={styles.filterLabel}>
                    Local
                  </label>
                  <CustomSelect
                    id="filtro-local"
                    ariaLabelledBy="lbl-filtro-local"
                    value={filtroLocal}
                    onChange={setFiltroLocal}
                    options={[
                      { value: '', label: 'Seleccionar local' },
                      ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
                    ]}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-nombre" className={styles.filterLabel}>Nombre</label>
                  <input
                    id="filtro-nombre"
                    type="text"
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    placeholder="Buscar por nombre…"
                    disabled={!hasFilter}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-categoria" className={styles.filterLabel}>Categoría</label>
                  <input
                    id="filtro-categoria"
                    type="text"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    placeholder="Ej: Corporal"
                    disabled={!hasFilter}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-sesiones" className={styles.filterLabel}>Sesiones</label>
                  <input
                    id="filtro-sesiones"
                    type="number"
                    min={1}
                    value={filtroSesiones}
                    onChange={(e) => setFiltroSesiones(e.target.value)}
                    placeholder="Ej: 4"
                    disabled={!hasFilter}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Hint ── */}
          {!hasFilter && (
            <div className={styles.hint}>
              <div className={styles.hintIcon}>
                <Package2 size={20} strokeWidth={1.5} />
              </div>
              <p className={styles.hintText}>Selecciona un <strong>local</strong> para ver los combos</p>
              <p className={styles.hintSub}>Los combos disponibles para el local seleccionado aparecerán aquí.</p>
            </div>
          )}

          {/* ── Combo list ── */}
          {hasFilter && (
            <>
              {loading && <p className={styles.totalLabel}>Cargando…</p>}
              {error && (
                <p style={{ color: 'var(--admin-accent-danger)', fontSize: '0.82rem' }}>{error}</p>
              )}
              {!loading && !error && total > 0 && (
                <p className={styles.totalLabel}>
                  <strong>{total}</strong> combo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </p>
              )}
              {!loading && !error && combos.length === 0 && (
                <p className={styles.totalLabel}>No se encontraron combos con los filtros actuales.</p>
              )}

              <div className={styles.comboList}>
                {combos.map((combo) => (
                  <div
                    key={combo.id}
                    className={`${styles.comboRow} ${expandedComboId === combo.id ? styles.comboRowExpanded : ''}`}
                  >
                    {/* ── Row header ── */}
                    <div
                      className={styles.comboRowHeader}
                      onClick={() => handleToggleExpand(combo.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleToggleExpand(combo.id)}
                      aria-expanded={expandedComboId === combo.id}
                    >
                      <span className={styles.comboName}>{combo.nombre}</span>
                      <span className={styles.comboMeta}>{combo.categoria}</span>
                      <span className={styles.comboBadge}>{combo.sesiones_totales} ses.</span>
                      <span className={styles.comboCosto}>{combo.costo_total} Bs.</span>
                      <button
                        type="button"
                        className={`${styles.expandToggle} ${expandedComboId === combo.id ? styles.expandToggleOpen : ''}`}
                        aria-label={expandedComboId === combo.id ? 'Cerrar' : 'Expandir'}
                        tabIndex={-1}
                      >
                        {expandedComboId === combo.id
                          ? <ChevronDown size={14} strokeWidth={2} />
                          : <ChevronRight size={14} strokeWidth={2} />
                        }
                      </button>
                    </div>

                    {/* ── Expanded servicios ── */}
                    {expandedComboId === combo.id && (
                      <div className={styles.serviciosSection}>
                        <div className={styles.serviciosSectionHeader}>
                          <span className={styles.serviciosSectionTitle}>Servicios incluidos</span>
                          <button
                            type="button"
                            className="admin-button admin-button-sm admin-button-ghost"
                            onClick={(e) => { e.stopPropagation(); openAddServicio(combo.id); }}
                          >
                            <Plus size={12} strokeWidth={2.2} />
                            Agregar
                          </button>
                        </div>

                        {comboServiciosLoading[combo.id] && (
                          <p className={styles.emptyServicios}>Cargando servicios…</p>
                        )}

                        {!comboServiciosLoading[combo.id] && (comboServicios[combo.id] ?? []).length === 0 && (
                          <p className={styles.emptyServicios}>Este combo no tiene servicios registrados.</p>
                        )}

                        {!comboServiciosLoading[combo.id] && (comboServicios[combo.id] ?? []).length > 0 && (
                          <table className={styles.serviciosTable}>
                            <thead>
                              <tr>
                                <th>Nombre</th>
                                <th>Tiempo</th>
                                <th>Costo</th>
                                <th>Sesiones</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(comboServicios[combo.id] ?? []).map((svc) => (
                                <tr key={svc.id}>
                                  <td className={styles.servicioNombre}>
                                    {svc.servicio_nombre || svc.servicio_texto || '—'}
                                  </td>
                                  <td>{svc.tiempo}</td>
                                  <td>{svc.costo} Bs.</td>
                                  <td>{svc.sesiones}</td>
                                  <td>
                                    <RowActionsMenu actions={[
                                      {
                                        label: 'Editar',
                                        icon: <Pencil size={12} strokeWidth={2} />,
                                        onClick: () => openEditServicio(svc),
                                      },
                                      {
                                        label: 'Eliminar',
                                        icon: <Trash2 size={12} strokeWidth={2} />,
                                        onClick: () => handleDeleteServicio(svc),
                                        variant: 'danger' as const,
                                      },
                                    ]} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── Modal: Agregar / Editar servicio ── */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={isEdit ? 'Editar servicio del combo' : 'Agregar servicio al combo'}
        onSubmit={handleSubmitServicio}
        loading={saving}
        submitLabel={isEdit ? 'Guardar cambios' : 'Agregar servicio'}
      >
        <div className={styles.formGrid}>

          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Identificación</span>
          </div>

          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label htmlFor="cs-texto">Nombre del servicio</label>
            <input
              id="cs-texto"
              type="text"
              value={form.servicio_texto}
              onChange={(e) => {
                patchForm({ servicio_texto: e.target.value });
                if (formErrors.servicio_texto) setFormErrors((p) => ({ ...p, servicio_texto: undefined }));
              }}
              placeholder="Ej: Masaje relajante completo"
              autoFocus
              aria-invalid={!!formErrors.servicio_texto}
              className={formErrors.servicio_texto ? styles.inputError : ''}
            />
            {formErrors.servicio_texto && (
              <span className={styles.fieldError}>{formErrors.servicio_texto}</span>
            )}
          </div>

          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Detalles</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-tiempo">Duración (HH:MM)</label>
            <input
              id="cs-tiempo"
              type="text"
              value={form.tiempo}
              onChange={(e) => {
                patchForm({ tiempo: e.target.value });
                if (formErrors.tiempo) setFormErrors((p) => ({ ...p, tiempo: undefined }));
              }}
              placeholder="01:00"
              aria-invalid={!!formErrors.tiempo}
              className={formErrors.tiempo ? styles.inputError : ''}
            />
            {formErrors.tiempo && <span className={styles.fieldError}>{formErrors.tiempo}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-costo">Costo (Bs.)</label>
            <input
              id="cs-costo"
              type="number"
              step="0.01"
              min={0}
              value={form.costo}
              onChange={(e) => {
                patchForm({ costo: e.target.value });
                if (formErrors.costo) setFormErrors((p) => ({ ...p, costo: undefined }));
              }}
              placeholder="0.00"
              aria-invalid={!!formErrors.costo}
              className={formErrors.costo ? styles.inputError : ''}
            />
            {formErrors.costo && <span className={styles.fieldError}>{formErrors.costo}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-sesiones">Sesiones</label>
            <input
              id="cs-sesiones"
              type="number"
              min={1}
              value={form.sesiones}
              onChange={(e) => {
                const n = Number(e.target.value);
                patchForm({ sesiones: Number.isFinite(n) ? n : 1 });
                if (formErrors.sesiones) setFormErrors((p) => ({ ...p, sesiones: undefined }));
              }}
              aria-invalid={!!formErrors.sesiones}
              className={formErrors.sesiones ? styles.inputError : ''}
            />
            {formErrors.sesiones && <span className={styles.fieldError}>{formErrors.sesiones}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-orden">
              Orden{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <input
              id="cs-orden"
              type="number"
              min={1}
              value={form.orden}
              onChange={(e) => patchForm({ orden: e.target.value })}
              placeholder="1"
            />
          </div>

        </div>
      </FormModal>

      {/* ── Confirm dialog ── */}
      <FormModal
        isOpen={confirmState !== null}
        onClose={() => setConfirmState(null)}
        title="Confirmar acción"
        onSubmit={() => { confirmState?.onConfirm(); setConfirmState(null); }}
        submitLabel="Confirmar"
      >
        <p style={{ color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {confirmState?.message}
        </p>
      </FormModal>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Full manual verification**

1. `npm run dev` → go to `http://localhost:3000/admin/configuracion`
2. Confirm Combos card visible (green accent)
3. Click Combos → lands on `/admin/configuracion/combos`
4. Select a local → combo cards appear
5. Click a combo row → expands with servicios sub-table (or empty state)
6. Click again → collapses
7. Re-expand same combo → no new network request (cached)
8. Click **Agregar** → modal opens with empty form
9. Submit empty → validation errors appear
10. Fill name, tiempo (`01:00`), costo, sesiones → submit → servicio appears in sub-table
11. Click **Editar** on a servicio → form pre-fills
12. Change name → save → updated in table
13. Click **Eliminar** → confirm dialog → servicio removed

---

## Self-Review

**Spec coverage:**
- ✅ List combos with filters (local required, nombre debounced, categoria, sesiones)
- ✅ Expandable rows — inline combo_servicios sub-table
- ✅ Lazy load on first expand, no re-fetch on re-expand
- ✅ Add servicio (`POST /bd/combos/servicios` with `servicio_texto`)
- ✅ Edit servicio (`PATCH /bd/combos/servicios/{id}`)
- ✅ Delete servicio with confirm dialog (`DELETE /bd/combos/servicios/{id}`)
- ✅ Combos read-only (no create/delete UI for combos themselves)
- ✅ Auth redirect guard
- ✅ Combos card in configuracion index
- ✅ GSAP entry animation

**Placeholder scan:** None found.

**Type consistency:**
- `ComboServicioDetalle` defined in Task 4, used throughout Task 4 ✅
- `openEditServicio(svc: ComboServicioDetalle)` matches type ✅
- `actualizarComboServicio` / `crearComboServicio` match interfaces from Task 1 ✅
- `reloadComboServicios(comboId: number)` consistent ✅
- `activeComboId` non-null guarded before use ✅
