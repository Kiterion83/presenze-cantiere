import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function FeriePage() {
  const { persona, assegnazione, isAtLeast } = useAuth()
  const [activeTab, setActiveTab] = useState('mie')
  const [mieRichieste, setMieRichieste] = useState([])
  const [richiesteTeam, setRichiesteTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'ferie',
    data_inizio: '',
    data_fine: '',
    giornata_intera: true,
    ore_totali: '',
    motivo: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (persona?.id && assegnazione?.progetto_id) {
      loadRichieste()
    }
  }, [persona?.id, assegnazione?.progetto_id])

  const loadRichieste = async () => {
    setLoading(true)

    // Le mie richieste
    const { data: mie } = await supabase
      .from('richieste_assenze')
      .select('*, gestita_da_persona:persone!richieste_assenze_gestita_da_fkey(nome, cognome)')
      .eq('persona_id', persona.id)
      .order('created_at', { ascending: false })

    setMieRichieste(mie || [])

    // Richieste del team (solo per supervisor+)
    if (isAtLeast('supervisor')) {
      const { data: team } = await supabase
        .from('richieste_assenze')
        .select('*, persona:persone(nome, cognome), gestita_da_persona:persone!richieste_assenze_gestita_da_fkey(nome, cognome)')
        .eq('progetto_id', assegnazione.progetto_id)
        .neq('persona_id', persona.id)
        .order('created_at', { ascending: false })

      setRichiesteTeam(team || [])
    }

    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      tipo: 'ferie',
      data_inizio: '',
      data_fine: '',
      giornata_intera: true,
      ore_totali: '',
      motivo: ''
    })
    setShowForm(false)
    setMessage(null)
  }

  const handleSubmit = async () => {
    if (!formData.data_inizio || !formData.data_fine) {
      setMessage({ type: 'error', text: 'Inserisci le date' })
      return
    }

    if (new Date(formData.data_fine) < new Date(formData.data_inizio)) {
      setMessage({ type: 'error', text: 'La data fine deve essere >= data inizio' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('richieste_assenze').insert({
        persona_id: persona.id,
        progetto_id: assegnazione.progetto_id,
        tipo: formData.tipo,
        data_inizio: formData.data_inizio,
        data_fine: formData.data_fine,
        giornata_intera: formData.giornata_intera,
        ore_totali: !formData.giornata_intera && formData.ore_totali ? parseFloat(formData.ore_totali) : null,
        motivo: formData.motivo || null,
        stato: 'in_attesa'
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Richiesta inviata!' })
      loadRichieste()
      setTimeout(resetForm, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAnnulla = async (id) => {
    if (!confirm('Annullare questa richiesta?')) return

    await supabase
      .from('richieste_assenze')
      .update({ stato: 'annullata' })
      .eq('id', id)

    loadRichieste()
  }

  const handleGestisci = async (id, nuovoStato, motivoRifiuto = null) => {
    const updateData = {
      stato: nuovoStato,
      gestita_da: persona.id,
      gestita_il: new Date().toISOString()
    }

    if (motivoRifiuto) {
      updateData.motivo_rifiuto = motivoRifiuto
    }

    await supabase
      .from('richieste_assenze')
      .update(updateData)
      .eq('id', id)

    loadRichieste()
  }

  const handleRifiuta = async (id) => {
    const motivo = prompt('Motivo del rifiuto (opzionale):')
    await handleGestisci(id, 'rifiutata', motivo)
  }

  // Calcola giorni
  const calcolaGiorni = (dataInizio, dataFine) => {
    if (!dataInizio || !dataFine) return 0
    const start = new Date(dataInizio)
    const end = new Date(dataFine)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff
  }

  // Stats
  const stats = {
    inAttesa: mieRichieste.filter(r => r.stato === 'in_attesa').length,
    approvate: mieRichieste.filter(r => r.stato === 'approvata').length,
    rifiutate: mieRichieste.filter(r => r.stato === 'rifiutata').length,
    daApprovare: richiesteTeam.filter(r => r.stato === 'in_attesa').length
  }

  const tipiAssenza = [
    { value: 'ferie', label: 'Ferie', emoji: '🏖️', color: 'purple' },
    { value: 'permesso', label: 'Permesso', emoji: '📋', color: 'blue' },
    { value: 'malattia', label: 'Malattia', emoji: '🏥', color: 'red' },
    { value: 'rol', label: 'ROL', emoji: '⏰', color: 'orange' },
    { value: 'altro', label: 'Altro', emoji: '📝', color: 'gray' }
  ]

  const getStatoInfo = (stato) => {
    switch (stato) {
      case 'in_attesa': return { label: 'In attesa', color: 'yellow', emoji: '⏳' }
      case 'approvata': return { label: 'Approvata', color: 'green', emoji: '✅' }
      case 'rifiutata': return { label: 'Rifiutata', color: 'red', emoji: '❌' }
      case 'annullata': return { label: 'Annullata', color: 'gray', emoji: '🚫' }
      default: return { label: stato, color: 'gray', emoji: '❓' }
    }
  }

  const getTipoInfo = (tipo) => tipiAssenza.find(t => t.value === tipo) || tipiAssenza[4]

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏖️ Ferie e Permessi</h1>
          <p className="text-gray-500">Gestione richieste assenze</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            + Nuova Richiesta
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-2xl font-bold text-yellow-700">{stats.inAttesa}</p>
          <p className="text-sm text-yellow-600">In attesa</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-2xl font-bold text-green-700">{stats.approvate}</p>
          <p className="text-sm text-green-600">Approvate</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-2xl font-bold text-red-700">{stats.rifiutate}</p>
          <p className="text-sm text-red-600">Rifiutate</p>
        </div>
        {isAtLeast('supervisor') && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">{stats.daApprovare}</p>
            <p className="text-sm text-blue-600">Da approvare</p>
          </div>
        )}
      </div>

      {/* Form Nuova Richiesta */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📝 Nuova Richiesta</h2>

          <div className="grid gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di assenza</label>
              <div className="flex flex-wrap gap-2">
                {tipiAssenza.map(tipo => (
                  <button
                    key={tipo.value}
                    onClick={() => setFormData({ ...formData, tipo: tipo.value })}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      formData.tipo === tipo.value
                        ? `bg-${tipo.color}-100 text-${tipo.color}-700 border-2 border-${tipo.color}-300`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tipo.emoji} {tipo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio *</label>
                <input
                  type="date"
                  value={formData.data_inizio}
                  onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value, data_fine: formData.data_fine || e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data fine *</label>
                <input
                  type="date"
                  value={formData.data_fine}
                  onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                  min={formData.data_inizio || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Giorni calcolati */}
            {formData.data_inizio && formData.data_fine && (
              <div className="bg-blue-50 rounded-xl p-3 text-blue-700">
                📅 <strong>{calcolaGiorni(formData.data_inizio, formData.data_fine)}</strong> giorno/i richiesto/i
              </div>
            )}

            {/* Giornata intera / Ore */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.giornata_intera}
                  onChange={(e) => setFormData({ ...formData, giornata_intera: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Giornata intera</span>
              </label>
            </div>

            {!formData.giornata_intera && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ore richieste</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.ore_totali}
                  onChange={(e) => setFormData({ ...formData, ore_totali: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  placeholder="Es: 4"
                />
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opzionale)</label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none"
                rows={2}
                placeholder="Inserisci un motivo o note aggiuntive..."
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Invio...' : 'Invia Richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('mie')}
          className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'mie' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
        >
          Le mie richieste
        </button>
        {isAtLeast('supervisor') && (
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            Da approvare {stats.daApprovare > 0 && <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{stats.daApprovare}</span>}
          </button>
        )}
      </div>

      {/* Lista Richieste */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'mie' && mieRichieste.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🏖️</p>
              <p>Nessuna richiesta</p>
            </div>
          )}

          {activeTab === 'team' && richiesteTeam.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">✅</p>
              <p>Nessuna richiesta da gestire</p>
            </div>
          )}

          {(activeTab === 'mie' ? mieRichieste : richiesteTeam).map(richiesta => {
            const statoInfo = getStatoInfo(richiesta.stato)
            const tipoInfo = getTipoInfo(richiesta.tipo)
            const giorni = calcolaGiorni(richiesta.data_inizio, richiesta.data_fine)

            return (
              <div
                key={richiesta.id}
                className={`bg-white rounded-xl p-4 shadow-sm border ${
                  richiesta.stato === 'in_attesa' ? 'border-yellow-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${tipoInfo.color}-100`}>
                    {tipoInfo.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{tipoInfo.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${statoInfo.color}-100 text-${statoInfo.color}-700`}>
                        {statoInfo.emoji} {statoInfo.label}
                      </span>
                    </div>

                    {/* Se è tab team, mostra nome persona */}
                    {activeTab === 'team' && richiesta.persona && (
                      <p className="text-sm text-gray-600 font-medium">
                        👤 {richiesta.persona.nome} {richiesta.persona.cognome}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mt-1">
                      📅 {new Date(richiesta.data_inizio).toLocaleDateString('it-IT')}
                      {richiesta.data_inizio !== richiesta.data_fine && (
                        <> → {new Date(richiesta.data_fine).toLocaleDateString('it-IT')}</>
                      )}
                      <span className="ml-2 font-medium">({giorni}g)</span>
                    </p>

                    {!richiesta.giornata_intera && richiesta.ore_totali && (
                      <p className="text-sm text-gray-500">⏰ {richiesta.ore_totali} ore</p>
                    )}

                    {richiesta.motivo && (
                      <p className="text-sm text-gray-400 mt-1">💬 {richiesta.motivo}</p>
                    )}

                    {richiesta.motivo_rifiuto && (
                      <p className="text-sm text-red-500 mt-1">❌ Motivo rifiuto: {richiesta.motivo_rifiuto}</p>
                    )}

                    {richiesta.gestita_da_persona && richiesta.gestita_il && (
                      <p className="text-xs text-gray-400 mt-2">
                        Gestita da {richiesta.gestita_da_persona.nome} {richiesta.gestita_da_persona.cognome} il {new Date(richiesta.gestita_il).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Azioni per le mie richieste */}
                    {activeTab === 'mie' && richiesta.stato === 'in_attesa' && (
                      <button
                        onClick={() => handleAnnulla(richiesta.id)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Annulla
                      </button>
                    )}

                    {/* Azioni per approvazioni */}
                    {activeTab === 'team' && richiesta.stato === 'in_attesa' && (
                      <>
                        <button
                          onClick={() => handleGestisci(richiesta.id, 'approvata')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          ✅ Approva
                        </button>
                        <button
                          onClick={() => handleRifiuta(richiesta.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                        >
                          ❌ Rifiuta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
