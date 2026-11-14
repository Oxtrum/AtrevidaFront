'use client';

import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { formatPhoneForDisplay, resolvePhoneE164 } from '@/lib/utils/phone';
import { buildWhatsappUrl } from '@/lib/utils/whatsapp';
import styles from './ContactoCliente.module.css';

interface ContactoClienteProps {
  telefono?: string | null;
  telefonoE164?: string | null;
}

/** Telefono de un cliente con un enlace a WhatsApp. Unico lugar donde se muestra un telefono de cliente. */
export function ContactoCliente({ telefono, telefonoE164 }: ContactoClienteProps) {
  const mostrado = formatPhoneForDisplay(telefonoE164, telefono);
  if (!mostrado) return <span className={styles.vacio}>Sin teléfono</span>;

  const whatsapp = buildWhatsappUrl(resolvePhoneE164(telefonoE164, telefono));

  return (
    <span className={styles.contacto}>
      <a className={styles.telefono} href={`tel:${telefonoE164 || telefono || ''}`} title="Llamar">
        {mostrado}
      </a>
      {whatsapp && (
        <a className={styles.whatsapp} href={whatsapp} target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp">
          <WhatsappIcon size={14} />
          WhatsApp
        </a>
      )}
    </span>
  );
}
