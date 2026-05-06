import styles from './Shared.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  helper,
  error,
  fullWidth = false,
  className = '',
  ...props
}: InputProps) {
  const wrapperClass = [
    styles.inputWrapper,
    fullWidth && styles.fullWidth,
    error && styles.hasError,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      {label && <label className={styles.inputLabel}>{label}</label>}
      <input
        className={styles.input}
        {...props}
      />
      {helper && !error && <span className={styles.helperText}>{helper}</span>}
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
