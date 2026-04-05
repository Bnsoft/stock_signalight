"use client"

import { Toast, useToast } from "@/hooks/useToast"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-green-600" />
      case "error":
        return <AlertCircle size={20} className="text-red-600" />
      case "warning":
        return <AlertTriangle size={20} className="text-yellow-600" />
      case "info":
        return <Info size={20} className="text-blue-600" />
      default:
        return null
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-600/10 border-green-600"
      case "error":
        return "bg-red-600/10 border-red-600"
      case "warning":
        return "bg-yellow-600/10 border-yellow-600"
      case "info":
        return "bg-blue-600/10 border-blue-600"
      default:
        return "bg-gray-600/10 border-gray-600"
    }
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${getBackgroundColor(
        toast.type
      )} animate-in fade-in slide-in-from-top-2`}
    >
      {getIcon(toast.type)}
      <div className="flex-1">
        <p className={`text-sm font-semibold ${getTextColor(toast.type)}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
