import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function MenuPage() {
  const location = useLocation()
  const { persona, ruolo, signOut, isAtLeast } = useAuth()

  // Menu items completi
  const menuItems = [
    { path: '/', label: 'Home', emoji: '🏠', minRole: 'helper' },
    { path: '/checkin', label: 'Check-in', emoji: '📍', minRole: 'helper' },
    { path: '/calendario', label: 'Calendario', emoji: '📅', minRole: 'helper' },
    { path: '/ferie', label: 'Ferie e Permessi', emoji: '🏖️', minRole: 'helper' },
    { path: '/team', label: 'Team', emoji: '👥', minRole: 'foreman' },
    { path: '/rapportino', label: 'Rapportino', emoji: '📝', minRole: 'foreman' },
    { path: '/documenti', label: 'Documenti', emoji: '📁', minRole: 'foreman' },
    { path: '/notifiche', label: 'Notifiche', emoji: '🔔', minRole: 'foreman' },
    { path: '/trasferimenti', label: 'Trasferimenti', emoji: '🔄', minRole: 'foreman' },
    { path: '/statistiche', label: 'Statistiche', emoji: '📊', minRole: 'supervisor' },
    { path: '/dashboard', label: 'Dashboard', emoji: '📈', minRole: 'supervisor' },
    { path: '/impostazioni', label: 'Impostazioni', emoji: '⚙️', minRole: 'admin' },
  ]

  const visibleMenuItems = menuItems.filter(item => isAtLeast(item.minRole))

  // Colori badge ruoli
  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      pm: 'bg-pink-100 text-pink-700',
      cm: 'bg-purple-100 text-purple-700',
      supervisor: 'bg-blue-100 text-blue-700',
      dept_manager: 'bg-indigo-100 text-indigo-700',
      foreman: 'bg-green-100 text-green-700',
      office: 'bg-yellow-100 text-yellow-700',
      helper: 'bg-gray-100 text-gray-700',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
        <p className="text-gray-500 text-sm">Tutte le funzionalità</p>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {persona?.nome?.[0]}{persona?.cognome?.[0]}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{persona?.nome} {persona?.cognome}</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(ruolo)}`}>
              {ruolo?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {visibleMenuItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
              location.pathname === item.path
                ? 'bg-blue-50 border-2 border-blue-200'
                : 'bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
            }`}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className={`text-sm font-medium text-center ${
              location.pathname === item.path ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={signOut}
        className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-2xl transition-colors flex items-center justify-center gap-2"
      >
        <span>🚪</span>
        <span>Esci dall'applicazione</span>
      </button>

      {/* Version */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">PTS - Project Tracking System</p>
        <p className="text-xs text-gray-300">v1.0.0</p>
      </div>
    </div>
  )
}
