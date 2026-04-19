'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  UserPlus,
  CalendarX,
  FileText,
  Trash2,
  Mail,
  Key,
  Shield,
  Upload,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AuditLogEntry } from '@/lib/types/database.types'

const actionLabels: Record<string, { label: string; icon: typeof ShieldCheck }> = {
  'auth.login': { label: 'Inicio de sesión', icon: LogIn },
  'auth.logout': { label: 'Cierre de sesión', icon: LogOut },
  'auth.login_failed': { label: 'Intento de sesión fallido', icon: ShieldAlert },
  'auth.2fa_enabled': { label: '2FA habilitado', icon: ShieldCheck },
  'auth.2fa_disabled': { label: '2FA deshabilitado', icon: ShieldAlert },
  'auth.2fa_verified': { label: '2FA verificado', icon: Shield },
  'auth.password_changed': { label: 'Contraseña cambiada', icon: Key },
  'auth.session_revoked': { label: 'Sesión revocada', icon: LogOut },
  'patient.created': { label: 'Paciente creado', icon: UserPlus },
  'patient.updated': { label: 'Paciente actualizado', icon: UserPlus },
  'appointment.created': { label: 'Turno creado', icon: FileText },
  'appointment.cancelled': { label: 'Turno cancelado', icon: CalendarX },
  'clinical_entry.created': { label: 'Nota clínica creada', icon: FileText },
  'clinical_entry.updated': { label: 'Nota clínica actualizada', icon: FileText },
  'file.uploaded': { label: 'Archivo subido', icon: Upload },
  'file.deleted': { label: 'Archivo eliminado', icon: Trash2 },
  'summary.sent': { label: 'Resumen enviado', icon: Mail },
  'reminder.sent': { label: 'Recordatorio enviado', icon: Mail },
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHr < 24) return `Hace ${diffHr}h`
  if (diffDay < 7) return `Hace ${diffDay}d`
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: diffDay > 365 ? 'numeric' : undefined,
  })
}

type Props = {
  has2FA: boolean
  auditEntries: AuditLogEntry[]
}

export function SecurityView({ has2FA, auditEntries }: Props) {
  const [filter, setFilter] = useState<string>('all')

  const filtered =
    filter === 'all'
      ? auditEntries
      : auditEntries.filter((e) => e.action.startsWith(filter))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Seguridad</h1>
        <p className="text-muted-foreground">
          Estado de seguridad y registro de actividad
        </p>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            {has2FA ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Doble factor activo</p>
                  <p className="text-sm text-muted-foreground">
                    Tu cuenta está protegida con 2FA
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <ShieldAlert className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Sin doble factor</p>
                  <p className="text-sm text-muted-foreground">
                    Configuralo en{' '}
                    <a href="/configuracion#2fa" className="text-primary underline">
                      Configuración
                    </a>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{auditEntries.length} eventos registrados</p>
              <p className="text-sm text-muted-foreground">
                Últimos 50 eventos de actividad
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registro de actividad
            </CardTitle>
            <Select
              value={filter}
              onValueChange={(v) => { if (v) setFilter(v) }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="auth">Autenticación</SelectItem>
                <SelectItem value="patient">Pacientes</SelectItem>
                <SelectItem value="appointment">Turnos</SelectItem>
                <SelectItem value="clinical">Notas clínicas</SelectItem>
                <SelectItem value="file">Archivos</SelectItem>
                <SelectItem value="summary">Resúmenes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay eventos para mostrar
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((entry) => {
                const info = actionLabels[entry.action] ?? {
                  label: entry.action,
                  icon: FileText,
                }
                const Icon = info.icon

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{info.label}</span>
                    {entry.ip_address && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {entry.ip_address}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
