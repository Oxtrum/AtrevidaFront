/**
 * Estado de un slot en el selector de horas.
 *
 * Cada formulario (público, admin crear, admin editar) arma su propio
 * `Map<string, SlotStatus>`: las reglas de capacidad dependen del local, del
 * tipo de espacio y de las reservas ya cargadas. Acá viven el tipo compartido
 * entre esos formularios y `TimeSlotPicker`, y el cálculo de capacidad, que
 * tiene que coincidir con el que hace el backend al validar.
 */
export type SlotStatus = 'free' | 'occupied' | 'past' | 'closed';

/** Forma mínima del local que devuelve `/bd/locales` para calcular capacidad. */
export interface LocalConEspacios {
    nombre: string;
    espacios?: Array<{ tipo_espacio: string; cantidad_espacios: number }> | null;
}

/**
 * Cuántos ambientes de `tipo` ('M' | 'B') tiene el local.
 *
 * La fuente es `espacios[]`, que el backend arma desde `tipos_espacio_locales`
 * — exactamente la tabla contra la que valida al crear una reserva. Antes acá
 * se leían campos `capacidad_mesas`/`capacidad_bicis` que la API nunca manda,
 * así que siempre caía a un fallback de 3 mesas: el front pintaba libre un
 * horario que el backend después rechazaba por falta de ambientes.
 *
 * Devuelve `null` si el local todavía no cargó o no declara ese tipo: sin dato
 * confiable es preferible no pintar nada como ocupado y dejar que el backend
 * decida, en vez de inventar una capacidad.
 */
export function capacidadDeLocal(
    local: LocalConEspacios | undefined,
    tipo: string,
): number | null {
    if (!local?.espacios?.length) return null;

    const buscado = tipo.toUpperCase().startsWith('B') ? 'B' : 'M';
    const espacio = local.espacios.find(
        e => e.tipo_espacio?.toUpperCase() === buscado,
    );
    if (!espacio) return null;

    return espacio.cantidad_espacios;
}

/**
 * Normaliza una hora del backend al formato de la rejilla: las columnas TIME
 * de PostgreSQL llegan como "15:00:00" y `HORAS` usa "15:00", así que sin esto
 * el `indexOf` falla y la reserva no se cuenta como ocupación.
 */
export function normalizarHoraSlot(hora: string | undefined | null): string {
    if (!hora) return '';
    return hora.length > 5 ? hora.slice(0, 5) : hora;
}
