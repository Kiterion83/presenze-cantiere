import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const location = useLocation()
  const { persona, progetto, ruolo, testRoleOverride, setTestRole, signOut, isAtLeast } = useAuth()

  const menuItems = [
    { path: '/', label: 'Home', emoji: '🏠', minRole: 'helper' },
    { path: '/checkin', label: 'Check-in', emoji: '📍', minRole: 'helper' },
    { path: '/calendario', label: 'Calendario', emoji: '📅', minRole: 'helper' },
    { path: '/ferie', label: 'Ferie', emoji: '🏖️', minRole: 'helper' },
    { path: '/team', label: 'Team', emoji: '👥', minRole: 'foreman' },
    { path: '/rapportino', label: 'Rapportino', emoji: '📝', minRole: 'foreman' },
    { path: '/documenti', label: 'Documenti', emoji: '📁', minRole: 'foreman' },
    { path: '/notifiche', label: 'Notifiche', emoji: '🔔', minRole: 'supervisor' },
    { path: '/trasferimenti', label: 'Trasferimenti', emoji: '🔄', minRole: 'cm' },
    { path: '/statistiche', label: 'Statistiche', emoji: '📊', minRole: 'supervisor' },
    { path: '/impostazioni', label: 'Impostazioni', emoji: '⚙️', minRole: 'cm' },
  ]

  const visibleMenuItems = menuItems.filter(item => isAtLeast(item.minRole))

  const roles = [
    { value: '', label: 'Ruolo reale' },
    { value: 'admin', label: 'Admin' },
    { value: 'cm', label: 'CM' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'foreman', label: 'Foreman' },
    { value: 'office', label: 'Office' },
    { value: 'helper', label: 'Helper' },
  ]

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      cm: 'bg-purple-100 text-purple-700 border-purple-200',
      supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
      foreman: 'bg-green-100 text-green-700 border-green-200',
      office: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">🏗️ Presenze Cantiere</h1>
          <p className="text-sm text-gray-500 mt-1 truncate">{progetto?.nome}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <label className="block text-xs font-medium text-amber-700 mb-1">🧪 Test Ruolo</label>
            <select
              value={testRoleOverride || ''}
              onChange={(e) => setTestRole(e.target.value || null)}
              className="w-full px-2 py-1.5 text-sm border border-amber-300 rounded-lg bg-white"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
              {persona?.nome?.[0]}{persona?.cognome?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{persona?.nome} {persona?.cognome}</p>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor(ruolo)}`}>
                {ruolo?.toUpperCase()}{testRoleOverride && ' 🧪'}
              </span>
            </div>
          </div>
          
          <button onClick={signOut} className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 truncate">{progetto?.nome || 'Presenze Cantiere'}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 truncate">{persona?.nome} {persona?.cognome}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor(ruolo)}`}>
                {ruolo?.toUpperCase()}{testRoleOverride && '🧪'}
              </span>
            </div>
          </div>
          <select
            value={testRoleOverride || ''}
            onChange={(e) => setTestRole(e.target.value || null)}
            className="ml-2 px-2 py-1 text-xs border border-amber-300 rounded-lg bg-amber-50"
          >
            {roles.map(r => (
              <option key={r.value} value={r.value}>{r.label || 'Reale'}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around items-center py-2">
          {visibleMenuItems.slice(0, 5).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-3 py-2 ${
                location.pathname === item.path ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          ))}
          {visibleMenuItems.length > 5 && (
            <Link to="/menu" className="flex flex-col items-center px-3 py-2 text-gray-500">
              <span className="text-xl">☰</span>
              <span className="text-xs mt-0.5">Altro</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  )
}
