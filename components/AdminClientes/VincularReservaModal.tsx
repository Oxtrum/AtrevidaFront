'use client';

import { useEffect, useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import type { ClientePG } from '@/lib/api/clientes';
import { vincularReservaCliente } from '@/lib/api/vinculo';
import { formatPhoneForDisplay } from '@/lib/utils/phone';
import { telefonosDistintos } from '@/lib/utils/telefonoCliente';
import { ClienteSelect } from './ClienteSelect';
import { useSugerenciasCliente } from './useSugerenciasCliente';
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
  const [texto, setTexto] = useState('');
  const [elegido, setElegido] = useState<ClientePG | null>(null);
  const [actualizarTelefono, setActualizarTelefono] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const telefonoMostrado = formatPhoneForDisplay(telefonoE164, telefono);

  // Al abrir se parte de cero: lo elegido en una reserva no debe quedar para la siguiente.
  useEffect(() => {
    if (!isOpen) return;
    setTexto('');
    setElegido(null);
    setActualizarTelefono(false);
  }, [isOpen, reservaId]);

  const sugerencias = useSugerenciasCliente(isOpen ? reservaId : null);

  // Solo se ofrece cuando el cliente elegido tiene otro telefono (o ninguno).
  const ofrecerTelefono = elegido != null && telefonosDistintos(elegido, { telefono_e164: telefonoE164, numero_telefono: telefono });

  const vincular = async () => {
    if (!elegido) return;
    setGuardando(true);
    try {
      const res = await vincularReservaCliente(reservaId, {
        cliente_id: elegido.id,
        actualizar_telefono: ofrecerTelefono && actualizarTelefono,
      });
      toast.success(res.data?.telefono_actualizado
        ? `Reserva vinculada a ${nombreCompleto(elegido)}. Teléfono actualizado.`
        : `Reserva vinculada a ${nombreCompleto(elegido)}`);
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
            setActualizarTelefono(false);
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

        {ofrecerTelefono && elegido && (
          <label className={styles.casilla}>
            <input type="checkbox" checked={actualizarTelefono} onChange={(e) => setActualizarTelefono(e.target.checked)} />
            <span>
              El teléfono de la reserva ({telefonoMostrado}) es distinto al de {nombreCompleto(elegido)}
              {' '}({formatPhoneForDisplay(elegido.telefono_e164, elegido.numero_telefono) || 'sin teléfono'}).
              {' '}Reemplazar el del cliente.
            </span>
          </label>
        )}
      </div>
    </FormModal>
  );
}
