import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications, NotificationPermissionBanner } from '../hooks/useNotifications.jsx'

export default function Layout({ children }) {
  const location = useLocation()
  const { persona, progetto, assegnazioni, assegnazione, ruolo, testRoleOverride, setTestRole, signOut, isAtLeast, canAccess, cambiaProgetto } = useAuth()
  const { unreadCount, requestPermission } = useNotifications(persona?.id, assegnazione?.progetto_id)
  
  // Sidebar ridimensionabile
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width')
    return saved ? parseInt(saved) : 256
  })
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)

  // Dropdown progetti
  const [showProgettiDropdown, setShowProgettiDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Menu items con permessi per ruolo - AGGIORNATO con Activities e Warehouse
  const menuItems = [
    { path: '/', label: 'Home', emoji: '🏠', minRole: 'helper' },
    { path: '/checkin', label: 'Check-in', emoji: '📍', minRole: 'helper' },
    { path: '/calendario', label: 'Calendario', emoji: '📅', minRole: 'helper' },
    { path: '/ferie', label: 'Ferie', emoji: '🏖️', minRole: 'helper' },
    { path: '/team', label: 'Team', emoji: '👥', minRole: 'foreman' },
    { path: '/rapportino', label: 'Rapportino', emoji: '📝', minRole: 'foreman' },
    { path: '/documenti', label: 'Documenti', emoji: '📁', minRole: 'foreman' },
    { path: '/notifiche', label: 'Notifiche', emoji: '🔔', minRole: 'foreman' },
    { path: '/activities', label: 'Activities', emoji: '📋', minRole: 'foreman', specialAccess: 'activities' },  // NUOVO
    { path: '/warehouse', label: 'Warehouse', emoji: '📦', minRole: 'warehouse', specialAccess: 'warehouse' },  // NUOVO
    { path: '/trasferimenti', label: 'Trasferimenti', emoji: '🔄', minRole: 'foreman' },
    { path: '/statistiche', label: 'Statistiche', emoji: '📊', minRole: 'supervisor' },
    { path: '/dashboard', label: 'Dashboard', emoji: '📈', minRole: 'supervisor' },
    { path: '/impostazioni', label: 'Impostazioni', emoji: '⚙️', minRole: 'admin' },
  ]

  // AGGIORNATO: Filtra menu items con supporto specialAccess
  const visibleMenuItems = menuItems.filter(item => {
    if (item.specialAccess) {
      return canAccess ? canAccess(item.specialAccess) : isAtLeast(item.minRole)
    }
    return isAtLeast(item.minRole)
  })

  // Lista ruoli con pm, dept_manager, warehouse e engineer
  const roles = [
    { value: '', label: 'Ruolo reale' },
    { value: 'admin', label: 'Admin' },
    { value: 'pm', label: 'PM' },
    { value: 'cm', label: 'CM' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'dept_manager', label: 'Dept Manager' },
    { value: 'engineer', label: 'Engineer' },      // NUOVO
    { value: 'foreman', label: 'Foreman' },
    { value: 'warehouse', label: 'Warehouse' },    // NUOVO
    { value: 'office', label: 'Office' },
    { value: 'helper', label: 'Helper' },
  ]

  // Colori badge ruoli - AGGIORNATO con warehouse e engineer
  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      pm: 'bg-pink-100 text-pink-700 border-pink-200',
      cm: 'bg-purple-100 text-purple-700 border-purple-200',
      supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
      dept_manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      engineer: 'bg-cyan-100 text-cyan-700 border-cyan-200',      // NUOVO
      foreman: 'bg-green-100 text-green-700 border-green-200',
      warehouse: 'bg-amber-100 text-amber-700 border-amber-200',  // NUOVO
      office: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      helper: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Gestione resize sidebar
  const startResizing = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = Math.min(Math.max(e.clientX, 200), 400)
      setSidebarWidth(newWidth)
      localStorage.setItem('sidebar_width', newWidth.toString())
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Chiudi dropdown click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProgettiDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Gestione cambio progetto
  const handleCambiaProgetto = (progettoId) => {
    cambiaProgetto(progettoId)
    setShowProgettiDropdown(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside 
        ref={sidebarRef}
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Header con logo PTS e selettore progetti */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            {/* Logo PTS */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-amber-400 font-bold text-sm">PTS</span>
            </div>
            <div className="min-w-0" style={{ maxWidth: sidebarWidth - 80 }}>
              <span className="font-bold text-blue-900 text-lg">PTS</span>
              <p className="text-xs text-gray-500 truncate">Project Tracking System</p>
            </div>
          </div>
          
          {/* Selettore Progetti */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProgettiDropdown(!showProgettiDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">📁</span>
                <span className="font-medium text-gray-800 truncate text-sm">
                  {progetto?.nome || 'Seleziona progetto'}
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${showProgettiDropdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Dropdown Lista Progetti */}
            {showProgettiDropdown && assegnazioni.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-2 border-b bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {assegnazioni.some(a => a.isVirtual) ? 'Tutti i progetti (Admin)' : 'I tuoi progetti'}
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {assegnazioni.map((ass) => (
                    <button
                      key={ass.id}
                      onClick={() => handleCambiaProgetto(ass.progetto_id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-blue-50 transition-colors ${
                        ass.progetto_id === progetto?.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      } ${ass.isVirtual ? 'bg-amber-50/50' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                        ass.isVirtual 
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                      }`}>
                        {ass.progetto?.codice?.slice(0, 2) || '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate text-sm">{ass.progetto?.nome}</p>
                        <p className="text-xs text-gray-500">
                          {ass.ruolo}
                          {ass.isVirtual && <span className="ml-1 text-amber-600">(accesso admin)</span>}
                        </p>
                      </div>
                      {ass.progetto_id === progetto?.id && (
                        <span className="text-blue-500">✔</span>
                      )}
                    </button>
                  ))}
                </div>
                {assegnazioni.length > 1 && (
                  <div className="p-2 border-t bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">
                      {assegnazioni.length} progetti disponibili
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
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
              <span className="truncate">{item.label}</span>
              {item.path === '/notifiche' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer con Test Ruolo e User */}
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

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors group"
          onMouseDown={startResizing}
        >
          <div className={`absolute top-1/2 right-0 transform -translate-y-1/2 w-4 h-8 bg-gray-300 rounded-l opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${isResizing ? 'opacity-100 bg-blue-400' : ''}`}>
            <span className="text-gray-600 text-xs">⋮</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="lg:transition-all"
        style={{ marginLeft: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '0' }}
      >
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo PTS Mobile */}
              <div className="w-9 h-9 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center shadow">
                <span className="text-amber-400 font-bold text-xs">PTS</span>
              </div>
              <div>
                <p className="font-bold text-blue-900 text-sm">PTS</p>
                {/* Selettore progetti mobile */}
                <button
                  onClick={() => setShowProgettiDropdown(!showProgettiDropdown)}
                  className="flex items-center gap-1 text-xs text-blue-600"
                >
                  <span className="truncate max-w-32">{progetto?.nome}</span>
                  <span>▼</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                to="/notifiche"
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                {persona?.nome?.[0]}{persona?.cognome?.[0]}
              </div>
            </div>
          </div>

          {/* Dropdown mobile */}
          {showProgettiDropdown && (
            <div className="absolute left-4 right-4 mt-2 bg-white rounded-xl shadow-lg border z-50">
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-gray-500">Cambia progetto</p>
              </div>
              {assegnazioni.map((ass) => (
                <button
                  key={ass.id}
                  onClick={() => handleCambiaProgetto(ass.progetto_id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left ${
                    ass.progetto_id === progetto?.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="font-medium text-sm">{ass.progetto?.nome}</span>
                  {ass.progetto_id === progetto?.id && <span className="ml-auto text-blue-500">✔</span>}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Page Content */}
        <div className="pb-20 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="flex justify-around py-2">
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

      {/* Banner permesso notifiche */}
      <NotificationPermissionBanner onEnable={requestPermission} />

      {/* Overlay durante resize */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  )
}
