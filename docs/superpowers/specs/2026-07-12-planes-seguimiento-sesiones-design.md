# Seguimiento de planes por sesiones (checklist) — diseño

**Fecha:** 2026-07-12
**Alcance:** AtrevidaBack + AtrevidaFront.
**Principios:** código mínimo, clean, reutilizar antes que duplicar. Una sola fuente de verdad.

## Context

Los planes (paquetes comprados) no tienen forma de registrar **qué se hizo y qué falta**. Hoy
la única señal es un contador plano `planes.sesiones_usadas` que las reservas incrementan — no
dice qué servicio ni en qué sesión, y depende de crear reservas.

El negocio piensa en **sesiones predefinidas con sets de servicios**: p. ej. un paquete de 3
sesiones donde Sesión 1 = {masaje, radiofrecuencia, DMAE}, Sesión 2 = {masaje}, Sesión 3 =
{DMAE, drenaje}. El admin quiere **marcar cada sesión como completada** y ver el progreso
(X/N sesiones), **sin depender de reservas**.

Objetivo: definir sesiones en el combo, copiarlas al plan, y una vista donde el admin marca
sesiones hechas. El checklist es la **única** fuente de verdad del progreso.

## Modelo (Enfoque A — reutilizar `plan_servicios`)

Se reutilizan las tablas existentes; se agregan columnas, sin tablas nuevas.

- **`combo_servicios`** += `sesion_numero INT NOT NULL DEFAULT 1`. Cada fila = (servicio, sesión).
  Un servicio puede repetirse en varias sesiones (filas distintas). `costo` por fila se mantiene.
- **`combos.sesiones_totales`** = cantidad de **sesiones distintas** (`COUNT(DISTINCT sesion_numero)`).
  Vuelve a derivarse (en la fase de combos se había puesto como input libre; se ajusta).
  `costo_total` (sugerencia de precio) = `Σ costo` de **todas** las filas (repeticiones incluidas).
- **`plan_servicios`** += `sesion_numero INT NOT NULL DEFAULT 1`, `realizado BOOL NOT NULL DEFAULT FALSE`,
  `fecha_realizado TIMESTAMPTZ NULL`.

Snapshot: `PlanesService.CrearPlan` (`services/planes_service.go:147-162`) ya copia
`combo.Servicios` → `plan_servicios`. Solo se arrastra `sesion_numero`; `realizado` nace `false`.

## Componentes

### 1. Backend — schema y snapshot
- Migración `000041`: `ALTER TABLE combo_servicios ADD sesion_numero`; `ALTER TABLE plan_servicios
  ADD sesion_numero, realizado, fecha_realizado`. Down: `DROP COLUMN`.
- `combo_servicios`: `sesion_numero` en INSERT (`insertarServiciosTx`) y en los SELECT de detalle.
- `combos_repo`: `sesiones_totales` pasa a `COUNT(DISTINCT sesion_numero)` (en create y en
  `actualizarResumenTx`); `costo_total` = `Σ costo` de filas activas (ya lo hace).
- `models`: `ComboServicioDetallePG` y `ComboServicioLineaInput` += `SesionNumero`.
  `PlanServicioSnapshot`/`CrearPlanServicioInput` += `SesionNumero`; snapshot lo copia.
- Modelo de plan (`plan_servicios` en el detalle) expone `sesion_numero`, `realizado`,
  `fecha_realizado`.

### 2. Backend — endpoint marcar sesión
- `PATCH /bd/planes/{id}/sesiones/{numero}` body `{ "realizado": bool }`.
  Guard `AuthRequired + AdminSysRequired` (igual que el resto de `/bd/planes`).
- Repo: `UPDATE plan_servicios SET realizado=$1, fecha_realizado = CASE WHEN $1 THEN NOW() ELSE NULL END
  WHERE plan_id=$2 AND sesion_numero=$3`. Reutiliza el patrón tx de planes_repo.
- Swagger regenerado (`go generate ./...`).

### 3. Frontend — form de combo (agrupar por sesión)
- `ComboFormModal`: en vez de lista plana, **secciones por sesión**: "Sesión 1" con sus
  selectores de servicio (agregar servicio / agregar sesión / quitar). Cada línea lleva
  `sesion_numero`.
- `sesiones_totales` deja de ser input manual: = nº de sesiones armadas. Duración/sesión se mantiene.
- Precio sugerido = `Σ costo` de todas las líneas (repeticiones incluidas), editable (como está).
- `lib/api/combos.ts` `ComboServicioLineaInput` += `sesion_numero`.

### 4. Frontend — vista de progreso (`app/atrevida-gestion/paquetes-activos`)
- En el detalle del plan: lista de sesiones con sus servicios y estado.
  `Sesión 1 · masaje · radiofrecuencia · DMAE   [Marcar hecha]` / `✓ hecha (12 jul)`.
- Barra/contador **X/N sesiones** = sesiones con todos sus `plan_servicios.realizado`.
- Botón marca/desmarca → `PATCH /bd/planes/{id}/sesiones/{numero}` → recarga el plan.
- `lib/api/planes.ts`: `marcarSesionPlan(id, numero, realizado)` + `PlanItem`/detalle incluyen
  `plan_servicios[]` con `sesion_numero`/`realizado`.

### 5. Desacople de reservas (una sola fuente de verdad)
- El **checklist es el progreso**. Se revierte la mutación de sesiones que hacían las reservas
  (`reservas_repo.go`): `CreateReserva` deja de `+1`, `AnularReserva`/`UpdateReservaEstado` dejan
  de ajustar. Se eliminan los helpers `ajustarSesionesPlanTx`/`reservaConsume` (quedan sin uso).
- `reservas.plan_id` se conserva como **etiqueta informativa** (a qué plan pertenece la visita),
  sin descontar. `PlanSelector` en el form de reserva sigue, solo informativo.
- `planes.sesiones_usadas` queda **deprecado** (no se escribe). El progreso se calcula desde
  `plan_servicios.realizado`. No se borra la columna (evita migración destructiva).

## Verificación (end-to-end)

Backend:
```bash
cd AtrevidaBack && go build ./... && git diff --exit-code docs/
go run cmd/migrate/main.go   # aplica 000041
go run main.go
```
- Crear combo con Sesión 1={A,B,C}, Sesión 2={A} → `sesiones_totales=2`,
  `costo_total = 2·costo(A)+costo(B)+costo(C)`.
- Vender en caja → plan copia `plan_servicios` con `sesion_numero` (1 y 2), `realizado=false`.
- `PATCH /bd/planes/{id}/sesiones/1 {realizado:true}` → filas de sesión 1 quedan `realizado`,
  `fecha_realizado` seteada. Progreso 1/2.
- Crear/cancelar una reserva con `plan_id` → `sesiones_usadas` **no cambia** (desacoplado).

Frontend:
```bash
cd AtrevidaFront && npm run lint
```
- Form combo agrupa por sesión; precio sugerido correcto.
- Paquetes-activos: marcar Sesión 1 hecha → progreso X/N sube; desmarcar lo revierte.

## Riesgos / notas
- Revertir la mutación de reservas afecta código de Fase 1 (ya commiteado en esta rama). Es
  intencional: el modelo cambió a checklist desacoplado.
- Datos existentes: combos viejos quedan con `sesion_numero=1` (todo en una sesión) hasta
  re-editarlos. Aceptable.
- Marcado es **por sesión completa** (no por servicio individual). Suficiente para el objetivo;
  granularidad por servicio queda fuera de alcance.
