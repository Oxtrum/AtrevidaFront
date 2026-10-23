import { Tooltip } from '@/components/AdminConfig';
import styles from './ReservaEstadoPill.module.css';

export type ReservaEstadoPillTone = 'pendiente' | 'info' | 'success' | 'danger' | 'neutral';

/** Qué significa cada estado de reserva, para el popover de las etiquetas. */
export const RESERVA_ESTADO_HINT: Record<string, string> = {
  PENDIENTE: 'Solicitud nueva desde la web. Apruébala para agendarla o recházala indicando la causa.',
  AGENDADO: 'La cita está agendada en el calendario.',
  COMPLETADO: 'El servicio ya se realizó.',
  RECHAZADO: 'La solicitud fue rechazada y la causa quedó registrada.',
};

interface ReservaEstadoPillProps {
  tone: ReservaEstadoPillTone;
  /** Explicación al acercar el cursor; sin ella, la etiqueta no muestra popover. */
  hint?: string;
  children: React.ReactNode;
}

/** Estado de una reserva como etiqueta compacta; el color lo da el tono, no el texto. */
export function ReservaEstadoPill({ tone, hint, children }: ReservaEstadoPillProps) {
  const pill = <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
  return hint ? <Tooltip content={hint}>{pill}</Tooltip> : pill;
}
