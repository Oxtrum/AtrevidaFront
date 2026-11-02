'use client';

import { useEffect, useState } from 'react';
import { ChoiceChips, FechaHechoField, FormField, FormGrid, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearCargo } from '@/lib/api/cuenta';
import { parseMonto, TIPOS_CARGO } from '@/lib/utils/cuenta';
import type { TipoCargo } from '@/lib/utils/cuenta';

interface CargoFormModalProps {
  isOpen: boolean;
  clienteId: number;
  onClose: () => void;
  onSaved: () => void;
}

/** Registra lo que un cliente debe. Un monto 0 deja constancia de un consumo que no se cobra. */
export function CargoFormModal({ isOpen, clienteId, onClose, onSaved }: CargoFormModalProps) {
  const [tipo, setTipo] = useState<TipoCargo>('PAQUETE');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTipo('PAQUETE');
    setConcepto('');
    setMonto('');
    setFecha('');
    setErrors({});
  }, [isOpen]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    const m = parseMonto(monto);
    if (!concepto.trim()) e.concepto = 'El concepto es obligatorio';
    if (m === null) e.monto = 'Ingresa un monto válido (0 si no se cobra)';
    setErrors(e);
    if (Object.keys(e).length || m === null) return;

    setSaving(true);
    try {
      await crearCargo(clienteId, { tipo, concepto: concepto.trim(), monto: m, fecha_hecho: fecha || undefined });
      toast.success('Cargo registrado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar el cargo' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Nuevo cargo" onSubmit={handleSubmit} loading={saving} submitLabel="Registrar cargo">
      <FormGrid>
        <FormField label="Tipo" labelId="cargo-tipo" required wide>
          <ChoiceChips options={TIPOS_CARGO} value={tipo} onChange={setTipo} ariaLabel="Tipo de cargo" />
        </FormField>
        <FormField label="Monto" htmlFor="cargo-monto" required error={errors.monto} hint="0 = sin cobro.">
          <input id="cargo-monto" type="text" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setErrors({}); }} placeholder="0.00" />
        </FormField>
        <FormField label="Concepto" htmlFor="cargo-concepto" required error={errors.concepto}>
          <input id="cargo-concepto" type="text" maxLength={300} value={concepto} onChange={(e) => { setConcepto(e.target.value); setErrors({}); }} placeholder="Ej. Paquete Relax 4 sesiones" autoFocus />
        </FormField>
        <FechaHechoField id="cargo-fecha" value={fecha} onChange={setFecha} />
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
