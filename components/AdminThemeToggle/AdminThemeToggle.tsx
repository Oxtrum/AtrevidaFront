'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './AdminThemeToggle.module.css';

type AdminTheme = 'dark' | 'light';

interface AdminThemeToggleProps {
  className?: string;
}

const STORAGE_KEY = 'atrevida-admin-theme';

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function getThemeSnapshot(): AdminTheme {
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function getServerThemeSnapshot(): AdminTheme {
  return 'dark';
}

export function AdminThemeToggle({ className = '' }: AdminThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);
  const isLight = theme === 'light';

  useEffect(() => {
    const adminRoot = document.querySelector<HTMLElement>('[data-admin="true"]');
    adminRoot?.setAttribute('data-admin-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${className}`}
      onClick={() => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: nextTheme }));
      }}
      aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={isLight ? 'Modo oscuro' : 'Modo claro'}
    >
      <span className={styles.iconRail} aria-hidden="true">
        {isLight ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
      </span>
      <span className={styles.toggleText}>{isLight ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
