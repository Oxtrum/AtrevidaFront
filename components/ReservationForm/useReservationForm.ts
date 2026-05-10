'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DiaSemana, SERVICIOS_DISPONIBLES, SUCURSALES,
  getServiciosPorSucursal, getServiciosPorCategoria, getTipoFromServicio,
  generarSemanas, getFechasDeSemana, esFechaPasada,
  type ReservaBD, normalizeTipo
} from '@/types/reserva';
import { useCrearReserva } from '@/lib/hooks/useCrearReserva';
import { useReservas } from '@/lib/hooks/useReservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { validateReservationForm, } from '@/lib/utils/reservationValidation';
import { type SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS, DIAS_SEMANA } from '@/lib/constants/reservationForm';
import { CATEGORIAS_ORDEN } from './constants';

export interface ReservationFormInitialData {
  local?: string;
  semana?: string;
  dia?: DiaSemana;
  hora_desde?: string;
  hora_hasta?: string;
  servicio?: string;
  isAdmin?: boolean;
}

export function useReservationForm(
  initialData?: ReservationFormInitialData,
  onSuccess?: () => void,
) {
  const router = useRouter();
  const { loading, error: hookError, crearReserva } = useCrearReserva();
  const { data: reservasData, fetch: fetchReservas } = useReservas();
  const { locales, loading: loadingLocales } = useLocales();
  console.log('>>> RENDER reservasData:', reservasData?.data?.reservas?.length ?? 'null');
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
  const [sucursal, setSucursal] = useState(initialData?.local || SUCURSALES[0]?.value || 'SAN MARTIN');
  const [semanaIndex, setSemanaIndex] = useState(initialData?.semana ? parseInt(initialData.semana, 10) : 0);
  const [dia, setDia] = useState<DiaSemana>(initialData?.dia || 'LUNES');
  const [horaDesde, setHoraDesde] = useState(normalizarHora(initialData?.hora_desde || ''));
  const [horaHasta, setHoraHasta] = useState(normalizarHora(initialData?.hora_hasta || ''));
  const [cliente, setCliente] = useState('');
  const [servicio, setServicio] = useState(initialData?.servicio || '');
  const [horaPreestablecida] = useState(!!initialData?.hora_desde); // Marca si hora vino del URL

  // Calcular horaHasta cuando hora viene del URL y se selecciona servicio
  useEffect(() => {
    if (!horaPreestablecida || !horaDesde || !servicio) return;

    const servicioInfo = SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
    if (!servicioInfo) return;

    const match = servicioInfo.duracion.match(/(\d+)/);
    const duracionMin = match ? parseInt(match[1]) : 60;
    const duracionSlots = Math.ceil(duracionMin / 30);

    const idxInicio = HORAS.indexOf(horaDesde);
    if (idxInicio !== -1) {
      const idxFin = Math.min(idxInicio + duracionSlots, HORAS.length - 1);
      const timeoutId = window.setTimeout(() => {
        setHoraHasta(HORAS[idxFin]);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [horaPreestablecida, horaDesde, servicio]);
  useEffect(() => {
    console.log('>>> useReservationForm MONTADO');
    return () => console.log('>>> useReservationForm DESMONTADO');
  }, []);
  useEffect(() => {
    console.log('>>> reservasData cambió:', reservasData);
  }, [reservasData]);
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
  const semanaActual = semanasDisponibles[semanaIndex] || semanasDisponibles[0];
  const fechasSemana = useMemo(
    () => {
      if (!semanaActual) return null;
      const fechas = getFechasDeSemana(semanaActual.fechaInicio);
      return fechas;
    },
    [semanaActual],
  );


  // ── Fetch reservas cuando cambian sucursal o semana ─────────
  useEffect(() => {
    if (sucursal && semanaActual) {
      const fechaInicio = new Date(semanaActual.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 5); // Lunes a Sábado

      const fechaDesdeStr = fechaInicio.toISOString().split('T')[0];
      const fechaHastaStr = fechaFin.toISOString().split('T')[0];

      console.log('Fetching reservas:', { local: sucursal, fecha_desde: fechaDesdeStr, fecha_hasta: fechaHastaStr });

      fetchReservas({
        local: sucursal,
        semana: semanaIndex + 1,
        fecha_desde: fechaDesdeStr,
        fecha_hasta: fechaHastaStr
      });
    }
  }, [sucursal, semanaIndex, semanaActual, fetchReservas]);

  // ── Hours availability ──────────────────────────────────
  // Marcar como 'past' las horas pasadas y 'occupied' las ya reservadas
  const hoursAvailability = useMemo(() => {
    const map = new Map<string, SlotStatus>();

    // 1. Inicializar todos los horarios como 'free'
    for (const hora of HORAS) {
      map.set(hora, 'free');
    }

    // 2. Marcar horas pasadas
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? null;
    if (fechaDia) {
      const hoy = new Date();
      const hoyMid = new Date(hoy);
      hoyMid.setHours(0, 0, 0, 0);

      const fechaDiaStr = fechaDia.toISOString().split('T')[0];
      const hoyStr = new Date().toLocaleDateString('en-CA');

      for (const hora of HORAS) {
        const [hh, mm] = hora.split(':').map(Number);
        const slotMin = hh * 60 + mm;
        const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();

        if (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin < ahoraMin)) {
          map.set(hora, 'past');
        } else if (fechaDia.getTime() < hoyMid.getTime()) {
          map.set(hora, 'past');
        }
      }
    }

    // 3. Marcar horas ocupadas basado en reservasData
    if (reservasData?.data?.reservas && fechaDia) {
      const fechaDiaStr = fechaDia.toISOString().split('T')[0];

      // Filtrar reservas para el día seleccionado
      const reservasDelDia = reservasData.data.reservas.filter((r: any) => {
        return r.fecha === fechaDiaStr;
      });

      // Marcar cada hora ocupada
      for (const reserva of reservasDelDia) {
        const horaInicio = reserva.hora_desde;
        const horaFin = reserva.hora_hasta;

        // Marcar todos los slots entre hora_desde y hora_hasta como ocupados
        const idxInicio = HORAS.indexOf(horaInicio);
        const idxFin = HORAS.indexOf(horaFin);

        if (idxInicio !== -1 && idxFin !== -1) {
          for (let i = idxInicio; i < idxFin; i++) {
            const horaActual = HORAS[i];
            // Solo marcar como occupied si no es 'past'
            if (map.get(horaActual) !== 'past') {
              map.set(horaActual, 'occupied');
            }
          }
        } else if (idxInicio !== -1) {
          // Si solo tenemos hora_inicio
          if (map.get(horaInicio) !== 'past') {
            map.set(horaInicio, 'occupied');
          }
        }
      }
    }

    return map;
  }, [dia, fechasSemana, reservasData]);


  // ── Limpiar servicio si cambia sucursal y no aplica ───────────
  useEffect(() => {
    if (sucursal && servicio) {
      const info = SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
      if (info) {
        const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
        if (info.sucursal !== 'ambos' && info.sucursal !== normalizedSucursal) {
          const timeoutId = window.setTimeout(() => {
            setServicio('');
            setHoraDesde('');
            setHoraHasta('');
          }, 0);

          return () => window.clearTimeout(timeoutId);
        }
      }
    }
  }, [sucursal, servicio]);

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
  const serviciosFiltrados = getServiciosPorSucursal(sucursal);
  const serviciosPorCategoria = getServiciosPorCategoria(serviciosFiltrados);
  const categoriasDisponibles = CATEGORIAS_ORDEN.filter(
    c => serviciosPorCategoria[c]?.length > 0,
  );

  // ── Select options ─────────────────────────────────────
  const semanaOptions = semanasDisponibles.map((s, idx) => ({
    value: String(idx),
    label: s.titulo,
  }));
  const servicioGroups = categoriasDisponibles.map(cat => ({
    label: cat,
    options: serviciosPorCategoria[cat].map(s => ({
      value: s.value,
      label: `${s.label} — ${s.duracion} — ${s.costo}`,
    })),
  }));

  // ── Handlers ───────────────────────────────────────────
  const handleSemanaChange = (value: string) => {
    const idx = Number(value);
    setSemanaIndex(idx);
    const nuevasFechas = getFechasDeSemana(semanasDisponibles[idx].fechaInicio);
    for (const [d, info] of nuevasFechas) {
      if (!info.esPasado) { setDia(d); break; }
    }
    setHoraDesde('');
    setHoraHasta('');
    setSlotWarning(null);
  };

  const handleServicioChange = (value: string) => {
    setServicio(value);
    // Solo resetear hora si NO fue preestablecida desde el URL
    if (!horaPreestablecida) {
      setHoraDesde('');
      setHoraHasta('');
    }
    setSlotWarning(null);
  };

  const handleDiaChange = (value: DiaSemana) => {
    setDia(value);
    // Solo resetear hora si NO fue preestablecida desde el URL
    if (!horaPreestablecida) {
      setHoraDesde('');
      setHoraHasta('');
    }
    setSlotWarning(null);
  };

  const handleSlotSelect = (desde: string, hasta: string) => {
    setHoraDesde(desde);

    // Auto-calcular hora fin basado en duración del servicio
    if (servicio) {
      const servicioInfo = SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
      if (servicioInfo) {
        const match = servicioInfo.duracion.match(/(\d+)/);
        const duracionMin = match ? parseInt(match[1]) : 60;
        const duracionSlots = Math.ceil(duracionMin / 30); // 30 min por slot

        const idxInicio = HORAS.indexOf(desde);
        if (idxInicio !== -1) {
          const idxFin = Math.min(idxInicio + duracionSlots, HORAS.length - 1);
          setHoraHasta(HORAS[idxFin]);
        }
      }
    } else {
      setHoraHasta(hasta);
    }

    setSlotWarning(null);
  };

  // ── Validación y submit ────────────────────────────────
  const validate = (): boolean => {
    const e = validateReservationForm(
      sucursal, semanaActual, cliente, servicio, horaDesde, horaHasta,
    );
    // No validar aquí si está ocupado - dejar que el backend lo valide
    // para permitir cambios de último minuto si hay slots disponibles
    if (horaDesde && hoursAvailability.get(horaDesde) === 'past') {
      e.horaDesde = 'No se pueden hacer reservas en horarios pasados';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fechaDia = fechasSemana?.get(dia)?.fecha;
    const fechaISO = fechaDia ? fechaDia.toISOString().split('T')[0] : '';
    if (!fechaISO) {
      setError('Error: No se pudo determinar la fecha.');
      return;
    }
    if (!validate()) return;

    setError(null);
    const tipo = getTipoFromServicio(servicio);
    const horaDesdeNorm = normalizarHora(horaDesde);
    const horaHastaNorm = normalizarHora(horaHasta);

    // Generar slots de 30 min entre horaDesde y horaHasta
    const generarSlots = (desde: string, hasta: string) => {
      const slots: { hora_desde: string; hora_hasta: string }[] = [];
      const idxInicio = HORAS.indexOf(desde);
      const idxFin = HORAS.indexOf(hasta);

      if (idxInicio === -1 || idxFin === -1) {
        // Fallback: enviar como un solo slot
        return [{ hora_desde: desde, hora_hasta: hasta }];
      }

      for (let i = idxInicio; i < idxFin; i++) {
        slots.push({
          hora_desde: HORAS[i],
          hora_hasta: HORAS[i + 1],
        });
      }
      return slots;
    };

      try {
        await crearReserva({
          local: sucursal,
          fecha: fechaISO,
          hora_desde: horaDesdeNorm,
          hora_hasta: horaHastaNorm,
          tipo,
          cliente,
          servicio,
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(initialData?.isAdmin ? '/admin/reservas' : '/reservas');
        }
        router.refresh();
      } catch {
        setError(hookError || 'Error al crear la reserva');
      }
  };
  return {
    // State
    sucursal, setSucursal,
    semanaIndex,
    dia,
    horaDesde, horaHasta,
    cliente, setCliente,
    servicio,
    error, errors,
    slotWarning,
    loading: loading || loadingLocales,
    // Derived
    hoursAvailability,
    diasDisponibles,
    sucursalOptions,
    semanaOptions,
    servicioGroups,
    // Handlers
    handleSemanaChange,
    handleServicioChange,
    handleDiaChange,
    handleSlotSelect,
    handleSubmit,
  };
}
