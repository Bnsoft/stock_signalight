"use client"

import { ValidationError } from "@/utils/validation"
import { AlertCircle } from "lucide-react"

interface FormErrorProps {
  errors: ValidationError[]
  field?: string
}

export function FormError({ errors, field }: FormErrorProps) {
  const relevantErrors = field
    ? errors.filter((e) => e.field === field)
    : errors

  if (relevantErrors.length === 0) return null

  return (
    <div className="space-y-1">
      {relevantErrors.map((error, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 p-2 bg-red-600/10 border border-red-600 rounded text-red-600 text-sm"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      ))}
    </div>
  )
}

interface FormFieldProps {
  label: string
  error?: ValidationError
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  )
}
