'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DiaSemana, SUCURSALES,
  generarSemanas, getFechasDeSemana, esFechaPasada,
  type ReservaBD,
} from '@/types/reserva';
import { useCrearReserva } from '@/lib/hooks/useCrearReserva';
import { useReservas } from '@/lib/hooks/useReservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { getServiciosDB } from '@/lib/api/servicios';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { toast } from '../Shared/Toast';
import { getPlanesDB } from '@/lib/api/planes';
import { validateReservationForm, } from '@/lib/utils/reservationValidation';
import { type SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS, DIAS_SEMANA, SLOT_MIN, SLOTS_POR_HORA, calcularHoraFin, tiempoAMinutos, isSlotOutsideBusinessHours } from '@/lib/constants/reservationForm';

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
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
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
  const effectiveSucursal = scopedLocalName || (adminLocalScope.ready ? sucursal : '');
  const [semanaIndex, setSemanaIndex] = useState(initialData?.semana ? parseInt(initialData.semana, 10) : 0);
  const [dia, setDia] = useState<DiaSemana>(initialData?.dia || 'LUNES');
  const [horaDesde, setHoraDesde] = useState(normalizarHora(initialData?.hora_desde || ''));
  const [horaHasta, setHoraHasta] = useState(normalizarHora(initialData?.hora_hasta || ''));
  const [cliente, setCliente] = useState('');
  const [numeroTelefono, setNumeroTelefono] = useState('');
  const [servicio, setServicio] = useState(initialData?.servicio || '');
  const [notas, setNotas] = useState('');
  const [planId, setPlanId] = useState<number | null>(null);
  // Por defecto el staff agenda directamente (AGENDADO): en la mayoría de casos
  // la reserva creada desde el panel ya está confirmada. Desactivar el toggle la
  // envía a aprobación (PENDIENTE).
  const [agendarDirecto, setAgendarDirecto] = useState(true);
  const [serviciosAPI, setServiciosAPI] = useState<Array<{ nombre: string; categoria: string; tipoEspacio: string; costo: string; tiempo: string; requiere_evaluacion: boolean }>>([]);

  const calcularHoraHasta = (desde: string, svc: string): string => {
    const servicioInfo = serviciosAPI.find(s => s.nombre === svc);
    if (!servicioInfo) return '';

    // `tiempo` llega como texto humano ('50 min', '1 hora y 30 min').
    const duracionMin = tiempoAMinutos(servicioInfo.tiempo);
    if (duracionMin <= 0) return '';

    const duracionSlots = Math.ceil(duracionMin / SLOT_MIN);
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? new Date();
    return calcularHoraFin(desde, duracionSlots, effectiveSucursal, fechaDia);
  };
  // ── Locales dinámicos ─────────────────────────
  // Usar locales dinámicos, si no hay usar SUCURSALES estático
  const sucursalOptions = useMemo(
    () => {
      if (!adminLocalScope.ready) {
        return [{ value: '', label: 'Cargando local...' }];
      }

      if (scopedLocalName) {
        return [{ value: scopedLocalName, label: scopedLocalName }];
      }

      if (locales.length > 0) {
        return locales.map(l => ({ value: l.nombre, label: l.nombre }));
      }
      // Fallback a constantes estáticas
      return SUCURSALES.map(s => ({ value: s.value, label: s.label }));
    },
    [adminLocalScope.ready, locales, scopedLocalName]
  );

  const setScopedSucursal = useCallback((value: string) => {
    setSucursal(scopedLocalName || value);
  }, [scopedLocalName]);

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

  const tipo = useMemo(() => {
    const svc = serviciosAPI.find(s => s.nombre === servicio);
    return svc?.tipoEspacio || 'M';
  }, [servicio, serviciosAPI]);

  // Auto-select first non-past day on mount (default 'LUNES' may be in the past mid-week)
  useEffect(() => {
    if (!initialData?.dia && fechasSemana) {
      for (const [d, info] of fechasSemana) {
        if (!info.esPasado) { setDia(d); break; }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechasSemana]);

  // ── Fetch reservas cuando cambian sucursal o semana ─────────
  useEffect(() => {
    if (effectiveSucursal && semanaActual) {
      const fechaInicio = new Date(semanaActual.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 5); // Lunes a Sábado

      const fechaDesdeStr = fechaInicio.toISOString().split('T')[0];
      const fechaHastaStr = fechaFin.toISOString().split('T')[0];

      fetchReservas({
        local: effectiveSucursal,
        semana: semanaIndex + 1,
        fecha_desde: fechaDesdeStr,
        fecha_hasta: fechaHastaStr
      });
    }
  }, [effectiveSucursal, semanaIndex, semanaActual, fetchReservas]);

  // ── Hours availability ──────────────────────────────────
  // Marcar como 'past' las horas pasadas y 'occupied' las ya reservadas
  const hoursAvailability = useMemo(() => {
    const map = new Map<string, SlotStatus>();

    // 1. Inicializar todos los horarios como 'free'
    for (const hora of HORAS) {
      map.set(hora, 'free');
    }

    // 2. Aplicar reglas de atención por sucursal
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? null;
    if (fechaDia) {
      for (const hora of HORAS) {
        if (isSlotOutsideBusinessHours(effectiveSucursal, fechaDia, hora)) {
          map.set(hora, 'closed');
        }
      }
    }

    // 3. Marcar horas pasadas
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

        if (map.get(hora) !== 'closed' && (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin < ahoraMin))) {
          map.set(hora, 'past');
        } else if (map.get(hora) !== 'closed' && fechaDia.getTime() < hoyMid.getTime()) {
          map.set(hora, 'past');
        }
      }
    }

    // 4. Marcar horas ocupadas basado en reservasData y capacidad
    if (reservasData?.data?.reservas && fechaDia && effectiveSucursal && tipo) {
      const fechaDiaStr = fechaDia.toISOString().split('T')[0];
      const currentLocal = locales.find(l => l.nombre === effectiveSucursal);
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
  }, [dia, effectiveSucursal, fechasSemana, reservasData, tipo, locales]);

  useEffect(() => {
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? null;
    if (!horaDesde || !fechaDia) return;

    const selectedStatus = hoursAvailability.get(horaDesde);
    const isOutsideHours = horaHasta
      ? isSlotOutsideBusinessHours(effectiveSucursal, fechaDia, horaDesde, horaHasta)
      : selectedStatus === 'closed';

    if (selectedStatus === 'closed' || isOutsideHours) {
      setHoraDesde('');
      setHoraHasta('');
      setSlotWarning('Ese horario no está disponible en la sucursal seleccionada. Elige otro horario.');
    }
  }, [dia, effectiveSucursal, fechasSemana, horaDesde, horaHasta, hoursAvailability]);


  // ── Fetch servicios desde API cuando cambia sucursal ───────────
  useEffect(() => {
    if (!effectiveSucursal) { setServiciosAPI([]); return; }
    let cancelled = false;
    const fetchSvc = async () => {
      try {
        const res = await getServiciosDB({ local: effectiveSucursal }) as { data?: { servicios?: typeof serviciosAPI } };
        if (!cancelled) setServiciosAPI(res?.data?.servicios ?? []);
      } catch {
        if (!cancelled) setServiciosAPI([]);
      }
    };
    fetchSvc();
    return () => { cancelled = true; };
  }, [effectiveSucursal]);

  // ── Limpiar servicio si cambia sucursal (nuevo local puede no tener ese servicio) ───────────
  useEffect(() => {
    if (effectiveSucursal && servicio && serviciosAPI.length > 0) {
      if (!serviciosAPI.some(s => s.nombre === servicio)) {
        setServicio('');
      }
    }
  }, [effectiveSucursal, servicio, serviciosAPI]);

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

  // ── Select options ─────────────────────────────────────
  const semanaOptions = semanasDisponibles.map((s, idx) => ({
    value: String(idx),
    label: s.titulo,
  }));
  const servicioGroups = useMemo(() => {
    const byCategory = new Map<string, Array<{ value: string; label: string }>>();
    for (const s of serviciosAPI) {
      const cat = s.categoria || 'Otros';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push({
        value: s.nombre,
        label: `${s.nombre} — ${s.tiempo || ''} — Bs ${s.costo || 0}`,
      });
    }
    return Array.from(byCategory.entries()).map(([label, options]) => ({ label, options }));
  }, [serviciosAPI]);

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
    if (horaDesde) {
      // `calcularHoraHasta` devuelve '' si el servicio no está en el catálogo o
      // si su `tiempo` (texto libre) no parsea. Sin el fallback quedaría pegada
      // la horaHasta del servicio anterior: se cae a 1 hora, igual que
      // `handleSlotSelect`.
      const hasta = calcularHoraHasta(horaDesde, value);
      const fechaDia = fechasSemana?.get(dia)?.fecha ?? new Date();
      setHoraHasta(hasta || calcularHoraFin(horaDesde, SLOTS_POR_HORA, effectiveSucursal, fechaDia));
    }
    setSlotWarning(null);
  };

  const handleDiaChange = (value: DiaSemana) => {
    setDia(value);
    setSlotWarning(null);
  };

  const handleSlotSelect = (desde: string) => {
    setHoraDesde(desde);

    if (servicio) {
      const hasta = calcularHoraHasta(desde, servicio);
      if (hasta) {
        setHoraHasta(hasta);
        setSlotWarning(null);
        return;
      }
    }

    // Sin servicio elegido: duración por defecto de 1 hora, recortada al cierre.
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? new Date();
    setHoraHasta(calcularHoraFin(desde, SLOTS_POR_HORA, effectiveSucursal, fechaDia));
    setSlotWarning(null);
  };

  // ── Validación y submit ────────────────────────────────
  const validate = (): boolean => {
    const e = validateReservationForm(
      effectiveSucursal,
      fechasSemana?.get(dia)?.fecha.toISOString().split('T')[0] || '',
      cliente,
      numeroTelefono,
      servicio,
      horaDesde,
      horaHasta,
      undefined,
      true, // admin can book any time slot
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

    const fechaDia = fechasSemana?.get(dia)?.fecha;
    const fechaISO = fechaDia ? fechaDia.toISOString().split('T')[0] : '';
    if (!fechaISO) {
      setError('Error: No se pudo determinar la fecha.');
      return;
    }
    if (!validate()) return;

    // Revalidar paquete antes de enviar (#C + #F capa 2)
    if (planId != null && effectiveSucursal) {
      try {
        const planRes = await getPlanesDB({ cliente, estado: 'ACTIVO', local: effectiveSucursal });
        const planData = planRes as { data?: { planes?: { id: number }[] } };
        const planValido = (planData?.data?.planes ?? []).find((p) => p.id === planId);
        if (!planValido) {
          toast.error('El paquete ya no es válido para esta sucursal.');
          setPlanId(null);
          return;
        }
      } catch {
        toast.error('No se pudo verificar el paquete. Intenta de nuevo.');
        return;
      }
    }

    setError(null);
    const horaDesdeNorm = normalizarHora(horaDesde);
    const horaHastaNorm = normalizarHora(horaHasta);

      try {
        const servicioInfo = serviciosAPI.find(s => s.nombre === servicio);
        const tipoBody = (servicioInfo?.tipoEspacio === 'B' ? 'B' : 'M') as 'M' | 'B';
        const payload = {
          local: effectiveSucursal,
          fecha: fechaISO,
          hora_desde: horaDesdeNorm,
          hora_hasta: horaHastaNorm,
          tipo: tipoBody,
          cliente,
          numero_telefono: numeroTelefono.replace(/\D/g, ''),
          servicio,
          servicio_solicitado: servicio,
          servicio_confirmado: agendarDirecto ? servicio : null,
          precio: servicioInfo ? Number(servicioInfo.costo) || 0 : 0,
          notas: notas || undefined,
          plan_id: planId ?? undefined,
          estado: agendarDirecto ? 'AGENDADO' as const : 'PENDIENTE' as const,
        };

        await crearReserva(payload);
        toast.success(
          agendarDirecto
            ? '¡Reserva agendada con éxito!'
            : 'Reserva registrada. Quedará pendiente de aprobación.',
        );

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
    sucursal: effectiveSucursal, setSucursal: setScopedSucursal,
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
