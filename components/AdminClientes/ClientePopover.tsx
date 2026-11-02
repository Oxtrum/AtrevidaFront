'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Copy, ExternalLink, Link2, TriangleAlert, UserRound } from 'lucide-react';
import { AdminButton } from '@/components/AdminConfig/AdminButton';
import { ModalPortal } from '@/components/AdminConfig/ModalPortal';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { getClienteByID } from '@/lib/api/clientes';
import { formatPhoneForDisplay, resolvePhoneE164 } from '@/lib/utils/phone';
import { posicionPopover, type PosicionPopover } from '@/lib/utils/posicionPopover';
import { buildWhatsappUrl } from '@/lib/utils/whatsapp';
import { VincularReservaModal } from './VincularReservaModal';
import styles from './ClientePopover.module.css';

const RETARDO_ABRIR_MS = 200;
const RETARDO_CERRAR_MS = 120;

/** El CI no viaja con la reserva: se pide una vez por cliente y se recuerda mientras dure la pagina. */
const cedulas = new Map<number, string>();

interface ClientePopoverProps {
  nombre: string;
  telefono?: string;
  telefonoE164?: string;
  /** Cliente registrado. Sin el, la reserva esta por vincular. */
  clienteId?: number | null;
  /** Reserva a la que pertenece el nombre; con ella y sin cliente se puede vincular. */
  reservaId?: number;
  /** Se llama despues de vincular, para que la tabla se recargue. */
  onVinculado?: () => void;
}

/**
 * Nombre de un cliente que se abre en una tarjeta con su telefono, WhatsApp y las acciones frecuentes. Es el
 * unico lugar del panel donde un nombre de cliente se muestra interactivo: tablas y listados lo reutilizan.
 * Se abre con hover, foco de teclado o toque, en un portal para que ningun contenedor lo recorte.
 */
