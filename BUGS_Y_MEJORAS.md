# Bugs encontrados y mejoras pendientes

Resultado del testing completo del MVP — Prompt 13, abril 2026.

---

## Bugs corregidos en este prompt

### CRÍTICOS (seguridad)

| # | Bug | Causa | Solución |
|---|-----|-------|----------|
| 1 | `createNotification()` no verificaba que el professionalId perteneciera al usuario autenticado | Función exportada sin auth check | Agregado getUser() + verificación de ownership |
| 2 | `markNotificationRead()` no filtraba por professional_id | Update solo por ID, sin ownership | Agregado filtro `.eq('professional_id', professional.id)` |
| 3 | `updateSummary()` no verificaba ownership del resumen | Update por summaryId sin chain verification | Agregada verificación summary → consultation_note → appointment → professional |

### ALTOS (funcionalidad rota)

| # | Bug | Causa | Solución |
|---|-----|-------|----------|
| 4 | Búsqueda de pacientes no encontraba nombres con acentos ("García", "Pérez") | `.ilike()` de Postgres no normaliza acentos | Creada extensión `unaccent` + función RPC `search_patients()` (migration 006) |
| 5 | Confirmación doble de turno por email permitía re-procesar respuesta | Check `confirmation.response && !r` permitía bypass con ?r= | Cambiado a `confirmation.response` sin condición de `!r` |

### MEDIOS (comportamiento incorrecto)

| # | Bug | Causa | Solución |
|---|-----|-------|----------|
| 6 | Estado vacío del dashboard sin acción sugerida | Faltaba link/botón en el empty state | Agregado link "Ir a la agenda para crear uno" |
| 7 | Estado vacío de historial de paciente sin acción | Faltaba link en empty state | Agregado link "Crear turno" |
| 8 | Mensaje de error "No se encontró el elemento solicitado" impersonal | Tono no coincidía con el resto de la app | Cambiado a "No pudimos encontrar lo que buscás" |

### BAJOS (lint, código muerto)

| # | Bug | Causa | Solución |
|---|-----|-------|----------|
| 9 | Imports no usados: `CardHeader`, `CardTitle`, `Button`, `useCallback` | Código remanente de refactors | Eliminados |
| 10 | Variable `let` que nunca se reasigna en patients.ts | Refactor cambió la lógica de búsqueda | Cambiado a `const` |
| 11 | Función `handleAppointmentCreated()` definida pero nunca usada | Reemplazada por callback inline | Eliminada |
| 12 | `setStep3Done` asignada pero nunca usada | Estado gestionado en flujo diferente | Cambiado a destructuring sin setter |
| 13 | 3 errores de lint `set-state-in-effect` | React Compiler strictness en patrones legítimos | Suprimidos con eslint-disable + comentario explicativo |
| 14 | 2 warnings `react-hooks/incompatible-library` por react-hook-form `watch()` | Incompatibilidad conocida con React Compiler | Suprimidos con eslint-disable + comentario |
| 15 | 1 warning `exhaustive-deps` en debounce effect | Dependencias intencionales para auto-save | Suprimido con eslint-disable + comentario |

---

## Mejoras pendientes (backlog para futuros sprints)

### Alta prioridad

- [ ] **Cron de recordatorios para pacientes sin email**: Actualmente se saltea silenciosamente. Debería generar una notificación in-app para que el profesional sepa que no se pudo enviar.
- [ ] **Paginación en dashboard con muchos turnos**: Con 100+ turnos diarios podría ser lento. Agregar paginación o virtualización.
- [ ] **Rate limiting en API de waitlist**: Actualmente depende solo del frontend (localStorage). Agregar rate limiting server-side con IP.

### Media prioridad

- [ ] **Mobile: textarea en modales puede quedar tapada por teclado virtual**: Agregar `scroll-padding-bottom` o `scrollIntoView()` en focus de inputs dentro de dialogs.
- [ ] **Recuperación de contraseña**: El link "¿Olvidaste tu contraseña?" en login necesita flujo completo de reset.
- [ ] **Paginación en lista de pacientes**: Con 500+ pacientes, la lista carga todos. Agregar infinite scroll o paginación.

### Baja prioridad

- [ ] **Ordenar pacientes por última visita**: Actualmente ordena alfabéticamente. Opción para ver los más recientes primero.
- [ ] **Bulk send de recordatorios**: Enviar recordatorios de todos los turnos de mañana en un solo click.
- [ ] **Indicador de email enviado**: En la agenda, mostrar si ya se envió el recordatorio para cada turno.

---

## Queries verificadas

| Query | Tabla | Índice | Status |
|-------|-------|--------|--------|
| getTodayAppointments | appointments | `idx_appointments_professional_start` | ✅ |
| getPatientDetail | patients | `idx_patients_professional_id` (nuevo) | ✅ |
| getUnreadNotifications | notifications | `idx_notifications_professional_read` | ✅ |
| getRecentActivity | appointments | `idx_appointments_created_at` (nuevo) | ✅ |
| Cron reminders | appointments | `idx_appointments_start_status` (nuevo) | ✅ |
| Messages por profesional | messages | `idx_messages_professional_id` (nuevo) | ✅ |

Nuevos índices en migration 007.

---

## Estado del lint y build

- `npm run lint`: 0 errores, 0 warnings ✅
- `npm run build`: Compilado exitosamente ✅
