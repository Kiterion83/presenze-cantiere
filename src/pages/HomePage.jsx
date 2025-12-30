import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { persona, assegnazione, progetto, user } = useAuth()

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Debug Info</h1>
        
        <div className="space-y-2 text-sm">
          <p><strong>User ID:</strong> {user?.id || 'NULL'}</p>
          <p><strong>User Email:</strong> {user?.email || 'NULL'}</p>
          <p><strong>Persona ID:</strong> {persona?.id || 'NULL'}</p>
          <p><strong>Persona Nome:</strong> {persona?.nome || 'NULL'}</p>
          <p><strong>Assegnazione ID:</strong> {assegnazione?.id || 'NULL'}</p>
          <p><strong>Progetto ID:</strong> {assegnazione?.progetto_id || 'NULL'}</p>
          <p><strong>Progetto Nome:</strong> {progetto?.nome || 'NULL'}</p>
          <p><strong>Ruolo:</strong> {assegnazione?.ruolo || 'NULL'}</p>
        </div>
      </div>

      <div className="bg-blue-600 text-white rounded-xl p-4">
        <h2 className="font-bold">Se vedi questa pagina, l'app funziona!</h2>
        <p className="text-sm text-blue-100 mt-2">
          Controlla i valori sopra per verificare i dati dal database.
        </p>
      </div>
    </div>
  )
}
