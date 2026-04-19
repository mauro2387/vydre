'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Búsqueda global' },
  { keys: ['N'], description: 'Nuevo turno (en Agenda)' },
  { keys: ['P'], description: 'Buscar paciente (en Pacientes)' },
  { keys: ['?'], description: 'Mostrar atajos de teclado' },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>
            Accesos rápidos disponibles en el dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <div className="flex gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
