'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional back link. Omit for top-level pages. */
  backHref?: string;
  /** Small label with icon shown above the title. */
  kicker?: string;
  kickerIcon?: React.ReactNode;
  /** Substring of `title` rendered with the brand gradient. */
  accentWord?: string;
  actions?: React.ReactNode;
}

/** Renders the title with `accentWord` (if present) wrapped in a gradient span. */
function renderTitle(title: string, accentWord?: string) {
  if (!accentWord || !title.includes(accentWord)) return title;
  const [before, ...rest] = title.split(accentWord);
  const after = rest.join(accentWord);
  return (
    <>
      {before}
      <span className={styles.accent}>{accentWord}</span>
      {after}
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  kicker,
  kickerIcon,
  accentWord,
  actions,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        {backHref && (
          <Link href={backHref} className={styles.backButton} aria-label="Volver">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
        )}
        <div className={styles.titleGroup}>
          {kicker && (
            <span className={styles.kicker}>
              {kickerIcon}
              {kicker}
            </span>
          )}
          <h1 className={styles.title}>{renderTitle(title, accentWord)}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
