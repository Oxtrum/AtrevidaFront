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
  const [sucursal, setSucursal] = useState(initialData?.local || SUCURSALES[0]?.value || 'SAN MARTIN');
  const [semanaIndex, setSemanaIndex] = useState(0);
  const [dia, setDia] = useState<DiaSemana>(initialData?.dia || 'LUNES');
  const [horaDesde, setHoraDesde] = useState(initialData?.hora_desde || '');
  const [horaHasta, setHoraHasta] = useState(initialData?.hora_hasta || '');
  const [cliente, setCliente] = useState('');
  const [servicio, setServicio] = useState(initialData?.servicio || '');

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
  // SIEMPRE mostrar 8:00-20:00, marcar ocupados si hay datos
  const hoursAvailability = useMemo(() => {
    console.log('>>> useMemo ejecutado, reservasData:', reservasData);
    const map = new Map<string, SlotStatus>();

    // 1. Inicializar todos los horarios como 'free'
    for (const hora of HORAS) {
      // Verificar si ya pasó
      const fechaDia = fechasSemana?.get(dia)?.fecha ?? null;
      if (fechaDia && esFechaPasada(fechaDia)) {
        const hoy = new Date();
        const [hh, mm] = hora.split(':').map(Number);
        const slotMin = hh * 60 + mm;
        const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();
        const hoyMid = new Date(hoy);
        hoyMid.setHours(0, 0, 0, 0);

        const fechaDiaStr = fechaDia.toISOString().split('T')[0];
        const hoyStr = new Date().toLocaleDateString('en-CA'); // "2026-05-04"

        if (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin <= ahoraMin)) {
          map.set(hora, 'past');
          continue;
        }

        if (fechaDia.getTime() === hoyMid.getTime() && slotMin <= ahoraMin) {
          map.set(hora, 'past');
          continue;
        } else if (fechaDia.getTime() < hoyMid.getTime()) {
          map.set(hora, 'past');
          continue;
        }
      }
      map.set(hora, 'free');
    }

    // 2. Si hay datos del backend, marcar ocupados
    // El backend devuelve: { data: { reservas: ReservaBD[], total } }
    console.log('hoursAvailability - reservasData:', reservasData);
    console.log('hoursAvailability - dia:', dia);
    console.log('hoursAvailability - fechasSemana:', fechasSemana);

    if (reservasData?.data?.reservas && fechasSemana) {
      const fechaDia = fechasSemana.get(dia)?.fecha;
      if (fechaDia) {
        const fechaStr = fechaDia.toISOString().split('T')[0];
        const reservas = reservasData.data.reservas as unknown as ReservaBD[];
        const tipoServicio = getTipoFromServicio(servicio).toLowerCase(); // 'm' o 'b'

        for (const reserva of reservas) {
          if (reserva.fecha?.slice(0, 10) !== fechaStr) continue;

          const tipoReserva = normalizeTipo(reserva.tipo); // 'm' o 'b'

          // Solo bloquear si el tipo de reserva coincide con el tipo del servicio
          // O si no hay servicio seleccionado, bloquear todo
          const debeBloquear = !servicio || tipoReserva === tipoServicio;
          if (!debeBloquear) continue;

          const horaInicio = reserva.hora_desde?.slice(0, 5);
          const horaFin = reserva.hora_hasta?.slice(0, 5);
          if (!horaInicio) continue;

          const idxInicio = HORAS.indexOf(horaInicio);
          const idxFin = horaFin ? HORAS.indexOf(horaFin) : idxInicio;
          const idxFinSafe = idxFin === -1 ? idxInicio : idxFin;

          for (let i = idxInicio; i <= idxFinSafe && i < HORAS.length; i++) {
            map.set(HORAS[i], 'occupied');
          }
        }
      }
    }
    console.log('Map final:', Array.from(map.entries()));
    return map;
  }, [reservasData, dia, fechasSemana, servicio]);


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
    setHoraDesde('');
    setHoraHasta('');
    setSlotWarning(null);
  };

  const handleDiaChange = (value: DiaSemana) => {
    setDia(value);
    setHoraDesde('');
    setHoraHasta('');
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
    if (horaDesde && hoursAvailability.get(horaDesde) === 'occupied') {
      e.horaDesde = 'El horario seleccionado ya no está disponible';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Calcular fechaISO - requerido para BD
    const fechaDia = fechasSemana?.get(dia)?.fecha;
    const fechaISO = fechaDia ? fechaDia.toISOString().split('T')[0] : '';

    if (!fechaISO) {
      setError('Error: No se pudo determinar la fecha. Selecciona una semana y día válidos.');
      return;
    }

    if (!validate()) return;

    setError(null);
    const tipo = getTipoFromServicio(servicio); // Returns 'M' or 'B'

    // Payload para BD
    const payload = {
      local: sucursal,
      fecha: fechaISO,
      hora_desde: horaDesde,
      hora_hasta: horaHasta,
      tipo,
      cliente,
      servicio,
    };

    try {
      await crearReserva(payload);
      if (onSuccess) { onSuccess(); } else { router.push('/reservas'); }
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
