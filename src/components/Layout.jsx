import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, MapPin, ClipboardList, Users, Settings, LogOut, Menu, X, BarChart3, ArrowLeftRight, UserCog, Calendar } from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { persona, assegnazione, progetto, signOut, isAtLeast } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    setShowMenu(false)
    await signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Home', show: true },
    { path: '/checkin', icon: MapPin, label: 'Check-in', show: true },
    { path: '/rapportino', icon: ClipboardList, label: 'Rapportino', show: isAtLeast('foreman') },
    { path: '/statistiche', icon: BarChart3, label: 'Stats', show: isAtLeast('foreman') },
    { path: '/team', icon: Users, label: 'Team', show: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{progetto?.nome || 'Presenze Cantiere'}</h1>
            <p className="text-xs text-gray-500">{persona?.nome} {persona?.cognome} • {assegnazione?.ruolo}</p>
          </div>
          <button type="button" onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-gray-100">
            {showMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-50 bg-black bg-opacity-20" onClick={() => setShowMenu(false)} />
          <div className="fixed right-4 top-16 bg-white rounded-xl shadow-xl border py-2 w-56 z-50">
            {isAtLeast('foreman') && (
              <button type="button" onClick={() => { setShowMenu(false); navigate('/trasferimenti'); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left">
                <ArrowLeftRight size={20} />
                <span>Trasferimenti</span>
              </button>
            )}
            {isAtLeast('supervisor') && (
              <button type="button" onClick={() => { setShowMenu(false); navigate('/personale'); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left">
                <UserCog size={20} />
                <span>Gestione Personale</span>
              </button>
            )}
            <button type="button" onClick={() => { setShowMenu(false); navigate('/ferie'); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left">
              <Calendar size={20} />
              <span>Ferie</span>
            </button>
            {isAtLeast('cm') && (
              <button type="button" onClick={() => { setShowMenu(false); navigate('/impostazioni'); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left">
                <Settings size={20} />
                <span>Impostazioni</span>
              </button>
            )}
            <div className="border-t my-1"></div>
            <button type="button" onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left">
              <LogOut size={20} />
              <span>Esci</span>
            </button>
          </div>
        </>
      )}

      <main className="pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t px-2 py-2 flex justify-around">
        {navItems.filter(i => i.show).map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `flex flex-col items-center py-1 px-2 rounded-lg ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
          >
            <Icon size={20} />
            <span className="text-xs mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
