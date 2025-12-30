import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function RapportinoPage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rapportino, setRapportino] = useState(null)
  const [presenze, setPresenze] = useState([])
  const [attivita, setAttivita] = useState([])
  const [centriCosto, setCentriCosto] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Form per nuova attività
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    centro_costo_id: '',
    descrizione: '',
    ore: '',
    quantita: '',
    unita_misura: '',
    note: ''
  })

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadData()
    }
  }, [assegnazione?.progetto_id, selectedDate])

  const loadData = async () => {
    setLoading(true)
    
    // Carica centri di costo del progetto
    const { data: cc } = await supabase
      .from('centri_costo')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('codice')

    setCentriCosto(cc || [])

    // Carica rapportino del giorno
    const { data: rap } = await supabase
      .from('rapportini')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', selectedDate)
      .single()

    setRapportino(rap || null)

    // Carica attività del giorno
    if (rap) {
      const { data: att } = await supabase
        .from('attivita_rapportino')
        .select(`
          *,
          centro_costo:centri_costo(codice, descrizione)
        `)
        .eq('rapportino_id', rap.id)
        .order('created_at')

      setAttivita(att || [])
    } else {
      setAttivita([])
    }

    // Carica presenze del giorno
    const { data: pres } = await supabase
      .from('presenze')
      .select(`
        *,
        persona:persone(nome, cognome)
      `)
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', selectedDate)
      .not('ora_uscita', 'is', null)

    setPresenze(pres || [])
    setLoading(false)
  }

  // Crea o ottieni rapportino
  const getOrCreateRapportino = async () => {
    if (rapportino) return rapportino

    const { data, error } = await supabase
      .from('rapportini')
      .insert({
        progetto_id: assegnazione.progetto_id,
        data: selectedDate,
        compilato_da: persona.id,
        stato: 'bozza'
      })
      .select()
      .single()

    if (error) throw error
    setRapportino(data)
    return data
  }

  // Aggiungi attività
  const handleAddAttivita = async () => {
    if (!formData.centro_costo_id || !formData.descrizione || !formData.ore) {
      setMessage({ type: 'error', text: 'Compila tutti i campi obbligatori' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const rap = await getOrCreateRapportino()

      const { error } = await supabase
        .from('attivita_rapportino')
        .insert({
          rapportino_id: rap.id,
          centro_costo_id: formData.centro_costo_id,
          descrizione: formData.descrizione,
          ore: parseFloat(formData.ore),
          quantita: formData.quantita ? parseFloat(formData.quantita) : null,
          unita_misura: formData.unita_misura || null,
          note: formData.note || null
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Attività aggiunta' })
      setFormData({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', unita_misura: '', note: '' })
      setShowForm(false)
      loadData()

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Elimina attività
  const handleDeleteAttivita = async (id) => {
    if (!confirm('Eliminare questa attività?')) return

    const { error } = await supabase
      .from('attivita_rapportino')
      .delete()
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  // Cambia stato rapportino
  const handleChangeStato = async (newStato) => {
    if (!rapportino) return

    setSaving(true)
    const { error } = await supabase
      .from('rapportini')
      .update({ 
        stato: newStato,
        ...(newStato === 'approvato' ? { approvato_da: persona.id, approvato_il: new Date().toISOString() } : {})
      })
      .eq('id', rapportino.id)

    if (!error) {
      loadData()
    }
    setSaving(false)
  }

  // Calcoli
  const totaleOre = attivita.reduce((sum, a) => sum + parseFloat(a.ore || 0), 0)
  const totaleOrePresenze = presenze.reduce((sum, p) => 
    sum + parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0), 0
  )

  // Navigazione date
  const changeDate = (days) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📝 Rapportino</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <div className="text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-lg font-semibold text-gray-800 bg-transparent border-none text-center cursor-pointer"
            />
            <p className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long' })}
            </p>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            {rapportino && (
              <div className={`rounded-xl p-4 ${
                rapportino.stato === 'approvato' ? 'bg-green-50 border border-green-200' :
                rapportino.stato === 'inviato' ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {rapportino.stato === 'approvato' ? '✅' :
                       rapportino.stato === 'inviato' ? '📤' : '📝'}
                    </span>
                    <div>
                      <p className="font-medium">
                        {rapportino.stato === 'approvato' ? 'Rapportino approvato' :
                         rapportino.stato === 'inviato' ? 'In attesa di approvazione' :
                         'Bozza'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {totaleOre}h registrate su {attivita.length} attività
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {rapportino.stato === 'bozza' && isAtLeast('foreman') && (
                    <button
                      onClick={() => handleChangeStato('inviato')}
                      disabled={saving || attivita.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      Invia
                    </button>
                  )}
                  {rapportino.stato === 'inviato' && isAtLeast('supervisor') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleChangeStato('bozza')}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                      >
                        Rifiuta
                      </button>
                      <button
                        onClick={() => handleChangeStato('approvato')}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                      >
                        Approva
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attività List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Attività svolte</h3>
                {(!rapportino || rapportino.stato === 'bozza') && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    + Aggiungi
                  </button>
                )}
              </div>

              {/* Form */}
              {showForm && (
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Centro di Costo *
                      </label>
                      <select
                        value={formData.centro_costo_id}
                        onChange={(e) => setFormData({...formData, centro_costo_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Seleziona...</option>
                        {centriCosto.map(cc => (
                          <option key={cc.id} value={cc.id}>
                            {cc.codice} - {cc.descrizione}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrizione attività *
                      </label>
                      <input
                        type="text"
                        value={formData.descrizione}
                        onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Es: Posa tubazioni zona A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ore *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.ore}
                        onChange={(e) => setFormData({...formData, ore: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="8"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantità
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={formData.quantita}
                          onChange={(e) => setFormData({...formData, quantita: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="10"
                        />
                        <input
                          type="text"
                          value={formData.unita_misura}
                          onChange={(e) => setFormData({...formData, unita_misura: e.target.value})}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="ml"
                        />
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note
                      </label>
                      <textarea
                        value={formData.note}
                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  {message && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {message.text}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleAddAttivita}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {attivita.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-4xl mb-2">📋</p>
                  <p>Nessuna attività registrata</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attivita.map(att => (
                    <div key={att.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{att.descrizione}</p>
                          <p className="text-sm text-gray-500">
                            {att.centro_costo?.codice} - {att.centro_costo?.descrizione}
                          </p>
                          {att.note && (
                            <p className="text-sm text-gray-400 mt-1">{att.note}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-800">{att.ore}h</p>
                          {att.quantita && (
                            <p className="text-sm text-gray-500">
                              {att.quantita} {att.unita_misura}
                            </p>
                          )}
                        </div>
                        {(!rapportino || rapportino.stato === 'bozza') && (
                          <button
                            onClick={() => handleDeleteAttivita(att.id)}
                            className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {attivita.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex justify-between font-semibold">
                    <span>Totale ore</span>
                    <span>{totaleOre}h</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Presenze */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700">👷 Presenze del giorno</h3>
                <p className="text-sm text-gray-500">{presenze.length} persone • {totaleOrePresenze.toFixed(1)}h totali</p>
              </div>
              
              {presenze.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  Nessuna presenza registrata
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {presenze.map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          {p.persona?.nome} {p.persona?.cognome}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.ora_entrata} - {p.ora_uscita}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          {(parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)).toFixed(1)}h
                        </p>
                        {parseFloat(p.ore_straordinarie || 0) > 0 && (
                          <p className="text-xs text-orange-500">
                            +{p.ore_straordinarie}h str.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
