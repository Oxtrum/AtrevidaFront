import styles from './FilterBar.module.css';

/** Contenedor de filtros sobre una tabla. Hijos: <FilterBar.Item label="…">control</FilterBar.Item>. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className={styles.bar}>{children}</div>;
}

function Item({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={`${styles.item} ${grow ? styles.grow : ''}`}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}

/** Acción principal (p. ej. "Nuevo ítem") como una celda más de la cuadrícula: ocupa su ancho y alinea con los controles. */
function Action({ children, full }: { children: React.ReactNode; full?: boolean }) {
  return <div className={`${styles.action} ${full ? styles.actionFull : ''}`}>{children}</div>;
}

FilterBar.Item = Item;
FilterBar.Action = Action;
