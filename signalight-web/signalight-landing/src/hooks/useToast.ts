import { useState, useCallback, useRef } from "react"

export type ToastType = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

const DEFAULT_DURATION = 3000

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = DEFAULT_DURATION) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const toast: Toast = { id, message, type, duration }

      setToasts((prev) => [...prev, toast])

      if (duration > 0) {
        const timeout = setTimeout(() => {
          removeToast(id)
        }, duration)

        timeoutRefs.current.set(id, timeout)
      }

      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))

    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
  }, [])

  const success = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "success", duration),
    [addToast]
  )

  const error = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "error", duration || 5000),
    [addToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "warning", duration),
    [addToast]
  )

  const info = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "info", duration),
    [addToast]
  )

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}
