'use client';

import { Copy } from 'lucide-react';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { formatPhoneForDisplay, resolvePhoneE164 } from '@/lib/utils/phone';
import { buildWhatsappUrl } from '@/lib/utils/whatsapp';
import styles from './ContactoCliente.module.css';

interface ContactoClienteProps {
  telefono?: string | null;
  telefonoE164?: string | null;
}

/** Telefono de un cliente con sus dos acciones: escribir por WhatsApp y copiar. Unico lugar donde se muestra un telefono de cliente. */
export function ContactoCliente({ telefono, telefonoE164 }: ContactoClienteProps) {
  const mostrado = formatPhoneForDisplay(telefonoE164, telefono);
  if (!mostrado) return <span className={styles.vacio}>Sin teléfono</span>;

  const whatsapp = buildWhatsappUrl(resolvePhoneE164(telefonoE164, telefono));
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mostrado);
      toast.success('Teléfono copiado');
    } catch {
      toast.error('No se pudo copiar el teléfono');
    }
  };

  return (
    <span className={styles.contacto}>
      <a className={styles.telefono} href={`tel:${telefonoE164 || telefono || ''}`} title="Llamar">
        {mostrado}
      </a>
      {whatsapp && (
        <a className={`${styles.boton} ${styles.whatsapp}`} href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="WhatsApp">
          <WhatsappIcon size={15} />
        </a>
      )}
      <button type="button" className={styles.boton} onClick={copiar} aria-label="Copiar teléfono" title="Copiar teléfono">
        <Copy size={13} strokeWidth={1.8} />
      </button>
    </span>
  );
}
