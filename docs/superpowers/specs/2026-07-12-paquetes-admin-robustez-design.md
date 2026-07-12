# Paquetes/Planes admin — robustez front-only

**Fecha:** 2026-07-12
**Alcance:** admin de AtrevidaFront. Sin tocar backend.
**No-goals:** la sección pública `Paquetes` queda igual. `#A` (auto-activar plan en caja) ya
está implementado — no se toca. Renombrado interno de variables/tipos (`combo_id`,
`/bd/combos`, `ComboFormModal`) queda igual: es el contrato del backend.

## Contexto

El vínculo Combo → Plan → Reserva vive en el backend. Del análisis de casos, tres huecos son
resolubles solo en el front reutilizando endpoints existentes:

- **#C sucursal cruzada:** `PlanSelector` filtra planes por cliente + `estado='ACTIVO'` pero
  **no por local** → una reserva en SAN MARTIN puede seleccionar un plan de PASEO ARANJUEZ.
- **#F sobreconsumo:** `PlanSelector` ya excluye planes agotados en el dropdown
  (`sesiones_totales - sesiones_usadas > 0`), pero no hay bloqueo duro en el submit ante
  estado viejo (otra reserva pudo consumir la última sesión entre carga y envío).
- **UX admin:** crear un paquete arma sus líneas de servicio dentro del modal; editar **no**
  puede — obliga a cerrar, expandir la fila y usar otro modal por cada servicio. Asimetría
  confusa.

Endpoints ya disponibles (no se crean nuevos):
`getPlanesDB({cliente, estado, local})`, `getComboServiciosDB(comboId)`,
`crearComboServicio`, `actualizarComboServicio`, `eliminarComboServicio`,
`crearCombo({..., servicios})`, `actualizarCombo`, `reemplazarLocalesCombo`.

## Diseño

### 1. `#C` + `#F` robustos — doble guard en reservas

`PlanSelector` recibe una nueva prop `localNombre` (= `sucursal` seleccionada en el
`AdminReservationForm`).

- **Capa 1 (filtro):** la carga pasa a
  `getPlanesDB({ cliente, estado: 'ACTIVO', local: localNombre })`. Solo muestra planes de esa
  sucursal. Mantiene el filtro de sesiones restantes existente. Si no hay sucursal elegida
  (`localNombre` vacío), el selector no ofrece paquetes.
- **Capa 2 (revalidación en submit):** antes del `POST /reservas` con `plan_id`, re-consultar
  `getPlanesDB({ cliente, estado: 'ACTIVO', local: localNombre })` y confirmar que el `planId`
  seleccionado sigue presente **y** con `sesiones_totales - sesiones_usadas > 0`. Si falla,
  abortar el submit con toast: "El paquete ya no es válido para esta sucursal o no tiene
  sesiones disponibles." Evita confiar en estado cacheado.
- Al cambiar de sucursal con un plan ya elegido, si el plan deja de aparecer en la lista
  filtrada, el efecto existente de `PlanSelector` (`planes.length === 0 → onChange(null)`) lo
  limpia; se extiende para limpiar también cuando el `planId` actual no está en la nueva lista.

Alternativa descartada: `getPlanByID(id)` devuelve `{ plan: unknown }` sin tipos; re-listar
reutiliza el endpoint ya tipado (`PlanItem`).

### 2. Admin form — unificar edición de servicios

`ComboFormModal` maneja las líneas de servicio en **ambos** modos.

- **Editar:** al abrir en modo `editar`, cargar las líneas actuales con
  `getComboServiciosDB(combo.id)` dentro del mismo editor de líneas, conservando el `id` de
  cada línea. La carga de servicios disponibles (`getServiciosDB`) deja de restringirse a
  `mode === 'crear'`: se hace también en editar según el primer local.
- **Guardar (editar):** además de metadata (`actualizarCombo`) y locales
  (`reemplazarLocalesCombo`), aplicar un **diff** de líneas contra las originales cargadas:
  - línea sin `id` → `crearComboServicio(combo_id, ...)`
  - línea con `id` y campos cambiados → `actualizarComboServicio(id, ...)`
  - `id` original ausente en el estado actual → `eliminarComboServicio(id)`
