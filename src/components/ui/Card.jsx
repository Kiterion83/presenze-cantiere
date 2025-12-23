/**
 * Componente Card
 * Contenitore con ombra e bordi arrotondati
 * 
 * Props:
 * - title: titolo opzionale
 * - subtitle: sottotitolo opzionale
 * - icon: icona opzionale nel header
 * - padding: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 * - children: contenuto
 * - className: classi aggiuntive
 * - headerAction: elemento opzionale a destra del titolo (bottone, etc)
 */

export default function Card({
  children,
  title,
  subtitle,
  icon,
  padding = 'md',
  className = '',
  headerAction,
  ...props
}) {
  // Padding variants
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  const hasHeader = title || subtitle || icon

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
    </div>
  )
}

// Variante Card semplice senza header
export function SimpleCard({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Card statistica con valore grande
export function StatCard({ title, value, subtitle, icon, trend, trendUp, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
