# Sidebar renames, DataTable for paquetes, hide tiempo

## Sidebar renombres

| Actual | Nuevo | Ruta |
|--------|-------|------|
| Caja | Cobros | `/atrevida-gestion/caja` |
| Pagos | Historial de Pagos | `/atrevida-gestion/pagos` |
| Paquetes | Paquetes Activos | `/atrevida-gestion/paquetes-activos` |

## Config hub

"Paquetes" → "Catálogo de Paquetes" con descripción "Crea y edita los paquetes del catálogo".

## Catálogo de paquetes (`/configuracion/paquetes`)

- Convertir a `DataTable`: columnas Nombre, Categoría, Locales, Sesiones, Precio, Acciones
- "Ver detalle" → modal con servicios por sesión (estilo paquetes-activos)
- Ocultar `duracion_min` del badge de fila y del `ComboFormModal`
- Mantener filtros y `ComboFormModal`

## Paquetes Activos (`/paquetes-activos`)

- Checkbox "Solo activos" activado por defecto → filtra estado=ACTIVO
- Desmarcado muestra historial completo (BORRADOR, ACTIVO, COMPLETADO, CANCELADO)
- Tooltip/explicación: BORRADOR = plan creado pendiente de activación

## Caja y Pagos

- Caja título pasa a "Registro de Cobros"
- Pagos título pasa a "Historial de Pagos"