- **Guardar (crear):** sin cambios — las líneas van en `crearCombo({..., servicios})`.
- **Simplificación de `page.tsx`:** se elimina el flujo separado de servicio (el segundo
  `FormModal`, su estado `form`/`formErrors`, `validateForm`, `handleSubmitServicio`,
  `openAddServicio`, `openEditServicio`, `handleDeleteServicio`, y la carga de
  `servicioOptions`). La fila expandida pasa a **solo-lectura**: muestra la tabla de servicios
  sin acciones de editar/agregar/eliminar. Toda edición ocurre en `ComboFormModal`.
- **Guard existente:** si `combo.id == null` (la API a veces omite id y se usa snapshot), no se
  pueden editar líneas por endpoint; se mantiene el aviso y se deshabilita la edición de
  líneas en ese caso.

### 3. Admin form — pulido visual (estilos reutilizables)

- Líneas de servicio en una grilla con encabezados (Servicio · Tiempo · Costo · Sesiones · ✕)
  e inputs con más aire que los `.lineaCorto` actuales.
- Resumen: total de sesiones (ya existe) y, cuando `tipo_precio === 'POR_ITEMS'`, total en Bs
  calculado de las líneas.
- Estados vacío/carga y jerarquía de secciones consistentes con el kit `AdminConfig`.
- Reutilizar clases de `page.module.css` y `ComboFormModal.module.css`; ajustes mínimos, sin
  CSS ad-hoc nuevo por elemento.

### 4. Renombrar ruta `combos` → `paquetes`

- Mover `app/atrevida-gestion/configuracion/combos/` →
  `app/atrevida-gestion/configuracion/paquetes/` (page, module.css, `ComboFormModal.tsx`,
  `ComboFormModal.module.css`).
- Actualizar el enlace del hub en `configuracion/page.tsx`.
- Los títulos/labels ya dicen "Paquetes". Imports internos siguen la nueva carpeta.
- Sin cambios de contrato: `/bd/combos`, `combo_id`, `getCombosDB`, `ComboFormModal` intactos.

## Archivos tocados

- `components/AdminReservationForm/PlanSelector.tsx` — prop `localNombre` + filtro por local +
  limpieza cuando el plan sale de la lista.
- `components/AdminReservationForm/index.tsx` + su hook — pasar `sucursal` al selector;
  revalidación previa al `POST /reservas`.
- `app/atrevida-gestion/configuracion/paquetes/ComboFormModal.tsx` — líneas en editar + diff +
  pulido; carga de servicios en ambos modos.
- `app/atrevida-gestion/configuracion/paquetes/page.tsx` — quitar flujo de servicio separado;
  fila expandida solo-lectura.
- `app/atrevida-gestion/configuracion/paquetes/*` — rename desde `combos/`.
- `app/atrevida-gestion/configuracion/page.tsx` — link del hub.
- `.module.css` existentes — ajustes de grilla de líneas; sin archivos nuevos.

## Verificación

- `npm run lint` (gate; también captura errores TS).
- Manual:
  - Crear paquete con varias líneas → aparece en la lista con sus servicios.
  - Editar paquete → agregar, cambiar y quitar líneas en un solo modal; se refleja al guardar.
  - Reserva: elegir sucursal A; un plan del cliente en sucursal B **no** aparece en el
    selector; si se fuerza, el submit lo bloquea.
  - Plan sin sesiones restantes: no aparece y el submit lo bloquea.
  - Navegar a `configuracion/paquetes` desde el hub; ruta vieja `configuracion/combos` ya no
    existe.

## Riesgos / notas

- El diff de líneas hace varias llamadas secuenciales; ante fallo parcial, informar y recargar
  desde el backend para reflejar el estado real (no asumir éxito).
- No hay atomicidad real (limitación front-only): la revalidación reduce, no elimina, la
  carrera de la última sesión. El fix definitivo es backend (ledger + lock), fuera de alcance.
