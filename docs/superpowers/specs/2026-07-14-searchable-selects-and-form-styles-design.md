# Selects con buscador + teclado, y estilos consistentes del form público

**Fecha:** 2026-07-14
**Alcance:** frontend (`AtrevidaFront/`)

## Contexto

Dos mejoras de UI sobre los selects personalizados y el formulario público de reserva:

1. Los `CustomSelect` (público) y `CustomSelectAdmin` (panel, ~20 usos) reemplazan al `<select>` nativo, pero **no tienen buscador ni navegación por teclado**: solo abren/cierran con Enter/Space. En selects largos (servicios, clientes) es incómodo.
2. En el form público de reserva (`components/ReservationForm/`), los campos **no se ven cohesivos entre sí**: el trigger del `CustomSelect` desentona en altura/borde/fondo con los inputs nativos (texto, teléfono, textarea).

Además hay un bug de copy: tras el cambio a "toda reserva pública nace PENDIENTE", el subtítulo del form (`index.tsx:74-77`) todavía dice "Este servicio se agenda directamente" para servicios sin evaluación.

## Parte A — Buscador + teclado en los selects

**Enfoque: hook compartido** `components/Custom/useSearchableSelect.ts`. La lógica de filtro y navegación vive en un solo lugar; cada componente conserva su markup, portal y CSS.

### Interfaz del hook
Entrada: `{ options, groups, value, open, onSelect, onClose }`.
Salida:
- `query`, `setQuery`
- `showSearch: boolean` — `true` solo si el total de opciones **> 6** (umbral). Selects cortos quedan sin caja.
- `filteredOptions` / `filteredGroups` — opciones visibles según `query`.
- `activeValue: string | null` — opción resaltada. Cada componente aplica su clase `active` cuando `opt.value === activeValue`.
- `onKeyDown(e)` — para el input de búsqueda: ↑/↓ mueve el resaltado sobre la lista filtrada aplanada (con wrap/clamp), **Enter** selecciona `activeValue`, **Esc** cierra.
- `searchInputRef` — para autofocus al abrir.
- `listboxRef` — el hook hace scroll-into-view del activo al cambiar.

### Reglas
- Filtro **insensible a acentos y mayúsculas**, reutilizando el patrón `normalize` (`String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')`).
- Al abrir: reset de `query` y `activeValue`; foco al input de búsqueda.
- El primer "activo" por defecto es la opción seleccionada actual (o la primera visible).
- Se preserva el aria existente (`role=combobox/listbox/option`, `aria-selected`, `aria-expanded`).

### Wiring por componente (`CustomSelect.tsx`, `CustomSelectAdmin.tsx`)
- Renderizar `<input type="text">` de búsqueda arriba del dropdown cuando `showSearch`.
- Añadir clase de resaltado (`activeValue`) en cada opción.
- Pasar `listboxRef` al contenedor del listbox.
- CSS por módulo: caja de búsqueda + estilo del ítem resaltado (tokens propios de cada módulo: `--af-*` en el público, `--admin-*` en el admin).

*Descartado:* implementar suelto en cada archivo (duplica la lógica de teclado); librería externa (dependencia + re-estilar).

## Parte B — Consistencia de estilos, form público

Archivo: `components/ReservationForm/ReservationForm.module.css` (+ `Custom/CustomSelect.module.css` para el trigger).

- Unificar **todos** los campos a una sola métrica: misma altura (min-height), `--af-input-radius`, borde `--af-border`, fondo `--af-input-bg`, focus `--af-accent-primary`, placeholder. El ajuste principal: alinear el **trigger del CustomSelect** al alto/padding de `.formGroup input`.
- Input `date` nativo: se deja el picker del navegador, pero el wrap comparte borde/alto para que no cante.
- Fix copy: `index.tsx:74-77` → siempre "La reserva quedará pendiente hasta aprobación" (quitar la rama "se agenda directamente").
- Scope: solo tokens `--af-*` del público. No se toca el admin en esta parte.

## Verificación
- `npm run lint` sin errores nuevos.
- Manual: en un select largo (servicios) del público y del admin → aparece buscador, filtra, ↑↓ resalta, Enter selecciona, Esc cierra; en uno corto (sucursal) → sin buscador. Los campos del form público se ven con misma altura/borde/fondo. Subtítulo dice "pendiente hasta aprobación".

## Fuera de alcance
- Rediseño mayor del form. Restyling del picker nativo de fecha. Cambios en selects nativos fuera del form público.
