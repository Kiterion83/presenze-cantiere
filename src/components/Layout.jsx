import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  MapPin, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  BarChart3, 
  ArrowLeftRight, 
  UserCog,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  Bell
} from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { persona, assegnazione, progetto, signOut, isAtLeast, isTestMode, ruolo, ruoloReale } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    setShowMenu(false)
    await signOut()
    window.location.href = '/login'
  }

  const handleNavigate = (path) => {
    setShowMenu(false)
    navigate(path)
  }

  // Menu items per bottom nav (responsive - meno items su mobile)
  const navItems = [
    { path: '/', icon: Home, label: 'Home', show: true },
    { path: '/checkin', icon: MapPin, label: 'Check-in', show: true },
    { path: '/rapportino', icon: ClipboardList, label: 'Rapportino', show: isAtLeast('foreman') },
    { path: '/statistiche', icon: BarChart3, label: 'Stats', show: isAtLeast('foreman') },
    { path: '/team', icon: Users, label: 'Team', show: true },
  ]

  // Menu items per dropdown (azioni secondarie)
  const menuItems = [
    { path: '/trasferimenti', icon: ArrowLeftRight, label: 'Trasferimenti', show: isAtLeast('foreman') },
    { path: '/personale', icon: UserCog, label: 'Gestione Personale', show: isAtLeast('supervisor') },
    { path: '/ferie', icon: Calendar, label: 'Ferie', show: true },
    { path: '/impostazioni', icon: Settings, label: 'Impostazioni', show: isAtLeast('cm') },
  ]

  // Colore badge ruolo
  const getRoleBadgeColor = () => {
    switch (ruolo) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200'
      case 'cm': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'supervisor': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'foreman': return 'bg-green-100 text-green-700 border-green-200'
      case 'office': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Mode Banner */}
      {isTestMode && isTestMode() && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-center text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle size={16} />
          <span>Test Mode: visualizzazione come <strong>{ruolo?.toUpperCase()}</strong></span>
          <span className="text-amber-200 text-xs">(ruolo reale: {ruoloReale})</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo e info progetto */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="hidden sm:flex p-2 bg-primary-50 rounded-lg">
                <Building2 className="text-primary-600" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                  {progetto?.nome || 'Presenze Cantiere'}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="truncate">{persona?.nome} {persona?.cognome}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor()}`}>
                    {ruolo?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notifiche (placeholder) */}
              <button 
                type="button" 
                className="p-2 rounded-lg hover:bg-gray-100 relative hidden sm:flex"
                onClick={() => handleNavigate('/notifiche')}
              >
                <Bell size={20} className="text-gray-600" />
                {/* Badge notifiche */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Menu hamburger */}
              <button 
                type="button" 
                onClick={() => setShowMenu(!showMenu)} 
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                {showMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" 
            onClick={() => setShowMenu(false)} 
          />
          
          {/* Menu Panel */}
          <div className="fixed right-4 top-16 bg-white rounded-xl shadow-2xl border w-64 z-50 overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="font-medium text-gray-800">{persona?.nome} {persona?.cognome}</p>
              <p className="text-xs text-gray-500">{persona?.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              {menuItems.filter(item => item.show).map(({ path, icon: Icon, label }) => (
                <button 
                  key={path}
                  type="button" 
                  onClick={() => handleNavigate(path)} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left transition-colors"
                >
                  <Icon size={20} className="text-gray-500" />
                  <span className="text-gray-700">{label}</span>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t">
              <button 
                type="button" 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left transition-colors"
              >
                <LogOut size={20} />
                <span>Esci</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="pb-20 min-h-[calc(100vh-120px)]">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg">
        <div className="flex justify-around items-center px-2 py-2 max-w-lg mx-auto">
          {navItems.filter(i => i.show).map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                flex flex-col items-center py-1.5 px-3 rounded-lg transition-all
                ${isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon size={22} />
              <span className="text-xs mt-0.5 font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
        
        {/* Safe area per iPhone */}
        <div className="h-safe-area-bottom bg-white" />
      </nav>
    </div>
  )
}
