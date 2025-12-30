import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function NotifichePage() {
  const { persona, assegnazione, isAtLeast } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rapportiniPendenti, setRapportiniPendenti] = useState([])
  const [feriePendenti, setFeriePendenti] = useState([])
  const [activeTab, setActiveTab] = useState('tutti')

  useEffect(() => {
    if (assegnazione?.progetto_id && isAtLeast('supervisor')) {
      loadNotifiche()
    }
  }, [assegnazione?.progetto_id])

  const loadNotifiche = async () => {
    setLoading(true)

    // Rapportini da approvare
    const { data: rapp } = await supabase
      .from('rapportini')
      .select('*, compilato_da_persona:persone!rapportini_compilato_da_fkey(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('stato', 'inviato')
      .order('data', { ascending: false })

    setRapportiniPendenti(rapp || [])

    // Ferie da approvare
    const { data: ferie } = await supabase
      .from('richieste_assenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('stato', 'in_attesa')
      .order('created_at', { ascending: false })

    setFeriePendenti(ferie || [])

    setLoading(false)
  }

  const handleApprovaRapportino = async (id) => {
    await supabase
      .from('rapportini')
      .update({
        stato: 'approvato',
        approvato_da: persona.id,
        approvato_il: new Date().toISOString()
      })
      .eq('id', id)
    loadNotifiche()
  }

  const handleRifiutaRapportino = async (id) => {
    const motivo = prompt('Motivo del rifiuto:')
    await supabase
      .from('rapportini')
      .update({ stato: 'bozza' }) // Torna in bozza per correzioni
      .eq('id', id)
    loadNotifiche()
  }

  const handleApprovaFerie = async (id) => {
    await supabase
      .from('richieste_assenze')
      .update({
        stato: 'approvata',
        gestita_da: persona.id,
        gestita_il: new Date().toISOString()
      })
      .eq('id', id)
    loadNotifiche()
  }

  const handleRifiutaFerie = async (id) => {
    const motivo = prompt('Motivo del rifiuto (opzionale):')
    await supabase
      .from('richieste_assenze')
      .update({
        stato: 'rifiutata',
        gestita_da: persona.id,
        gestita_il: new Date().toISOString(),
        motivo_rifiuto: motivo || null
      })
      .eq('id', id)
    loadNotifiche()
  }

  const totalePendenti = rapportiniPendenti.length + feriePendenti.length

  const getTipoFerieInfo = (tipo) => {
    const tipi = {
      ferie: { label: 'Ferie', emoji: '🏖️' },
      permesso: { label: 'Permesso', emoji: '📋' },
      malattia: { label: 'Malattia', emoji: '🏥' },
      rol: { label: 'ROL', emoji: '⏰' },
      altro: { label: 'Altro', emoji: '📝' }
    }
    return tipi[tipo] || tipi.altro
  }

  if (!isAtLeast('supervisor')) {
    return (
      <div className="p-4 lg:p-8">
        <div className="text-center py-12">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-gray-500">Accesso riservato a Supervisor e superiori</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔔 Notifiche</h1>
          <p className="text-gray-500">Approvazioni in attesa</p>
        </div>
        <button
          onClick={loadNotifiche}
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          🔄
        </button>
      </div>

      {/* Summary Card */}
      <div className={`rounded-2xl p-6 mb-6 ${totalePendenti > 0 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-green-50 border-2 border-green-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${totalePendenti > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
            {totalePendenti > 0 ? '⚠️' : '✅'}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {totalePendenti > 0 ? `${totalePendenti} elementi da gestire` : 'Tutto in ordine!'}
            </p>
            <p className="text-gray-600">
              {rapportiniPendenti.length > 0 && `${rapportiniPendenti.length} rapportini`}
              {rapportiniPendenti.length > 0 && feriePendenti.length > 0 && ' • '}
              {feriePendenti.length > 0 && `${feriePendenti.length} richieste ferie`}
              {totalePendenti === 0 && 'Nessuna approvazione in attesa'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('tutti')}
          className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'tutti' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
        >
          Tutti ({totalePendenti})
        </button>
        <button
          onClick={() => setActiveTab('rapportini')}
          className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'rapportini' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
        >
          📝 Rapportini ({rapportiniPendenti.length})
        </button>
        <button
          onClick={() => setActiveTab('ferie')}
          className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'ferie' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
        >
          🏖️ Ferie ({feriePendenti.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="space-y-4">
          {/* Rapportini */}
          {(activeTab === 'tutti' || activeTab === 'rapportini') && rapportiniPendenti.map(rapp => (
            <div key={rapp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                  📝
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">Rapportino</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      ⏳ Da approvare
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    👤 {rapp.compilato_da_persona?.nome} {rapp.compilato_da_persona?.cognome}
                  </p>
                  <p className="text-sm text-gray-500">
                    📅 {new Date(rapp.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/rapportino')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                  >
                    👁️ Vedi
                  </button>
                  <button
                    onClick={() => handleApprovaRapportino(rapp.id)}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                  >
                    ✅ Approva
                  </button>
                  <button
                    onClick={() => handleRifiutaRapportino(rapp.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    ❌ Rifiuta
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Ferie */}
          {(activeTab === 'tutti' || activeTab === 'ferie') && feriePendenti.map(ferie => {
            const tipoInfo = getTipoFerieInfo(ferie.tipo)
            const giorni = Math.ceil((new Date(ferie.data_fine) - new Date(ferie.data_inizio)) / (1000 * 60 * 60 * 24)) + 1

            return (
              <div key={ferie.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                    {tipoInfo.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{tipoInfo.label}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        ⏳ Da approvare
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      👤 {ferie.persona?.nome} {ferie.persona?.cognome}
                    </p>
                    <p className="text-sm text-gray-500">
                      📅 {new Date(ferie.data_inizio).toLocaleDateString('it-IT')}
                      {ferie.data_inizio !== ferie.data_fine && <> → {new Date(ferie.data_fine).toLocaleDateString('it-IT')}</>}
                      <span className="ml-2 font-medium">({giorni}g)</span>
                    </p>
                    {ferie.motivo && (
                      <p className="text-sm text-gray-400 mt-1">💬 {ferie.motivo}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprovaFerie(ferie.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                    >
                      ✅ Approva
                    </button>
                    <button
                      onClick={() => handleRifiutaFerie(ferie.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      ❌ Rifiuta
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {totalePendenti === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-gray-500">Nessuna approvazione in attesa</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
