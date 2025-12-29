import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  MapPin, 
  ClipboardList, 
  Users, 
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { persona, assegnazione, progetto, signOut, isAtLeast } = useAuth()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Navigation items
  const navItems = [
    { path: '/', icon: Home, label: 'Home', show: true },
    { path: '/checkin', icon: MapPin, label: 'Check-in', show: true },
    { path: '/rapportino', icon: ClipboardList, label: 'Rapportino', show: isAtLeast('foreman') },
    { path: '/team', icon: Users, label: 'Team', show: true },
    { path: '/trasferimenti', icon: ArrowLeftRight, label: 'Trasferimenti', show: isAtLeast('foreman') },
  ]

  const visibleNavItems = navItems.filter(item => item.show)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {progetto?.nome || 'Presenze Cantiere'}
            </h1>
            <p className="text-xs text-gray-500">
              {persona?.nome} {persona?.cognome} • {assegnazione?.ruolo}
            </p>
          </div>
          
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-50">
            {isAtLeast('cm') && (
              <NavLink
                to="/impostazioni"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <Settings size={18} />
                <span>Impostazioni</span>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-danger-600 hover:bg-danger-50 w-full"
            >
              <LogOut size={18} />
              <span>Esci</span>
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="page-container">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {visibleNavItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => 
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={22} />
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
