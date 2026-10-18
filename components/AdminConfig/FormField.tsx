import styles from './FormField.module.css';

interface FormFieldProps {
  label: string;
  /** id del control interno (enlaza el <label>). Para CustomSelect usar `labelId`. */
  htmlFor?: string;
  labelId?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Ocupa las dos columnas dentro de un FormGrid. */
  wide?: boolean;
  children: React.ReactNode;
}

/** Label + control + pista + error. Estiliza input/textarea/select hijos. */
export function FormField({ label, htmlFor, labelId, required, hint, error, wide, children }: FormFieldProps) {
  return (
    <div className={`${styles.field} ${error ? styles.invalid : ''} ${wide ? styles.span2 : ''}`}>
      <label id={labelId} htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  );
}

/** Grilla de 2 columnas (1 en móvil) para formularios en modal. */
export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

/** Bloque rojo de error de envío al pie de un formulario. */
export function FormSubmitError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className={styles.submitError} role="alert">{message}</div>;
}
