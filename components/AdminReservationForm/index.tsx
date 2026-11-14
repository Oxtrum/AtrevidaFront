'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarCheck, CalendarPlus, Save } from 'lucide-react';
import { useState } from 'react';
import { CustomSelect } from '../Custom/CustomSelectAdmin';
import { TimeSlotPicker } from './TimeSlotPicker';
import { horarioHabilitado } from '@/lib/utils/diaSeleccion';
import { DaySelector } from './DaySelector';
import { WeekStepper } from './WeekStepper';
import PlanSelector from './PlanSelector';
import { ServiceSelect } from './ServiceSelect';
import { useReservationForm, type ReservationFormInitialData } from './useReservationForm';
import type { ClientePG } from '@/lib/api/clientes';
import { ClienteSelect } from '@/components/AdminClientes';
import { ConfirmDialog } from '@/components/AdminConfig/ConfirmDialog';
import { ReservaDuplicadaDialog } from '@/components/AdminReservas/ReservaDuplicadaDialog';
import { AvisoDuracion } from './AvisoDuracion';
import { PhoneInput } from '@/components/PhoneInput';
import { formatPhoneForDisplay, phoneValueFrom, type PhoneValue } from '@/lib/utils/phone';
import { telefonosDistintos } from '@/lib/utils/telefonoCliente';
import styles from './ReservationForm.module.css';

interface ReservationFormProps {
  initialData?: ReservationFormInitialData;
  onSuccess?: () => void;
}

