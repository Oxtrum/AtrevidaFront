'use client';

import styles from './Tabs.module.css';

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
  icon?: React.ReactNode;
  /** Contador opcional (ej. alertas). Se oculta si es 0/undefined. */
  count?: number;
}

interface TabsProps<K extends string> {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
}

export function Tabs<K extends string>({ tabs, active, onChange, ariaLabel = 'Secciones' }: TabsProps<K>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel}>
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
          {tab.count ? <span className={styles.count}>{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
