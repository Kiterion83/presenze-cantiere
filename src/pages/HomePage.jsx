import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user, persona, assegnazione, progetto, signOut, isAtLeast } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  // Colore badge ruolo
  const getRoleBadgeColor = () => {
    switch (assegnazione?.ruolo) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'cm': return 'bg-purple-100 text-purple-700'
      case 'supervisor': return 'bg-blue-100 text-blue-700'
      case 'foreman': return 'bg-green-100 text-green-700'
      case 'office': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              {progetto?.nome || 'Presenze Cantiere'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                {persona?.nome} {persona?.cognome}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor()}`}>
                {assegnazione?.ruolo?.toUpperCase() || 'N/A'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Esci
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 max-w-2xl mx-auto">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 mb-4">
          <h2 className="text-xl font-bold">
            Ciao, {persona?.nome}! 👋
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            {new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">📋 Info Utente</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Ruolo:</strong> {assegnazione?.ruolo || 'N/A'}</p>
            <p><strong>Progetto:</strong> {progetto?.nome || 'N/A'}</p>
            <p><strong>Ditta:</strong> {assegnazione?.ditta?.nome || 'N/A'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">🚀 Azioni Rapide</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton emoji="📍" label="Check-in" href="/checkin" />
            <ActionButton emoji="👥" label="Team" href="/team" />
            {isAtLeast('foreman') && (
              <>
                <ActionButton emoji="📝" label="Rapportino" href="/rapportino" />
                <ActionButton emoji="📊" label="Statistiche" href="/statistiche" />
              </>
            )}
            {isAtLeast('cm') && (
              <ActionButton emoji="⚙️" label="Impostazioni" href="/impostazioni" />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">
            ✅ App funzionante - Step 1 completato!
          </p>
        </div>
      </main>
    </div>
  )
}

// Componente bottone azione
function ActionButton({ emoji, label, href }) {
  return (
    <a 
      href={href}
      className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
    >
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  )
}
