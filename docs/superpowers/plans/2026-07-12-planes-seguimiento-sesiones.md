# Seguimiento de planes por sesiones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin define sesiones (sets de servicios) en el combo, y marca cada sesión de un plan como completada, viendo el progreso X/N — sin depender de reservas.

**Architecture:** Enfoque A — reutilizar tablas existentes. `combo_servicios` y `plan_servicios` ganan `sesion_numero`; `plan_servicios` gana `realizado`/`fecha_realizado`. El snapshot combo→plan (ya existente) arrastra `sesion_numero`. Un endpoint marca las filas de una sesión. Las reservas se desacoplan (revertir la mutación de sesiones).

**Tech Stack:** Go 1.26 + Gin + sqlx + PostgreSQL (AtrevidaBack); Next.js 16 + React 19 + CSS Modules (AtrevidaFront). Swagger via swaggo.

## Global Constraints

- Código mínimo, clean, **reutilizar antes que duplicar**. Una sola fuente de verdad (checklist).
- Cualquier cambio de endpoint/request/response → actualizar swaggo y `go generate ./...` (hooks lo enforzan).
- Front: sin framework de tests; el gate es `npm run lint`. Backend: `go build ./...`; verificación con `psql` + prueba manual en UI (endpoints POST/PATCH requieren token admin_sys).
- Marcado **por sesión completa** (no por servicio individual).
- No romper el contrato `/bd/combos` ni `/bd/planes` (solo se agregan campos/rutas).
- `PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db` para verificar DB.

---

### Task 1: Migración 000041 — columnas de seguimiento

**Files:**
- Create: `AtrevidaBack/migrations/000041_planes_seguimiento_sesiones.up.sql`
- Create: `AtrevidaBack/migrations/000041_planes_seguimiento_sesiones.down.sql`

**Interfaces:**
- Produces: columnas `combo_servicios.sesion_numero`, `plan_servicios.sesion_numero`, `plan_servicios.realizado`, `plan_servicios.fecha_realizado`.

- [ ] **Step 1: Escribir la migración up**

`AtrevidaBack/migrations/000041_planes_seguimiento_sesiones.up.sql`:
```sql
-- Agrupa los servicios del combo/plan en sesiones y registra si cada sesión se realizó.
ALTER TABLE combo_servicios
    ADD COLUMN IF NOT EXISTS sesion_numero INT NOT NULL DEFAULT 1;

ALTER TABLE plan_servicios
    ADD COLUMN IF NOT EXISTS sesion_numero   INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS realizado       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fecha_realizado TIMESTAMPTZ;

COMMENT ON COLUMN combo_servicios.sesion_numero IS
    'Numero de sesion (1-based) a la que pertenece el servicio dentro del combo.';
COMMENT ON COLUMN plan_servicios.sesion_numero IS
    'Numero de sesion a la que pertenece la linea del plan.';
COMMENT ON COLUMN plan_servicios.realizado IS
    'TRUE cuando la sesion de esta linea fue marcada como realizada.';
COMMENT ON COLUMN plan_servicios.fecha_realizado IS
    'Momento en que se marco realizada; NULL si esta pendiente.';
```

- [ ] **Step 2: Escribir la migración down**

`AtrevidaBack/migrations/000041_planes_seguimiento_sesiones.down.sql`:
```sql
ALTER TABLE plan_servicios
    DROP COLUMN IF EXISTS fecha_realizado,
    DROP COLUMN IF EXISTS realizado,
    DROP COLUMN IF EXISTS sesion_numero;

ALTER TABLE combo_servicios
    DROP COLUMN IF EXISTS sesion_numero;
```

- [ ] **Step 3: Aplicar la migración**

Run: `cd AtrevidaBack && go run cmd/migrate/main.go`
Expected: `versión actual: 41 (dirty: false)`

- [ ] **Step 4: Verificar columnas**

Run: `PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -c "\d plan_servicios" -c "\d combo_servicios"`
Expected: `plan_servicios` tiene `sesion_numero`, `realizado`, `fecha_realizado`; `combo_servicios` tiene `sesion_numero`.

- [ ] **Step 5: Commit**

