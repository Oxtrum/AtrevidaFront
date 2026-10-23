'use client';

import { useEffect, useState } from 'react';
import { FormField, FormGrid, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { guardarTipoBono } from '@/lib/api/rrhh';
import type { TipoBono } from '@/types/rrhh';

interface TipoBonoFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  tipo: TipoBono | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Alta y edición de un concepto del catálogo de bonos. */
export function TipoBonoFormModal({ isOpen, tipo, onClose, onSaved }: TipoBonoFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNombre(tipo?.nombre ?? '');
    setDescripcion(tipo?.descripcion ?? '');
    setErrors({});
  }, [isOpen, tipo]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    setSaving(true);
    try {
      await guardarTipoBono({ nombre: nombre.trim(), descripcion: descripcion.trim() || null }, tipo?.id);
      toast.success(tipo ? 'Tipo de bono actualizado' : 'Tipo de bono creado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={tipo ? 'Editar tipo de bono' : 'Nuevo tipo de bono'} onSubmit={handleSubmit} loading={saving} submitLabel={tipo ? 'Guardar' : 'Crear'}>
      <FormGrid>
        <FormField label="Nombre" htmlFor="tb-nombre" required error={errors.nombre} wide>
          <input id="tb-nombre" type="text" value={nombre} onChange={(e) => { setNombre(e.target.value); setErrors({}); }} placeholder="Ej. Producción, Puntualidad" autoFocus />
        </FormField>
        <FormField label="Descripción" htmlFor="tb-desc" hint="Para qué se paga este bono. Opcional." wide>
          <textarea id="tb-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </FormField>
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