export default function AdminReservationForm({ initialData, onSuccess }: ReservationFormProps) {
  const router = useRouter();
  // Cliente elegido en el buscador (no el que ya traia la reserva): de el sale la opcion de reemplazar su telefono.
  const [clienteElegido, setClienteElegido] = useState<ClientePG | null>(null);
  const {
    sucursal, setSucursal,
    semanaIndex,
    dia,
    horaDesde, horaHasta,
    cliente, setCliente,
    setClienteId,
    numeroTelefono, setNumeroTelefono,
    telefonoE164, setTelefonoE164,
    notas, setNotas,
    planId, setPlanId,
    agendarDirecto, setAgendarDirecto,
    servicio,
    error, errors,
    slotWarning,
    esperandoAjuste,
    confirmandoDuracion,
    desajusteDuracion,
    loading,
    hoursAvailability,
    diasDisponibles,
    sucursalOptions,
    semanaOptions,
    servicioGroups,
    handleSemanaChange,
    handleFechaSelect,
    fechaSeleccionadaISO,
    rangoFechas,
    handleServicioChange,
    handleDiaChange,
    handleSlotSelect,
    handleSubmit,
    confirmarDuracion,
    cancelarConfirmacionDuracion,
    reservasDuplicadas,
    confirmarDuplicada,
    cancelarDuplicada,
    editando,
    aprobando,
    actualizarTelefonoCliente, setActualizarTelefonoCliente,
  } = useReservationForm(initialData, onSuccess);

  // El cliente se elige en el buscador. El teléfono ya no lo adivina: no es confiable.
  const handleTelefonoChange = (phone: PhoneValue) => {
    setNumeroTelefono(phone.nationalNumber);
    setTelefonoE164(phone.e164);
  };

  // Elegido de la lista o recien creado: el nombre y el telefono del cliente pasan a la reserva.
  const handleClienteElegido = (clienteItem: ClientePG) => {
    setCliente(`${clienteItem.nombre} ${clienteItem.apellido}`.trim());
    setClienteId(clienteItem.id);
    setClienteElegido(clienteItem);
    setActualizarTelefonoCliente(false);
    // Al editar, el telefono de la reserva se respeta: si difiere del del cliente se ofrece reemplazar el del cliente.
    if (editando) return;
    const phone = phoneValueFrom(clienteItem.telefono_e164 || clienteItem.numero_telefono);
    setNumeroTelefono(phone.nationalNumber);
    setTelefonoE164(phone.e164);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formBody}>

        {/* Header */}
        <div className={styles.formHeader}>
          <div className={styles.formEyebrow}>
            <span className={styles.eyebrowDot} />
            AtrevidaFit
          </div>
          <h2 className={styles.formTitle}>{aprobando ? `Aprobar Reserva #${initialData?.reserva?.id}` : editando ? `Editar Reserva #${initialData?.reserva?.id}` : 'Nueva Reserva'}</h2>
          <p className={styles.formSubtitle}>
            {aprobando
              ? `Solicitó: ${initialData?.reserva?.servicio_solicitado || initialData?.reserva?.servicio || 'por definir'}. Confirma o corrige los datos y agéndala.`
              : editando
                ? 'Cambia lo que haga falta. Aprobar, rechazar y completar se hacen desde la lista.'
                : 'Selecciona el horario disponible y completa los datos del cliente'}
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div className={styles.formGrid}>

          {/* Sucursal */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
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
            <label>Semana y día</label>
            <WeekStepper
              semanaIndex={semanaIndex}
              semanaOptions={semanaOptions}
              onSemanaChange={handleSemanaChange}
              fechaISO={fechaSeleccionadaISO}
              minISO={rangoFechas.min}
              maxISO={rangoFechas.max}
              onFechaSelect={handleFechaSelect}
              hasError={!!errors.semana}
            />
            {errors.semana && <span className={styles.errorText}>{errors.semana}</span>}
            <DaySelector
              dias={diasDisponibles}
              diaActivo={dia}
              onChange={handleDiaChange}
            />
            {errors.fecha && <span className={styles.errorText}>{errors.fecha}</span>}
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
                <AlertTriangle size={16} strokeWidth={1.8} /> {slotWarning}
              </div>
            )}

            {!sucursal ? (
              <div className={styles.pickerPlaceholder}>
                Selecciona una sucursal para ver la disponibilidad
              </div>
            ) : !horarioHabilitado(dia, sucursal) ? (
              <div className={styles.pickerPlaceholder}>
                Elige primero el día de la semana para ver los horarios
              </div>
            ) : (
              <TimeSlotPicker
                horaDesde={horaDesde}
                horaHasta={horaHasta}
                hoursAvailability={hoursAvailability}
                onSelect={handleSlotSelect}
                esperandoAjuste={esperandoAjuste}
                permitirSolicitudSinCupo={!agendarDirecto}
              />
            )}
          </div>

          <div className={styles.formDivider} />

          {/* Cliente */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            {initialData?.isAdmin ? (
              <ClienteSelect
                id="reserva-cliente"
                value={cliente}
                onValueChange={(texto) => {
                  setCliente(texto);
                  // Escribir de nuevo suelta al cliente elegido: hay que volver a elegir uno de la lista.
                  setClienteId(null);
                }}
                onSelect={handleClienteElegido}
                initialNombre={initialData?.reserva?.cliente}
                initialTelefono={numeroTelefono}
                error={errors.cliente}
              />
            ) : (
              <>
                <label htmlFor="reserva-cliente">Cliente</label>
                <input
                  id="reserva-cliente"
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente"
                  className={errors.cliente ? styles.inputError : ''}
                  autoComplete="off"
                />
                {errors.cliente && <span className={styles.errorText}>{errors.cliente}</span>}
              </>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Teléfono</label>
            <PhoneInput
              value={numeroTelefono}
              e164={telefonoE164}
              onChange={handleTelefonoChange}
              placeholder="77777777"
              invalid={!!errors.numeroTelefono}
            />
            {errors.numeroTelefono && <span className={styles.errorText}>{errors.numeroTelefono}</span>}
          </div>

          {editando && clienteElegido && telefonosDistintos(clienteElegido, { telefono_e164: telefonoE164, numero_telefono: numeroTelefono }) && (
            <label className={styles.directToggle}>
              <input
                type="checkbox"
                className={styles.directToggleInput}
                checked={actualizarTelefonoCliente}
                onChange={(e) => setActualizarTelefonoCliente(e.target.checked)}
              />
              <span className={styles.directToggleSwitch} aria-hidden="true">
                <span className={styles.directToggleThumb} />
              </span>
              <span className={styles.directToggleText}>
                <span className={styles.directToggleTitle}>Actualizar el teléfono del cliente</span>
                <span className={styles.directToggleHint}>
                  La reserva tiene {formatPhoneForDisplay(telefonoE164, numeroTelefono)} y {`${clienteElegido.nombre} ${clienteElegido.apellido}`.trim()} tiene{' '}
                  {formatPhoneForDisplay(clienteElegido.telefono_e164, clienteElegido.numero_telefono) || 'ninguno'}. Si lo activas, se reemplaza el del cliente.
                </span>
              </span>
            </label>
          )}

          {initialData?.isAdmin && (
            <PlanSelector
              clienteNombre={cliente}
              planId={planId}
              localNombre={sucursal}
              onChange={setPlanId}
            />
          )}

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Notas <span style={{ opacity: 0.4, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones sobre la reserva..."
              rows={3}
            />
          </div>

          {!editando && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.directToggle}>
              <input
                type="checkbox"
                className={styles.directToggleInput}
                checked={agendarDirecto}
                onChange={(e) => setAgendarDirecto(e.target.checked)}
              />
              <span className={styles.directToggleSwitch} aria-hidden="true">
                <span className={styles.directToggleThumb} />
              </span>
              <span className={styles.directToggleText}>
                <span className={styles.directToggleTitle}>Agendar directamente</span>
                <span className={styles.directToggleHint}>
                  Activado, la reserva queda agendada al instante. Desactívalo para enviarla a aprobación.
                </span>
              </span>
            </label>
          </div>
          )}

        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            // Usar push a una ruta conocida en lugar de router.back() para
            // forzar un desmontado consistente (evita problemas con BFCache
            // y restauraciones que no desmontan el componente).
            onClick={() => router.push(initialData?.isAdmin ? '/atrevida-gestion/reservas' : '/reservas')}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            <span className={styles.submitButtonText}>
              {loading ? (aprobando ? 'Agendando...' : editando ? 'Guardando...' : 'Creando...') : aprobando ? (
                <>
                  <CalendarCheck size={17} strokeWidth={1.8} />
                  Aprobar y agendar
                </>
              ) : editando ? (
                <>
                  <Save size={17} strokeWidth={1.8} />
                  Guardar cambios
                </>
              ) : (
                <>
                  <CalendarPlus size={17} strokeWidth={1.8} />
                  Reservar
                </>
              )}
            </span>
          </button>
        </div>

      </div>

      {/* El rango elegido no dura lo que el servicio: confirmar antes de
          ocupar ambientes de más (o de menos) sin querer. */}
      <ConfirmDialog
        isOpen={confirmandoDuracion && !!desajusteDuracion}
        title="La duración no coincide con el servicio"
        confirmLabel={editando ? 'Guardar así' : 'Reservar así'}
        cancelLabel="Ajustar horario"
        loading={loading}
        onConfirm={confirmarDuracion}
        onClose={cancelarConfirmacionDuracion}
        message={desajusteDuracion && (
          <AvisoDuracion
            servicio={servicio}
            desajuste={desajusteDuracion}
            ayuda="Si fue un error, elige Ajustar horario y vuelve a marcar el rango en la rejilla."
          />
        )}
      />

      {/* El cliente ya tiene reserva ese día (en cualquier sucursal): evita agendar dos veces sin darse cuenta. */}
      <ReservaDuplicadaDialog
        reservas={reservasDuplicadas}
        cliente={cliente}
        telefonoE164={telefonoE164}
        numeroTelefono={numeroTelefono}
        fecha={fechaSeleccionadaISO}
        confirmLabel={editando ? 'Sí, guardar igual' : 'Sí, reservar igual'}
        loading={loading}
        onConfirm={confirmarDuplicada}
        onClose={cancelarDuplicada}
      />
    </form>
  );
}
