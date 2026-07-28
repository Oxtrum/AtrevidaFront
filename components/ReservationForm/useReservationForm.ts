'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DiaSemana, SERVICIOS_DISPONIBLES, SUCURSALES,
  SERVICIOS_ESPECIALIZADOS_DISPONIBLES,
  getTipoFromServicio, getTipoBackendFromServicio,
  getServiciosAdminPorCategoria,
  generarSemanas, getFechasDeSemana, esFechaPasada,
  type ReservaBD,
} from '@/types/reserva';
import { useCrearReserva } from '@/lib/hooks/useCrearReserva';
import { useReservas } from '@/lib/hooks/useReservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { useServiciosPublicos } from '@/lib/hooks/useServiciosPublicos';
import { toast } from '../Shared/Toast';
import {
  getReservationDateRestriction,
  validateReservationForm,
} from '@/lib/utils/reservationValidation';
import { type SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS, DIAS_SEMANA, SLOT_MIN, SLOTS_POR_HORA, calcularHoraFin, isSlotOutsideBusinessHours } from '@/lib/constants/reservationForm';
import { CATEGORIAS_ORDEN } from './constants';

export interface ReservationFormInitialData {
  local?: string;
  semana?: string;
  dia?: DiaSemana;
  fecha?: string;
  hora_desde?: string;
  hora_hasta?: string;
  servicio?: string;
  isAdmin?: boolean;
}

function getTodayISO() {
  return new Date().toLocaleDateString('en-CA');
}

function getWeekIndexForDate(fechaISO: string, semanas: ReturnType<typeof generarSemanas>) {
  if (!fechaISO) return 0;
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const idx = semanas.findIndex((semana) => {
    const inicio = new Date(semana.fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 5);
    return fecha >= inicio && fecha <= fin;
  });
  return idx >= 0 ? idx : 0;
}

function getDateDay(fechaISO: string) {
  if (!fechaISO) return null;
  return new Date(`${fechaISO}T00:00:00`).getDay();
}

