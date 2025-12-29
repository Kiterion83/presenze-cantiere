import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function TrasferimentiPage() {
  const { persona, assegnazione, isAtLeast } = useAuth()
  const [loading, setLoading] = useState(true)
  const [trasferimenti, setTrasferimenti] = useState([])
  const [pendingApproval, setPendingApproval] = useState([])
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    loadTrasferimenti()
  }, [])

  const loadTrasferimenti = async () => {
    try {
      // Carica trasferimenti attivi (da me o verso di me)
      const { data } = await supabase
        .from('trasferimenti')
        .select(`
          *,
          persona:persone!persona_id(nome, cognome),
          foreman_da:persone!foreman_da_persona_id(nome, cognome),
          foreman_a:persone!foreman_a_persona_id(nome, cognome)
        `)
        .eq('progetto_id', assegnazione.progetto_id)
        .in('stato', ['attivo', 'pending'])
        .order('created_at', { ascending: false })

      setTrasferimenti(data || [])

      // Carica richieste da approvare (se supervisor o cm)
      if (isAtLeast('supervisor')) {
        const { data: pendingData } = await supabase
          .from('trasferimenti')
          .select(`
            *,
            persona:persone!persona_id(nome, cognome),
            foreman_da:persone!foreman_da_persona_id(nome, cognome),
            foreman_a:persone!foreman_a_persona_id(nome, cognome)
          `)
          .eq('progetto_id', assegnazione.progetto_id)
          .eq('stato', 'pending')
          .eq('richiede_approvazione', true)

        setPendingApproval(pendingData || [])
      }

    } catch (error) {
      console.error('Error loading trasferimenti:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      parziale_giorno: 'Parziale Giornaliero',
      totale_giorno: 'Totale Giornaliero',
      temporale: 'Temporale',
      definitivo: 'Definitivo'
    }
    return labels[tipo] || tipo
  }

  const getTipoColor = (tipo) => {
    const colors = {
      parziale_giorno: 'bg-blue-100 text-blue-800',
      totale_giorno: 'bg-green-100 text-green-800',
      temporale: 'bg-orange-100 text-orange-800',
      definitivo: 'bg-purple-100 text-purple-800'
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  const getStatoIcon = (stato) => {
    switch(stato) {
      case 'attivo': return <CheckCircle className="text-success-500" size={16} />
      case 'pending': return <Clock className="text-warning-500" size={16} />
      case 'rifiutato': return <XCircle className="text-danger-500" size={16} />
      default: return null
    }
  }

  const handleApprove = async (id) => {
    try {
      await supabase
        .from('trasferimenti')
        .update({
          stato: 'attivo',
          approvato_da_persona_id: persona.id,
          approvato_data: new Date().toISOString()
        })
        .eq('id', id)

      loadTrasferimenti()
    } catch (error) {
      console.error('Error approving:', error)
    }
  }

  const handleReject = async (id) => {
    const motivo = prompt('Motivo del rifiuto:')
    if (!motivo) return

    try {
      await supabase
        .from('trasferimenti')
        .update({
          stato: 'rifiutato',
          approvato_da_persona_id: persona.id,
          approvato_data: new Date().toISOString(),
          rifiuto_motivo: motivo
        })
        .eq('id', id)

      loadTrasferimenti()
    } catch (error) {
      console.error('Error rejecting:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Trasferimenti</h1>
          <p className="text-sm text-gray-500">Gestione risorse</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Nuovo
        </button>
      </div>

      {/* Pending Approval */}
      {pendingApproval.length > 0 && (
        <div className="card bg-warning-50 border-warning-200">
          <h3 className="font-medium text-warning-800 flex items-center gap-2 mb-3">
            <AlertCircle size={18} />
            Da approvare ({pendingApproval.length})
          </h3>
          
          <div className="space-y-3">
            {pendingApproval.map(t => (
              <div key={t.id} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {t.persona?.nome} {t.persona?.cognome}
                  </span>
                  <span className={`badge ${getTipoColor(t.tipo)}`}>
                    {getTipoLabel(t.tipo)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Da {t.foreman_da?.nome} {t.foreman_da?.cognome} → {t.foreman_a?.nome} {t.foreman_a?.cognome}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(t.id)}
                    className="btn-success text-sm py-1 flex-1"
                  >
                    Approva
                  </button>
                  <button
                    onClick={() => handleReject(t.id)}
                    className="btn-danger text-sm py-1 flex-1"
                  >
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista trasferimenti */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500">Trasferimenti attivi</h3>
        
        {trasferimenti.length === 0 ? (
          <div className="card text-center text-gray-500">
            <ArrowLeftRight className="mx-auto mb-2 text-gray-300" size={32} />
            <p>Nessun trasferimento attivo</p>
          </div>
        ) : (
          trasferimenti.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="text-gray-500" size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {t.persona?.nome} {t.persona?.cognome}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {t.foreman_da?.nome} → {t.foreman_a?.nome}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatoIcon(t.stato)}
                  <span className={`badge ${getTipoColor(t.tipo)}`}>
                    {getTipoLabel(t.tipo)}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(t.data_inizio).toLocaleDateString('it-IT')}
                  {t.data_fine && ` - ${new Date(t.data_fine).toLocaleDateString('it-IT')}`}
                </span>
                {t.ore_trasferite && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {t.ore_trasferite}h
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal nuovo trasferimento (placeholder) */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Nuovo Trasferimento</h2>
            <p className="text-gray-500 mb-4">
              Funzionalità in sviluppo...
            </p>
            <button
              onClick={() => setShowNew(false)}
              className="btn-secondary w-full"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
