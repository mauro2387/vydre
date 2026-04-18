'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const STORAGE_PREFIX = 'vydre_autosave_'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type UseAutoSaveOptions<T> = {
  /** Stable unique key for this form/entity, e.g. `clinical:${appointmentId}`. */
  key: string
  /** Current form data. Any change (by deep-equality via JSON) re-schedules a save. */
  data: T
  /** Called after `delay`ms of inactivity. May throw; status becomes 'error'. */
  onSave: (data: T) => Promise<void>
  /** Debounce delay in ms. Default 2000. */
  delay?: number
  /** Skip server saves while this is false. localStorage still persists. */
  enabled?: boolean
}

export type UseAutoSaveResult<T> = {
  status: AutoSaveStatus
  lastSaved: Date | null
  /** A draft is an entry in localStorage whose serialized value differs from the
   * `initialData` snapshot captured on mount. */
  hasDraft: boolean
  /** Draft payload if one exists, else null. */
  draft: T | null
  /** Timestamp of when the draft was last written to localStorage. */
  draftSavedAt: Date | null
  /** Remove the draft from localStorage. */
  clearDraft: () => void
  /** Force a save right now (bypasses debounce). */
  flush: () => Promise<void>
}

type StoredDraft<T> = { value: T; savedAt: string }

function readDraft<T>(key: string): StoredDraft<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as StoredDraft<T>
  } catch {
    return null
  }
}

function writeDraft<T>(key: string, value: T): StoredDraft<T> {
  const payload: StoredDraft<T> = { value, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  } catch {
    // storage full / disabled — ignore, in-memory state still works
  }
  return payload
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    /* ignore */
  }
}

/**
 * Auto-save hook with localStorage draft backup.
 *
 * Strategy:
 *   1. Every change writes synchronously to localStorage (instant backup).
 *   2. After `delay`ms of inactivity, calls `onSave` on the server.
 *   3. Exposes `hasDraft`/`draft` so the UI can offer "recover draft?" on mount
 *      when the localStorage copy differs from the initial server data.
 */
export function useAutoSave<T>({
  key,
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveResult<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Snapshot of the initial data so we can detect drafts that diverged from the
  // server state. Stored as JSON to survive non-plain-object values.
  const initialSnapshotRef = useRef<string>('')
  const [draft, setDraft] = useState<T | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    initialSnapshotRef.current = JSON.stringify(data)
    const existing = readDraft<T>(key)
    if (existing && JSON.stringify(existing.value) !== initialSnapshotRef.current) {
      setDraft(existing.value)
      setDraftSavedAt(new Date(existing.savedAt))
    }
    // Only on mount / key change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Debounced server save + immediate localStorage backup.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string>('')
  const latestDataRef = useRef<T>(data)
  latestDataRef.current = data

  useEffect(() => {
    const serialized = JSON.stringify(data)
    if (serialized === lastSerializedRef.current) return
    lastSerializedRef.current = serialized

    // Skip the very first render (serialized === initial snapshot).
    if (serialized === initialSnapshotRef.current) return

    // Instant local backup.
    writeDraft(key, data)

    if (!enabled) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await onSave(latestDataRef.current)
        setStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        console.error('[useAutoSave] save failed:', err)
        setStatus('error')
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // onSave intentionally omitted to avoid re-scheduling on ref churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, delay, enabled])

  const clearDraft = useCallback(() => {
    removeDraft(key)
    setDraft(null)
    setDraftSavedAt(null)
  }, [key])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setStatus('saving')
    try {
      await onSave(latestDataRef.current)
      setStatus('saved')
      setLastSaved(new Date())
      removeDraft(key)
    } catch (err) {
      console.error('[useAutoSave] flush failed:', err)
      setStatus('error')
      throw err
    }
  }, [onSave, key])

  return {
    status,
    lastSaved,
    hasDraft: draft !== null,
    draft,
    draftSavedAt,
    clearDraft,
    flush,
  }
}
