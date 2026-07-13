'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { crearPlan } from '@/lib/api/planes';
import { getCombosDB } from '@/lib/api/servicios';
import { getClientesDB, type ClientePG } from '@/lib/api/clientes';
import styles from './page.module.css';

interface LocalOpt { id: number; nombre: string; }
interface ComboOpt { id: number; nombre: string; }

const getClienteNombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();
const normalizeSearch = (v: string) => v.trim().toLowerCase();

interface Props {
  locales: LocalOpt[];
  onClose: () => void;
  onReservado: () => void;
}

export default function ReservarPlanModal({ locales, onClose, onReservado }: Props) {
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [localId, setLocalId] = useState('');
  const [comboId, setComboId] = useState('');
  const [clientes, setClientes] = useState<ClientePG[]>([]);
  const [combos, setCombos] = useState<ComboOpt[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    getClientesDB({})
      .then((r) => setClientes(r?.data?.clientes ?? []))
      .catch(() => setClientes([]));
  }, []);

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

  const query = normalizeSearch(clienteQuery);
  const sugeridos = useMemo(() => {
    if (query.length < 2) return [];
    return clientes
      .filter((c) => {
        const n = normalizeSearch(c.nombre);
        const a = normalizeSearch(c.apellido);
        const full = normalizeSearch(getClienteNombreCompleto(c));
        return n.includes(query) || a.includes(query) || full.includes(query);
      })
      .slice(0, 7);
  }, [query, clientes]);

  const showDropdown = dropdownOpen && query.length >= 2;

  const selectCliente = (c: ClientePG) => {
    setClienteQuery(getClienteNombreCompleto(c));
    setClienteId(String(c.id));
    setDropdownOpen(false);
  };

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
        <div className={styles.field}>
          <label id="lbl-reservar-cliente" htmlFor="reservar-cliente">Cliente</label>
          <div className={styles.clientAutocomplete}>
            <input
              id="reservar-cliente"
              type="text"
              value={clienteQuery}
              onChange={(e) => {
                setClienteQuery(e.target.value);
                if (clienteId) setClienteId('');
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => window.setTimeout(() => setDropdownOpen(false), 120)}
              placeholder="Busca un cliente por nombre o apellido…"
              autoComplete="off"
              className={styles.clientInput}
            />
            {showDropdown && (
              <div className={styles.clientDropdown} role="listbox" aria-label="Clientes registrados">
                {sugeridos.length > 0 ? (
                  sugeridos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.clientOption}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCliente(c);
                      }}
                      role="option"
                      aria-selected={String(c.id) === clienteId}
                    >
                      <strong>{getClienteNombreCompleto(c)}</strong>
                      <span>{c.numero_telefono || 'Sin teléfono'}</span>
                    </button>
                  ))
                ) : (
                  <div className={styles.clientDropdownStatus}>Sin coincidencias</div>
                )}
              </div>
            )}
          </div>
        </div>

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
