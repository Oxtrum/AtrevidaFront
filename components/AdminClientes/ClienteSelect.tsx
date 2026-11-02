'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { getClientesDB, type ClientePG } from '@/lib/api/clientes';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { ClienteFormModal } from './ClienteFormModal';
import styles from './ClienteSelect.module.css';

const MIN_BUSQUEDA = 2;
const MAX_SUGERENCIAS = 7;

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();
const normalizar = (valor: string) => valor.trim().toLowerCase();

/** Un cliente que se propone sin que el cajero escriba nada, con el motivo (p. ej. "Mismo teléfono"). */
export interface ClienteSugerencia {
  cliente: ClientePG;
  pista?: string;
}

interface ClienteSelectProps {
  id: string;
  label?: string;
  /** Texto del campo. */
  value: string;
  /** Se escribió en el campo: quien lo usa suelta al cliente elegido, hay que volver a elegir uno de la lista. */
  onValueChange: (texto: string) => void;
  /** Se eligió un cliente de la lista o se creó uno nuevo. */
  onSelect: (cliente: ClientePG) => void;
  /** Para precargar el alta de un cliente nuevo; el nombre solo se usa si el campo esta vacio. */
  initialNombre?: string;
  initialTelefono?: string;
  autoFocus?: boolean;
  placeholder?: string;
  error?: string;
  /** Propuestas al enfocar el campo vacío. */
  sugerencias?: ClienteSugerencia[];
}

/**
 * Buscador de cliente: se escribe, sale la lista de clientes registrados y se elige uno. Sin coincidencias ofrece
 * registrarlo ahí mismo. Es el mismo en Nueva reserva y al vincular una reserva con su cliente.
 */
export function ClienteSelect({
  id,
  label = 'Cliente',
  value,
  onValueChange,
  onSelect,
  initialNombre,
  initialTelefono,
  autoFocus,
  placeholder = 'Nombre del cliente',
  error,
  sugerencias = [],
}: ClienteSelectProps) {
  const [directorio, setDirectorio] = useState<ClientePG[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);

  const consulta = normalizar(value);
  const buscando = consulta.length >= MIN_BUSQUEDA;

  useEffect(() => {
    if (!buscando) return;
    const control = new AbortController();
    const espera = window.setTimeout(() => {
      setCargando(true);
      setErrorCarga(null);
      getClientesDB({ busqueda: consulta, limit: PAGE_LIMIT }, control.signal)
        .then((res) => {
          if (!control.signal.aborted) setDirectorio(res.data?.clientes ?? []);
        })
        .catch((err) => {
          if (control.signal.aborted) return;
          setDirectorio([]);
          setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar el directorio de clientes');
        })
        .finally(() => {
          if (!control.signal.aborted) setCargando(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(espera);
      control.abort();
    };
  }, [consulta, buscando]);

  const coincidencias = useMemo(() => {
    if (!buscando) return [];
    return directorio
      .filter((c) => normalizar(c.nombre).includes(consulta) || normalizar(c.apellido).includes(consulta) || normalizar(nombreCompleto(c)).includes(consulta))
      .slice(0, MAX_SUGERENCIAS);
  }, [buscando, consulta, directorio]);

  const mostrarPropuestas = abierto && !buscando && sugerencias.length > 0;
  const mostrarLista = abierto && buscando;

  const elegir = (cliente: ClientePG) => {
    onSelect(cliente);
    setAbierto(false);
  };

  return (
    <div className={styles.campo}>
      <div className={styles.fila}>
        <label htmlFor={id}>{label}</label>
        <button type="button" className={styles.nuevo} onClick={() => setCreando(true)}>
          <UserPlus size={13} strokeWidth={2} />
          Nuevo
        </button>
      </div>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 120)}
        placeholder={placeholder}
        className={error ? styles.conError : ''}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
      />

      {mostrarPropuestas && (
        <div className={styles.lista} role="listbox" aria-label="Posibles coincidencias">
          <div className={styles.estado}>Posibles coincidencias</div>
          {sugerencias.map(({ cliente, pista }) => (
            <button
              key={cliente.id}
              type="button"
              className={styles.opcion}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(cliente);
              }}
              role="option"
              aria-selected={false}
            >
              <strong>{nombreCompleto(cliente)}</strong>
              <span>
                {cliente.numero_telefono || 'Sin teléfono registrado'}
                {pista ? ` · ${pista}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {mostrarLista && (
        <div className={styles.lista} role="listbox" aria-label="Clientes registrados">
          {cargando ? (
            <div className={styles.estado}>Cargando directorio...</div>
          ) : errorCarga ? (
            <div className={styles.estado}>{errorCarga}</div>
          ) : coincidencias.length > 0 ? (
            coincidencias.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                className={styles.opcion}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(cliente);
                }}
                role="option"
                aria-selected={false}
              >
                <strong>{nombreCompleto(cliente)}</strong>
                <span>{cliente.numero_telefono || 'Sin teléfono registrado'}</span>
              </button>
            ))
          ) : (
            <>
              <div className={styles.estado}>Sin coincidencias registradas</div>
              <button
                type="button"
                className={styles.registrar}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setCreando(true);
                }}
              >
                <UserPlus size={14} strokeWidth={2} />
                Registrar “{value.trim()}” como cliente nuevo
              </button>
            </>
          )}
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}

      <ClienteFormModal
        isOpen={creando}
        onClose={() => setCreando(false)}
        initialNombre={value.trim() || initialNombre}
        initialTelefono={initialTelefono}
        onSaved={(nuevo) => {
          setCreando(false);
          // El directorio solo trae lo buscado: sin esto el cliente recien creado no aparece al volver a buscarlo.
          setDirectorio((previos) => [nuevo, ...previos]);
          elegir(nuevo);
        }}
      />
    </div>
  );
}
