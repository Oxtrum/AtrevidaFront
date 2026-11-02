export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Tamano {
  width: number;
  height: number;
}

export interface PosicionPopover {
  left: number;
  top: number;
  lugar: 'abajo' | 'arriba';
}

const SEPARACION = 8;
const BORDE = 12;

/**
 * Donde poner un popover fijo respecto de su ancla: debajo y alineado a su borde izquierdo; arriba si abajo no
 * cabe y arriba si. Si no cabe en ninguno va del lado con mas espacio, sin salirse de la pantalla.
 */
export function posicionPopover(ancla: Rect, popover: Tamano, pantalla: Tamano): PosicionPopover {
  const left = Math.max(BORDE, Math.min(ancla.left, pantalla.width - popover.width - BORDE));

  const topAbajo = ancla.bottom + SEPARACION;
  const topArriba = ancla.top - SEPARACION - popover.height;
  const cabeAbajo = topAbajo + popover.height <= pantalla.height - BORDE;
  const cabeArriba = topArriba >= BORDE;

  if (cabeAbajo) return { left, top: topAbajo, lugar: 'abajo' };
  if (cabeArriba) return { left, top: topArriba, lugar: 'arriba' };

  const espacioAbajo = pantalla.height - ancla.bottom;
  const espacioArriba = ancla.top;
  if (espacioAbajo >= espacioArriba) {
    return { left, top: Math.max(BORDE, Math.min(topAbajo, pantalla.height - popover.height - BORDE)), lugar: 'abajo' };
  }
  return { left, top: Math.max(BORDE, topArriba), lugar: 'arriba' };
}
