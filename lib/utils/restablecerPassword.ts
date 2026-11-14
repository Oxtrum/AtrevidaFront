export interface ErroresRestablecerPassword {
  nueva?: string;
  confirmar?: string;
}

/** Valida el formulario con que un administrador fija una contraseña nueva a otro usuario. */
export function validarRestablecerPassword(nueva: string, confirmar: string): ErroresRestablecerPassword {
  const errores: ErroresRestablecerPassword = {};
  if (!nueva.trim()) errores.nueva = 'La nueva contraseña es obligatoria';
  if (!confirmar.trim()) errores.confirmar = 'Confirma la nueva contraseña';
  else if (nueva !== confirmar) errores.confirmar = 'Las contraseñas no coinciden';
  return errores;
}
