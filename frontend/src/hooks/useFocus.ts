import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useFocusParam(): { focusId: number | null; clearFocus: () => void } {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('focus')
  const focusId = raw && /^\d+$/.test(raw) ? Number(raw) : null
  const clearFocus = useCallback(
    () => setSearchParams({}, { replace: true }),
    [setSearchParams],
  )
  return { focusId, clearFocus }
}