```bash
cd AtrevidaBack && git add migrations/000041_planes_seguimiento_sesiones.up.sql migrations/000041_planes_seguimiento_sesiones.down.sql
git commit -m "feat(db): sesion_numero en combo/plan servicios + realizado en plan (000041)"
```

---

### Task 2: Combo — sesion_numero de punta a punta

**Files:**
- Modify: `AtrevidaBack/models/pg_models.go` (`ComboServicioDetallePG`)
- Modify: `AtrevidaBack/repositories/combos_repository.go` (`ComboServicioCatalogoInput`)
- Modify: `AtrevidaBack/repositories/pgsql/combos_repo.go` (INSERT, SELECT detalle, `sesiones_totales`, `actualizarResumenTx`)
- Modify: `AtrevidaBack/services/combos_service.go` (`normalizarServicios`)
- Modify: `AtrevidaBack/handlers/combos_pg_handler.go` (`comboServicioCatalogoRequest`, `toComboServiciosInput`)
- Modify: `AtrevidaBack/docs/*` (swagger)

**Interfaces:**
- Consumes: columnas de Task 1.
- Produces: request/response de combo incluyen `sesion_numero` por línea; `combos.sesiones_totales` = `COUNT(DISTINCT sesion_numero)`.

- [ ] **Step 1: Modelo detalle**

En `AtrevidaBack/models/pg_models.go`, en `ComboServicioDetallePG` (buscar el struct; tiene `Sesiones int`), agregar tras `Sesiones`:
```go
	SesionNumero int `db:"sesion_numero" json:"sesion_numero" example:"1"`
```

- [ ] **Step 2: Input de repo**

En `AtrevidaBack/repositories/combos_repository.go`, en `ComboServicioCatalogoInput`, agregar:
```go
	SesionNumero int
```

- [ ] **Step 3: Handler request + mapeo**

En `AtrevidaBack/handlers/combos_pg_handler.go`, en `comboServicioCatalogoRequest` agregar (tras `Sesiones`):
```go
	// Numero de sesion (1-based) a la que pertenece el servicio.
	SesionNumero int `json:"sesion_numero" example:"1"`
```
Y en `toComboServiciosInput` (la línea que construye `repository.ComboServicioCatalogoInput{...}`), agregar `SesionNumero: request.SesionNumero`.

- [ ] **Step 4: Normalización (default 1)**

En `AtrevidaBack/services/combos_service.go`, dentro de `normalizarServicios`, tras el bloque que hace `if servicio.Sesiones < 1 { servicio.Sesiones = 1 }`, agregar:
```go
		if servicio.SesionNumero < 1 {
			servicio.SesionNumero = 1
		}
```

- [ ] **Step 5: Repo — INSERT, SELECT detalle, sesiones_totales**

En `AtrevidaBack/repositories/pgsql/combos_repo.go`:

(a) `insertarServiciosTx` — agregar `sesion_numero` al INSERT:
```go
		INSERT INTO combo_servicios (combo_id, servicio_id, servicio_texto, tiempo, costo, sesiones, sesion_numero, orden, activo)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
```
y pasar `servicio.SesionNumero` como `$7` (correr el `orden` a `$8`).

(b) `cargarDetalleCombo` — el SELECT de `combo_servicios` (busca `cs.servicio_id, cs.servicio_texto ...`) agregar `cs.sesion_numero`.

(c) `CreateCombo` INSERT de combos — reemplazar `input.SesionesTotales` por el conteo de sesiones distintas del input:
```go
	sesionesTotales := contarSesiones(servicios)
	...
	`, ... input.Moneda, precioFinal, sesionesTotales, input.DuracionMin).Scan(&comboID)
