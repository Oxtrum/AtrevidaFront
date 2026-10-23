import { formatMoney } from '@/lib/utils/format';
import type { Planilla } from '@/types/rrhh';
import styles from './PlanillaDesglose.module.css';

interface PlanillaDesgloseProps {
  planilla: Planilla;
  moneda: string;
}

/** Cómo se llega del sueldo base a lo que cobra el empleado y a lo que cuesta a la empresa. */
export function PlanillaDesglose({ planilla: p, moneda }: PlanillaDesgloseProps) {
  const money = (v: number) => formatMoney(v, moneda);
  return (
    <dl className={styles.list}>
      <div className={styles.row}><dt>Sueldo base</dt><dd>{money(p.sueldo_base)}</dd></div>
      {p.bonos_detalle.map((b) => (
        <div key={b.id} className={styles.row}>
          <dt>Bono · {b.tipo_nombre}{b.nota ? <span className={styles.nota}> ({b.nota})</span> : null}</dt>
          <dd className={styles.plus}>+ {money(b.monto)}</dd>
        </div>
      ))}
      {p.descuento_faltas > 0 && (
        <div className={styles.row}><dt>Faltas ({p.dias_falta} {p.dias_falta === 1 ? 'día' : 'días'})</dt><dd className={styles.minus}>− {money(p.descuento_faltas)}</dd></div>
      )}
      <div className={`${styles.row} ${styles.sub}`}><dt>Total ganado</dt><dd>{money(p.total_ganado)}</dd></div>
      {p.aporte_laboral > 0 && <div className={styles.row}><dt>Aportes de ley (empleado)</dt><dd className={styles.minus}>− {money(p.aporte_laboral)}</dd></div>}
      {p.adelantos > 0 && <div className={styles.row}><dt>Adelantos descontados</dt><dd className={styles.minus}>− {money(p.adelantos)}</dd></div>}
      {p.otros_descuentos > 0 && <div className={styles.row}><dt>Otros descuentos</dt><dd className={styles.minus}>− {money(p.otros_descuentos)}</dd></div>}
      <div className={`${styles.row} ${styles.total}`}><dt>Neto a pagar</dt><dd>{money(p.neto_pagar)}</dd></div>
      {p.aporte_patronal > 0 && <div className={styles.row}><dt>Aportes patronales (empresa)</dt><dd>{money(p.aporte_patronal)}</dd></div>}
      <div className={`${styles.row} ${styles.sub}`}><dt>Costo para la empresa</dt><dd>{money(p.costo_empresa)}</dd></div>
    </dl>
  );
}
