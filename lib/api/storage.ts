/**
 * PUT directo de un archivo a una URL firmada del storage (S3).
 * La URL es absoluta y ya lleva la firma: no pasa por apiClient (no se le manda el token del admin).
 * `headers` son los que devolvió el backend: van firmados en la URL y deben enviarse tal cual.
 */
export async function subirAUrlFirmada(uploadUrl: string, archivo: Blob, headers?: Record<string, string>): Promise<void> {
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: headers ?? { 'Content-Type': archivo.type },
      body: archivo,
    });
  } catch {
    throw new Error('No se pudo contactar el almacenamiento de imágenes. Revisa tu conexión o el CORS del bucket');
  }
  if (!res.ok) throw new Error(`El almacenamiento rechazó la imagen (HTTP ${res.status})`);
}
