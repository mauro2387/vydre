'use client'

import { useEffect, useState } from 'react'

/**
 * Returns a value that only updates after `delay` ms of no changes.
 * Useful to prevent firing a search on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])

  return debounced
}
