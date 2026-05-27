'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import styles from './RowActionsMenu.module.css';

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface RowActionsMenuProps {
  actions: RowAction[];
}

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = actions.length * 40 + 16;
    const openUp = rect.bottom + estimatedHeight > window.innerHeight - 16;
    setPos({
      top: openUp ? rect.top : rect.bottom + 4,
      left: rect.right,
      openUp,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const defaultActions = actions.filter((a) => a.variant !== 'danger');
  const dangerActions = actions.filter((a) => a.variant === 'danger');

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      className={`${styles.menu} ${pos.openUp ? styles.menuUp : ''}`}
      style={{
        position: 'fixed',
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
        left: pos.left,
        transform: 'translateX(-100%)',
        zIndex: 9999,
      }}
    >
      {defaultActions.map((action) => (
        <ActionItem key={action.label} action={action} onClose={() => setOpen(false)} />
      ))}

      {defaultActions.length > 0 && dangerActions.length > 0 && (
        <div className={styles.divider} role="separator" />
      )}

      {dangerActions.map((action) => (
        <ActionItem key={action.label} action={action} onClose={() => setOpen(false)} />
      ))}
    </div>
  ) : null;

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-label="Más acciones"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={14} strokeWidth={2} />
      </button>

      {typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
  );
}

function ActionItem({
  action,
  onClose,
}: {
  action: RowAction;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.item} ${action.variant === 'danger' ? styles.itemDanger : ''}`}
      disabled={action.disabled}
      onClick={() => {
        if (action.disabled) return;
        action.onClick();
        onClose();
      }}
    >
      {action.icon && <span className={styles.itemIcon}>{action.icon}</span>}
      <span className={styles.itemLabel}>{action.label}</span>
    </button>
  );
}
