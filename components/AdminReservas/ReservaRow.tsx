import { AlertTriangle, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { Tooltip } from '@/components/AdminConfig';
import styles from './ReservaRow.module.css';

/**
 * Fila única de reserva para todo el admin (Lista, Aprobación, Citas próximas).
 * Todo cambio visual de las filas se hace aquí y en ReservaRow.module.css.
 */

export type ReservaRowTone = 'pendiente' | 'agendado' | 'completado' | 'rechazado';

export const RESERVA_ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  AGENDADO: 'Agendado',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado',
};

export const getReservaTone = (estado?: string): ReservaRowTone => {
  switch (estado) {
    case 'AGENDADO': return 'agendado';
    case 'COMPLETADO': return 'completado';
    case 'RECHAZADO': return 'rechazado';
    default: return 'pendiente';
  }
};

const toMinutes = (time?: string) => {
  const [hh, mm] = (time ?? '').split(':').map(Number);
  return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : NaN;
};

const joinHM = (h: number, m: number) => [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');

/** "1 h", "1 h 30 min"; vacío si el rango no es válido. */
export function formatDuracion(desde?: string, hasta?: string) {
  const min = toMinutes(hasta) - toMinutes(desde);
  if (!Number.isFinite(min) || min <= 0) return '';
  return joinHM(Math.floor(min / 60), min % 60);
}

/** "jue 22 oct" */
export function formatDiaCorto(fecha: string) {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/** "en 2 h 10 min" hasta el inicio de una cita de hoy; vacío si ya empezó. */
export function formatFalta(horaDesde?: string) {
  const now = new Date();
  const min = toMinutes(horaDesde) - (now.getHours() * 60 + now.getMinutes());
  if (!Number.isFinite(min) || min <= 0) return '';
  if (min < 60) return `en ${min} min`;
  return `en ${joinHM(Math.floor(min / 60), min % 60)}`;
}

interface ReservaRowProps {
  tone: ReservaRowTone;
  /** Resalta la fila (p. ej. completada pendiente de cobro). */
  highlight?: boolean;
  /** compact = hora | datos | acción (Citas próximas). */
  variant?: 'full' | 'compact';
  day?: string;
  time: string;
  /** Texto bajo la hora (duración). */
  timeSub?: string;
  title: string;
  id?: number;
  service: string;
  /** Detalle bajo el servicio (solicitado/confirmado, notas). */
  details?: React.ReactNode;
  /** Local, teléfono… usar <ReservaMetaItem />. */
  meta?: React.ReactNode;
  /** Estado en una línea; usar <ReservaStatusLine />. */
  status?: React.ReactNode;
  actions?: React.ReactNode;
  /** Bloque a todo el ancho bajo la fila (p. ej. causa de rechazo). */
  footer?: React.ReactNode;
  /** Texto junto al título (p. ej. "en 20 min"). */
  titleHint?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ReservaRow({
  tone, highlight, variant = 'full', day, time, timeSub, title, id, service,
  details, meta, status, actions, footer, titleHint, className = '', onClick,
}: ReservaRowProps) {
  const compact = variant === 'compact';
  return (
    <article
      className={[
        styles.row,
        styles[tone],
        compact ? styles.compact : '',
        highlight ? styles.highlight : '',
        onClick ? styles.clickable : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={styles.when}>
        {day && <span className={styles.day}>{day}</span>}
        <strong>{time}</strong>
        {timeSub && <span className={styles.sub}>{timeSub}</span>}
      </div>

      <div className={styles.main}>
        <div className={styles.title}>
          <h3>{title}</h3>
          {id != null && <span className={styles.id}>#{id}</span>}
          {titleHint}
        </div>
        <p className={styles.service}>{service}</p>
        {details}
        {compact && meta && <div className={styles.meta}>{meta}</div>}
      </div>

      {!compact && meta && <div className={styles.meta}>{meta}</div>}
      {!compact && <div className={styles.status}>{status}</div>}
      {actions && <div className={styles.actions} onClick={onClick ? (e) => e.stopPropagation() : undefined}>{actions}</div>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  );
}

export function ReservaMetaItem({ icon: Icon, children, muted }: { icon: LucideIcon; children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={muted ? styles.metaMuted : undefined}>
      <Icon size={13} strokeWidth={1.8} />
      {children}
    </span>
  );
}

/** Local + teléfono, el meta estándar de una reserva. `showLocal` false cuando la lista ya está filtrada por local. */
export function ReservaContacto({ local, telefono, showLocal = true }: { local?: string; telefono?: string; showLocal?: boolean }) {
  return (
    <>
      {showLocal && local && <ReservaMetaItem icon={MapPin}>{local}</ReservaMetaItem>}
      {telefono && <ReservaMetaItem icon={Phone}>{telefono}</ReservaMetaItem>}
    </>
  );
}

interface StatusNote {
  text: string;
  warn?: boolean;
}

/** Aviso corto en texto, sin píldora: "Sin confirmar", "Por cobrar". `warn` lo pinta ámbar. */
export function ReservaNote({ warn, hint, children }: { warn?: boolean; hint?: string; children: React.ReactNode }) {
  const note = <span className={`${styles.note} ${warn ? styles.noteWarn : ''}`}>{children}</span>;
  return hint ? <Tooltip content={hint}>{note}</Tooltip> : note;
}

export const POR_COBRAR_HINT = 'El servicio ya se realizó pero aún no se registró el cobro. Usa «Cobrar» en el menú de acciones de la fila.';

/** Línea de estado discreta: ● Estado · notas · ⚠ Stock. `showEstado` false cuando la pestaña ya dice el estado. */
export function ReservaStatusLine({ estado, notes = [], stock, showEstado = true }: { estado: string; notes?: StatusNote[]; stock?: boolean; showEstado?: boolean }) {
  return (
    <div className={styles.statusLine}>
      {showEstado && (
        <span className={styles.state}>
          <i className={styles.dot} />
          {RESERVA_ESTADO_LABEL[estado] ?? estado}
        </span>
      )}
      {notes.map((n) => (
        <ReservaNote key={n.text} warn={n.warn}>{n.text}</ReservaNote>
      ))}
      {stock && <ReservaStockHint />}
    </div>
  );
}

export const STOCK_HINT = 'No hay stock suficiente de los insumos que consume este servicio. Revisa el inventario antes de la cita.';

export function ReservaStockHint() {
  return (
    <Tooltip title="Falta stock" content={STOCK_HINT}>
      <span className={styles.stock}>
        <AlertTriangle size={13} strokeWidth={2} />
        Stock
      </span>
    </Tooltip>
  );
}
