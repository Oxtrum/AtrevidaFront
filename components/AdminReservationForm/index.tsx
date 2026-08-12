'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarPlus, UserPlus } from 'lucide-react';
import { CustomSelect } from '../Custom/CustomSelectAdmin';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DaySelector } from './DaySelector';
import PlanSelector from './PlanSelector';
import { ServiceSelect } from './ServiceSelect';
import { useReservationForm, type ReservationFormInitialData } from './useReservationForm';
import { getClientesDB, type ClientePG } from '@/lib/api/clientes';
import { ClienteFormModal } from '@/components/AdminClientes';
import { normalizeBolivianPhone } from '@/lib/utils/reservationValidation';
import styles from './ReservationForm.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';

interface ReservationFormProps {
  initialData?: ReservationFormInitialData;
  onSuccess?: () => void;
}

const MIN_CLIENT_SEARCH_LENGTH = 2;
const MAX_CLIENT_SUGGESTIONS = 7;
// Mismo umbral que validateReservationForm: fijos de 7 dígitos son válidos.
const MIN_PHONE_DIGITS = 7;

const getClienteNombreCompleto = (cliente: ClientePG) => `${cliente.nombre} ${cliente.apellido}`.trim();

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const normalizeClientPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return normalizeBolivianPhone(digits.length > 8 ? digits.slice(-8) : digits);
};

