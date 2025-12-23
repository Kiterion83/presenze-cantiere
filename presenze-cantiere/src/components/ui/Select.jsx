/**
 * Componente Select
 * Menu a tendina stilizzato
 * 
 * Props:
 * - label: etichetta sopra il select
 * - value: valore corrente
 * - onChange: handler cambio (riceve il value)
 * - options: array di { value, label } oppure array di stringhe
 * - placeholder: testo quando nessuna selezione
 * - error: messaggio errore
 * - disabled: boolean
 * - required: boolean
 * - fullWidth: boolean
 */

import { ChevronDown } from 'lucide-react'

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Seleziona...',
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  ...props
}) {
  // Normalizza options (accetta sia stringhe che oggetti)
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={`
            w-full appearance-none rounded-lg border bg-white px-4 py-2.5 pr-10
            text-gray-900 transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={20}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// Input text styled
export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-lg border bg-white px-4 py-2.5
          text-gray-900 transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// Textarea styled
export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-lg border bg-white px-4 py-2.5
          text-gray-900 transition-colors resize-none
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
