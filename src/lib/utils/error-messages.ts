export function parseActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  // Pass through user-friendly messages
  if (message.includes('El paciente no tiene email')) return message
  if (message.includes('Ya tenés un turno en ese horario')) return message

  // Map known patterns
  if (message.includes('already exists')) return 'Ya existe un registro con esos datos'
  if (message.includes('not found') || message.includes('no encontr')) return 'No pudimos encontrar lo que buscás'
  if (message.includes('duplicate key')) return 'Ya existe un registro con esos datos'

  return 'Algo salió mal. Intentá de nuevo.'
}
