'use client';

import { useState } from 'react';
import { Gift, HandCoins, UsersRound, Wallet } from 'lucide-react';
import { AdminPageShell, PageHeader, Tabs } from '@/components/AdminConfig';
import type { TabItem } from '@/components/AdminConfig';
import { AdelantoFormModal, AdelantosPanel, EmpleadosPanel, PlanillasPanel, TiposBonoPanel } from '@/components/AdminRRHH';
import { getAdelantos, getEmpleados, getTiposBono } from '@/lib/api/rrhh';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { todayISO } from '@/lib/utils/format';
import type { Adelanto, Empleado, TipoBono } from '@/types/rrhh';

type TabKey = 'planillas' | 'empleados' | 'adelantos' | 'bonos';

// Sueldos y planillas: solo admin_sys (igual que Finanzas).
const ROLES = ['admin_sys'];
const EMPTY_EMPLEADOS: Empleado[] = [];
const EMPTY_ADELANTOS: Adelanto[] = [];
const EMPTY_TIPOS: TipoBono[] = [];

export default function RRHHPage() {
  const [tab, setTab] = useState<TabKey>('planillas');
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const empleadosQ = useAsyncData(getEmpleados, 'rrhh-empleados');
  const adelantosQ = useAsyncData(getAdelantos, 'rrhh-adelantos');
  const tiposQ = useAsyncData(getTiposBono, 'rrhh-tipos-bono');
  const tipos = tiposQ.data ?? EMPTY_TIPOS;
  const empleados = empleadosQ.data ?? EMPTY_EMPLEADOS;
  const adelantos = adelantosQ.data ?? EMPTY_ADELANTOS;

  const [adelantoOpen, setAdelantoOpen] = useState(false);
  const [adelantoEmpleado, setAdelantoEmpleado] = useState<number | null>(null);

  const openAdelanto = (empleadoId: number | null) => {
    setAdelantoEmpleado(empleadoId);
    setAdelantoOpen(true);
  };

  // Una planilla puede descontar adelantos y un adelanto nuevo cambia el pendiente del empleado.
  const recargarPersonal = async () => {
    await Promise.all([empleadosQ.reload(), adelantosQ.reload()]);
  };

  const tabs: TabItem<TabKey>[] = [
    { key: 'planillas', label: 'Planillas', icon: <Wallet size={14} strokeWidth={2} /> },
    { key: 'empleados', label: 'Empleados', icon: <UsersRound size={14} strokeWidth={2} />, count: empleados.filter((e) => e.activo).length },
    { key: 'adelantos', label: 'Adelantos', icon: <HandCoins size={14} strokeWidth={2} />, count: adelantos.filter((a) => !a.planilla_id && !a.anulado).length },
    { key: 'bonos', label: 'Bonos', icon: <Gift size={14} strokeWidth={2} />, count: tipos.filter((t) => t.activo).length },
  ];

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Administración"
        kickerIcon={<UsersRound size={14} strokeWidth={2} />}
        title="Recursos Humanos"
        accentWord="Humanos"
        subtitle="Personal, adelantos, bonos y planillas de sueldo. El día de pago de cada mes se genera la planilla y su egreso en Finanzas."
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} ariaLabel="Secciones de Recursos Humanos" />

      {tab === 'planillas' && (
        <PlanillasPanel month={month} onMonthChange={setMonth} empleados={empleados} onChanged={recargarPersonal} />
      )}
      {tab === 'empleados' && (
        <EmpleadosPanel
          empleados={empleados}
          loading={empleadosQ.loading}
          error={empleadosQ.error}
          onReload={recargarPersonal}
          onAdelanto={(e) => openAdelanto(e.id)}
        />
      )}
      {tab === 'adelantos' && (
        <AdelantosPanel
          adelantos={adelantos}
          loading={adelantosQ.loading}
          error={adelantosQ.error}
          onReload={recargarPersonal}
          onNuevo={() => openAdelanto(null)}
        />
      )}
      {tab === 'bonos' && <TiposBonoPanel tipos={tipos} loading={tiposQ.loading} error={tiposQ.error} onReload={tiposQ.reload} />}

      <AdelantoFormModal
        isOpen={adelantoOpen}
        empleados={empleados}
        empleadoId={adelantoEmpleado}
        onClose={() => setAdelantoOpen(false)}
        onSaved={recargarPersonal}
      />
    </AdminPageShell>
  );
}
