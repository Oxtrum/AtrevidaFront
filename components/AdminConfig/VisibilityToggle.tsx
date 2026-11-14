'use client';

import { Eye, EyeOff } from 'lucide-react';
import { ChoiceChips } from './ChoiceChips';
import { Tooltip } from './Tooltip';
import styles from './VisibilityToggle.module.css';

interface VisibilityToggleProps {
  /** Qué se muestra u oculta, en pocas palabras ("Sección en la web"). */
  label: string;
  visible: boolean;
  onChange: (visible: boolean) => void;
  /** Explicación del efecto de cada estado; se muestra en un tooltip. */
  helpVisible: string;
  helpHidden: string;
  disabled?: boolean;
  /** Motivo por el que no se puede cambiar; reemplaza la explicación mientras está deshabilitado. */
  disabledReason?: string;
}

const OPCIONES = [
  { value: 'visible', label: 'Visible' },
  { value: 'oculto', label: 'Oculto' },
] as const;

/**
 * Interruptor Visible / Oculto con etiqueta y tooltip, para mostrar u ocultar de cara al
 * público algo que sigue existiendo en administración. Pensado para barras de acciones.
 */
export function VisibilityToggle({
  label,
  visible,
  onChange,
  helpVisible,
  helpHidden,
  disabled = false,
  disabledReason,
}: VisibilityToggleProps) {
  const ayuda = disabled && disabledReason ? disabledReason : visible ? helpVisible : helpHidden;
  const Icon = visible ? Eye : EyeOff;

  return (
    <Tooltip title={visible ? 'Visible' : 'Oculto'} content={ayuda}>
      <fieldset className={styles.field} disabled={disabled}>
        <span className={styles.label}>
          <Icon size={14} strokeWidth={2} aria-hidden />
          {label}
        </span>
        <ChoiceChips
          variant="toggle"
          ariaLabel={label}
          options={[...OPCIONES]}
          value={visible ? 'visible' : 'oculto'}
          onChange={(estado) => onChange(estado === 'visible')}
        />
      </fieldset>
    </Tooltip>
  );
}
