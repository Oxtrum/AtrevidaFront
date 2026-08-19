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
import { getPlanByID } from '@/lib/api/planes';
import { validateReservationForm, } from '@/lib/utils/reservationValidation';
import { type SlotStatus, capacidadDeLocal, normalizarHoraSlot } from '@/lib/utils/hoursAvailability';
import { HORAS, DIAS_SEMANA, SLOT_MIN, SLOTS_POR_HORA, calcularHoraFin, tiempoAMinutos, isSlotOutsideBusinessHours } from '@/lib/constants/reservationForm';
import { iniciarSeleccion, modificarFin, puedeAjustarFin, slotsEnRango, formatearDuracion } from '@/lib/utils/slotRange';

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
  // Ciclo de 2 clicks en la rejilla: click de inicio (fija desde + duración
  // del servicio) → click de ajuste (recorta/estira el fin) → vuelve a inicio.
  const [esperandoAjuste, setEsperandoAjuste] = useState(!!(initialData?.hora_desde && initialData?.hora_hasta));
  // Confirmación previa cuando el rango elegido no dura lo que el servicio.
  const [confirmandoDuracion, setConfirmandoDuracion] = useState(false);
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

  /** Slots que ocupa el servicio elegido. 1 hora si no se conoce su duración. */
  const slotsDeServicio = (svc: string): number => {
    const servicioInfo = serviciosAPI.find(s => s.nombre === svc);
    if (!servicioInfo) return SLOTS_POR_HORA;

    // `tiempo` llega como texto humano ('50 min', '1 hora y 30 min').
    const duracionMin = tiempoAMinutos(servicioInfo.tiempo);
    if (duracionMin <= 0) return SLOTS_POR_HORA;
    return Math.ceil(duracionMin / SLOT_MIN);
  };

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

    // 4. Marcar horas sin ambientes libres, con la capacidad real del local
    //    (`espacios[]`, la misma tabla contra la que valida el backend).
    const capacidadMaxima = capacidadDeLocal(locales.find(l => l.nombre === effectiveSucursal), tipo);
    if (reservasData?.data?.reservas && fechaDia && effectiveSucursal && tipo && capacidadMaxima) {
      const fechaDiaStr = fechaDia.toISOString().split('T')[0];

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
        const idxInicio = HORAS.indexOf(normalizarHoraSlot(reserva.hora_desde));
        const idxFin = HORAS.indexOf(normalizarHoraSlot(reserva.hora_hasta));

        if (idxInicio !== -1 && idxFin !== -1) {
          for (let i = idxInicio; i < idxFin; i++) {
            const h = HORAS[i];
            conteoPorHora.set(h, (conteoPorHora.get(h) || 0) + 1);
          }
        } else if (idxInicio !== -1) {
          const h = HORAS[idxInicio];
          conteoPorHora.set(h, (conteoPorHora.get(h) || 0) + 1);
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
      setEsperandoAjuste(false);
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

  /**
   * Datos del diálogo de confirmación. Es `null` mientras el rango elegido
   * dura exactamente lo que el servicio — el caso normal, que no interrumpe.
   * Se compara en bloques de 30 min porque la rejilla no permite otra cosa
   * (un servicio de 50 min ocupa 2 bloques y no cuenta como desajuste).
   */
  const desajusteDuracion = (() => {
    if (!servicio || !horaDesde || !horaHasta) return null;
    const slotsServicio = slotsDeServicio(servicio);
    const slotsElegidos = slotsEnRango(horaDesde, horaHasta);
    if (slotsElegidos <= 0 || slotsElegidos === slotsServicio) return null;
    return {
      horaDesde,
      horaHasta,
      duracionServicio: formatearDuracion(slotsServicio * SLOT_MIN),
      duracionElegida: formatearDuracion(slotsElegidos * SLOT_MIN),
      esMasLargo: slotsElegidos > slotsServicio,
      bloquesDiferencia: Math.abs(slotsElegidos - slotsServicio),
    };
  })();

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
    setEsperandoAjuste(false);
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
      // Ya hay un rango completo (inicio + duración del nuevo servicio): el
      // próximo click en la rejilla es de ajuste, no de inicio.
      setEsperandoAjuste(true);
    }
    setSlotWarning(null);
  };

  const handleDiaChange = (value: DiaSemana) => {
    setDia(value);
    setSlotWarning(null);
  };

  /**
   * Ciclo de 2 clicks: el de inicio fija `horaDesde` y toma automáticamente
   * la duración del servicio; el de ajuste recorta o estira `horaHasta`. Tras
   * el ajuste, el siguiente click vuelve a ser de inicio. Un click que no
   * sirve como ajuste (cae en el inicio o antes) arranca una selección nueva
   * en vez de avisar un error (ver `slotRange.ts`).
   */
  const handleSlotSelect = (hora: string) => {
    const fechaDia = fechasSemana?.get(dia)?.fecha ?? new Date();
    const esSlotLibre = (h: string) => (hoursAvailability.get(h) ?? 'free') === 'free';
    const ajustando = esperandoAjuste && puedeAjustarFin(hora, horaDesde, horaHasta);

    const { desde, hasta } = ajustando
      ? modificarFin({
        hora, horaDesde, horaHasta,
        local: effectiveSucursal, fecha: fechaDia, esSlotLibre,
      })
      : iniciarSeleccion(hora, slotsDeServicio(servicio), effectiveSucursal, fechaDia, esSlotLibre);

    setEsperandoAjuste(!ajustando);
    setHoraDesde(desde);
    setHoraHasta(hasta);
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
      // Los errores van también al toast: el aviso del tope del formulario
      // queda fuera de pantalla cuando el staff está abajo completando datos.
      setError('Error: No se pudo determinar la fecha.');
      toast.error('No se pudo determinar la fecha. Elige de nuevo el día.');
      return;
    }
    if (!validate()) {
      toast.error('Faltan datos o hay campos con error. Revisa los marcados en rojo.');
      return;
    }

    // Revalidar paquete antes de enviar (#C + #F capa 2)
    if (planId != null && effectiveSucursal) {
      try {
		const planRes = await getPlanByID(planId);
        const plan = planRes?.data?.plan;
        const normalizar = (value: string | undefined) => (value ?? '').trim().toLocaleUpperCase('es-BO');
        const planValido = plan
          && plan.id === planId
          && plan.estado === 'ACTIVO'
          && plan.activo !== false
          && plan.sesiones_usadas < plan.sesiones_totales
          && normalizar(plan.cliente_nombre_texto || plan.cliente) === normalizar(cliente)
          && normalizar(plan.local_nombre_texto) === normalizar(effectiveSucursal);
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

    // Si el rango elegido no coincide con la duración del servicio, confirmar
    // antes de escribir: bloquear franjas de más deja ambientes inutilizables.
    if (desajusteDuracion) {
      setConfirmandoDuracion(true);
      return;
    }

    await enviarReserva(fechaISO);
  };

  const enviarReserva = async (fechaISO: string) => {
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
        const mensaje = err instanceof Error ? err.message : hookError || 'Error al crear la reserva';
        setError(mensaje);
        toast.error(mensaje);
      } finally {
        setConfirmandoDuracion(false);
      }
  };

  /** El staff aceptó el rango tal como lo dejó: recién ahí se escribe. */
  const confirmarDuracion = () => {
    const fechaISO = fechasSemana?.get(dia)?.fecha?.toISOString().split('T')[0] ?? '';
    if (!fechaISO) {
      setConfirmandoDuracion(false);
      toast.error('No se pudo determinar la fecha. Elige de nuevo el día.');
      return;
    }
    void enviarReserva(fechaISO);
  };

  /** Cerrar sin reservar: el formulario queda intacto para corregir el horario. */
  const cancelarConfirmacionDuracion = () => setConfirmandoDuracion(false);

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
    esperandoAjuste,
    confirmandoDuracion,
    desajusteDuracion,
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
    confirmarDuracion,
    cancelarConfirmacionDuracion,
  };
}
