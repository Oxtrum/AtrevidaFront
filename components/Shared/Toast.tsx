'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Boton dentro del aviso (por ejemplo Enviar WhatsApp). Con href abre un enlace nuevo; despues el aviso se cierra. */
export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface ToastState {
  message: string;
  /** Línea destacada sobre el mensaje (opcional). */
  title?: string;
  type: ToastType;
  isVisible: boolean;
  duration: number;
  action?: ToastAction;
}

let toastTimeout: ReturnType<typeof setTimeout> | undefined;

/** Los errores explican qué hacer y son más largos: necesitan más tiempo en pantalla. */
const DURACION_POR_TIPO: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 8000,
  error: 9000,
};

/**
 * Hook para controlar el Toast globalmente (versión simplificada)
 */
export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
    duration: DURACION_POR_TIPO.success,
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setState({ message, type, isVisible: true, duration: DURACION_POR_TIPO[type] });
  }, []);

  const hideToast = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return { ...state, showToast, hideToast };
};

// Singleton-ish state for global access
let globalShowToast: ((msg: string, type?: ToastType, duration?: number, title?: string, action?: ToastAction) => void) | undefined;

export const toast = {
  success: (msg: string, duration?: number) => globalShowToast?.(msg, 'success', duration),
  error: (msg: string, duration?: number) => globalShowToast?.(msg, 'error', duration),
  info: (msg: string, duration?: number) => globalShowToast?.(msg, 'info', duration),
  /** Aviso que no es un error: la acción se hizo, pero algo requiere atención. */
  warning: (msg: string, options?: { title?: string; duration?: number }) =>
    globalShowToast?.(msg, 'warning', options?.duration, options?.title),
  /** Aviso de exito con un boton: la accion siguiente a lo que se acaba de hacer. */
  successWithAction: (msg: string, options: { title?: string; duration?: number; action: ToastAction }) =>
    globalShowToast?.(msg, 'success', options.duration ?? 15000, options.title, options.action),
};

export default function ToastContainer() {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
    duration: DURACION_POR_TIPO.success,
  });
  const toastRef = useRef<HTMLDivElement>(null);

  const showGlobalToast = useCallback((message: string, type: ToastType = 'success', duration?: number, title?: string, action?: ToastAction) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    const ms = duration ?? DURACION_POR_TIPO[type];
    setState({ message, title, type, isVisible: true, duration: ms, action });

    toastTimeout = setTimeout(() => {
      setState(prev => ({ ...prev, isVisible: false }));
    }, ms);
  }, []);

  useEffect(() => {
    globalShowToast = showGlobalToast;

    return () => {
      if (globalShowToast === showGlobalToast) {
        globalShowToast = undefined;
      }
      if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = undefined;
      }
    };
  }, [showGlobalToast]);

  useEffect(() => {
    if (!toastRef.current) return;

    const ctx = gsap.context(() => {
      if (state.isVisible) {
        gsap.fromTo(
          toastRef.current,
          { x: 100, opacity: 0, scale: 0.9 },
          { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.8)' }
        );
      } else {
        gsap.to(toastRef.current, {
          x: 50,
          opacity: 0,
          scale: 0.9,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    });

    return () => ctx.revert();
  }, [state.isVisible]);

  if (!state.isVisible && !state.message) return null;

  return (
    <div 
      ref={toastRef}
      id="toast-notification" 
      className={`${styles.toast} ${styles[state.type]}`}
      style={{ display: state.isVisible ? 'flex' : 'none' }}
    >
      <div className={styles.iconContainer}>
        {state.type === 'success' && <CheckCircle2 className={styles.icon} />}
        {state.type === 'error' && <XCircle className={styles.icon} />}
        {state.type === 'warning' && <TriangleAlert className={styles.icon} />}
        {state.type === 'info' && <Info className={styles.icon} />}
      </div>
      
      <div className={styles.content}>
        {state.title && <p className={styles.title}>{state.title}</p>}
        <p className={styles.message}>{state.message}</p>
        {state.action && (
          <a
            className={styles.action}
            href={state.action.href}
            target={state.action.href ? '_blank' : undefined}
            rel={state.action.href ? 'noopener noreferrer' : undefined}
            role={state.action.href ? undefined : 'button'}
            onClick={() => {
              state.action?.onClick?.();
              setState(prev => ({ ...prev, isVisible: false }));
            }}
          >
            {state.action.label}
          </a>
        )}
      </div>

      <button onClick={() => setState(prev => ({ ...prev, isVisible: false }))} className={styles.closeBtn}>
        <X size={16} />
      </button>
      
      {/* key: reinicia la animación cuando llega otro toast mientras hay uno visible. */}
      <div key={`${state.type}-${state.message}`} className={styles.progressBar} style={{ animationDuration: `${state.duration}ms` }} />
    </div>
  );
}