export default function AdminReservationForm({ initialData, onSuccess }: ReservationFormProps) {
  const router = useRouter();
  const [clientesDirectorio, setClientesDirectorio] = useState<ClientePG[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const {
    sucursal, setSucursal,
    semanaIndex,
    dia,
    horaDesde, horaHasta,
    cliente, setCliente,
    numeroTelefono, setNumeroTelefono,
    notas, setNotas,
    planId, setPlanId,
    agendarDirecto, setAgendarDirecto,
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

	const clienteQuery = normalizeSearch(cliente);

  useEffect(() => {
	if (!initialData?.isAdmin || clienteQuery.length < MIN_CLIENT_SEARCH_LENGTH) {
		return;
	}
	const controller = new AbortController();
	const timer = window.setTimeout(() => {
	  setClientesLoading(true);
	  setClientesError(null);
	  getClientesDB({ busqueda: clienteQuery, limit: PAGE_LIMIT }, controller.signal)
      .then((res) => {
		if (controller.signal.aborted) return;
        setClientesDirectorio(res.data?.clientes ?? []);
      })
      .catch((err) => {
		if (controller.signal.aborted) return;
        setClientesDirectorio([]);
        setClientesError(err instanceof Error ? err.message : 'No se pudo cargar el directorio de clientes');
      })
      .finally(() => {
		if (!controller.signal.aborted) setClientesLoading(false);
      });
	}, 300);

    return () => {
	  window.clearTimeout(timer);
	  controller.abort();
    };
  }, [clienteQuery, initialData?.isAdmin]);

  const clientesSugeridos = useMemo(() => {
    if (!initialData?.isAdmin || clienteQuery.length < MIN_CLIENT_SEARCH_LENGTH) return [];

    return clientesDirectorio
      .filter((clienteItem) => {
        const nombre = normalizeSearch(clienteItem.nombre);
        const apellido = normalizeSearch(clienteItem.apellido);
        const nombreCompleto = normalizeSearch(getClienteNombreCompleto(clienteItem));

        return nombre.includes(clienteQuery)
          || apellido.includes(clienteQuery)
          || nombreCompleto.includes(clienteQuery);
      })
      .slice(0, MAX_CLIENT_SUGGESTIONS);
  }, [clienteQuery, clientesDirectorio, initialData?.isAdmin]);

  const showClienteDropdown = initialData?.isAdmin
    && clienteDropdownOpen
    && clienteQuery.length >= MIN_CLIENT_SEARCH_LENGTH;

  // El teléfono identifica al cliente sólo mientras el nombre esté vacío. Se
  // resuelve al teclear y no en un efecto: si reaccionara a que "Cliente" quedó
  // vacío, borrar un nombre elegido por error lo volvería a escribir solo.
  const handleTelefonoChange = (valor: string) => {
    const telefono = normalizeBolivianPhone(valor);
    setNumeroTelefono(telefono);

    if (!initialData?.isAdmin || cliente.trim() || telefono.length < MIN_PHONE_DIGITS) return;

    const match = clientesDirectorio.find(
      (clienteItem) => normalizeClientPhone(clienteItem.numero_telefono) === telefono,
    );
    if (match) setCliente(getClienteNombreCompleto(match));
  };

  const selectClienteSugerido = (clienteItem: ClientePG) => {
    setCliente(getClienteNombreCompleto(clienteItem));
    setNumeroTelefono(normalizeClientPhone(clienteItem.numero_telefono));
    setClienteDropdownOpen(false);
  };

  const handleClienteCreado = (nuevo: ClientePG) => {
    setCliente(getClienteNombreCompleto(nuevo));
    setNumeroTelefono(normalizeClientPhone(nuevo.numero_telefono));
    // El directorio se carga una sola vez al montar. Sin este push, el cliente
    // recien creado no aparece al volver a buscarlo en la misma sesion.
    setClientesDirectorio((prev) => [nuevo, ...prev]);
    setClienteDropdownOpen(false);
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
          <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.clientAutocomplete}`}>
            <div className={styles.labelRow}>
              <label htmlFor="reserva-cliente">Cliente</label>
              {initialData?.isAdmin && (
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setClienteModalOpen(true)}
                >
                  <UserPlus size={13} strokeWidth={2} />
                  Nuevo
                </button>
              )}
            </div>
            <input
              id="reserva-cliente"
              type="text"
              value={cliente}
              onChange={(e) => {
                setCliente(e.target.value);
                setClienteDropdownOpen(true);
              }}
              onFocus={() => setClienteDropdownOpen(true)}
              onBlur={() => window.setTimeout(() => setClienteDropdownOpen(false), 120)}
              placeholder="Nombre del cliente"
              className={errors.cliente ? styles.inputError : ''}
              autoComplete="off"
            />
            {showClienteDropdown && (
              <div className={styles.clientDropdown} role="listbox" aria-label="Clientes registrados">
                {clientesLoading ? (
                  <div className={styles.clientDropdownStatus}>Cargando directorio...</div>
                ) : clientesError ? (
                  <div className={styles.clientDropdownStatus}>{clientesError}</div>
                ) : clientesSugeridos.length > 0 ? (
                  clientesSugeridos.map((clienteItem) => (
                    <button
                      key={clienteItem.id}
                      type="button"
                      className={styles.clientOption}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectClienteSugerido(clienteItem);
                      }}
                      role="option"
                      aria-selected={false}
                    >
                      <strong>{getClienteNombreCompleto(clienteItem)}</strong>
                      <span>{clienteItem.numero_telefono || 'Sin telefono registrado'}</span>
                    </button>
                  ))
                ) : (
                  <>
                    <div className={styles.clientDropdownStatus}>Sin coincidencias registradas</div>
                    <button
                      type="button"
                      className={styles.clientRegisterOption}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setClienteModalOpen(true);
                      }}
                    >
                      <UserPlus size={14} strokeWidth={2} />
                      Registrar «{cliente.trim()}» como cliente nuevo
                    </button>
                  </>
                )}
              </div>
            )}
            {errors.cliente && <span className={styles.errorText}>{errors.cliente}</span>}
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Teléfono</label>
            <input
              type="tel"
              inputMode="numeric"
              value={numeroTelefono}
              onChange={e => handleTelefonoChange(e.target.value)}
              placeholder="77777777"
              className={errors.numeroTelefono ? styles.inputError : ''}
            />
            {errors.numeroTelefono && <span className={styles.errorText}>{errors.numeroTelefono}</span>}
          </div>

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
              {loading ? 'Creando...' : (
                <>
                  <CalendarPlus size={17} strokeWidth={1.8} />
                  Reservar
                </>
              )}
            </span>
          </button>
        </div>

      </div>

      <ClienteFormModal
        isOpen={clienteModalOpen}
        onClose={() => setClienteModalOpen(false)}
        initialNombre={cliente}
        initialTelefono={numeroTelefono}
        onSaved={handleClienteCreado}
      />
    </form>
  );
}
