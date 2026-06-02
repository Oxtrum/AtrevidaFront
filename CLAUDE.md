# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint (flat config via eslint.config.mjs)
```

No test framework. No typecheck script — lint catches TS errors via `eslint-config-next`.

## Architecture

AtrevidaFit is a wellness center booking site with a public landing + reservation flow and a protected admin panel. Frontend only — all persistence lives in an external backend.

**Backend connection**: Two env vars point to the same backend:
- `NEXT_PUBLIC_API_URL` — used by `lib/api/client.ts` (client-side fetch)
- `BACKEND_URL` — used by Next.js API proxy routes (server-side)

Default for both: `http://localhost:8080`.

**Two API paths coexist**:
1. `lib/api/client.ts` → `apiClient` — direct fetch to backend, reads JWT from `localStorage`, used in hooks and client components
2. `app/api/bd/**` — Next.js proxy routes that forward to the backend (some public routes go through here to avoid CORS)

Always use `apiClient` / `lib/api/reservas.ts` functions in new code. Never raw `fetch` in components.

## Auth

Admin-only. Token stored in `localStorage` as `adminToken`. `apiClient` reads it automatically and injects `Authorization: Bearer <token>`. Login via `POST /api/atrevida-gestion/login` → on success, stores token, redirects to `/atrevida-gestion/dashboard`.

**Two-layer auth**: `lib/api/auth.ts` has real backend calls (`loginAuth`, `registrarUsuario`, `cambiarPassword`, `getUsuarios`, `toggleUsuarioActivo`) hitting `/auth/*`. The Next.js proxy at `app/api/atrevida-gestion/login/route.ts` is still a local mock with hardcoded credentials — it does not call the backend. Admin panel lives at `/atrevida-gestion/` (renamed from `/admin/` for security).

No middleware guards routes — each admin page must handle redirect on missing token. Standard pattern: `useEffect` checks `localStorage.getItem('adminToken')`, calls `router.replace('/atrevida-gestion/login')` if absent.

## Reservation System

Key domain quirks:

- **Tipo** has two encodings depending on context:
  - GET query params: `'mesa'` or `'bicicleta'`
  - POST/PATCH body: `'M'` or `'B'`
  - Use `getTipoBackendFromServicio()` from `types/reserva.ts` to derive tipo from a service value
- **Estado**: `PENDIENTE | AGENDADO | RECHAZADO | COMPLETADO`
- **Sucursales**: `PASEO ARANJUEZ` and `SAN MARTIN`. `CENTRO` is hidden (commented out in `SUCURSALES`). SAN MARTIN maps to CENTRO for service filtering — `getServiciosPorSucursal()` normalizes this.
- **Legacy Sheets API** (`/reservas` endpoints): deprecated. All new code uses `/bd/reservas`.
- **Soft deletes**: DELETE on reservas, servicios, and locales sets `activo=false` — nothing is hard-deleted.
- Public booking flow only shows services where `requiere_evaluacion: false` — see `SERVICIOS_DISPONIBLES` vs `SERVICIOS_ADMIN_DISPONIBLES` in `types/reserva.ts`.

## Key Files

| Path | Purpose |
|------|---------|
| `lib/api/client.ts` | Base fetch client — single source of truth for all HTTP calls |
| `lib/api/reservas.ts` | All `/bd/reservas` service functions |
| `lib/api/servicios.ts` | `/bd/servicios`, `/bd/combos`, `/bd/locales`, `/bd/categorias` service functions |
| `lib/api/auth.ts` | Real backend auth calls (`/auth/*`) — login, register, password change, user management |
| `lib/api/clientes.ts` | `/bd/clientes` service functions |
| `types/reserva.ts` | All reservation types, service catalog, helper functions |
| `lib/constants/reservationForm.ts` | Hour slots and day-of-week constants |
| `lib/hooks/` | React hooks for reservation data fetching |
| `lib/utils/` | Calendar helpers, hours availability, reservation validation |
| `app/api/bd/` | Next.js proxy routes to backend |
| `app/atrevida-gestion/configuracion/` | Admin CRUD pages for locales, servicios, categorias, combos |

## API Response Shape

All backend responses are wrapped in `ApiResponse<T>` from `types/reserva.ts`:
```ts
{ code: number; data: T; error: boolean; message: string | null; status: string }
```
Access `.data` for the actual payload. `ApiError` (from `lib/api/client.ts`) is thrown on non-2xx.

## AdminConfig Component Kit

Reusable admin UI primitives in `components/AdminConfig/` — use these for all admin CRUD pages:

| Component | Purpose |
|-----------|---------|
| `AdminPanel` | Page wrapper with consistent padding/surface |
| `PageHeader` | Title + subtitle + optional action button |
| `DataTable` | Sortable table with loading/empty states |
| `FormModal` | Controlled modal for create/edit forms |
| `StatCard` | KPI card with icon, value, trend |
| `RowActionsMenu` | Dropdown menu for table row actions (edit/delete) |

## Component Conventions

- Components live in `components/<ComponentName>/<ComponentName>.tsx` with co-located CSS modules
- Admin components: `components/Admin*`
- GSAP animations use `gsap.context()` with cleanup via `ctx.revert()` in `useEffect` cleanup
- Tailwind CSS 4 — use `@tailwindcss/postcss` plugin; no `tailwind.config.js` needed for most things

## Admin Theming

Admin panel scopes all styles under `[data-admin="true"]` (set on layout root). CSS variables live in `app/atrevida-gestion/atrevida-gestion.css` — use them instead of hardcoding colors:

- Backgrounds: `--admin-bg`, `--admin-bg-secondary`, `--admin-surface-1` … `--admin-surface-4`
- Accents: `--admin-accent-primary` (#ec008c), `--admin-accent-secondary` (#92278f), `--admin-accent-tertiary` (#14aeef)
- Text: `--admin-foreground`, `--admin-text-muted`, `--admin-text-dim`
- Status: `--admin-accent-success`, `--admin-accent-warning`, `--admin-accent-danger`

## Workflow for Claude Instances

Before implementing any feature or UI change:
1. **Brainstorm first** — invoke `superpowers:brainstorming` skill to explore intent, requirements, and design before writing code.
2. **UI work** — invoke `frontend-design:frontend-design` skill for any component, page, or visual change. Never freestyle UI without it.
3. **After changes** — invoke `code-review:code-review` (or `caveman:caveman-review`) on the diff before reporting work complete.

This sequence is mandatory: brainstorm → implement → review.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Dirty `graphify-out/` files are expected after hooks or incremental updates — not a reason to skip graphify.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
