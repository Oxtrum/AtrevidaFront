'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { FormModal } from '@/components/AdminConfig';
import { AdminButton } from '@/components/AdminConfig/AdminButton';
import { toast } from '@/components/Shared/Toast';
import { getClientesDB, type ClientePG } from '@/lib/api/clientes';
import { getSugerenciasCliente, vincularReservaCliente, type ClienteSugerido } from '@/lib/api/vinculo';
import { formatPhoneForDisplay, resolvePhoneE164 } from '@/lib/utils/phone';
import { ClienteFormModal } from './ClienteFormModal';
import styles from './VincularReservaModal.module.css';

const MIN_BUSQUEDA = 2;
const LIMITE_BUSQUEDA = 8;

interface VincularReservaModalProps {
  isOpen: boolean;
  reservaId: number;
  /** Nombre escrito en la reserva; precarga el buscador y el cliente nuevo. */
  nombre: string;
  telefono?: string;
  telefonoE164?: string;
  onClose: () => void;
  onVinculado: () => void;
}

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();

interface Candidato {
  cliente: ClientePG;
  /** Por que se sugiere; solo las sugerencias lo traen. */
  pista?: string;
}

function pistaDe(s: ClienteSugerido): string | undefined {
  if (s.por_telefono && s.por_nombre) return 'Mismo teléfono y nombre';
  if (s.por_telefono) return 'Mismo teléfono';
  if (s.por_nombre) return 'Mismo nombre';
  return undefined;
}

/**
 * Enlaza una reserva sin cliente con un cliente registrado. Nada se vincula solo: arriba salen las posibles
 * coincidencias como pista, el cajero busca o crea al cliente, elige y confirma.
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
  const [consulta, setConsulta] = useState('');
  const [encontrados, setEncontrados] = useState<ClientePG[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<ClientePG | null>(null);
  const [mismoTelefono, setMismoTelefono] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);

  const hayTelefono = Boolean(resolvePhoneE164(telefonoE164, telefono));
  const telefonoMostrado = formatPhoneForDisplay(telefonoE164, telefono);

  // Al abrir se parte de cero: lo elegido en una reserva no debe quedar para la siguiente.
  useEffect(() => {
    if (!isOpen) return;
    setConsulta('');
    setEncontrados([]);
    setElegido(null);
    setMismoTelefono(true);
    const control = new AbortController();
    getSugerenciasCliente(reservaId, control.signal)
      .then((res) => setSugeridos(res.data ?? []))
      .catch(() => setSugeridos([]));
    return () => control.abort();
  }, [isOpen, reservaId]);

  const busqueda = consulta.trim();
  useEffect(() => {
    if (busqueda.length < MIN_BUSQUEDA) {
      setEncontrados([]);
      return;
    }
    const control = new AbortController();
    setBuscando(true);
    const espera = window.setTimeout(() => {
      getClientesDB({ busqueda, limit: LIMITE_BUSQUEDA }, control.signal)
        .then((res) => {
          if (!control.signal.aborted) setEncontrados(res.data?.clientes ?? []);
        })
        .catch(() => {
          if (!control.signal.aborted) setEncontrados([]);
        })
        .finally(() => {
          if (!control.signal.aborted) setBuscando(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(espera);
      control.abort();
    };
  }, [busqueda]);

  const candidatos: Candidato[] = useMemo(() => {
    if (busqueda.length >= MIN_BUSQUEDA) return encontrados.map((cliente) => ({ cliente }));
    return sugeridos.map((s) => ({ cliente: s, pista: pistaDe(s) }));
  }, [busqueda, encontrados, sugeridos]);

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
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        title="Vincular reserva a un cliente"
        submitLabel={elegido ? `Vincular a ${nombreCompleto(elegido)}` : 'Vincular'}
        submitDisabled={!elegido}
        loading={guardando}
        onSubmit={vincular}
      >
        <div className={styles.cuerpo}>
          <p className={styles.reserva}>
            Reserva a nombre de <strong>{nombre}</strong>
            {telefonoMostrado && <> · {telefonoMostrado}</>}
          </p>

          <div className={styles.buscador}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar cliente por nombre o teléfono"
              aria-label="Buscar cliente"
              autoComplete="off"
            />
          </div>

          <div className={styles.lista} role="radiogroup" aria-label="Clientes">
            {busqueda.length < MIN_BUSQUEDA && candidatos.length > 0 && (
              <p className={styles.titulo}>Posibles coincidencias</p>
            )}
            {candidatos.map(({ cliente, pista }) => {
              const activo = elegido?.id === cliente.id;
              return (
                <button
                  key={cliente.id}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  className={`${styles.opcion} ${activo ? styles.opcionActiva : ''}`}
                  onClick={() => setElegido(cliente)}
                >
                  <span className={styles.opcionNombre}>{nombreCompleto(cliente)}</span>
                  <span className={styles.opcionDetalle}>
                    {formatPhoneForDisplay(cliente.telefono_e164, cliente.numero_telefono) || 'Sin teléfono'}
                    {cliente.ci ? ` · CI ${cliente.ci}` : ''}
                  </span>
                  {pista && <span className={styles.pista}>{pista}</span>}
                </button>
              );
            })}
            {candidatos.length === 0 && (
              <p className={styles.vacio}>
                {busqueda.length >= MIN_BUSQUEDA
                  ? buscando ? 'Buscando...' : 'Ningún cliente coincide con esa búsqueda.'
                  : 'No hay coincidencias claras. Busca al cliente por su nombre o teléfono, o crea uno nuevo.'}
              </p>
            )}
          </div>

          <div className={styles.nuevo}>
            <AdminButton variant="inline" icon={<UserPlus size={13} strokeWidth={2} />} onClick={() => setCreando(true)}>
              Crear cliente nuevo
            </AdminButton>
          </div>

          {hayTelefono && (
            <label className={styles.casilla}>
              <input type="checkbox" checked={mismoTelefono} onChange={(e) => setMismoTelefono(e.target.checked)} />
              <span>Vincular también las otras reservas sin cliente con este mismo teléfono</span>
            </label>
          )}
        </div>
      </FormModal>

      <ClienteFormModal
        isOpen={creando}
        onClose={() => setCreando(false)}
        initialNombre={nombre}
        initialTelefono={telefono}
        onSaved={(nuevo) => {
          setCreando(false);
          setElegido(nuevo);
          setConsulta('');
          setSugeridos((previos) => [{ ...nuevo, por_telefono: false, por_nombre: false }, ...previos]);
        }}
      />
    </>
  );
}
