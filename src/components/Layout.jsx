import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Layout() {
  console.log('Layout: render iniziato')
  
  const auth = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  console.log('Layout: auth =', {
    loading: auth?.loading,
    persona: auth?.persona?.nome,
    ruolo: auth?.ruolo
  })

  const handleLogout = async () => {
    setShowMenu(false)
    try {
      await auth?.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Valori sicuri
  const nome = auth?.persona?.nome || 'Utente'
  const cognome = auth?.persona?.cognome || ''
  const ruolo = auth?.assegnazione?.ruolo || 'N/A'
  const progettoNome = auth?.progetto?.nome || 'Presenze Cantiere'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header semplice */}
      <header className="sticky top-0 z-40 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{progettoNome}</h1>
            <p className="text-xs text-gray-500">{nome} {cognome} • {ruolo}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setShowMenu(!showMenu)} 
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {showMenu ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Menu dropdown semplice */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black bg-opacity-20" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="fixed right-4 top-16 bg-white rounded-xl shadow-xl border py-2 w-56 z-50">
            <button 
              type="button" 
              onClick={() => { setShowMenu(false); navigate('/ferie'); }} 
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left"
            >
              <span>📅</span>
              <span>Ferie</span>
            </button>
            <button 
              type="button" 
              onClick={() => { setShowMenu(false); navigate('/impostazioni'); }} 
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 w-full text-left"
            >
              <span>⚙️</span>
              <span>Impostazioni</span>
            </button>
            <div className="border-t my-1"></div>
            <button 
              type="button" 
              onClick={handleLogout} 
              className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left"
            >
              <span>🚪</span>
              <span>Esci</span>
            </button>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation semplice */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t px-2 py-2 flex justify-around">
        <NavLink
          to="/"
          className={({ isActive }) => `flex flex-col items-center py-1 px-2 rounded-lg ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
        >
          <span>🏠</span>
          <span className="text-xs mt-0.5">Home</span>
        </NavLink>
        <NavLink
          to="/checkin"
          className={({ isActive }) => `flex flex-col items-center py-1 px-2 rounded-lg ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
        >
          <span>📍</span>
          <span className="text-xs mt-0.5">Check-in</span>
        </NavLink>
        <NavLink
          to="/team"
          className={({ isActive }) => `flex flex-col items-center py-1 px-2 rounded-lg ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
        >
          <span>👥</span>
          <span className="text-xs mt-0.5">Team</span>
        </NavLink>
      </nav>
    </div>
  )
}
