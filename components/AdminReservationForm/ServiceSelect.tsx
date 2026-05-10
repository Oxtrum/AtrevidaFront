'use client';

import { CustomSelect } from '../Custom/CustomSelectAdmin';
import styles from './ReservationForm.module.css';

interface ServiceGroup {
  label: string;
  options: { value: string; label: string }[];
}

interface ServiceSelectProps {
  sucursal: string;
  servicio: string;
  groups: ServiceGroup[];
  hasError: boolean;
  onChange: (value: string) => void;
}

export function ServiceSelect({
  sucursal,
  servicio,
  groups,
  hasError,
  onChange,
}: ServiceSelectProps) {
  if (!sucursal) {
    return (
      <div className={styles.servicioPlaceholder}>
        Selecciona una sucursal para ver los servicios disponibles
      </div>
    );
  }

  return (
    <CustomSelect
      value={servicio}
      onChange={onChange}
      groups={groups}
      placeholder="Seleccionar servicio"
      hasError={hasError}
    />
  );
}