```
y agregar el helper al final del archivo:
```go
// contarSesiones cuenta las sesiones distintas presentes en las líneas del combo.
func contarSesiones(servicios []servicioMaterializado) int {
	set := map[int]bool{}
	for _, s := range servicios {
		n := s.SesionNumero
		if n < 1 {
			n = 1
		}
		set[n] = true
	}
	if len(set) == 0 {
		return 1
	}
	return len(set)
}
```
(Nota: `servicioMaterializado` es el tipo interno que usa `insertarServiciosTx`/`resumenServicios`; agregarle el campo `SesionNumero int` y copiarlo en `materializarServiciosTx`.)

(d) `actualizarResumenTx` — cambiar el SELECT para traer también las sesiones distintas y usarlo:
```go
		COALESCE((SELECT COUNT(DISTINCT cs.sesion_numero) FROM combo_servicios cs WHERE cs.combo_id = cb.id AND cs.activo = TRUE), 1) AS sesiones
```
y en el `UPDATE combos SET costo_total = $1, sesiones_totales = $2, actualizado_en = NOW() WHERE id = $3` volver a incluir `sesiones_totales = $2` con `resumen.Sesiones`. (Revierte la parte de la fase anterior donde se dejó de setear.)

- [ ] **Step 6: Quitar sesiones_totales como input libre**

`combos.sesiones_totales` ahora se deriva. En `AtrevidaBack/handlers/combos_pg_handler.go` quitar el campo `SesionesTotales` de `crearComboCatalogoRequest` y `actualizarComboCatalogoRequest` y su mapeo; en `services/combos_service.go` y `repositories/combos_repository.go` quitar `SesionesTotales` de los inputs (crear y actualizar) y de `normalizarCrearCombo`/`UpdateCombo` (el `add("sesiones_totales", ...)`). `DuracionMin` se mantiene.

- [ ] **Step 7: Build + swagger**

Run:
```bash
cd AtrevidaBack && go build ./... && go generate ./...
```
Expected: build OK; `docs/` regenerado (aparece `sesion_numero` en combo servicio; desaparece `sesiones_totales` del request de combo).

- [ ] **Step 8: Verificar derivación**

Run: `cd AtrevidaBack && go run main.go` (en background), luego crear un combo desde la UI (o curl con token) con Sesión 1={A,B}, Sesión 2={A}. Verificar:
```bash
PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -tAc \
  "SELECT sesiones_totales FROM combos ORDER BY id DESC LIMIT 1;"   # 2
PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -tAc \
  "SELECT sesion_numero, count(*) FROM combo_servicios WHERE combo_id=(SELECT max(id) FROM combos) GROUP BY sesion_numero;"
