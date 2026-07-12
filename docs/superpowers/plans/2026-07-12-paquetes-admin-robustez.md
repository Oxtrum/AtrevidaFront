# Plan — Paquetes admin robustez front-only

**Spec:** `docs/superpowers/specs/2026-07-12-paquetes-admin-robustez-design.md`
**Branch:** `feature/paquetes-planes-admin`
**Verificación:** `npm run lint` después de cada tarea.

---

## Tarea 1 — Renombrar ruta `combos` → `paquetes`

**Archivos:** mover carpeta + actualizar link hub.

1. `mv app/atrevida-gestion/configuracion/combos app/atrevida-gestion/configuracion/paquetes`
2. `configuracion/page.tsx:78` — cambiar `href: '/atrevida-gestion/configuracion/combos'` → `'/atrevida-gestion/configuracion/paquetes'`
3. Verificar que imports internos de `page.tsx` y `ComboFormModal.tsx` sigan funcionando (relativos a la misma carpeta, no cambian).
4. `npm run lint`

---

## Tarea 2 — ComboFormModal: cargar líneas en modo editar

**Archivo:** `paquetes/ComboFormModal.tsx`

**Cambios:**

1. En el handler que abre el modal en modo `editar` (recibe `combo` con `id`):
   - Cargar `getComboServiciosDB(combo.id)` → poblar `servicios` local con sus `id`, `servicio_id`, `servicio_texto`, `tiempo`, `costo`, `sesiones`.
   - Almacenar snapshot de líneas originales para diff posterior.
2. La carga de servicios disponibles (`getServiciosDB`) moverla fuera del bloque `if (mode === 'crear')` para que corra también en editar. Usar el primer local de los checkboxes como parámetro.
3. Si `combo.id == null` (snapshot sin id), deshabilitar sección de líneas y mostrar mensaje "Edición de servicios no disponible para este paquete" (ya existe lógica similar).

**Verificación:** `npm run lint`

---

## Tarea 3 — ComboFormModal: diff + guardar líneas en editar

**Archivo:** `paquetes/ComboFormModal.tsx`

Extender `handleSubmit` para modo `editar`:

1. Además de llamar `actualizarCombo(id, metadata)` y `reemplazarLocalesCombo(id, localIds)`:
2. Comparar `servicios` actuales contra el snapshot original:
   - **Nuevas:** `servicio` sin `id` → `crearComboServicio(comboId, {...})`
   - **Cambiadas:** `servicio` con `id` cuyos campos difieren del snapshot → `actualizarComboServicio(id, {...})`
   - **Eliminadas:** `id` en snapshot pero ausente en estado actual → `eliminarComboServicio(id)`
3. Ejecutar secuencialmente. Si alguna falla, toast con error + `reemplazarServicios(snapshotOriginal)` para revertir estado local.
4. Modo `crear` queda sin cambios (líneas van en `crearCombo({..., servicios})`).

**Verificación:** `npm run lint`

---

## Tarea 4 — ComboFormModal: pulido visual líneas de servicio

**Archivos:** `paquetes/ComboFormModal.tsx`, `paquetes/ComboFormModal.module.css`

**Cambios:**

1. Reemplazar el grid actual de `.lineaRow`/`.lineaCol` por una tabla con encabezados visibles: **Servicio · Tiempo · Costo · Sesiones · ✕**
2. Inputs con mayor espaciado vertical; usar clases existentes de `AdminConfig` donde sea posible.
3. Agregar total en Bs en el resumen cuando `tipo_precio === 'POR_ITEMS'` (suma de `costo` de cada línea).
4. Estados vacío y carga consistentes con `DataTable` loading/empty states del kit.

**Verificación:** `npm run lint`

---

## Tarea 5 — `page.tsx`: eliminar flujo de servicio separado, fila solo-lectura

**Archivo:** `paquetes/page.tsx`

**Cambios:**

1. Eliminar: segundo `FormModal` para crear/editar servicio, `servicioForm`/`formErrors` state, `validateServicioForm()`, `handleSubmitServicio()`, `openAddServicio()`, `openEditServicio()`, `handleDeleteServicio()`, `servicioOptions` loading.
2. En la fila expandida (`ExpandedRow` o similar), reemplazar botones de acción por una tabla solo-lectura de servicios (nombre, tiempo, costo, sesiones). Sin botones de agregar/editar/eliminar.
3. Toda edición de líneas ocurre exclusivamente dentro de `ComboFormModal`.

**Verificación:** `npm run lint`

---

## Tarea 6 — PlanSelector: agregar filtro por local (#C capa 1)

**Archivos:** `PlanSelector.tsx`, `index.tsx`, hook del form

**PlanSelector.tsx cambios:**
1. Agregar prop `localNombre: string`.
2. En la llamada a `getPlanesDB`, pasar `local: localNombre`.
3. Si `localNombre` está vacío, mostrar "Seleccione una sucursal primero" y retornar null.
4. En el `useEffect` que vigila cambios en `planes`, si el `planId` actual no está en la nueva lista (por cambio de sucursal), llamar `onChange(null)`.

**index.tsx / hook cambios:**
1. Pasar `sucursal` (del form state) como `localNombre` al `PlanSelector`.
2. Hook: exponer `localNombre` o el valor de sucursal actual.

**Verificación:** `npm run lint`

---

## Tarea 7 — Submit revalidation (#C + #F capa 2)

**Archivo:** hook del `AdminReservationForm` (en el `handleSubmit`)

**Cambios:**

Antes de ejecutar `crearReservaPostgres(data)` cuando `planId != null`:

1. Llamar `getPlanesDB({ cliente, estado: 'ACTIVO', local: localNombre })`
2. Buscar el `planId` seleccionado en el resultado.
3. Si no está en la lista o `sesiones_totales - sesiones_usadas <= 0`:
   - `toast.error('El paquete ya no es válido para esta sucursal o no tiene sesiones disponibles')`
   - `setPlanId(null)` y abortar submit (return).
4. Si pasa, continuar con el POST.

**Verificación:** `npm run lint`

---

## Verificación final

```bash
npm run lint
```

Manual:
- Crear paquete con servicios → aparece en lista
- Editar paquete → agregar/cambiar/quitar líneas en un solo modal
- Reserva con sucursal A → no muestra planes de sucursal B
- Plan agotado → bloqueado en submit
- Ruta `/configuracion/paquetes` funciona; `/configuracion/combos` 404
