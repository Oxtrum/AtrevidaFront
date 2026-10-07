/**
 * Separa las apariciones de una reserva expandida en slots de 30 minutos.
 * La API repite el mismo ID en cada slot que ocupa; la primera aparición se
 * renderiza como tarjeta principal y las siguientes quedan disponibles para
 * la tarjeta compacta de continuación.
 */
export function separarSlotsContinuacion<T extends { id?: number }>(
    slots: readonly T[],
    idsContinuacion?: ReadonlySet<number>,
): { iniciales: T[]; continuaciones: T[] } {
    if (!idsContinuacion?.size) {
        return { iniciales: [...slots], continuaciones: [] };
    }

    const iniciales: T[] = [];
    const continuaciones: T[] = [];

    for (const slot of slots) {
        if (slot.id != null && idsContinuacion.has(slot.id)) {
            continuaciones.push(slot);
        } else {
            iniciales.push(slot);
        }
    }

    return { iniciales, continuaciones };
}
