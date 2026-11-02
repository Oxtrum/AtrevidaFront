'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import type { ClientePG } from '@/lib/api/clientes';
import { getSugerenciasCliente, vincularReservaCliente, type ClienteSugerido } from '@/lib/api/vinculo';
import { formatPhoneForDisplay, resolvePhoneE164 } from '@/lib/utils/phone';
import { ClienteSelect, type ClienteSugerencia } from './ClienteSelect';
import styles from './VincularReservaModal.module.css';

interface VincularReservaModalProps {
  isOpen: boolean;
  reservaId: number;
  /** Nombre escrito en la reserva. */
  nombre: string;
  telefono?: string;
  telefonoE164?: string;
  onClose: () => void;
  onVinculado: () => void;
}

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();

function pistaDe(s: ClienteSugerido): string | undefined {
  if (s.por_telefono && s.por_nombre) return 'mismo teléfono y nombre';
  if (s.por_telefono) return 'mismo teléfono';
  if (s.por_nombre) return 'mismo nombre';
  return undefined;
}

/**
 * Enlaza una reserva sin cliente con un cliente registrado. Nada se vincula solo: el cajero busca al cliente (o lo
 * crea) en el mismo buscador de Nueva reserva, elige y confirma. Al enfocar el campo vacio salen las posibles
 * coincidencias por telefono o nombre.
 */
export function VincularReservaModal({
  isOpen,
  reservaId,
  nombre,
  telefono,
  telefonoE164,
  onClose,
  onVinculado,
}: VincularReservaModalProps) {
  const [sugeridos, setSugeridos] = useState<ClienteSugerido[]>([]);
  const [texto, setTexto] = useState('');
  const [elegido, setElegido] = useState<ClientePG | null>(null);
  const [mismoTelefono, setMismoTelefono] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const hayTelefono = Boolean(resolvePhoneE164(telefonoE164, telefono));
  const telefonoMostrado = formatPhoneForDisplay(telefonoE164, telefono);

  // Al abrir se parte de cero: lo elegido en una reserva no debe quedar para la siguiente.
  useEffect(() => {
    if (!isOpen) return;
    setTexto('');
    setElegido(null);
    setMismoTelefono(true);
    const control = new AbortController();
    getSugerenciasCliente(reservaId, control.signal)
      .then((res) => setSugeridos(res.data ?? []))
      .catch(() => setSugeridos([]));
    return () => control.abort();
  }, [isOpen, reservaId]);

  const sugerencias: ClienteSugerencia[] = useMemo(
    () => sugeridos.map((s) => ({ cliente: s, pista: pistaDe(s) })),
    [sugeridos],
  );

  const vincular = async () => {
    if (!elegido) return;
    setGuardando(true);
    try {
      const res = await vincularReservaCliente(reservaId, {
        cliente_id: elegido.id,
        vincular_mismo_telefono: hayTelefono && mismoTelefono,
      });
      const n = res.data?.vinculadas ?? 1;
      toast.success(n > 1 ? `${n} reservas vinculadas a ${nombreCompleto(elegido)}` : `Reserva vinculada a ${nombreCompleto(elegido)}`);
      onVinculado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo vincular la reserva');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular reserva"
      submitLabel="Vincular"
      submitDisabled={!elegido}
      loading={guardando}
      onSubmit={vincular}
    >
      <div className={styles.cuerpo}>
        <p className={styles.reserva}>
          Reserva de <strong>{nombre}</strong>
          {telefonoMostrado && <> · {telefonoMostrado}</>}
        </p>

        <ClienteSelect
          id={`vincular-cliente-${reservaId}`}
          value={texto}
          onValueChange={(valor) => {
            setTexto(valor);
            setElegido(null);
          }}
          selectedId={elegido?.id ?? null}
          onSelect={(cliente) => {
            setElegido(cliente);
            setTexto(nombreCompleto(cliente));
          }}
          initialNombre={nombre}
          initialTelefono={telefono}
          autoFocus
          placeholder="Buscar por nombre o teléfono"
          sugerencias={sugerencias}
        />

        {hayTelefono && (
          <label className={styles.casilla}>
            <input type="checkbox" checked={mismoTelefono} onChange={(e) => setMismoTelefono(e.target.checked)} />
            <span>Vincular también las otras reservas de {nombre} con este teléfono</span>
          </label>
        )}
      </div>
    </FormModal>
  );
}
