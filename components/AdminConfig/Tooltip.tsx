'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ModalPortal } from './ModalPortal';
import styles from './Tooltip.module.css';

interface TooltipProps {
  /** Explicación que aparece al acercar el cursor o enfocar con teclado. */
  content: React.ReactNode;
  /** Encabezado en negrita sobre la explicación (p. ej. el nombre del estado). */
  title?: string;
  children: React.ReactNode;
}

const SHOW_DELAY_MS = 120;
const GAP = 8;
const EDGE = 12;
const HALF_WIDTH = 140;

interface Position {
  left: number;
  top: number;
  below: boolean;
}

/**
 * Popover informativo para etiquetas e iconos que el usuario no entiende a simple vista.
 * Se muestra al pasar el cursor o enfocar (teclado) y se cierra con Esc, scroll o al salir.
 */
export function Tooltip({ content, title, children }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const [pos, setPos] = useState<Position | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const hide = useCallback(() => {
    clearTimer();
    setPos(null);
  }, []);

  const show = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Arriba por defecto; abajo si el elemento está pegado al borde superior.
      const below = rect.top < 110;
      const center = rect.left + rect.width / 2;
      setPos({
        left: Math.min(Math.max(center, HALF_WIDTH + EDGE), window.innerWidth - HALF_WIDTH - EDGE),
        top: below ? rect.bottom + GAP : rect.top - GAP,
        below,
      });
    }, SHOW_DELAY_MS);
  };

  useEffect(() => {
    if (!pos) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', onKeyDown);
    // El popover es fixed: si la página se desplaza o cambia de tamaño quedaría lejos del elemento.
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos, hide]);

  useEffect(() => clearTimer, []);

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.trigger}
        tabIndex={0}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {pos && (
        <ModalPortal>
          <div
            id={id}
            role="tooltip"
            className={styles.tip}
            style={{
              left: pos.left,
              top: pos.top,
              transform: pos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            }}
          >
            {title && <strong>{title}</strong>}
            <span>{content}</span>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
