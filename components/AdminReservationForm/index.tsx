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
import { FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearClienteDB, getClientesDB, type ClientePG } from '@/lib/api/clientes';
import { normalizeBolivianPhone } from '@/lib/utils/reservationValidation';
import styles from './ReservationForm.module.css';

interface ReservationFormProps {
  initialData?: ReservationFormInitialData;
  onSuccess?: () => void;
}

interface NuevoClienteForm {
  nombre: string;
  apellido: string;
  numero_telefono: string;
}

interface NuevoClienteErrors {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
  submit?: string;
}

const MIN_CLIENT_SEARCH_LENGTH = 2;
const MAX_CLIENT_SUGGESTIONS = 7;

const getClienteNombreCompleto = (cliente: ClientePG) => `${cliente.nombre} ${cliente.apellido}`.trim();

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const normalizeClientPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return normalizeBolivianPhone(digits.length > 8 ? digits.slice(-8) : digits);
};

// El formulario solo pide un campo "Cliente" (nombre completo), pero crear un
// cliente en BD exige nombre y apellido por separado: se parte por la última
// palabra, igual que en Caja.
const splitNombreCompleto = (nombreCompleto: string): Pick<NuevoClienteForm, 'nombre' | 'apellido'> => {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return { nombre: partes[0] ?? '', apellido: '' };
  return {
    nombre: partes.slice(0, -1).join(' '),
    apellido: partes.at(-1) ?? '',
  };
};

