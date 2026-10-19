'use client';

import styles from './Tabs.module.css';

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
  /** Contador opcional (ej. alertas). Se oculta si es undefined; el 0 se muestra atenuado. */
  count?: number;
}

interface TabsProps<K extends string> {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
  /** underline = pestañas con subrayado; segmented = barra con fondo propio, visible sobre cualquier superficie. */
  variant?: 'underline' | 'segmented';
}

export function Tabs<K extends string>({ tabs, active, onChange, ariaLabel = 'Secciones', variant = 'segmented' }: TabsProps<K>) {
  return (
    <div className={`${styles.tabs} ${variant === 'segmented' ? styles.segmented : ''}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={`${styles.tab} ${tab.key === active ? styles.active : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined ? <span className={`${styles.count} ${tab.count === 0 ? styles.countZero : ''}`}>{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
