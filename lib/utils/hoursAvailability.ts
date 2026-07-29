/**
 * Estado de un slot en el selector de horas.
 *
 * Cada formulario (público, admin crear, admin editar) arma su propio
 * `Map<string, SlotStatus>`: las reglas de capacidad dependen del local, del
 * tipo de espacio y de las reservas ya cargadas. Acá vive únicamente el tipo
 * compartido entre esos formularios y `TimeSlotPicker`.
 */
export type SlotStatus = 'free' | 'occupied' | 'past' | 'closed';
