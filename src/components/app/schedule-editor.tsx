'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const dayLabels: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function generateTimeSlots(start: number, end: number): string[] {
  const slots: string[] = []
  for (let hour = start; hour <= end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < end) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

const startTimeSlots = generateTimeSlots(7, 20)
const endTimeSlots = generateTimeSlots(7, 21)

export type DaySchedule = {
  active: boolean
  start: string
  end: string
}

export type ScheduleValue = Record<string, DaySchedule>

export const defaultSchedule: ScheduleValue = {
  monday: { active: true, start: '09:00', end: '18:00' },
  tuesday: { active: true, start: '09:00', end: '18:00' },
  wednesday: { active: true, start: '09:00', end: '18:00' },
  thursday: { active: true, start: '09:00', end: '18:00' },
  friday: { active: true, start: '09:00', end: '18:00' },
  saturday: { active: false, start: '09:00', end: '13:00' },
  sunday: { active: false, start: '09:00', end: '13:00' },
}

function getScheduleError(day: DaySchedule): string | null {
  if (!day.active) return null
  const [startH, startM] = day.start.split(':').map(Number)
  const [endH, endM] = day.end.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  if (endMin <= startMin) return 'La hora de fin debe ser posterior al inicio'
  if (endMin - startMin < 60) return 'Diferencia mínima de 1 hora'
  return null
}

export function getScheduleErrors(schedule: ScheduleValue): Record<string, string | null> {
  const errors: Record<string, string | null> = {}
  for (const day of dayKeys) {
    errors[day] = getScheduleError(schedule[day])
  }
  return errors
}

export function hasScheduleErrors(schedule: ScheduleValue): boolean {
  return Object.values(getScheduleErrors(schedule)).some(Boolean)
}

export function ScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: ScheduleValue
  onChange: (newSchedule: ScheduleValue) => void
  disabled?: boolean
}) {
  function updateDay(day: string, field: keyof DaySchedule, val: string | boolean) {
    onChange({
      ...value,
      [day]: { ...value[day], [field]: val },
    })
  }

  const errors = getScheduleErrors(value)

  return (
    <div className="space-y-3">
      {dayKeys.map((day) => {
        const dayData = value[day]
        const error = errors[day]
        return (
          <div key={day}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dayData.active}
                onChange={(e) => updateDay(day, 'active', e.target.checked)}
                className="h-4 w-4 rounded border-input"
                disabled={disabled}
              />
              <span className="w-24 text-sm font-medium">{dayLabels[day]}</span>
              <Select
                value={dayData.start}
                onValueChange={(val) => { if (val) updateDay(day, 'start', val) }}
                disabled={!dayData.active || disabled}
              >
                <SelectTrigger className={`w-28 ${!dayData.active ? 'opacity-40' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {startTimeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">a</span>
              <Select
                value={dayData.end}
                onValueChange={(val) => { if (val) updateDay(day, 'end', val) }}
                disabled={!dayData.active || disabled}
              >
                <SelectTrigger className={`w-28 ${!dayData.active ? 'opacity-40' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {endTimeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="ml-7 mt-1 text-xs text-destructive">{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
