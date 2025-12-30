import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  console.log('HomePage: render iniziato')
  
  const auth = useAuth()
  
  console.log('HomePage: auth =', {
    loading: auth?.loading,
    user: auth?.user?.email,
    persona: auth?.persona?.nome,
    ruolo: auth?.ruolo
  })

  // Se ancora in caricamento
  if (auth?.loading) {
    console.log('HomePage: loading...')
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Valori sicuri con fallback
  const nome = auth?.persona?.nome || 'Utente'
  const cognome = auth?.persona?.cognome || ''
  const ruolo = auth?.ruolo || 'non assegnato'
  const progettoNome = auth?.progetto?.nome || 'Nessun progetto'
  
  console.log('HomePage: rendering con', { nome, ruolo, progettoNome })

  return (
    <div className="p-4 space-y-4">
      {/* Debug Info */}
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-2">🔍 Debug Info</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>User email:</strong> {auth?.user?.email || 'NULL'}</p>
          <p><strong>Persona ID:</strong> {auth?.persona?.id || 'NULL'}</p>
          <p><strong>Persona nome:</strong> {auth?.persona?.nome || 'NULL'}</p>
          <p><strong>Assegnazione ID:</strong> {auth?.assegnazione?.id || 'NULL'}</p>
          <p><strong>Ruolo:</strong> {auth?.assegnazione?.ruolo || 'NULL'}</p>
          <p><strong>Progetto ID:</strong> {auth?.assegnazione?.progetto_id || 'NULL'}</p>
          <p><strong>Progetto nome:</strong> {auth?.progetto?.nome || 'NULL'}</p>
        </div>
      </div>

      {/* Greeting Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4">
        <h2 className="text-xl font-bold">
          Ciao, {nome}!
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Ruolo: {ruolo}
        </p>
        <p className="text-blue-100 text-sm mt-1">
          Progetto: {progettoNome}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a 
          href="/checkin" 
          className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center py-6"
        >
          <div className="p-3 bg-blue-50 rounded-xl mb-2">
            <span className="text-2xl">📍</span>
          </div>
          <span className="font-medium text-gray-800">Check-in</span>
        </a>

        <a 
          href="/team" 
          className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center py-6"
        >
          <div className="p-3 bg-purple-50 rounded-xl mb-2">
            <span className="text-2xl">👥</span>
          </div>
          <span className="font-medium text-gray-800">Team</span>
        </a>
      </div>

      {/* Successo */}
      <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-center">
        <p className="text-green-800 font-medium">
          ✅ HomePage caricata con successo!
        </p>
      </div>
    </div>
  )
}
