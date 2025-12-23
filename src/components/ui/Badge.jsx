/**
 * Componente Badge
 * Etichette colorate per stati, ruoli, categorie
 * 
 * Props:
 * - variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
 * - size: 'sm' | 'md' | 'lg'
 * - children: testo
 * - dot: boolean - mostra pallino colorato
 * - removable: boolean - mostra X per rimuovere
 * - onRemove: function - handler rimozione
 */

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className = '',
}) {
  // Varianti colore
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  // Colori dot
  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
  }

  // Dimensioni
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  )
}

// Badge con contatore (es: notifiche)
export function CountBadge({ count, max = 99, variant = 'danger' }) {
  if (!count || count <= 0) return null
  
  const displayCount = count > max ? `${max}+` : count
  
  const variants = {
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 
        text-xs font-bold rounded-full
        ${variants[variant]}
      `}
    >
      {displayCount}
    </span>
  )
}

// Badge stato approvazione
export function StatoBadge({ stato }) {
  const stati = {
    pending: { variant: 'warning', label: 'In Attesa' },
    approved: { variant: 'success', label: 'Approvato' },
    rejected: { variant: 'danger', label: 'Rifiutato' },
  }

  const config = stati[stato] || stati.pending

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
