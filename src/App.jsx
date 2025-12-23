import { useState } from 'react'
import { Home, FileText, Calendar, BarChart3, LogOut, Menu, X } from 'lucide-react'

// Pages
import HomePage from './pages/HomePage'
import RapportinoPage from './pages/RapportinoPage'
import PresenzePage from './pages/PresenzePage'
import StatistichePage from './pages/StatistichePage'

function App() {
  const [paginaCorrente, setPaginaCorrente] = useState('home')
  const [utente, setUtente] = useState(null)
  const [menuAperto, setMenuAperto] = useState(false)

  // Se non loggato, mostra HomePage (login)
  if (!utente) {
    return <HomePage onLogin={setUtente} />
  }

  // Menu items
  const menuItems = [
    { id: 'rapportino', label: 'Rapportino', icon: FileText },
    { id: 'presenze', label: 'Presenze', icon: Calendar },
    { id: 'statistiche', label: 'Statistiche', icon: BarChart3 },
  ]

  // Render pagina corrente
  const renderPagina = () => {
    switch (paginaCorrente) {
      case 'rapportino':
        return <RapportinoPage utente={utente} />
      case 'presenze':
        return <PresenzePage utente={utente} />
      case 'statistiche':
        return <StatistichePage utente={utente} />
      default:
        return <RapportinoPage utente={utente} />
    }
  }

  const handleLogout = () => {
    setUtente(null)
    setPaginaCorrente('home')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo e titolo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-800 font-bold text-lg">PC</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg">Presenze Cantiere</h1>
                <p className="text-blue-200 text-xs">Centrale di Compressione</p>
              </div>
            </div>

            {/* Menu Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPaginaCorrente(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    paginaCorrente === item.id
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700/50'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* User info e logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="font-medium text-sm">{utente.nome}</p>
                <p className="text-blue-200 text-xs">{utente.ruolo}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              
              {/* Menu mobile toggle */}
              <button
                onClick={() => setMenuAperto(!menuAperto)}
                className="md:hidden p-2 hover:bg-blue-700 rounded-lg"
              >
                {menuAperto ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {menuAperto && (
          <nav className="md:hidden border-t border-blue-700 px-4 py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPaginaCorrente(item.id)
                  setMenuAperto(false)
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                  paginaCorrente === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-700/50'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderPagina()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-4 text-sm mt-auto">
        © 2024 Presenze Cantiere - Centrale di Compressione
      </footer>
    </div>
  )
}

export default App
