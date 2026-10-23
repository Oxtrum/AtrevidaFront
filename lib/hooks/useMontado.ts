import { useSyncExternalStore } from 'react';

const suscribir = () => () => {};

/**
 * `false` en el servidor y durante la hidratación, `true` ya en el cliente.
 * Sirve para no pintar nada que dependa de la fecha/hora actual en el primer
 * render: el servidor y el navegador no coinciden en zona horaria ni en hora.
 */
export function useMontado(): boolean {
  return useSyncExternalStore(suscribir, () => true, () => false);
}
