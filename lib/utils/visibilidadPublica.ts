/**
 * La sección de paquetes de la página principal se muestra por defecto: solo
 * se oculta si el backend responde `mostrar_paquetes: false`. Si la consulta
 * falla no se esconde el catálogo por error.
 */
export function mostrarSeccionPaquetes(config: { mostrar_paquetes?: boolean } | null | undefined): boolean {
  return config?.mostrar_paquetes !== false;
}

/** Textos del chip, de la acción del menú y del tooltip de visibilidad de un paquete. */
export function textosVisibilidadPaquete(visiblePublico: boolean | undefined): { chip: string; accion: string; ayuda: string } {
  if (visiblePublico === false) {
    return {
      chip: 'Oculto al público',
      accion: 'Mostrar en la página principal',
      ayuda: 'El paquete no aparece en la página principal. Sigue activo en administración, reservas y caja. Clic para mostrarlo.',
    };
  }
  return {
    chip: 'En página principal',
    accion: 'Ocultar de la página principal',
    ayuda: 'El paquete se ve en la página principal. Si lo ocultas sigue disponible en administración, reservas y caja. Clic para ocultarlo.',
  };
}
