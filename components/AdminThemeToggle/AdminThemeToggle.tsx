'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './AdminThemeToggle.module.css';

type AdminTheme = 'dark' | 'light';

interface AdminThemeToggleProps {
  className?: string;
}

const STORAGE_KEY = 'atrevida-admin-theme';

function getStoredTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function AdminThemeToggle({ className = '' }: AdminThemeToggleProps) {
  const [theme, setTheme] = useState<AdminTheme>(getStoredTheme);
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
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
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
