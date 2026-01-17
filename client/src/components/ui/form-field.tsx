import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'
import { Input } from './input'
import { Textarea } from './textarea'
import { AlertCircle } from 'lucide-react'

export interface FormFieldProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'password' | 'url'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  multiline?: boolean
  rows?: number
  className?: string
  autoComplete?: string
}

// Validation helpers
export const validators = {
  email: (value: string): string | undefined => {
    if (!value) return undefined
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Formato de email invalido'
    }
    return undefined
  },
  phone: (value: string): string | undefined => {
    if (!value) return undefined
    // Accept various formats: +52 123 456 7890, 1234567890, etc.
    const cleaned = value.replace(/[\s\-\(\)]/g, '')
    if (cleaned.length < 10) {
      return 'El telefono debe tener al menos 10 digitos'
    }
    if (!/^[\+]?[0-9]+$/.test(cleaned)) {
      return 'El telefono solo debe contener numeros'
    }
    return undefined
  },
  required: (value: string, fieldName: string): string | undefined => {
    if (!value || !value.trim()) {
      return `${fieldName} es obligatorio`
    }
    return undefined
  },
}

export function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  multiline = false,
  rows = 3,
  className,
  autoComplete,
}: FormFieldProps) {
  const inputId = `field-${id}`
  const errorId = `${inputId}-error`
  const hasError = !!error

  const inputClasses = cn(
    hasError && 'border-destructive focus-visible:ring-destructive'
  )

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {multiline ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
      ) : (
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete={autoComplete}
        />
      )}
      
      {hasError && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  )
}

// Hook for form validation
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: string) => string | undefined>>
) {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({})

  const setValue = (field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    
    // Validate on change if field was touched
    if (touched[field]) {
      const rule = validationRules[field]
      if (rule) {
        const error = rule(value)
        setErrors((prev) => ({ ...prev, [field]: error }))
      }
    }
  }

  const setFieldTouched = (field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    
    // Validate when field loses focus
    const rule = validationRules[field]
    if (rule) {
      const error = rule(values[field])
      setErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    for (const field of Object.keys(validationRules) as (keyof T)[]) {
      const rule = validationRules[field]
      if (rule) {
        const error = rule(values[field])
        if (error) {
          newErrors[field] = error
          isValid = false
        }
      }
    }

    setErrors(newErrors)
    setTouched(
      Object.keys(validationRules).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      )
    )

    return isValid
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
  }
}
