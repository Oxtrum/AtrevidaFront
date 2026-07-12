# CRUD de combo en el admin

## Contexto

`configuracion/combos/page.tsx` hoy solo gestiona los **servicios incluidos** de un combo
existente; no permite crear/editar/eliminar el combo ni su precio/categoría/locales. Los
19 combos existen solo por seed SQL. El backend ya expone `POST /bd/combos`,
`PATCH /bd/combos/:id`, `DELETE /bd/combos/:id`, `PUT /bd/combos/:id/locales`,
`PUT /bd/combos/:id/servicios` (admin_sys). Falta la capa `lib/api` y la UI.

## Decisiones (cerradas con el usuario)
- Crear incluye editor de **varias líneas** de servicio (POST inline).
- **Modal grande** reutilizado en la misma página (no rutas nuevas).
- Editar modal = metadata + locales; los **servicios se editan con el gestor inline que ya existe**.
- Sin tocar backend.

## Data layer — `lib/api/combos.ts`

Añadir (junto al `getCombosDB` público), con `apiClient`:
- `crearCombo(data: CrearComboData)` → `POST /bd/combos`.
- `actualizarCombo(id, data: ActualizarComboData)` → `PATCH /bd/combos/:id`.
- `reemplazarLocalesCombo(id, localIds: number[])` → `PUT /bd/combos/:id/locales` body `{ local_ids }`.
- `eliminarCombo(id)` → `DELETE /bd/combos/:id`.

Tipos alineados al backend:
- `CrearComboData = { nombre; descripcion?; categoria_id?; tipo_precio: 'POR_ITEMS'|'PRECIO_PAQUETE';
  precio_paquete?; moneda?; local_ids: number[]; servicios: ComboServicioLinea[] }`.
- `ComboServicioLinea = { servicio_id?; servicio_texto?; tiempo?; costo?; sesiones; orden }`.
- `ActualizarComboData` = metadata parcial (sin locales ni servicios).
Verificar los nombres JSON exactos contra `handlers/combos_pg_handler.go` antes de fijar.

## UI — `configuracion/combos/page.tsx` + `ComboFormModal`

- Botón **"Nuevo combo"** en `PageHeader` → `ComboFormModal` en modo crear.
- Fila de combo: `RowActionsMenu` con **Editar** / **Eliminar**.
- `ComboFormModal` (componente nuevo, envuelve `FormModal` para no inflar la página):
  - Datos: nombre, descripción, categoría (select desde getter de categorías).
  - Precio: toggle `tipo_precio`; si `PRECIO_PAQUETE` → precio + moneda (default BOB).
  - Locales: checkboxes (`getLocalesDB`), respetando `useAdminLocalScope` como el resto.
  - Líneas (solo modo crear): lista dinámica add/quitar; cada línea = servicio (`getServiciosDB`)
    o texto, tiempo, costo, sesiones, orden.
  - Submit crear → `crearCombo`. Submit editar → `actualizarCombo` + `reemplazarLocalesCombo`.
- Eliminar → `confirmState` existente → `eliminarCombo` → recargar lista.
- Tras crear/editar/eliminar: `toast` + recargar combos (fetch existente).

## Reusos
`FormModal`, `PageHeader`, `RowActionsMenu`, `getLocalesDB`, `getServiciosDB`, getter categorías,
`toast`, `confirmState`, `useAdminLocalScope`, tema `--admin-*`. Validación en cliente:
nombre requerido, ≥1 local, `precio_paquete` requerido si `PRECIO_PAQUETE`, ≥1 línea válida.

## Fuera de alcance
Reemplazo masivo de servicios desde el modal de editar (se usa el gestor inline existente).
Campo imagen (revertido). Cambios de backend.

## Verificación
- `npm run lint`.
- Runtime admin: login → configuracion/combos → "Nuevo combo": crear un PRECIO_PAQUETE con
  1–2 líneas y 2 locales → aparece en la lista y en `GET /bd/combos` (y en la sección pública).
  Editar su precio/categoría/locales → PATCH+PUT reflejados. Eliminar → sale de la lista (soft).
- Confirmar que un combo creado desde el admin se ve en la sección pública de paquetes.
