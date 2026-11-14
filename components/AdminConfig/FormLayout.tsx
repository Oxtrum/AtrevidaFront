import type { CSSProperties, ReactNode } from 'react';
import { SectionLabel } from './SectionLabel';
import styles from './FormLayout.module.css';

/** Apila las secciones de un formulario largo con aire entre ellas. */
export function FormStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

/** Columna lateral (p. ej. la imagen) a la izquierda y el contenido principal a la derecha; una columna en móvil. */
export function FormSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.split}>
      {aside}
      <div className={styles.main}>{children}</div>
    </div>
  );
}

/** Dos campos lado a lado (uno por fila en móvil). */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

/** Bloque con título de sección y su línea separadora. */
export function FormSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <SectionLabel icon={icon} withLine>
        {title}
      </SectionLabel>
      {children}
    </section>
  );
}

/** Ancho de reserva (en rem) para un texto fijo dentro del input. */
const reservar = (texto: string) => `${Math.max(3, texto.length * 0.62 + 1.7)}rem`;

/** Un input con texto fijo al inicio (moneda) o al final (unidad). El hijo debe ser el <input>. */
export function InputAffix({ start, end, children }: { start?: string; end?: string; children: ReactNode }) {
  const style = {
    ...(start ? { '--affix-start': reservar(start) } : {}),
    ...(end ? { '--affix-end': reservar(end) } : {}),
  } as CSSProperties;
  return (
    <div className={styles.affix} style={style}>
      {start && (
        <span className={`${styles.affixText} ${styles.affixStart}`} aria-hidden="true">
          {start}
        </span>
      )}
      {children}
      {end && (
        <span className={`${styles.affixText} ${styles.affixEnd}`} aria-hidden="true">
          {end}
        </span>
      )}
    </div>
  );
}