export function useReservationForm(
  initialData?: ReservationFormInitialData,
  onSuccess?: () => void,
) {
  const router = useRouter();
  const { loading, error: hookError, crearReserva } = useCrearReserva();
  const { data: reservasData, fetch: fetchReservas } = useReservas();
  const { locales, loading: loadingLocales } = useLocales();
  // ── State ──────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slotWarning, setSlotWarning] = useState<string | null>(null);

  // Inicializar sucursal con el primer valor disponible
  // Normalizar horas que vienen del URL
  const normalizarHora = (hora: string): string => {
    if (!hora) return '';

    // Si ya está en HORAS exactamente, usarla tal cual
    if (HORAS.includes(hora)) return hora;

    // Intentar sin leading zero: "09:00" → "9:00"
    const sinCero = hora.replace(/^0(\d)/, '$1');
    if (HORAS.includes(sinCero)) return sinCero;

    // Intentar con leading zero: "9:00" → "09:00"
    const conCero = hora.replace(/^(\d):/, '0$1:');
    if (HORAS.includes(conCero)) return conCero;

    // Número simple como "9" → probar "9:00" y "09:00"
    if (!hora.includes(':')) {
      const num = parseInt(hora, 10);
      if (!isNaN(num)) {
        const opcion1 = `${num}:00`;
        if (HORAS.includes(opcion1)) return opcion1;
        const opcion2 = `${num.toString().padStart(2, '0')}:00`;
        if (HORAS.includes(opcion2)) return opcion2;
      }
    }

    return hora; // fallback
  };
  // Sin default silencioso: si no llega `local` explícito, queda vacío y la
  // validación obliga a elegir sucursal (evita escribir en la sucursal equivocada).
  const [sucursal, setSucursal] = useState(initialData?.local || '');
  const { servicios, loading: loadingServicios } = useServiciosPublicos(sucursal, true);
  const [dia, setDia] = useState<DiaSemana>(initialData?.dia || 'LUNES');
  const [fecha, setFecha] = useState(initialData?.fecha || getTodayISO());
  const [horaDesde, setHoraDesde] = useState(normalizarHora(initialData?.hora_desde || ''));
  const [horaHasta, setHoraHasta] = useState(normalizarHora(initialData?.hora_hasta || ''));
  const [cliente, setCliente] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [servicio, setServicio] = useState(initialData?.servicio || '');
  const [servicioSolicitado, setServicioSolicitado] = useState('');
  const [horaPreestablecida] = useState(!!initialData?.hora_desde); // Marca si hora vino del URL

  // Calcular horaHasta cuando hora viene del URL y se selecciona servicio
  useEffect(() => {
    if (!horaPreestablecida || !horaDesde || !servicio) return;

    const servicioInfo = SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
    if (!servicioInfo) return;

    // El catálogo estático expresa la duración en minutos: '50 min', '90 min'.
    const match = servicioInfo.duracion.match(/(\d+)/);
    const duracionMin = match ? parseInt(match[1]) : 60;
    const duracionSlots = Math.ceil(duracionMin / SLOT_MIN);

    const fechaDia = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    const fin = calcularHoraFin(horaDesde, duracionSlots, sucursal, fechaDia);

    const timeoutId = window.setTimeout(() => {
      setHoraHasta(fin);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [horaPreestablecida, horaDesde, servicio, fecha, sucursal]);
  // ── Locales dinámicos ─────────────────────────
  // Usar locales dinámicos, si no hay usar SUCURSALES estático
  const sucursalOptions = useMemo(
    () => {
      if (locales.length > 0) {
        return locales.map(l => ({ value: l.nombre, label: l.nombre }));
      }
      // Fallback a constantes estáticas
      return SUCURSALES.map(s => ({ value: s.value, label: s.label }));
    },
    [locales]
  );

  // ── Semanas ────────────────────────────────────
  const semanasDisponibles = useMemo(() => generarSemanas(6), []);
  const semanaIndex = initialData?.semana
    ? parseInt(initialData.semana, 10)
    : getWeekIndexForDate(fecha, semanasDisponibles);
  const semanaActual = semanasDisponibles[semanaIndex] || semanasDisponibles[0];
  const fechasSemana = useMemo(
    () => {
      if (!semanaActual) return null;
      const fechas = getFechasDeSemana(semanaActual.fechaInicio);
      return fechas;
    },
    [semanaActual],
  );

  const tipo = useMemo(() => {
    const found = servicios.find(s => s.value === servicio);
    if (found) return found.tipoEspacio.toLowerCase() === 'bicicleta' ? 'B' : 'M';
    return getTipoFromServicio(servicio);
  }, [servicio, servicios]);

  // Auto-select first non-past day on mount (default 'LUNES' may be in the past mid-week)
  useEffect(() => {
    if (!initialData?.dia && fechasSemana) {
      for (const [d, info] of fechasSemana) {
        if (!info.esPasado) { setDia(d); break; }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechasSemana]);

  const servicioSeleccionado = useMemo(
    () => servicios.find(s => s.value === servicio) ?? SERVICIOS_DISPONIBLES.find(s => s.value === servicio),
    [servicio, servicios],
  );
  const esTratamientoEspecializado = servicio === 'tratamiento_especializado';
  const requiereAprobacion = servicioSeleccionado?.requiere_evaluacion ?? true;
  const scheduleWarning = useMemo(
    () => getReservationDateRestriction(fecha),
    [fecha],
  );
  const isSundaySelected = getDateDay(fecha) === 0;

  // ── Fetch reservas cuando cambian sucursal o semana ─────────
  useEffect(() => {
    if (sucursal && fecha) {
      fetchReservas({
        local: sucursal,
        fecha,
      });
    }
  }, [sucursal, fecha, fetchReservas]);

  // ── Hours availability ──────────────────────────────────
  // Marcar como 'past' las horas pasadas y 'occupied' las ya reservadas
  const hoursAvailability = useMemo(() => {
    const map = new Map<string, SlotStatus>();

    // 1. Inicializar todos los horarios como 'free'
    for (const hora of HORAS) {
      map.set(hora, 'free');
    }

    // 2. Aplicar reglas de atención por sucursal.
    const selectedDay = getDateDay(fecha);
    if (selectedDay === 0) {
      for (const hora of HORAS) {
        map.set(hora, 'closed');
      }
      return map;
    }

    if (selectedDay === 6) {
      const fechaDia = new Date(`${fecha}T00:00:00`);
      for (const hora of HORAS) {
        if (isSlotOutsideBusinessHours(sucursal, fechaDia, hora)) {
          map.set(hora, 'closed');
        }
      }
    }

    // 3. Marcar horas pasadas
    const fechaDia = fecha ? new Date(`${fecha}T00:00:00`) : null;
    if (fechaDia) {
      const hoy = new Date();
      const hoyMid = new Date(hoy);
      hoyMid.setHours(0, 0, 0, 0);

      const fechaDiaStr = fecha;
      const hoyStr = new Date().toLocaleDateString('en-CA');

      for (const hora of HORAS) {
        const [hh, mm] = hora.split(':').map(Number);
        const slotMin = hh * 60 + mm;
        const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();

        if (map.get(hora) !== 'closed' && (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin < ahoraMin))) {
          map.set(hora, 'past');
        } else if (map.get(hora) !== 'closed' && fechaDia.getTime() < hoyMid.getTime()) {
          map.set(hora, 'past');
        }
      }
    }

    // 4. Marcar horas ocupadas basado en reservasData y capacidad
    if (reservasData?.data?.reservas && fechaDia && sucursal && tipo) {
      const fechaDiaStr = fecha;
      const currentLocal = locales.find(l => l.nombre === sucursal);
      const capacidadMaxima = tipo.toLowerCase() === 'm' || tipo.toLowerCase() === 'mesa' 
        ? (currentLocal?.capacidad_mesas || 3) 
        : (currentLocal?.capacidad_bicis || 2);

      // Filtrar reservas para el día y tipo seleccionado
      const reservasDelDia = reservasData.data.reservas.filter((r: ReservaBD) => {
        const tipoReserva = r.tipo?.toLowerCase();
        const matchesTipo = tipo.toLowerCase() === 'm' 
          ? (tipoReserva === 'm' || tipoReserva === 'mesa')
          : (tipoReserva === 'b' || tipoReserva === 'bicicleta');
        return r.fecha === fechaDiaStr && matchesTipo;
      });

      // Contar reservas por cada slot horario
      const conteoPorHora = new Map<string, number>();

      for (const reserva of reservasDelDia) {
        const idxInicio = HORAS.indexOf(reserva.hora_desde);
        const idxFin = HORAS.indexOf(reserva.hora_hasta);

        if (idxInicio !== -1 && idxFin !== -1) {
          for (let i = idxInicio; i < idxFin; i++) {
            const h = HORAS[i];
            conteoPorHora.set(h, (conteoPorHora.get(h) || 0) + 1);
          }
        } else if (idxInicio !== -1) {
          conteoPorHora.set(reserva.hora_desde, (conteoPorHora.get(reserva.hora_desde) || 0) + 1);
        }
      }

      // Marcar como ocupado solo si se alcanza la capacidad máxima
      for (const [hora, conteo] of conteoPorHora.entries()) {
        if (conteo >= capacidadMaxima && map.get(hora) !== 'past' && map.get(hora) !== 'closed') {
          map.set(hora, 'occupied');
        }
      }
    }

    return map;
  }, [fecha, reservasData, sucursal, tipo, locales]);

  useEffect(() => {
    if (!horaDesde || !fecha) return;

    const fechaDia = new Date(`${fecha}T00:00:00`);
    const selectedStatus = hoursAvailability.get(horaDesde);
    const isOutsideHours = horaHasta
      ? isSlotOutsideBusinessHours(sucursal, fechaDia, horaDesde, horaHasta)
      : selectedStatus === 'closed';

    if (selectedStatus === 'closed' || isOutsideHours) {
      setHoraDesde('');
      setHoraHasta('');
      setSlotWarning('Ese horario no está disponible en la sucursal seleccionada. Elige otro horario.');
    }
  }, [fecha, horaDesde, horaHasta, hoursAvailability, sucursal]);


  // ── Limpiar servicio si cambia sucursal y no aplica ───────────
  useEffect(() => {
    if (sucursal && servicio) {
      const info = servicios.find(s => s.value === servicio) ?? SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
      if (info) {
        const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
        if (info.sucursal !== 'ambos' && info.sucursal !== sucursal && info.sucursal !== normalizedSucursal) {
          const timeoutId = window.setTimeout(() => {
            setServicio('');
            setHoraDesde('');
            setHoraHasta('');
          }, 0);

          return () => window.clearTimeout(timeoutId);
        }
      }
    }
  }, [sucursal, servicio, servicios]);

  // ── Días disponibles ───────────────────────────────────
  const diasDisponibles = useMemo(
    () =>
      DIAS_SEMANA.map(d => {
        const fechaInfo = fechasSemana?.get(d.value);
        return {
          ...d,
          esPasado: fechaInfo ? esFechaPasada(fechaInfo.fecha) : false,
          fecha: fechaInfo || null,
        };
      }),
    [fechasSemana],
  );

  // ── Servicios filtrados por sucursal ───────────────────────────
  const serviciosPorCategoria = useMemo(() => {
    const map: Record<string, typeof servicios> = {};
    for (const s of servicios) {
      if (!map[s.categoria]) map[s.categoria] = [];
      map[s.categoria]!.push(s);
    }
    return map;
  }, [servicios]);

  const serviciosEspecializadosFiltrados = SERVICIOS_ESPECIALIZADOS_DISPONIBLES.filter((s) => {
    const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
    return s.sucursal === 'ambos' || s.sucursal === normalizedSucursal;
  });
  const serviciosEspecializadosPorCategoria = getServiciosAdminPorCategoria(serviciosEspecializadosFiltrados);
  const categoriasEspecializadasDisponibles = CATEGORIAS_ORDEN.filter(
    c => serviciosEspecializadosPorCategoria[c]?.length > 0,
  );

  // ── Select options ─────────────────────────────────────
  const semanaOptions = semanasDisponibles.map((s, idx) => ({
    value: String(idx),
    label: s.titulo,
  }));
  const servicioGroups = useMemo(() => {
    const ordered = CATEGORIAS_ORDEN.filter(c => serviciosPorCategoria[c]?.length > 0);
    const rest = Object.keys(serviciosPorCategoria).filter(
      c => !(CATEGORIAS_ORDEN as readonly string[]).includes(c) && serviciosPorCategoria[c]!.length > 0,
    );
    return [...ordered, ...rest].map(cat => ({
      label: cat,
      options: (serviciosPorCategoria[cat] ?? []).map(s => ({
        value: s.value,
        label: s.label,
        subtitle: [s.duracion, s.costo, s.sesiones > 1 ? `${s.sesiones} sesiones` : '']
          .filter(Boolean).join(' • '),
      })),
    }));
  }, [serviciosPorCategoria]);
  const servicioSolicitadoGroups = categoriasEspecializadasDisponibles.map(cat => ({
    label: cat,
    options: serviciosEspecializadosPorCategoria[cat].map(s => ({
      value: s.value,
      label: `${s.label} — ${s.costo}`,
    })),
  }));

  // ── Handlers ───────────────────────────────────────────
  const handleSemanaChange = (value: string) => {
    const idx = Number(value);
    const nuevasFechas = getFechasDeSemana(semanasDisponibles[idx].fechaInicio);
    for (const [d, info] of nuevasFechas) {
      if (!info.esPasado) {
        setDia(d);
        setFecha(info.fecha.toLocaleDateString('en-CA'));
        break;
      }
    }
    setHoraDesde('');
    setHoraHasta('');
    setSlotWarning(null);
  };

  const handleServicioChange = (value: string) => {
    setServicio(value);
    setServicioSolicitado('');
    // Solo resetear hora si NO fue preestablecida desde el URL
    if (!horaPreestablecida) {
      setHoraDesde('');
      setHoraHasta('');
    }
    setSlotWarning(null);
  };

  const handleDiaChange = (value: DiaSemana) => {
    setDia(value);
    const nuevaFecha = fechasSemana?.get(value)?.fecha;
    if (nuevaFecha) {
      setFecha(nuevaFecha.toLocaleDateString('en-CA'));
    }
    // Solo resetear hora si NO fue preestablecida desde el URL
    if (!horaPreestablecida) {
      setHoraDesde('');
      setHoraHasta('');
    }
    setSlotWarning(null);
  };

  const handleFechaChange = (value: string) => {
    setFecha(value);
    setHoraDesde('');
    setHoraHasta('');
    setSlotWarning(null);
  };

  const handleSlotSelect = (desde: string) => {
    setHoraDesde(desde);

    // Duración por defecto: 1 hora, recortada al cierre del local.
    const fechaDia = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    setHoraHasta(calcularHoraFin(desde, SLOTS_POR_HORA, sucursal, fechaDia));

    setSlotWarning(null);
  };

  // ── Validación y submit ────────────────────────────────
  const validate = (): boolean => {
    const e = validateReservationForm(
      sucursal, fecha, cliente, numeroTelefono, servicio, horaDesde, horaHasta,
      servicioSolicitado,
    );
    // No validar aquí si está ocupado - dejar que el backend lo valide
    // para permitir cambios de último minuto si hay slots disponibles
    if (horaDesde && hoursAvailability.get(horaDesde) === 'past') {
      e.horaDesde = 'No se pueden hacer reservas en horarios pasados';
    } else if (horaDesde && hoursAvailability.get(horaDesde) === 'closed') {
      e.horaDesde = 'Ese horario está fuera de atención';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fechaISO = fecha;
    if (!fechaISO) {
      setError('Error: No se pudo determinar la fecha.');
      return;
    }
    if (!validate()) return;

    setError(null);
    const selectedService = servicios.find(s => s.value === servicio);
    const tipoBackend: 'M' | 'B' = selectedService?.tipoEspacio === 'bicicleta' ? 'B' : getTipoBackendFromServicio(servicio);
    const horaDesdeNorm = normalizarHora(horaDesde);
    const horaHastaNorm = normalizarHora(horaHasta);

    const servicioInfo = selectedService ?? SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
    const servicioSolicitadoInfo = esTratamientoEspecializado
      ? SERVICIOS_ESPECIALIZADOS_DISPONIBLES.find(s => s.value === servicioSolicitado)
      : servicioInfo;
    const servicioLabel = servicioInfo?.label || servicio;
    const phoneDigits = numeroTelefono.replace(/\D/g, '');

      try {
        const payload = {
          local: sucursal,
          fecha: fechaISO,
          hora_desde: horaDesdeNorm,
          hora_hasta: horaHastaNorm,
          tipo: tipoBackend,
          cliente,
          numero_telefono: phoneDigits,
          servicio: servicioLabel,
          servicio_solicitado: servicioSolicitadoInfo?.label || servicioLabel,
          // Toda reserva pública nace PENDIENTE: la valida el staff antes de agendarla.
          servicio_confirmado: null,
          precio: esTratamientoEspecializado ? 0 : servicioInfo?.precio ?? 0,
          notas,
          estado: 'PENDIENTE' as const,
        };

        await crearReserva(payload);
        if (initialData?.isAdmin) {
          toast.success('Reserva enviada. Quedará pendiente de aprobación.');
        }

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(initialData?.isAdmin ? '/atrevida-gestion/reservas' : '/reservas');
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : hookError || 'Error al crear la reserva');
      }
  };
  return {
    // State
    sucursal, setSucursal,
    semanaIndex,
    dia,
    fecha, setFecha,
    horaDesde, horaHasta,
    cliente, setCliente,
    numeroTelefono, setNumeroTelefono,
    notas, setNotas,
    servicio,
    servicioSolicitado, setServicioSolicitado,
    error, errors,
    slotWarning,
    scheduleWarning,
    loading: loading || loadingLocales || loadingServicios,
    // Derived
    hoursAvailability,
    diasDisponibles,
    sucursalOptions,
    semanaOptions,
    servicioGroups,
    servicioSolicitadoGroups,
    servicioSeleccionado,
    esTratamientoEspecializado,
    requiereAprobacion,
    isSundaySelected,
    // Handlers
    handleSemanaChange,
    handleServicioChange,
    handleDiaChange,
    handleFechaChange,
    handleSlotSelect,
    handleSubmit,
  };
}
