import { useState } from 'react'
import { Calendar, Plus, Clock, CheckCircle, XCircle, Sun } from 'lucide-react'

export default function FeriePage() {
  const [showForm, setShowForm] = useState(false)

  // Dati placeholder
  const richieste = [
    { id: 1, tipo: 'ferie', data_inizio: '2024-08-12', data_fine: '2024-08-23', stato: 'approvata', note: 'Vacanze estive' },
    { id: 2, tipo: 'permesso', data_inizio: '2024-12-24', data_fine: '2024-12-24', stato: 'in_attesa', note: 'Vigilia' },
  ]

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ferie e Permessi</h1>
          <p className="text-sm text-gray-500">Gestisci le tue assenze</p>
        </div>
        <button 
          onClick={() => alert('Funzionalità in arrivo!')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Nuova</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Sun className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">5</p>
              <p className="text-xs text-gray-500">Ferie disponibili</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">3</p>
              <p className="text-xs text-gray-500">Permessi disponibili</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-3">Le tue richieste</h2>
        <div className="space-y-3">
          {richieste.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-gray-400" size={20} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{r.tipo}</span>
                  {r.stato === 'approvata' ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={12} /> Approvata
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={12} /> In attesa
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formatDate(r.data_inizio)} → {formatDate(r.data_fine)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
