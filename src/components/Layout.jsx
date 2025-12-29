import { Outlet, NavLink, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    setShowMenu(false)
    try {
      await signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      alert('Errore durante il logout')
    }
  }

  const handleImpostazioni = () => {
    setShowMenu(false)
    navigate('/impostazioni')
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
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
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
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
          >
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Dropdown menu - OUTSIDE header for better z-index */}
      {showMenu && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/20" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="fixed right-4 top-14 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-52 z-50">
            {isAtLeast('cm') && (
              <button
                type="button"
                onClick={handleImpostazioni}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 w-full text-left active:bg-gray-200"
              >
                <Settings size={20} />
                <span className="font-medium">Impostazioni</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left active:bg-red-100"
            >
              <LogOut size={20} />
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center">
        {visibleNavItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
