'use client';

import { useState } from 'react';
import type { Empleado } from '@/types/rrhh';
import styles from './RRHHPanel.module.css';

interface EmpleadoAvatarProps {
  empleado: Pick<Empleado, 'nombre' | 'apellido' | 'foto_url'>;
}

/** Foto del empleado en círculo; sin foto (o si la URL firmada ya caducó) muestra sus iniciales. */
export function EmpleadoAvatar({ empleado }: EmpleadoAvatarProps) {
  const [fallida, setFallida] = useState(false);
  const iniciales = `${empleado.nombre.charAt(0)}${empleado.apellido.charAt(0)}`.toUpperCase();

  if (empleado.foto_url && !fallida) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3, temporal
      <img
        src={empleado.foto_url}
        alt=""
        className={styles.avatar}
        loading="lazy"
        decoding="async"
        onError={() => setFallida(true)}
      />
    );
  }
  return (
    <span className={`${styles.avatar} ${styles.avatarIniciales}`} aria-hidden="true">
      {iniciales}
    </span>
  );
}
