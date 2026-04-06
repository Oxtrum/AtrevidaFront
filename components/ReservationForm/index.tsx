'use client';

import { useRouter } from 'next/navigation';
import { DiaSemana } from '@/types/reserva';
import { CustomSelect } from '../Custom/CustomSelect';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DaySelector } from './DaySelector';
import { ServiceSelect } from './ServiceSelect';
import { useReservationForm, type ReservationFormInitialData } from './useReservationForm';
import styles from './ReservationForm.module.css';

interface ReservationFormProps {
  initialData?: ReservationFormInitialData;
  onSuccess?: () => void;
}

export default function ReservationForm({ initialData, onSuccess }: ReservationFormProps) {
  const router = useRouter();
  const {
    sucursal, setSucursal,
    semanaIndex,
    dia,
    horaDesde, horaHasta,
    cliente, setCliente,
    servicio,
    error, errors,
    slotWarning,
    loading,
    hoursAvailability,
    diasDisponibles,
    sucursalOptions,
    semanaOptions,
    servicioGroups,
    handleSemanaChange,
    handleServicioChange,
    handleDiaChange,
    handleSlotSelect,
    handleSubmit,
  } = useReservationForm(initialData, onSuccess);

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
            Selecciona el horario disponible y completa los datos del cliente
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

          {/* Semana */}
          <div className={styles.formGroup}>
            <label>Semana</label>
            <CustomSelect
              value={String(semanaIndex)}
              onChange={handleSemanaChange}
              options={semanaOptions}
              hasError={!!errors.semana}
            />
            {errors.semana && <span className={styles.errorText}>{errors.semana}</span>}
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
            {errors.servicio && <span className={styles.errorText}>{errors.servicio}</span>}
          </div>

          {/* Día */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Día</label>
            <DaySelector
              dias={diasDisponibles}
              diaActivo={dia}
              onChange={handleDiaChange}
            />
          </div>

          {/* Horario */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>
              Horario
              {errors.horaDesde && (
                <span className={styles.errorText}> — {errors.horaDesde}</span>
              )}
            </label>

            {slotWarning && (
              <div className={styles.slotWarning}>
                <span>⚠</span> {slotWarning}
              </div>
            )}

            {!sucursal || !servicio ? (
              <div className={styles.pickerPlaceholder}>
                {!sucursal
                  ? 'Selecciona una sucursal para ver la disponibilidad'
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

        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            <span className={styles.submitButtonText}>
              {loading ? 'Creando...' : '✦ Reservar'}
            </span>
          </button>
        </div>

      </div>
    </form>
  );
}