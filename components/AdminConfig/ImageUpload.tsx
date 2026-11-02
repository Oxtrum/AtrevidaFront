'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { CircleCheck, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { convertirAWebp, formatBytes } from '@/lib/utils/imageToWebp';
import { FormField } from './FormField';
import styles from './ImageUpload.module.css';

/** Lo que el formulario padre necesita saber: subir `blob` (ya en WebP) o quitar la imagen guardada. */
export interface ImagenSeleccion {
  blob: Blob | null;
  quitar: boolean;
}

interface ImageUploadProps {
  id: string;
  label?: string;
  /** URL de la imagen ya guardada (null/undefined si no tiene). */
  currentUrl?: string | null;
  /** square = recuadro que llena la columna (productos); avatar = círculo centrado (personas). */
  shape?: 'square' | 'avatar';
  /** Ícono del estado vacío; por defecto un "agregar imagen". */
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  /** Texto alternativo de la imagen mostrada. */
  alt?: string;
  disabled?: boolean;
  onChange: (seleccion: ImagenSeleccion) => void;
  /** Avisa mientras se convierte a WebP, para bloquear el guardado. */
  onBusyChange?: (busy: boolean) => void;
}

interface ImagenNueva {
  blob: Blob;
  previewUrl: string;
  originalBytes: number;
}

/**
 * Zona de subida de imagen para formularios admin: arrastrar o elegir, convierte a WebP en el
 * navegador y muestra vista previa. No sube nada: entrega el blob al padre, que lo sube al guardar.
 * Vive dentro de un FormModal, que se desmonta al cerrar, así que cada apertura empieza limpia.
 */
export function ImageUpload({
  id,
  label = 'Imagen',
  currentUrl,
  shape = 'square',
  emptyIcon,
  emptyTitle = 'Subir imagen',
  emptyHint = 'Arrastra una imagen aquí o haz clic para elegir',
  alt = 'Imagen',
  disabled = false,
  onChange,
  onBusyChange,
}: ImageUploadProps) {
  const [nueva, setNueva] = useState<ImagenNueva | null>(null);
  const [quitada, setQuitada] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (nueva) URL.revokeObjectURL(nueva.previewUrl);
    };
  }, [nueva]);

  useEffect(() => {
    onBusyChange?.(convirtiendo);
  }, [convirtiendo, onBusyChange]);

  const bloqueado = convirtiendo || disabled;
  const src = nueva?.previewUrl ?? (quitada ? null : currentUrl ?? null);
  const esAvatar = shape === 'avatar';

  const procesar = async (file: File) => {
    setConvirtiendo(true);
    setError(undefined);
    try {
      const webp = await convertirAWebp(file);
      setNueva({ blob: webp.blob, previewUrl: URL.createObjectURL(webp.blob), originalBytes: webp.originalBytes });
      setQuitada(false);
      onChange({ blob: webp.blob, quitar: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen');
    } finally {
      setConvirtiendo(false);
    }
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void procesar(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (bloqueado) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void procesar(file);
  };

  const abrir = () => {
    if (!bloqueado) fileInputRef.current?.click();
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrir();
    }
  };

  const quitar = () => {
    setNueva(null);
    setQuitada(true);
    setError(undefined);
    onChange({ blob: null, quitar: true });
  };

  const acciones = src && (
    <div className={esAvatar ? styles.avatarActions : styles.previewActions}>
      <button type="button" className={styles.actionBtn} onClick={abrir} disabled={bloqueado} aria-label="Cambiar imagen" title="Cambiar imagen">
        <ImagePlus size={15} strokeWidth={2} />
        {esAvatar && 'Cambiar'}
      </button>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
        onClick={quitar}
        disabled={bloqueado}
        aria-label="Quitar imagen"
        title="Quitar imagen"
      >
        <Trash2 size={15} strokeWidth={2} />
        {esAvatar && 'Quitar'}
      </button>
    </div>
  );

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <div className={`${styles.root} ${esAvatar ? styles.rootAvatar : ''}`}>
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          className={styles.visuallyHidden}
          onChange={handleInput}
          tabIndex={-1}
        />
        <div
          className={[
            styles.dropzone,
            esAvatar ? styles.dropzoneAvatar : '',
            src ? styles.dropzoneFilled : '',
            arrastrando ? styles.dropzoneActive : '',
          ].join(' ')}
          role={src ? undefined : 'button'}
          tabIndex={src ? undefined : 0}
          aria-label={src ? undefined : emptyTitle}
          onClick={src ? undefined : abrir}
          onKeyDown={src ? undefined : handleKey}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
        >
          {src ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL de S3 o blob local; el dominio aún no es fijo */}
              <img src={src} alt={alt} className={styles.previewImg} />
              {!esAvatar && acciones}
            </>
          ) : (
            <>
              <span className={styles.emptyIcon} aria-hidden="true">
                {emptyIcon ?? <ImagePlus size={20} strokeWidth={1.75} />}
              </span>
              <span className={styles.emptyTitle}>{emptyTitle}</span>
              {!esAvatar && <span className={styles.emptyHint}>{emptyHint}</span>}
            </>
          )}
          {convirtiendo && (
            <div className={styles.processing} role="status">
              <Loader2 size={22} strokeWidth={2} className={styles.spin} />
              Procesando…
            </div>
          )}
        </div>
        {esAvatar && acciones}
        {nueva && (
          <div className={styles.meta}>
            <CircleCheck size={14} strokeWidth={2} className={styles.metaOk} />
            {formatBytes(nueva.originalBytes)} → {formatBytes(nueva.blob.size)}
          </div>
        )}
        {quitada && currentUrl && !nueva && <div className={styles.meta}>Se quitará al guardar</div>}
        {esAvatar && !src && <span className={styles.avatarHint}>{emptyHint}</span>}
      </div>
    </FormField>
  );
}
