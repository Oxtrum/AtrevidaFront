'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { CursorPagination, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { getReservasDB } from '@/lib/api/reservas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { formatDateISO } from '@/lib/utils/format';
import type { ReservaBD } from '@/types/reserva';
import styles from './ReservaAgendadaPicker.module.css';

type Row = ReservaBD & Record<string, unknown>;

const PAGE_SIZE = 8;

interface ReservaAgendadaPickerProps {
  isOpen: boolean;
  /** Nombre del local al que se limita la lista; vacío = todos los que el usuario puede ver. */
  local?: string;
  onClose: () => void;
  onSelect: (reserva: ReservaBD) => void;
}

/**
 * Elegir la reserva agendada que se va a atender, sin pasar por la pantalla de Reservas. Solo lista reservas
 * AGENDADAS (las únicas que se pueden cerrar con una atención), de la más reciente a la más antigua.
 */
export function ReservaAgendadaPicker(props: ReservaAgendadaPickerProps) {
  // Se monta al abrir: así cada vez empieza sin búsqueda y en la primera página.
  return props.isOpen ? <Picker {...props} /> : null;
}

function Picker({ local, onClose, onSelect }: ReservaAgendadaPickerProps) {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  // Cursor de cada página ya visitada; la primera no lleva cursor.
  const [cursores, setCursores] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursores[cursores.length - 1];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusqueda(texto.trim());
      setCursores([undefined]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [texto]);

  const { data, loading, error } = useAsyncData(
    () => getReservasDB({
      estado: 'AGENDADO',
      local: local || undefined,
      busqueda: busqueda || undefined,
      ordenar_por: 'fecha',
      sentido: 'desc',
      limit: PAGE_SIZE,
      cursor,
      include_total: true,
    }),
    `${local ?? ''}|${busqueda}|${cursor ?? ''}`,
  );
  const reservas = data?.data?.reservas ?? [];
  const siguiente = data?.data?.paginacion?.next_cursor ?? null;
  const totalPaginas = data?.data?.paginacion?.total_paginas;

  const columns: Column<Row>[] = [
    { key: 'fecha', label: 'Fecha', render: (v) => formatDateISO(v as string) },
    { key: 'hora_desde', label: 'Hora', render: (_, r) => [r.hora_desde, r.hora_hasta].filter(Boolean).join(' – ') },
    { key: 'cliente', label: 'Cliente', render: (v) => <strong>{v as string}</strong> },
    { key: 'servicio', label: 'Servicio', render: (_, r) => r.servicio_confirmado || r.servicio_solicitado || r.servicio || '—' },
    { key: 'local', label: 'Local' },
  ];

  return (
    <FormModal isOpen onClose={onClose} title="Registrar atención" size="lg" hideFooter>
      <p className={styles.ayuda}>Elige la reserva agendada que se atendió. Al guardar la atención, la reserva queda completada.</p>
      <div className={styles.buscador}>
        <Search size={15} strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por cliente, teléfono, servicio o número de reserva…"
          aria-label="Buscar reserva agendada"
          autoFocus
        />
      </div>
      <DataTable<Row>
        columns={columns}
        data={reservas as Row[]}
        loading={loading}
        error={error}
        getRowKey={(r) => r.id}
        onRowClick={(r) => onSelect(r)}
        hideSearch
        sortable={false}
        pageSize={0}
        emptyMessage={busqueda ? 'Ninguna reserva agendada coincide con la búsqueda' : 'No hay reservas agendadas por atender'}
      />
      <CursorPagination
        page={cursores.length}
        totalPages={totalPaginas}
        hasNext={!!siguiente}
        loading={loading}
        onPrevious={() => setCursores((c) => (c.length > 1 ? c.slice(0, -1) : c))}
        onNext={() => siguiente && setCursores((c) => [...c, siguiente])}
      />
    </FormModal>
  );
}