export function ClientePopover({ nombre, telefono, telefonoE164, clienteId, reservaId, onVinculado }: ClientePopoverProps) {
  const router = useRouter();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [fijado, setFijado] = useState(false);
  const [pos, setPos] = useState<PosicionPopover | null>(null);
  const [cedula, setCedula] = useState<string | undefined>(clienteId ? cedulas.get(clienteId) : undefined);
  const [vinculando, setVinculando] = useState(false);

  const sinVincular = !clienteId;
  const puedeVincular = sinVincular && reservaId != null;
  const telefonoMostrado = formatPhoneForDisplay(telefonoE164, telefono);
  const whatsappHref = buildWhatsappUrl(resolvePhoneE164(telefonoE164, telefono));

  const limpiarTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cerrar = useCallback(() => {
    limpiarTimer();
    setAbierto(false);
    setFijado(false);
    setPos(null);
  }, []);

  const programarApertura = () => {
    limpiarTimer();
    timerRef.current = window.setTimeout(() => setAbierto(true), abierto ? 0 : RETARDO_ABRIR_MS);
  };

  const programarCierre = () => {
    if (fijado) return;
    limpiarTimer();
    timerRef.current = window.setTimeout(cerrar, RETARDO_CERRAR_MS);
  };

  useEffect(() => limpiarTimer, []);

  // Posicion: se mide el popover ya montado (oculto) y se coloca antes de pintar.
  useLayoutEffect(() => {
    if (!abierto || !triggerRef.current || !popRef.current) return;
    const ancla = triggerRef.current.getBoundingClientRect();
    const caja = popRef.current.getBoundingClientRect();
    setPos(posicionPopover(ancla, { width: caja.width, height: caja.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [abierto, cedula]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      cerrar();
      triggerRef.current?.focus();
    };
    const alTocarFuera = (e: PointerEvent) => {
      const objetivo = e.target as Node;
      if (triggerRef.current?.contains(objetivo) || popRef.current?.contains(objetivo)) return;
      cerrar();
    };
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('pointerdown', alTocarFuera);
    // El popover es fixed: si la pagina se desplaza o cambia de tamano quedaria lejos de su nombre.
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('pointerdown', alTocarFuera);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto, cerrar]);

  // CI: solo se pide al abrir, y una vez por cliente. Si falla, la tarjeta se queda sin ese dato.
  useEffect(() => {
    if (!abierto || !clienteId || cedulas.has(clienteId)) return;
    let vigente = true;
    getClienteByID(clienteId)
      .then((res) => {
        const ci = res.data?.cliente?.ci ?? '';
        cedulas.set(clienteId, ci);
        if (vigente) setCedula(ci);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [abierto, clienteId]);

  const copiarTelefono = async () => {
    try {
      await navigator.clipboard.writeText(telefonoMostrado);
      toast.success('Teléfono copiado');
    } catch {
      toast.error('No se pudo copiar el teléfono');
    }
  };

  const irA = (ruta: string) => {
    cerrar();
    router.push(ruta);
  };

  const alSalirDelFoco = (e: React.FocusEvent) => {
    const destino = e.relatedTarget as Node | null;
    if (destino && (triggerRef.current?.contains(destino) || popRef.current?.contains(destino))) return;
    if (!fijado) programarCierre();
  };

  // Desde el nombre, Tab entra a la tarjeta aunque viva en el portal, al final del documento.
  const alTeclearEnNombre = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || e.shiftKey || !abierto) return;
    const primero = popRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])');
    if (primero) {
      e.preventDefault();
      primero.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.nombre} ${sinVincular ? styles.nombreSinVincular : ''}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        onMouseEnter={programarApertura}
        onMouseLeave={programarCierre}
        onFocus={programarApertura}
        onBlur={alSalirDelFoco}
        onKeyDown={alTeclearEnNombre}
        onClick={() => {
          if (abierto && fijado) {
            cerrar();
          } else {
            limpiarTimer();
            setAbierto(true);
            setFijado(true);
          }
        }}
      >
        <UserRound className={styles.icono} size={15} strokeWidth={1.8} aria-hidden="true" />
        <span className={styles.texto}>{nombre}</span>
      </button>

      {abierto && (
        <ModalPortal>
          <div
            ref={popRef}
            id={id}
            role="dialog"
            aria-label={`Cliente ${nombre}`}
            className={styles.tarjeta}
            style={{
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              visibility: pos ? 'visible' : 'hidden',
            }}
            onMouseEnter={limpiarTimer}
            onMouseLeave={programarCierre}
            onBlur={alSalirDelFoco}
          >
            <header className={styles.cabecera}>
              <div className={styles.identidad}>
                <strong className={styles.titulo}>{nombre}</strong>
                <p className={styles.contacto}>
                  {telefonoMostrado ? (
                    <a className={styles.telefono} href={`tel:${telefonoE164 ?? telefono ?? ''}`} title="Llamar">
                      {telefonoMostrado}
                    </a>
                  ) : (
                    <span>Sin teléfono</span>
                  )}
                  {cedula && (
                    <>
                      <span className={styles.separador} aria-hidden="true">·</span>
                      <span>CI {cedula}</span>
                    </>
                  )}
                </p>
              </div>
              {telefonoMostrado && (
                <div className={styles.contactos}>
                  {whatsappHref && (
                    <a
                      className={`${styles.mini} ${styles.miniWhatsapp}`}
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Escribir por WhatsApp"
                      title="WhatsApp"
                    >
                      <WhatsappIcon size={17} />
                    </a>
                  )}
                  <button type="button" className={styles.mini} onClick={copiarTelefono} aria-label="Copiar teléfono" title="Copiar teléfono">
                    <Copy size={15} strokeWidth={1.8} />
                  </button>
                </div>
              )}
            </header>

            {sinVincular && (
              <p className={styles.aviso}>
                <TriangleAlert size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>Esta reserva no tiene un cliente registrado.</span>
              </p>
            )}

            {puedeVincular && (
              <div className={styles.acciones}>
                <AdminButton variant="primary" size="sm" fullWidth icon={<Link2 size={15} strokeWidth={1.8} />} onClick={() => setVinculando(true)}>
                  Vincular cliente
                </AdminButton>
              </div>
            )}

            {!sinVincular && (
              <div className={styles.acciones}>
                <AdminButton variant="primary" size="sm" icon={<Banknote size={15} strokeWidth={1.8} />} onClick={() => irA(`/atrevida-gestion/clientes/${clienteId}?cobrar=1`)}>
                  Cobrar
                </AdminButton>
                <AdminButton variant="secondary" size="sm" icon={<ExternalLink size={15} strokeWidth={1.8} />} onClick={() => irA(`/atrevida-gestion/clientes/${clienteId}`)}>
                  Ver cliente
                </AdminButton>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {puedeVincular && (
        <VincularReservaModal
          isOpen={vinculando}
          reservaId={reservaId}
          nombre={nombre}
          telefono={telefono}
          telefonoE164={telefonoE164}
          onClose={() => setVinculando(false)}
          onVinculado={() => {
            setVinculando(false);
            cerrar();
            onVinculado?.();
          }}
        />
      )}
    </>
  );
}
