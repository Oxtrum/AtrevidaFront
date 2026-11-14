/**
 * Conversión de imágenes a WebP en el navegador, antes de subirlas al storage.
 * Reduce el peso (fotos de celular de 3-8 MB quedan en ~50-150 KB) sin pasar por el backend.
 */

export const IMAGEN_MAX_LADO = 1024;
export const IMAGEN_CALIDAD = 0.82;
/** Límite del archivo original que se acepta para convertir. */
export const IMAGEN_MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
/** Límite del resultado convertido que se sube. */
export const IMAGEN_MAX_WEBP_BYTES = 2 * 1024 * 1024;

export interface ImagenWebp {
  blob: Blob;
  width: number;
  height: number;
  /** Peso del archivo original, para mostrar el ahorro. */
  originalBytes: number;
}

/** Reduce proporcionalmente para que el lado mayor no supere `maxLado`; nunca amplía. */
export function calcularTamano(width: number, height: number, maxLado: number = IMAGEN_MAX_LADO) {
  const escala = Math.min(1, maxLado / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * escala)), height: Math.max(1, Math.round(height * escala)) };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Convierte un archivo de imagen a WebP. Lanza `Error` con un mensaje apto para mostrar al usuario. */
export async function convertirAWebp(file: File): Promise<ImagenWebp> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen');
  if (file.size > IMAGEN_MAX_ORIGINAL_BYTES) {
    throw new Error(`La imagen pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(IMAGEN_MAX_ORIGINAL_BYTES)}`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP');
  }

  try {
    const { width, height } = calcularTamano(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no pudo procesar la imagen');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', IMAGEN_CALIDAD));
    // Los navegadores sin soporte de WebP devuelven PNG en silencio: no se sube eso.
    if (!blob || blob.type !== 'image/webp') throw new Error('Tu navegador no puede convertir a WebP. Actualízalo e intenta de nuevo');
    if (blob.size > IMAGEN_MAX_WEBP_BYTES) {
      throw new Error(`La imagen convertida pesa ${formatBytes(blob.size)}; el máximo es ${formatBytes(IMAGEN_MAX_WEBP_BYTES)}`);
    }
    return { blob, width, height, originalBytes: file.size };
  } finally {
    bitmap.close();
  }
}
