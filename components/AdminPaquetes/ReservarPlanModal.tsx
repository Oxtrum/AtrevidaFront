'use client';

import { useEffect, useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { ClienteSelect } from '@/components/AdminClientes';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { crearPlan } from '@/lib/api/planes';
import { getCombosDB } from '@/lib/api/servicios';
import type { ClientePG } from '@/lib/api/clientes';
import styles from './PaquetesActivos.module.css';

interface LocalOpt { id: number; nombre: string; }
interface ComboOpt { id: number; nombre: string; }

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();

interface Props {
  locales: LocalOpt[];
  onClose: () => void;
  onReservado: () => void;
}

export default function ReservarPlanModal({ locales, onClose, onReservado }: Props) {
  const [clienteTexto, setClienteTexto] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [localId, setLocalId] = useState('');
  const [comboId, setComboId] = useState('');
  const [combos, setCombos] = useState<ComboOpt[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const local = locales.find((l) => String(l.id) === localId);
    setComboId('');
    if (!local) {
      setCombos([]);
      return;
    }
    setLoadingCombos(true);
    getCombosDB({ local: local.nombre })
      .then((r) => {
        const data = (r as { data?: { combos?: ComboOpt[] } })?.data;
        setCombos(data?.combos ?? []);
      })
      .catch(() => setCombos([]))
      .finally(() => setLoadingCombos(false));
  }, [localId, locales]);

  const handleSubmit = async () => {
    if (!clienteId || !localId || !comboId) {
      toast.error('Completa cliente, local y paquete.');
      return;
    }
    setSaving(true);
    try {
      await crearPlan({
        combo_id: Number(comboId),
        cliente_id: Number(clienteId),
        local_id: Number(localId),
        tipo_pago: 'UNICO',
      });
      toast.success('Paquete reservado');
      onReservado();
      onClose();
    } catch {
      toast.error('No se pudo reservar el paquete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title="Reservar paquete"
      onSubmit={handleSubmit}
      loading={saving}
      submitLabel="Reservar"
    >
      <div className={styles.formStack}>
        <ClienteSelect
          id="reservar-cliente"
          value={clienteTexto}
          onValueChange={(texto) => {
            setClienteTexto(texto);
            // Escribir de nuevo suelta al cliente elegido: hay que volver a elegir uno de la lista.
            setClienteId('');
          }}
          onSelect={(cliente) => {
            setClienteTexto(nombreCompleto(cliente));
            setClienteId(String(cliente.id));
          }}
          placeholder="Busca un cliente…"
        />

        <div className={styles.field}>
          <label id="lbl-reservar-local" htmlFor="reservar-local">Local</label>
          <CustomSelect
            id="reservar-local"
            ariaLabelledBy="lbl-reservar-local"
            value={localId}
            onChange={setLocalId}
            placeholder="Selecciona un local…"
            options={locales.map((l) => ({ value: String(l.id), label: l.nombre }))}
          />
        </div>

        <div className={styles.field}>
          <label id="lbl-reservar-combo" htmlFor="reservar-combo">Paquete</label>
          <CustomSelect
            id="reservar-combo"
            ariaLabelledBy="lbl-reservar-combo"
            value={comboId}
            onChange={setComboId}
            placeholder={!localId ? 'Elige un local primero…' : loadingCombos ? 'Cargando paquetes…' : 'Selecciona un paquete…'}
            options={combos.map((c) => ({ value: String(c.id), label: c.nombre }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
