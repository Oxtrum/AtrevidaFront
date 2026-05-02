/**
 * Custom hooks para operaciones de API.
 * 
 * Patrón SOLID:
 * - Cada hook tiene responsabilidad única (fetch, crear, eliminar, etc.)
 * - Los hooks hablan directamente con el API sin pasar por rutas intermediarias
 * - El cliente importa los hooks y los usa, nunca hace fetch directo
 * 
 * Uso:
 * import { useReservas } from '@/lib/hooks';
 * const { data, loading, error, fetch } = useReservas();
 * 
 * await fetch({ local: 'sucursal', semana: 1 });
 */

export { useReservas } from './useReservas';
export { useCrearReserva } from './useCrearReserva';
