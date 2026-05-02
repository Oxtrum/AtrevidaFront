'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DiaSemana, SUCURSALES, SERVICIOS_DISPONIBLES,
  getServiciosPorSucursal, getServiciosPorCategoria, getTipoFromServicio,
  generarSemanas, getFechasDeSemana, esFechaPasada,
} from '@/types/reserva';
import { useCrearReserva } from '@/lib/hooks/useCrearReserva';
import { useReservas } from '@/lib/hooks/useReservas';
import { validateReservationForm, buildReservaPayload } from '@/lib/utils/reservationValidation';
import { buildHoursAvailability, type SlotStatus } from '@/lib/utils/hoursAvailability';
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
  const { data: disponibilidadData, fetch: fetchDisponibilidad } = useReservas();

  // ── State ──────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slotWarning, setSlotWarning] = useState<string | null>(null);

  const [sucursal, setSucursal] = useState(initialData?.local || '');
  const [semanaIndex, setSemanaIndex] = useState(0);
  const [dia, setDia] = useState<DiaSemana>(initialData?.dia || 'LUNES');
  const [horaDesde, setHoraDesde] = useState(initialData?.hora_desde || '');
  const [horaHasta, setHoraHasta] = useState(initialData?.hora_hasta || '');
  const [cliente, setCliente] = useState('');
  const [servicio, setServicio] = useState(initialData?.servicio || '');

  // ── Semanas ────────────────────────────────────────────────────
  const semanasDisponibles = useMemo(() => generarSemanas(6), []);
  const semanaActual = semanasDisponibles[semanaIndex];
  const fechasSemana = useMemo(
    () => (semanaActual ? getFechasDeSemana(semanaActual.fechaInicio) : null),
    [semanaActual],
  );

  const tipoRequerido = getTipoFromServicio(servicio);

  // ── Fetch disponibilidad ───────────────────────────────────────
  useEffect(() => {
    if (sucursal) fetchDisponibilidad({ local: sucursal, semana: semanaIndex + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursal, semanaIndex]);

  // ── hoursAvailability ──────────────────────────────────────────
  const hoursAvailability = useMemo(() => {
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? null;
    return buildHoursAvailability({
      disponibilidadData,
      dia,
      tipoRequerido: servicio ? tipoRequerido : '',
      fechaDia,
      semanaTitulo: semanaActual.titulo,
    });
  }, [disponibilidadData, dia, tipoRequerido, servicio, fechasSemana, semanaActual]);

  // ── Limpiar slot si ya no es válido ───────────────────────────
  useEffect(() => {
    if (!horaDesde) { setSlotWarning(null); return; }
    const status = hoursAvailability.get(horaDesde);
    if (status !== 'free') {
      const motivo =
        status === 'unavailable' ? 'no hay puestos de ese tipo'
          : status === 'full' ? 'está completamente ocupado'
            : 'ya pasó';
      setSlotWarning(
        `El horario ${horaDesde} fue eliminado porque ${motivo} para el servicio seleccionado.`,
      );
      setHoraDesde('');
      setHoraHasta('');
    } else {
      setSlotWarning(null);
    }
  }, [hoursAvailability, horaDesde]);

  // ── Limpiar servicio si cambia sucursal y no aplica ───────────
  useEffect(() => {
    if (sucursal && servicio) {
      const info = SERVICIOS_DISPONIBLES.find(s => s.value === servicio);
      if (info) {
        const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
        if (info.sucursal !== 'ambos' && info.sucursal !== normalizedSucursal) {
          setServicio('');
          setHoraDesde('');
          setHoraHasta('');
        }
      }
    }
  }, [sucursal, servicio]);

  // ── Días disponibles ───────────────────────────────────────────
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

  // ── Select options ─────────────────────────────────────────────
  const sucursalOptions = SUCURSALES.map(s => ({ value: s.value, label: s.label }));
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

  // ── Handlers ───────────────────────────────────────────────────
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
    setHoraHasta(hasta);
    setSlotWarning(null);
  };

  // ── Validación y submit ────────────────────────────────────────
  const validate = (): boolean => {
    const e = validateReservationForm(
      sucursal, semanaActual, cliente, servicio, horaDesde, horaHasta,
    );
    if (horaDesde && hoursAvailability.get(horaDesde) !== 'free') {
      e.horaDesde = 'El horario seleccionado ya no está disponible';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    const tipo = getTipoFromServicio(servicio);
    const semanaTitulo = semanaActual.titulo.replace(/\b(\d)\b/g, '0$1');
    const payload = buildReservaPayload(
      sucursal, semanaTitulo, dia, horaDesde, horaHasta, tipo, cliente, servicio,
    );
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
    loading,
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