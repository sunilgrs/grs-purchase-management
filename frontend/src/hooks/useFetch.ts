import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useFetch<T>(path: string | null, pollIntervalMs?: number): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  useEffect(() => {
    if (!path || !pollIntervalMs) return
    const id = setInterval(() => setTick((t) => t + 1), pollIntervalMs)
    return () => clearInterval(id)
  }, [path, pollIntervalMs])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, reload }
}

export function useApiAction() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setSubmitting(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      return undefined
    } finally {
      setSubmitting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { submitting, error, clearError, run }
}
