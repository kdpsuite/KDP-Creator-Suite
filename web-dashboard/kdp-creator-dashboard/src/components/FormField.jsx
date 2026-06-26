import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input.jsx'

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  success,
  helperText,
  required = false,
  disabled = false,
  ...props
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            transition-all duration-200
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${success ? 'border-green-500 focus:ring-green-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          {...props}
        />
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
        {success && !error && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
