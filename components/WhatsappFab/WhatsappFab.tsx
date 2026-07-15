'use client';

import { usePathname } from 'next/navigation';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import styles from './WhatsappFab.module.css';

const PHONE = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '59177411855';
const DEFAULT_MESSAGE = 'Hola Atrevida Fit, quisiera más información sobre sus servicios.';

const HIDDEN_PREFIXES = ['/atrevida-gestion'];

interface WhatsappFabProps {
  /** Override phone number (international format, no `+`). */
  phone?: string;
  /** Prefilled message text. */
  message?: string;
  /** Visible label on wide screens. */
  label?: string;
}

export default function WhatsappFab({
  phone = PHONE,
  message = DEFAULT_MESSAGE,
  label = 'Escríbenos',
}: WhatsappFabProps) {
  const pathname = usePathname() ?? '';
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const href = `https://wa.me/591${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.fab}
      aria-label={`Abrir conversación en WhatsApp con Atrevida Fit (${label})`}
      title="Chatear por WhatsApp"
    >
      <span className={styles.pulse} aria-hidden="true" />
      <WhatsappIcon size={28} color="#fff" />
      <span className={styles.label}>{label}</span>
    </a>
  );
}
