'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import styles from './ImageUploader.module.css';
import { AdminButton } from './AdminButton';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploaderProps {
  /** Imagen ya guardada (URL calculada por el backend). */
  currentUrl?: string | null;
  /** El usuario pidió quitar la imagen guardada. */
  removed?: boolean;
  maxSizeMB?: number;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveChange: (removed: boolean) => void;
  onError?: (message: string) => void;
}

/**
 * Selector de imagen con vista previa. No sube nada: el padre recibe el File y
 * decide cuándo subirlo (en ítems, tras guardar, con el flujo upload-url → PUT → confirmar).
 */
export function ImageUploader({
  currentUrl,
  removed = false,
  maxSizeMB = 3,
  disabled,
  onFileChange,
  onRemoveChange,
  onError,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const setPreviewUrl = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const shown = preview ?? (removed ? null : currentUrl ?? null);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) {
      onError?.('Formato no permitido. Usa JPG, PNG o WebP.');
      return;
    }
    if (picked.size > maxSizeMB * 1024 * 1024) {
      onError?.(`La imagen supera ${maxSizeMB} MB.`);
      return;
    }
    onRemoveChange(false);
    setPreviewUrl(URL.createObjectURL(picked));
    onFileChange(picked);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onFileChange(null);
    if (currentUrl) onRemoveChange(true);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob/URL externa del storage, sin dominio fijo para next/image
          <img src={shown} alt="Vista previa del ítem" className={styles.image} />
        ) : (
          <ImagePlus size={26} strokeWidth={1.4} />
        )}
      </div>
      <div className={styles.actions}>
        <AdminButton variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus size={15} strokeWidth={2} />
          {shown ? 'Cambiar imagen' : 'Subir imagen'}
        </AdminButton>
        {shown && (
          <button type="button" className={styles.remove} onClick={handleRemove} disabled={disabled}>
            <Trash2 size={14} strokeWidth={2} /> Quitar
          </button>
        )}
        <span className={styles.hint}>JPG, PNG o WebP · máx. {maxSizeMB} MB</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className={styles.hiddenInput}
        onChange={handlePick}
        tabIndex={-1}
      />
    </div>
  );
}
