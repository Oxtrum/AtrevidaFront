'use client';

import { useEffect, useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearClienteDB, actualizarClienteDB } from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import styles from './ClienteFormModal.module.css';

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cliente a editar. Ausente = modo creación. */
  cliente?: ClientePG;
  /** Sólo en modo creación: precarga nombre/apellido partiendo este texto. */
  initialNombre?: string;
  /** Sólo en modo creación: precarga el NIT. */
  initialNit?: string;
  /** Recibe el cliente ya persistido, con su id. */
  onSaved?: (cliente: ClientePG) => void;
}

interface FormState {
  nombre: string;
  apellido: string;
  numero_telefono: string;
  ci: string;
  nit: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { nombre: '', apellido: '', numero_telefono: '', ci: '', nit: '' };

/**
 * Parte un nombre completo en nombre + apellido por el último espacio.
 * "Ana Maria Lopez" → { nombre: "Ana Maria", apellido: "Lopez" }
 */
export function splitNombreCompleto(fullName: string): { nombre: string; apellido: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nombre: parts[0] ?? '', apellido: '' };
  return { nombre: parts.slice(0, -1).join(' '), apellido: parts.at(-1) ?? '' };
}

/**
 * Único formulario de cliente de la app. Es dueño de su estado, su validación
 * y su llamada al backend; quien lo usa sólo abre, cierra y recibe `onSaved`.
 */
export function ClienteFormModal({
  isOpen,
  onClose,
  cliente,
  initialNombre,
  initialNit,
  onSaved,
}: ClienteFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const isEdit = cliente !== undefined;

  // Sembrar el formulario cada vez que se abre. Sin esto, reabrir el modal
  // mostraría lo que quedó tecleado la vez anterior.
  useEffect(() => {
    if (!isOpen) return;

    if (cliente) {
      setForm({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        numero_telefono: cliente.numero_telefono,
        ci: cliente.ci ?? '',
        nit: cliente.nit ?? '',
      });
    } else {
      const { nombre, apellido } = splitNombreCompleto(initialNombre ?? '');
      setForm({ ...EMPTY_FORM, nombre, apellido, nit: initialNit ?? '' });
    }
    setErrors({});
  }, [isOpen, cliente, initialNombre, initialNit]);

  const patch = (campo: keyof FormState, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrors((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.nombre.trim()) next.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) next.apellido = 'Los apellidos son obligatorios';
    if (!form.numero_telefono.trim()) {
      next.numero_telefono = 'El teléfono es obligatorio';
    } else if (!/^\d{7,}$/.test(form.numero_telefono.replace(/\D/g, ''))) {
      next.numero_telefono = 'Ingresa al menos 7 dígitos del teléfono';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const limpio = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      numero_telefono: form.numero_telefono.trim(),
      ci: form.ci.trim(),
      nit: form.nit.trim(),
    };

    setSaving(true);
    try {
      if (cliente) {
        await actualizarClienteDB(cliente.id, limpio);
        toast.success('Cliente actualizado correctamente');
        onSaved?.({ ...cliente, ...limpio });
      } else {
        const res = await crearClienteDB(limpio);
        const id = res.data?.id;
        if (!id) throw new Error('No se recibió el ID del cliente creado');
        toast.success('Cliente creado correctamente');
        onSaved?.({ id, ...limpio });
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
      onSubmit={handleSubmit}
      loading={saving}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear cliente'}
    >
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="cliente-nombre">Nombre</label>
          <input
            id="cliente-nombre"
            type="text"
            value={form.nombre}
            onChange={(e) => patch('nombre', e.target.value)}
            placeholder="Ej: María"
            autoFocus
            aria-invalid={!!errors.nombre}
            className={errors.nombre ? styles.inputError : ''}
          />
          {errors.nombre && <span className={styles.fieldError}>{errors.nombre}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="cliente-apellido">Apellidos</label>
          <input
            id="cliente-apellido"
            type="text"
            value={form.apellido}
            onChange={(e) => patch('apellido', e.target.value)}
            placeholder="Ej: López"
            aria-invalid={!!errors.apellido}
            className={errors.apellido ? styles.inputError : ''}
          />
          {errors.apellido && <span className={styles.fieldError}>{errors.apellido}</span>}
        </div>

        <div className={`${styles.field} ${styles.colSpan2}`}>
          <label htmlFor="cliente-telefono">Teléfono</label>
          <input
            id="cliente-telefono"
            type="tel"
            value={form.numero_telefono}
            onChange={(e) => patch('numero_telefono', e.target.value)}
            placeholder="Ej: 70011223"
            aria-invalid={!!errors.numero_telefono}
            className={errors.numero_telefono ? styles.inputError : ''}
          />
          {errors.numero_telefono && (
            <span className={styles.fieldError}>{errors.numero_telefono}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="cliente-ci">
            CI <span className={styles.optional}>(opcional)</span>
          </label>
          <input
            id="cliente-ci"
            type="text"
            inputMode="numeric"
            value={form.ci}
            onChange={(e) => patch('ci', e.target.value)}
            placeholder="Ej: 8765432"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="cliente-nit">
            NIT <span className={styles.optional}>(opcional)</span>
          </label>
          <input
            id="cliente-nit"
            type="text"
            inputMode="numeric"
            value={form.nit}
            onChange={(e) => patch('nit', e.target.value)}
            placeholder="Ej: 1234567"
          />
        </div>
      </div>

      <p className={styles.hint}>
        El NIT se propondrá al cobrar, y podrá cambiarse en cada venta.
      </p>
    </FormModal>
  );
}
