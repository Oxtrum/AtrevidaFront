'use client';

import { useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { CustomSelect } from '../Custom/CustomSelect';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ServiceSelect } from './ServiceSelect';
import { useReservationForm, type ReservationFormInitialData } from './useReservationForm';
import styles from './ReservationForm.module.css';

interface ReservationFormProps {
  initialData?: ReservationFormInitialData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReservationForm({ initialData, onSuccess, onCancel }: ReservationFormProps) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const {
    sucursal, setSucursal,
    fecha,
    horaDesde, horaHasta,
    cliente, setCliente,
    numeroTelefono, setNumeroTelefono,
    notas, setNotas,
    servicio,
    servicioSolicitado, setServicioSolicitado,
    error, errors,
    slotWarning,
    scheduleWarning,
    loading,
    hoursAvailability,
    sucursalOptions,
    servicioGroups,
    servicioSolicitadoGroups,
    servicioSeleccionado,
    esTratamientoEspecializado,
    isSundaySelected,
    handleServicioChange,
    handleFechaChange,
    handleSlotSelect,
    handleSubmit,
  } = useReservationForm(initialData, onSuccess);
  const fechaLegible = useMemo(() => {
    if (!fecha) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${fecha}T00:00:00`));
  }, [fecha]);
  const resumenHora = horaDesde && horaHasta ? `${horaDesde} a ${horaHasta}` : 'Sin horario';
  const notaServicio = servicioSeleccionado && 'nota' in servicioSeleccionado
    ? servicioSeleccionado.nota
    : '';

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formBody}>

        {/* Header */}
        <div className={styles.formHeader}>
          <div className={styles.formEyebrow}>
            <span className={styles.eyebrowDot} />
            AtrevidaFit
          </div>
          <h2 className={styles.formTitle}>Nueva Reserva</h2>
          <p className={styles.formSubtitle}>
            Elige fecha y horario. La reserva quedará pendiente hasta aprobación.
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div className={styles.formGrid}>

          {/* Sucursal */}
          <div className={styles.formGroup}>
            <label>Sucursal</label>
            <CustomSelect
              value={sucursal}
              onChange={setSucursal}
              options={sucursalOptions}
              placeholder="Seleccionar sucursal"
              hasError={!!errors.sucursal}
            />
            {errors.sucursal && <span className={styles.errorText}>{errors.sucursal}</span>}
          </div>

          {/* Fecha */}
          <div className={styles.formGroup}>
            <label>Fecha</label>
            <div className={styles.dateInputWrap}>
              <input
                ref={dateInputRef}
                type="date"
                value={fecha}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={e => handleFechaChange(e.target.value)}
                className={errors.fecha ? styles.inputError : ''}
              />
              <button
                type="button"
                className={styles.datePickerButton}
                aria-label="Abrir selector de fecha"
                onClick={() => dateInputRef.current?.showPicker?.()}
              >
                <CalendarDays size={18} strokeWidth={1.8} />
              </button>
            </div>
            {errors.fecha && <span className={styles.errorText}>{errors.fecha}</span>}
          </div>

          {/* Servicio */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Servicio</label>
            <ServiceSelect
              sucursal={sucursal}
              servicio={servicio}
              groups={servicioGroups}
              hasError={!!errors.servicio}
              onChange={handleServicioChange}
            />
            {notaServicio && (
              <p className={styles.serviceNote}>{notaServicio}</p>
            )}
            {errors.servicio && <span className={styles.errorText}>{errors.servicio}</span>}
          </div>

          {esTratamientoEspecializado && (
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Tratamiento que te interesa</label>
              <CustomSelect
                value={servicioSolicitado}
                onChange={setServicioSolicitado}
                groups={servicioSolicitadoGroups}
                placeholder="Seleccionar tratamiento"
                hasError={!!errors.servicioSolicitado}
              />
              <p className={styles.serviceNote}>
                Esto no agenda el tratamiento automáticamente. El equipo lo validará contigo antes de confirmar la reserva.
              </p>
              {errors.servicioSolicitado && <span className={styles.errorText}>{errors.servicioSolicitado}</span>}
            </div>
          )}

          {/* Horario */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>
              Horario
              {errors.horaDesde && (
                <span className={styles.errorText}> — {errors.horaDesde}</span>
              )}
            </label>

            {(slotWarning || scheduleWarning) && (
              <div className={styles.slotWarning}>
                <span>Atención:</span> {slotWarning || scheduleWarning}
              </div>
            )}

            {!sucursal || !servicio || !fecha || isSundaySelected ? (
              <div className={styles.pickerPlaceholder}>
                {!sucursal
                  ? 'Selecciona una sucursal para ver la disponibilidad'
                  : !fecha
                    ? 'Selecciona una fecha para ver los horarios disponibles'
                    : isSundaySelected
                      ? 'Los domingos no hay horarios disponibles'
                      : 'Selecciona un servicio para ver los horarios disponibles'}
              </div>
            ) : (
              <TimeSlotPicker
                horaDesde={horaDesde}
                horaHasta={horaHasta}
                hoursAvailability={hoursAvailability}
                onSelect={handleSlotSelect}
              />
            )}
          </div>

          <div className={`${styles.reservationSummary} ${styles.fullWidth}`}>
            <div>
              <span>Fecha</span>
              <strong>{fechaLegible}</strong>
            </div>
            <div>
              <span>Horario</span>
              <strong>{resumenHora}</strong>
            </div>
            <div>
              <span>Servicio</span>
              <strong>{servicioSeleccionado?.label || 'Sin servicio'}</strong>
            </div>
          </div>

          <div className={styles.formDivider} />

          {/* Cliente */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Cliente</label>
            <input
              type="text"
              value={cliente}
              onChange={e => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
              className={errors.cliente ? styles.inputError : ''}
            />
            {errors.cliente && <span className={styles.errorText}>{errors.cliente}</span>}
          </div>

          {/* Teléfono */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Teléfono</label>
            <div className={styles.phoneInputWrap}>
              <span className={styles.phonePrefix}>+591</span>
              <input
                type="tel"
                inputMode="numeric"
                value={numeroTelefono}
                onChange={e => setNumeroTelefono(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="77777777"
                className={errors.numeroTelefono ? styles.inputError : ''}
              />
            </div>
            {errors.numeroTelefono && <span className={styles.errorText}>{errors.numeroTelefono}</span>}
          </div>

          {/* Notas */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Notas</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Comentarios adicionales"
            />
          </div>

        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            // Usar push a una ruta conocida en lugar de router.back() para
            // forzar un desmontado consistente (evita problemas con BFCache
            // y restauraciones que no desmontan el componente).
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              router.push(initialData?.isAdmin ? '/admin/reservas' : '/reservas');
            }}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            <span className={styles.submitButtonText}>
              {loading ? 'Enviando...' : 'Solicitar reserva'}
            </span>
          </button>
        </div>

      </div>
    </form>
  );
}