```

- [ ] **Step 9: Commit**

```bash
cd AtrevidaBack && git add -A
git commit -m "feat(combos): sesion_numero por servicio; sesiones_totales derivado por sesiones distintas"
```

---

### Task 3: Snapshot del plan arrastra sesion_numero + realizado en detalle

**Files:**
- Modify: `AtrevidaBack/repositories/planes_repository.go` (`CrearPlanServicioInput`)
- Modify: `AtrevidaBack/services/planes_service.go` (loop de snapshot, `PlanServicioInput`)
- Modify: `AtrevidaBack/repositories/pgsql/planes_repo.go` (INSERT `plan_servicios`, `cargarServicios`)
- Modify: `AtrevidaBack/models/pg_models.go` (`PlanServicioPG`)
- Modify: `AtrevidaBack/handlers/planes_handler.go` (`planServicioManualRequest` si aplica)
- Modify: `AtrevidaBack/docs/*`

**Interfaces:**
- Consumes: `ComboServicioDetallePG.SesionNumero` (Task 2).
- Produces: `plan_servicios` con `sesion_numero`; `PlanServicioPG` expone `sesion_numero`, `realizado`, `fecha_realizado`.

- [ ] **Step 1: Modelo detalle del plan**

En `AtrevidaBack/models/pg_models.go`, en `PlanServicioPG`, tras `Orden` agregar:
```go
	SesionNumero   int        `db:"sesion_numero" json:"sesion_numero" example:"1"`
	Realizado      bool       `db:"realizado" json:"realizado" example:"false"`
	FechaRealizado *time.Time `db:"fecha_realizado" json:"fecha_realizado,omitempty" example:"2026-07-12T15:04:05Z"`
```

- [ ] **Step 2: Input de repo**

En `AtrevidaBack/repositories/planes_repository.go`, en `CrearPlanServicioInput`, tras `Orden int` agregar:
```go
	SesionNumero int
```

- [ ] **Step 3: Servicio — snapshot copia sesion_numero**

En `AtrevidaBack/services/planes_service.go`:
- En `PlanServicioInput` (struct del service), agregar `SesionNumero int`.
- En el loop que copia `combo.Servicios` (≈línea 147), agregar `SesionNumero: cs.SesionNumero,` al `repository.CrearPlanServicioInput{...}`.
- En el loop de `input.Servicios` (manual, ≈línea 181), agregar `SesionNumero: s.SesionNumero,` (con default 1 si `< 1`).

- [ ] **Step 4: Repo — INSERT + SELECT**

En `AtrevidaBack/repositories/pgsql/planes_repo.go`:
- INSERT `plan_servicios` (≈línea 179): agregar columna `sesion_numero` y valor `s.SesionNumero`.
- `cargarServicios` (≈línea 348) SELECT: agregar `sesion_numero, realizado, fecha_realizado`.

- [ ] **Step 5: Build + swagger**

Run: `cd AtrevidaBack && go build ./... && go generate ./...`
Expected: OK; `PlanServicioPG` en swagger muestra `sesion_numero`/`realizado`.

- [ ] **Step 6: Verificar snapshot**

Vender el combo de Task 2 en caja (UI) → nuevo plan. Verificar:
```bash
PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -tAc \
  "SELECT sesion_numero, realizado FROM plan_servicios WHERE plan_id=(SELECT max(id) FROM planes) ORDER BY sesion_numero;"
```
Expected: filas con `sesion_numero` (1,1,2…) y `realizado=f`.

- [ ] **Step 7: Commit**

```bash
cd AtrevidaBack && git add -A
git commit -m "feat(planes): snapshot arrastra sesion_numero; detalle expone realizado/fecha_realizado"
```

---

### Task 4: Endpoint marcar sesión

**Files:**
- Modify: `AtrevidaBack/repositories/planes_repository.go` (interface)
- Modify: `AtrevidaBack/repositories/pgsql/planes_repo.go` (método)
- Modify: `AtrevidaBack/services/planes_service.go` (método)
- Modify: `AtrevidaBack/handlers/planes_handler.go` (handler + request)
- Modify: `AtrevidaBack/router/router.go` (ruta)
- Modify: `AtrevidaBack/docs/*`

**Interfaces:**
- Produces: `PATCH /bd/planes/{id}/sesiones/{numero}` body `{ "realizado": bool }`.

- [ ] **Step 1: Repo — método + interface**

En `AtrevidaBack/repositories/planes_repository.go`, en la interface `PlanesRepository` agregar:
```go
	MarcarSesion(planID, numero int, realizado bool) (int, error)
```
En `AtrevidaBack/repositories/pgsql/planes_repo.go` agregar:
```go
// MarcarSesion marca (o desmarca) todas las líneas de una sesión del plan. Devuelve filas afectadas.
func (r *PlanesRepo) MarcarSesion(planID, numero int, realizado bool) (int, error) {
	res, err := r.db.Exec(`
		UPDATE plan_servicios
		SET realizado = $1,
			fecha_realizado = CASE WHEN $1 THEN NOW() ELSE NULL END
		WHERE plan_id = $2 AND sesion_numero = $3
	`, realizado, planID, numero)
	if err != nil {
		return 0, fmt.Errorf("error al marcar sesion del plan: %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}
```

- [ ] **Step 2: Service**

En `AtrevidaBack/services/planes_service.go`:
```go
func (s *PlanesService) MarcarSesion(planID, numero int, realizado bool) error {
	if planID < 1 || numero < 1 {
		return fmt.Errorf("id y numero deben ser positivos: %w", ErrPlanInvalido)
	}
	n, err := s.repo.MarcarSesion(planID, numero, realizado)
	if err != nil {
		return traducirErrorRepositorioPlan(err)
	}
	if n == 0 {
		return fmt.Errorf("%w: sesion %d del plan %d", ErrPlanNoEncontrado, numero, planID)
	}
	return nil
}
```

- [ ] **Step 3: Handler + request + swaggo**

En `AtrevidaBack/handlers/planes_handler.go` agregar el request y el handler (seguir el estilo de `PatchPlanEstado`):
```go
type marcarSesionRequest struct {
	// TRUE marca la sesión como realizada; FALSE la vuelve a pendiente.
	Realizado bool `json:"realizado" example:"true"`
}

// MarcarSesionPlan godoc
// @Summary Marcar una sesión del plan como realizada o pendiente
// @Description Actualiza el estado realizado de todas las líneas de una sesión del plan. Requiere token Bearer con rol admin_sys.
// @Tags planes
// @Accept json
// @Produce json
// @Param id path int true "ID del plan"
// @Param numero path int true "Número de sesión"
// @Param request body marcarSesionRequest true "Estado de la sesión"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Security BearerAuth
// @Router /bd/planes/{id}/sesiones/{numero} [patch]
func (h *Container) MarcarSesionPlan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		utils.RespondError(c, http.StatusBadRequest, "id invalido")
		return
	}
	numero, err := strconv.Atoi(c.Param("numero"))
	if err != nil || numero < 1 {
		utils.RespondError(c, http.StatusBadRequest, "numero invalido")
		return
	}
	var req marcarSesionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "body invalido")
		return
	}
	if err := h.PlanesPG.MarcarSesion(id, numero, req.Realizado); err != nil {
		responderErrorPlan(c, err)
		return
	}
	utils.Respond(c, http.StatusOK, gin.H{"ok": true})
}
```
(Confirmar imports `strconv`, `net/http` ya presentes en el archivo; si falta `strconv`, agregarlo.)

- [ ] **Step 4: Ruta**

En `AtrevidaBack/router/router.go`, tras la línea de `planes/:id/estado`:
```go
		bd.PATCH("/planes/:id/sesiones/:numero", h.AuthRequired, h.AdminSysRequired, h.MarcarSesionPlan)
```

- [ ] **Step 5: Build + swagger**

Run: `cd AtrevidaBack && go build ./... && go generate ./... && git diff --exit-code docs/ || true`
Expected: build OK; nueva ruta en swagger.

- [ ] **Step 6: Verificar endpoint**

Con el server corriendo y un plan de Task 3 (id `<P>`), token admin en `$T`:
```bash
curl -s -X PATCH "http://localhost:8080/bd/planes/<P>/sesiones/1" \
  -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"realizado":true}'
PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -tAc \
  "SELECT realizado, fecha_realizado IS NOT NULL FROM plan_servicios WHERE plan_id=<P> AND sesion_numero=1;"
```
Expected: filas de sesión 1 con `realizado=t` y fecha no nula.

- [ ] **Step 7: Commit**

```bash
cd AtrevidaBack && git add -A
git commit -m "feat(planes): endpoint PATCH /bd/planes/{id}/sesiones/{numero} para marcar sesión"
```

---

### Task 5: Desacoplar reservas del consumo del plan (revertir Fase 1)

**Files:**
- Modify: `AtrevidaBack/repositories/pgsql/reservas_repo.go`

**Interfaces:**
- Produces: crear/anular/cambiar-estado de reserva ya **no** tocan `planes.sesiones_usadas`.

- [ ] **Step 1: CreateReserva — quitar el +1**

En `AtrevidaBack/repositories/pgsql/reservas_repo.go`, en `CreateReserva`, reemplazar el bloque:
```go
	if reservaConsume(true, input.Estado) {
		if err := ajustarSesionesPlanTx(tx, input.PlanID, +1); err != nil {
			return 0, err
		}
	}

	return reservaID, tx.Commit()
```
por:
```go
	return reservaID, tx.Commit()
```

- [ ] **Step 2: AnularReserva — volver a versión simple**

Reemplazar toda la función `AnularReserva` por:
```go
func (r *ReservasRepo) AnularReserva(id int) error {
	res, err := r.db.Exec(
		`UPDATE reservas SET activo = FALSE, actualizado_en = NOW() WHERE id = $1 AND activo = TRUE`, id,
	)
	if err != nil {
		return fmt.Errorf("error al eliminar reserva: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("reserva con id %d no encontrada o inactiva", id)
	}
	return nil
}
```

- [ ] **Step 3: UpdateReservaEstado — quitar el SELECT previo y el ajuste**

En `UpdateReservaEstado`, quitar el bloque agregado en Fase 1:
```go
	var planID sql.NullInt64
	var estadoAnterior string
	if err := tx.QueryRowx(
		`SELECT plan_id, estado FROM reservas WHERE id = $1 AND activo = TRUE`, input.ID,
	).Scan(&planID, &estadoAnterior); err != nil {
		return fmt.Errorf("reserva no encontrada")
	}
```
y el bloque final antes del commit:
```go
	// Ajusta el plan según la transición...
	delta := 0
	if reservaConsume(true, input.Estado) {
		delta++
	}
	if reservaConsume(true, estadoAnterior) {
		delta--
	}
	if err := ajustarSesionesPlanTx(tx, nullIntToPtr(planID), delta); err != nil {
		return err
	}
```
dejando solo `return tx.Commit()`.

- [ ] **Step 4: Quitar helpers sin uso**

Borrar las funciones `ajustarSesionesPlanTx`, `reservaConsume` y `nullIntToPtr` (quedan sin uso). Si `sql` deja de usarse en el archivo, quitar el import `"database/sql"`.

- [ ] **Step 5: Build**

Run: `cd AtrevidaBack && go build ./...`
Expected: OK, sin "declared and not used".

- [ ] **Step 6: Verificar desacople**

Con server corriendo: crear una reserva con `plan_id=<P>` desde la UI, anotar `sesiones_usadas` antes y después; luego eliminarla.
```bash
PGPASSWORD=1234 psql -h localhost -p5432 -U postgres -d atrevida_db -tAc "SELECT sesiones_usadas FROM planes WHERE id=<P>;"
```
Expected: no cambia al crear ni al eliminar.

- [ ] **Step 7: Commit**

```bash
cd AtrevidaBack && git add repositories/pgsql/reservas_repo.go
git commit -m "refactor(reservas): desacoplar del plan; el progreso vive en el checklist de sesiones"
```

---

### Task 6: Front — form de combo agrupado por sesión

**Files:**
- Modify: `AtrevidaFront/lib/api/combos.ts` (`ComboServicioLineaInput`)
- Modify: `AtrevidaFront/app/atrevida-gestion/configuracion/paquetes/ComboFormModal.tsx`
- Modify: `AtrevidaFront/app/atrevida-gestion/configuracion/paquetes/ComboFormModal.module.css`

**Interfaces:**
- Consumes: request de combo con `sesion_numero` por línea (Task 2).
- Produces: el form envía líneas con `sesion_numero`; `sesiones_totales` deja de enviarse (derivado).

- [ ] **Step 1: Tipo de línea**

En `AtrevidaFront/lib/api/combos.ts`, en `ComboServicioLineaInput` agregar `sesion_numero: number;`. Quitar `sesiones_totales` de `CrearComboData` y `ActualizarComboData` (ya no se envía; el backend lo deriva). `duracion_min` se mantiene.

- [ ] **Step 2: Estado y modelo de sesiones en el form**

En `ComboFormModal.tsx`, cambiar el modelo de líneas: cada línea lleva `sesion_numero`. `LineaForm` += `sesion_numero: number`. `nuevaLinea(sesion)` recibe el número de sesión. Derivar sesiones desde las líneas:
```tsx
const sesiones = useMemo(() => {
  const nums = Array.from(new Set(lineas.map((l) => l.sesion_numero))).sort((a, b) => a - b);
  return nums.length > 0 ? nums : [1];
}, [lineas]);
```
Quitar el estado `sesionesTotales` y el campo Sesiones del form (ahora = `sesiones.length`, solo display). `duracionMin` se mantiene. En `handleSubmit`/`construirLinea` incluir `sesion_numero: l.sesion_numero`; quitar `sesiones_totales` del payload de `crearCombo`/`actualizarCombo`.

- [ ] **Step 3: UI por sesión**

Renderizar una sección por sesión con sus líneas, botón "Agregar servicio" (a esa sesión) y "Agregar sesión" (crea líneas con el siguiente número). Reusar `.lineaCard`, `.addLinea`, tokens `--admin-*`. Ejemplo de estructura:
```tsx
{sesiones.map((n) => (
  <div key={n} className={styles.sesionBloque}>
    <div className={styles.sesionHeader}>Sesión {n}</div>
    {lineas.map((l, i) => l.sesion_numero === n && (
      <div key={i} className={styles.lineaCard}>
        <div className={styles.lineaTop}>
          <CustomSelect value={l.servicio_id != null ? String(l.servicio_id) : ''}
            onChange={(v) => seleccionarServicioLinea(i, Number(v))}
            options={[{ value: '', label: 'Seleccionar servicio…' }, ...serviciosDisponibles.map((s) => ({ value: String(s.id), label: s.nombre }))]} />
          <button type="button" className={styles.removeLinea} onClick={() => removeLinea(i)} aria-label="Quitar servicio" disabled={lineas.length === 1}>
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    ))}
    <button type="button" className={styles.addLinea} onClick={() => addLineaEnSesion(n)}>
      <Plus size={13} strokeWidth={2.2} /> Agregar servicio
    </button>
  </div>
))}
<button type="button" className={styles.addLinea} onClick={addSesion}>
  <Plus size={13} strokeWidth={2.2} /> Agregar sesión
</button>
```
con `addLineaEnSesion(n)` que hace push de `{...nuevaLinea(), sesion_numero: n}` y `addSesion()` que usa `Math.max(...sesiones)+1`. El precio sugerido (`precioSugerido = Σ costo`) y su lógica se mantienen (cuenta todas las líneas de todas las sesiones).

- [ ] **Step 4: Prefill (editar) agrupa por sesión**

En el `useEffect` de prefill, al mapear `getComboServiciosDB`, incluir `sesion_numero: s.sesion_numero ?? 1` en cada `LineaForm`.

- [ ] **Step 5: CSS de sesión**

En `ComboFormModal.module.css` agregar:
```css
.sesionBloque {
  grid-column: 1 / -1;
  padding: 0.75rem;
  border: 1px solid var(--admin-border-subtle);
  border-radius: var(--admin-radius-md);
  background: rgba(255, 255, 255, 0.015);
  margin-bottom: 0.6rem;
}
.sesionHeader {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--admin-accent-primary);
  margin-bottom: 0.5rem;
}
```

- [ ] **Step 6: Lint**

Run: `cd AtrevidaFront && npm run lint`
Expected: 0 errors.

- [ ] **Step 7: Verificar en UI**

`npm run dev` → configuración/paquetes → Nuevo paquete → armar Sesión 1 (2 servicios) + Sesión 2 (1) → Guardar. La lista debe mostrar `2 ses.`; expandir muestra los servicios.

- [ ] **Step 8: Commit**

```bash
cd AtrevidaFront && git add lib/api/combos.ts app/atrevida-gestion/configuracion/paquetes/ComboFormModal.tsx app/atrevida-gestion/configuracion/paquetes/ComboFormModal.module.css
git commit -m "feat(paquetes): form agrupa servicios por sesión; sesiones_totales derivado"
```

---

### Task 7: Front — vista de progreso y marcar sesión

**Files:**
- Modify: `AtrevidaFront/lib/api/planes.ts` (tipos detalle + `marcarSesionPlan`)
- Modify: `AtrevidaFront/app/atrevida-gestion/paquetes-activos/page.tsx`

**Interfaces:**
- Consumes: `PATCH /bd/planes/{id}/sesiones/{numero}` (Task 4); detalle de plan con `plan_servicios[].sesion_numero/realizado` (Task 3).

- [ ] **Step 1: API — marcar + tipos**

En `AtrevidaFront/lib/api/planes.ts` agregar:
```ts
export interface PlanServicioDetalle {
  id: number;
  nombre_snapshot: string;
  sesion_numero: number;
  realizado: boolean;
  fecha_realizado?: string;
  orden: number;
}

/** PATCH /bd/planes/{id}/sesiones/{numero} — marca/desmarca una sesión. */
export async function marcarSesionPlan(id: number, numero: number, realizado: boolean) {
  return apiClient.patch(`/bd/planes/${id}/sesiones/${numero}`, { realizado });
}
```
Si `getPlanByID` ya existe, tipar su `servicios` como `PlanServicioDetalle[]`; si no, agregar `getPlanByID(id)` → `GET /bd/planes/{id}`.

- [ ] **Step 2: Agrupar servicios por sesión en la página**

En `paquetes-activos/page.tsx`, para el plan abierto, cargar su detalle (`getPlanByID`) y agrupar `servicios` por `sesion_numero`:
```tsx
const sesiones = useMemo(() => {
  const map = new Map<number, PlanServicioDetalle[]>();
  for (const s of detalle?.servicios ?? []) {
    const arr = map.get(s.sesion_numero) ?? [];
    arr.push(s);
    map.set(s.sesion_numero, arr);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
    .map(([numero, servs]) => ({ numero, servicios: servs, hecha: servs.every((x) => x.realizado) }));
}, [detalle]);
const hechas = sesiones.filter((s) => s.hecha).length;
```

- [ ] **Step 3: Render sesiones + toggle + progreso**

```tsx
<div className={styles.progreso}>Progreso: {hechas}/{sesiones.length} sesiones</div>
{sesiones.map((s) => (
  <div key={s.numero} className={`${styles.sesionRow} ${s.hecha ? styles.sesionHecha : ''}`}>
    <span className={styles.sesionNum}>Sesión {s.numero}</span>
    <span className={styles.sesionServs}>{s.servicios.map((x) => x.nombre_snapshot).join(' · ')}</span>
    <button type="button" className={styles.toggleBtn} onClick={() => toggleSesion(s.numero, !s.hecha)}>
      {s.hecha ? '✓ Hecha' : 'Marcar hecha'}
    </button>
  </div>
))}
```
con:
```tsx
const toggleSesion = async (numero: number, realizado: boolean) => {
  try {
    await marcarSesionPlan(planId, numero, realizado);
    await recargarDetalle();
    toast.success(realizado ? 'Sesión marcada' : 'Sesión pendiente');
  } catch {
    toast.error('No se pudo actualizar la sesión');
  }
};
```

- [ ] **Step 4: CSS mínimo**

Agregar en el module.css de la página clases `.progreso`, `.sesionRow`, `.sesionHecha`, `.sesionNum`, `.sesionServs`, `.toggleBtn` reutilizando tokens `--admin-*` (borde, radius, accent). Estado hecha: borde/fondo verde suave (`--admin-accent-success`).

- [ ] **Step 5: Lint**

Run: `cd AtrevidaFront && npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Verificar end-to-end**

`npm run dev` → paquetes-activos → abrir el plan de la venta → marcar Sesión 1 → progreso pasa a 1/N; el botón queda "✓ Hecha"; recargar la página mantiene el estado. Desmarcar lo revierte.

- [ ] **Step 7: Commit**

```bash
cd AtrevidaFront && git add lib/api/planes.ts app/atrevida-gestion/paquetes-activos/
git commit -m "feat(paquetes-activos): vista de progreso por sesión con marcar hecha/pendiente"
```

---

## Self-Review

- **Spec coverage:** §1 modelo → Tasks 1-3; §2 endpoint → Task 4; §3 form → Task 6; §4 progreso → Task 7; §5 desacople → Task 5. Precio sugerido (Σ costo) → se mantiene de la fase previa (Task 6 Step 3 lo conserva). `sesiones_totales` derivado → Task 2 Steps 5-6. Cubierto.
- **Placeholders:** ninguno; cada step trae código/consultas concretas.
- **Type consistency:** `sesion_numero`/`realizado`/`fecha_realizado` consistentes entre migración, modelos, repos y front; `MarcarSesion(planID, numero, realizado)` mismo nombre en repo/service/handler; `marcarSesionPlan(id, numero, realizado)` en front.

## Notas de verificación
- Los endpoints de crear/editar combo y marcar sesión requieren token admin_sys; para curl obtener el token vía `/auth/login`. Preferir la prueba por UI donde sea más simple.
- El precio sigue siendo **sugerencia editable** (no se rompe): Σ costo de todas las líneas de todas las sesiones.
