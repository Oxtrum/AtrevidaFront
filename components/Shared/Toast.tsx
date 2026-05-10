'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
}

let toastTimeout: NodeJS.Timeout;

/**
 * Hook para controlar el Toast globalmente (versión simplificada)
 */
export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setState({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return { ...state, showToast, hideToast };
};

// Singleton-ish state for global access
let globalShowToast: (msg: string, type?: ToastType) => void;

export const toast = {
  success: (msg: string) => globalShowToast?.(msg, 'success'),
  error: (msg: string) => globalShowToast?.(msg, 'error'),
  info: (msg: string) => globalShowToast?.(msg, 'info'),
};

export default function ToastContainer() {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const toastRef = useRef<HTMLDivElement>(null);

  globalShowToast = (message: string, type: ToastType = 'success') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    setState({ message, type, isVisible: true });
    
    toastTimeout = setTimeout(() => {
      setState(prev => ({ ...prev, isVisible: false }));
    }, 4000);
  };

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
      </div>
      
      <div className={styles.content}>
        <p className={styles.message}>{state.message}</p>
      </div>

      <button onClick={() => setState(prev => ({ ...prev, isVisible: false }))} className={styles.closeBtn}>
        <X size={16} />
      </button>
      
      <div className={styles.progressBar} />
    </div>
  );
}
