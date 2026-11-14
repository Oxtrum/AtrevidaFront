'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

function subscribe() {
  return () => {};
}

function getTarget() {
  return document.querySelector<HTMLElement>('[data-admin="true"]') ?? document.body;
}

function getServerTarget() {
  return null;
}

/**
 * Saca el modal del árbol de la página (que puede crear un stacking context y
 * dejar el sidebar por encima) y lo monta en el scope [data-admin="true"], donde
 * viven las variables de tema.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const target = useSyncExternalStore(subscribe, getTarget, getServerTarget);

  return target ? createPortal(children, target) : null;
}