export default function AdminReservationForm({ initialData, onSuccess }: ReservationFormProps) {
  const router = useRouter();
  const [clientesDirectorio, setClientesDirectorio] = useState<ClientePG[]>([]);
  const [clientesLoading, setClientesLoading] = useState(() => Boolean(initialData?.isAdmin));
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteEncontradoPorTelefono, setClienteEncontradoPorTelefono] = useState<ClientePG | null>(null);
  const [nuevoClienteModalOpen, setNuevoClienteModalOpen] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState<NuevoClienteForm>({ nombre: '', apellido: '', numero_telefono: '' });
  const [nuevoClienteErrors, setNuevoClienteErrors] = useState<NuevoClienteErrors>({});
  const [creandoCliente, setCreandoCliente] = useState(false);
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

  useEffect(() => {
    if (!initialData?.isAdmin) return;

    let cancelled = false;

    getClientesDB({})
      .then((res) => {
        if (cancelled) return;
        setClientesDirectorio(res.data?.clientes ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setClientesDirectorio([]);
        setClientesError(err instanceof Error ? err.message : 'No se pudo cargar el directorio de clientes');
      })
      .finally(() => {
        if (!cancelled) setClientesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialData?.isAdmin]);

  // Cuando el teléfono queda completo (8 dígitos), busca en el directorio ya
  // cargado un cliente con ese número y autocompleta el nombre si aún está vacío.
  useEffect(() => {
    if (!initialData?.isAdmin || numeroTelefono.length !== 8) {
      setClienteEncontradoPorTelefono(null);
      return;
    }

    const match = clientesDirectorio.find(
      (clienteItem) => normalizeClientPhone(clienteItem.numero_telefono) === numeroTelefono,
    );
    setClienteEncontradoPorTelefono(match ?? null);

    if (match && !cliente.trim()) {
      setCliente(getClienteNombreCompleto(match));
    }
  }, [numeroTelefono, clientesDirectorio, initialData?.isAdmin, cliente, setCliente]);

  const mostrarOfertaCrearCliente = Boolean(
    initialData?.isAdmin
    && !clientesLoading
    && numeroTelefono.length === 8
    && cliente.trim().length > 0
    && !clienteEncontradoPorTelefono,
  );

  const abrirModalNuevoCliente = () => {
    const { nombre, apellido } = splitNombreCompleto(cliente);
    setNuevoClienteForm({ nombre, apellido, numero_telefono: numeroTelefono });
    setNuevoClienteErrors({});
    setNuevoClienteModalOpen(true);
  };

  const cerrarModalNuevoCliente = () => {
    if (creandoCliente) return;
    setNuevoClienteModalOpen(false);
    setNuevoClienteErrors({});
  };

  const validarNuevoCliente = (): boolean => {
    const errs: NuevoClienteErrors = {};
    if (!nuevoClienteForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!nuevoClienteForm.apellido.trim()) errs.apellido = 'El apellido es obligatorio';
    if (!/^\d{8}$/.test(nuevoClienteForm.numero_telefono.replace(/\D/g, ''))) {
      errs.numero_telefono = 'Ingresa 8 dígitos del teléfono';
    }
    setNuevoClienteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCrearCliente = async () => {
    if (!validarNuevoCliente()) return;

    setCreandoCliente(true);
    setNuevoClienteErrors({});
    try {
      const payload = {
        nombre: nuevoClienteForm.nombre.trim(),
        apellido: nuevoClienteForm.apellido.trim(),
        numero_telefono: nuevoClienteForm.numero_telefono.replace(/\D/g, ''),
      };
      const res = await crearClienteDB(payload);
      if (!res.data?.id) throw new Error('No se recibió el ID del cliente creado');

      const nuevoCliente: ClientePG = { id: res.data.id, ...payload };
      setClientesDirectorio((prev) => [...prev, nuevoCliente]);
      setCliente(getClienteNombreCompleto(nuevoCliente));
      setNumeroTelefono(normalizeClientPhone(nuevoCliente.numero_telefono));
      setClienteEncontradoPorTelefono(nuevoCliente);
      setNuevoClienteModalOpen(false);
      toast.success('Cliente creado correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cliente';
      setNuevoClienteErrors({ submit: message });
      toast.error(message);
    } finally {
      setCreandoCliente(false);
    }
  };

  const clienteQuery = normalizeSearch(cliente);
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

  const selectClienteSugerido = (clienteItem: ClientePG) => {
    setCliente(getClienteNombreCompleto(clienteItem));
    setNumeroTelefono(normalizeClientPhone(clienteItem.numero_telefono));
    setClienteDropdownOpen(false);
  };

  return (
    <>
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
            <label>Cliente</label>
            <input
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
                  <div className={styles.clientDropdownStatus}>Sin coincidencias registradas</div>
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
              onChange={e => setNumeroTelefono(normalizeBolivianPhone(e.target.value))}
              placeholder="77777777"
              className={errors.numeroTelefono ? styles.inputError : ''}
            />
            {errors.numeroTelefono && <span className={styles.errorText}>{errors.numeroTelefono}</span>}
            {clienteEncontradoPorTelefono && (
              <p className={styles.clienteFoundHint}>
                Cliente registrado encontrado: <strong>{getClienteNombreCompleto(clienteEncontradoPorTelefono)}</strong>
              </p>
            )}
            {mostrarOfertaCrearCliente && (
              <div className={styles.clienteNuevoHint}>
                <span>Este teléfono no corresponde a ningún cliente registrado.</span>
                <button type="button" className={styles.clienteNuevoButton} onClick={abrirModalNuevoCliente}>
                  <UserPlus size={14} strokeWidth={2} />
                  Crear ficha de cliente
                </button>
              </div>
            )}
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
    </form>

    <FormModal
      isOpen={nuevoClienteModalOpen}
      onClose={cerrarModalNuevoCliente}
      title="Cliente no registrado"
      onSubmit={handleCrearCliente}
      loading={creandoCliente}
      submitLabel="Crear cliente"
    >
      <div className={styles.modalFormGrid}>
        <label className={styles.modalField}>
          <span>Nombre</span>
          <input
            type="text"
            value={nuevoClienteForm.nombre}
            onChange={(e) => {
              setNuevoClienteForm((prev) => ({ ...prev, nombre: e.target.value }));
              if (nuevoClienteErrors.nombre) setNuevoClienteErrors((prev) => ({ ...prev, nombre: undefined }));
            }}
            className={nuevoClienteErrors.nombre ? styles.inputError : ''}
            autoFocus
          />
          {nuevoClienteErrors.nombre && <small className={styles.fieldError}>{nuevoClienteErrors.nombre}</small>}
        </label>

        <label className={styles.modalField}>
          <span>Apellido</span>
          <input
            type="text"
            value={nuevoClienteForm.apellido}
            onChange={(e) => {
              setNuevoClienteForm((prev) => ({ ...prev, apellido: e.target.value }));
              if (nuevoClienteErrors.apellido) setNuevoClienteErrors((prev) => ({ ...prev, apellido: undefined }));
            }}
            className={nuevoClienteErrors.apellido ? styles.inputError : ''}
          />
          {nuevoClienteErrors.apellido && <small className={styles.fieldError}>{nuevoClienteErrors.apellido}</small>}
        </label>

        <label className={`${styles.modalField} ${styles.modalFieldFull}`}>
          <span>Teléfono</span>
          <input
            type="tel"
            inputMode="numeric"
            value={nuevoClienteForm.numero_telefono}
            onChange={(e) => {
              setNuevoClienteForm((prev) => ({ ...prev, numero_telefono: normalizeBolivianPhone(e.target.value) }));
              if (nuevoClienteErrors.numero_telefono) {
                setNuevoClienteErrors((prev) => ({ ...prev, numero_telefono: undefined }));
              }
            }}
            className={nuevoClienteErrors.numero_telefono ? styles.inputError : ''}
            placeholder="77777777"
          />
          {nuevoClienteErrors.numero_telefono && (
            <small className={styles.fieldError}>{nuevoClienteErrors.numero_telefono}</small>
          )}
        </label>
      </div>

      {nuevoClienteErrors.submit && <div className={styles.submitError}>{nuevoClienteErrors.submit}</div>}
    </FormModal>
    </>
  );
}
