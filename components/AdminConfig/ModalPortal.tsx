'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Saca el modal del árbol de la página (que puede crear un stacking context y
 * dejar el sidebar por encima) y lo monta en el scope [data-admin="true"], donde
 * viven las variables de tema.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>('[data-admin="true"]') ?? document.body);
  }, []);

  return target ? createPortal(children, target) : null;
}
