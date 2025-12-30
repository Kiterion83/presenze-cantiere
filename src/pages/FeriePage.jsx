import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Sun,
  Umbrella
} from 'lucide-react'

export default function FeriePage() {
  const { persona, isAtLeast } = useAuth()
  const [richieste, setRichieste] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'ferie',
    data_inizio: '',
    data_fine: '',
    note: ''
  })

  useEffect(() => {
    loadRichieste()
  }, [])

  const loadRichieste = async () => {
    try {
      // Placeholder - in produzione caricherà da richieste_ferie
      setRichieste([
        {
          id: 1,
          tipo: 'ferie',
          data_inizio: '2024-08-12',
          data_fine: '2024-08-23',
          stato: 'approvata',
          note: 'Vacanze estive'
        },
        {
          id: 2,
          tipo: 'permesso',
          data_inizio: '2024-12-24',
          data_fine: '2024-12-24',
          stato: 'in_attesa',
          note: 'Vigilia di Natale'
        },
        {
          id: 3,
          tipo: 'malattia',
          data_inizio: '2024-11-05',
          data_fine: '2024-11-07',
          stato: 'approvata',
          note: 'Certificato medico allegato'
        }
      ])
    } catch (error) {
      console.error('Error loading richieste:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatoBadge = (stato) => {
    switch (stato) {
      case 'approvata':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle size={12} />
            Approvata
          </span>
        )
      case 'rifiutata':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <XCircle size={12} />
            Rifiutata
          </span>
        )
      case 'in_attesa':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock size={12} />
            In attesa
          </span>
        )
      default:
        return <span className="badge badge-gray">{stato}</span>
    }
  }

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'ferie':
        return <Sun className="text-yellow-500" size={20} />
      case 'permesso':
        return <Clock className="text-blue-500" size={20} />
      case 'malattia':
        return <Umbrella className="text-red-500" size={20} />
      default:
        return <Calendar className="text-gray-500" size={20} />
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short'
    })
  }

  const calcGiorni = (inizio, fine) => {
    const start = new Date(inizio)
    const end = new Date(fine)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // TODO: Implementare submit a database
    alert('Funzionalità in arrivo!')
    setShowForm(false)
  }

  // Stats placeholder
  const stats = {
    ferieDisponibili: 15,
    ferieUsate: 10,
    permessiDisponibili: 5,
    permessiUsati: 2
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ferie e Permessi</h1>
          <p className="text-sm text-gray-500">Gestisci le tue assenze</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuova Richiesta</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Sun className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {stats.ferieDisponibili - stats.ferieUsate}
              </p>
              <p className="text-xs text-gray-500">
                Ferie disponibili
              </p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${(stats.ferieUsate / stats.ferieDisponibili) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.ferieUsate} usate su {stats.ferieDisponibili}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {stats.permessiDisponibili - stats.permessiUsati}
              </p>
              <p className="text-xs text-gray-500">
                Permessi disponibili
              </p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(stats.permessiUsati / stats.permessiDisponibili) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.permessiUsati} usati su {stats.permessiDisponibili}
          </p>
        </div>
      </div>

      {/* Lista Richieste */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Le tue richieste</h2>
        
        {richieste.length === 0 ? (
          <div className="empty-state py-8">
            <Calendar className="empty-state-icon" />
            <p className="empty-state-title">Nessuna richiesta</p>
            <p className="empty-state-text">
              Non hai ancora fatto richieste di ferie o permessi
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {richieste.map((richiesta) => (
              <div 
                key={richiesta.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                {getTipoIcon(richiesta.tipo)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 capitalize">
                      {richiesta.tipo}
                    </span>
                    {getStatoBadge(richiesta.stato)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(richiesta.data_inizio)}
                    {richiesta.data_inizio !== richiesta.data_fine && (
                      <> → {formatDate(richiesta.data_fine)}</>
                    )}
                    <span className="text-gray-400">
                      {' '}• {calcGiorni(richiesta.data_inizio, richiesta.data_fine)} giorni
                    </span>
                  </p>
                  {richiesta.note && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {richiesta.note}
                    </p>
                  )}
                </div>
                
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box per Supervisor+ */}
      {isAtLeast('supervisor') && (
        <div className="alert alert-info">
          <AlertCircle size={20} />
          <div>
            <p className="font-medium">Richieste del team</p>
            <p className="text-sm">
              Come supervisor puoi approvare le richieste del tuo team dalla sezione Gestione Personale.
            </p>
          </div>
        </div>
      )}

      {/* Modal Form (placeholder) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Nuova Richiesta
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <select 
                  className="select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                >
                  <option value="ferie">Ferie</option>
                  <option value="permesso">Permesso</option>
                  <option value="malattia">Malattia</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Data inizio</label>
                  <input 
                    type="date"
                    className="input"
                    value={formData.data_inizio}
                    onChange={(e) => setFormData({...formData, data_inizio: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Data fine</label>
                  <input 
                    type="date"
                    className="input"
                    value={formData.data_fine}
                    onChange={(e) => setFormData({...formData, data_fine: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Note (opzionale)</label>
                <textarea 
                  className="input"
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Motivo della richiesta..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Invia Richiesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
