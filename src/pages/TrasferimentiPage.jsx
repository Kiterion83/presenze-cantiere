import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function TrasferimentiPage() {
  const { persona, assegnazione, progetto } = useAuth()
  const [trasferimenti, setTrasferimenti] = useState([])
  const [persone, setPersone] = useState([])
  const [squadre, setSquadre] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    persona_id: '',
    tipo: 'cambio_squadra',
    squadra_destinazione_id: '',
    data_inizio: new Date().toISOString().split('T')[0],
    data_fine: '',
    motivo: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [filter, setFilter] = useState('attivi')

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadData()
    }
  }, [assegnazione?.progetto_id])

  const loadData = async () => {
    setLoading(true)

    // Carica trasferimenti
    const { data: t } = await supabase
      .from('trasferimenti')
      .select(`
        *,
        persona:persone!trasferimenti_persona_id_fkey(nome, cognome),
        squadra_origine:squadre!trasferimenti_squadra_origine_id_fkey(nome, colore),
        squadra_destinazione:squadre!trasferimenti_squadra_destinazione_id_fkey(nome, colore),
        creato_da_persona:persone!trasferimenti_creato_da_fkey(nome, cognome)
      `)
      .or(`progetto_origine_id.eq.${assegnazione.progetto_id},progetto_destinazione_id.eq.${assegnazione.progetto_id}`)
      .order('created_at', { ascending: false })

    setTrasferimenti(t || [])

    // Carica persone del progetto
    const { data: p } = await supabase
      .from('assegnazioni_progetto')
      .select('*, persona:persone(id, nome, cognome), squadra:squadre(id, nome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('persona(cognome)')

    setPersone(p || [])

    // Carica squadre
    const { data: s } = await supabase
      .from('squadre')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('nome')

    setSquadre(s || [])

    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      persona_id: '',
      tipo: 'cambio_squadra',
      squadra_destinazione_id: '',
      data_inizio: new Date().toISOString().split('T')[0],
      data_fine: '',
      motivo: ''
    })
    setShowForm(false)
    setMessage(null)
  }

  const handleSubmit = async () => {
    if (!formData.persona_id || !formData.squadra_destinazione_id) {
      setMessage({ type: 'error', text: 'Seleziona persona e squadra destinazione' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // Trova assegnazione corrente della persona
      const personaAss = persone.find(p => p.persona.id === formData.persona_id)
      if (!personaAss) throw new Error('Persona non trovata')

      // Crea trasferimento
      const { error: errTrasf } = await supabase.from('trasferimenti').insert({
        persona_id: formData.persona_id,
        progetto_origine_id: assegnazione.progetto_id,
        squadra_origine_id: personaAss.squadra_id,
        progetto_destinazione_id: assegnazione.progetto_id,
        squadra_destinazione_id: formData.squadra_destinazione_id,
        tipo: formData.tipo,
        data_inizio: formData.data_inizio,
        data_fine: formData.data_fine || null,
        motivo: formData.motivo || null,
        stato: 'attivo',
        creato_da: persona.id
      })

      if (errTrasf) throw errTrasf

      // Aggiorna assegnazione (se non è prestito temporaneo)
      if (formData.tipo === 'cambio_squadra' || !formData.data_fine) {
        await supabase
          .from('assegnazioni_progetto')
          .update({ squadra_id: formData.squadra_destinazione_id })
          .eq('id', personaAss.id)
      }

      setMessage({ type: 'success', text: 'Trasferimento effettuato!' })
      loadData()
      setTimeout(resetForm, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAnnulla = async (trasf) => {
    if (!confirm('Annullare questo trasferimento? La persona tornerà alla squadra originale.')) return

    try {
      // Aggiorna stato trasferimento
      await supabase
        .from('trasferimenti')
        .update({ stato: 'annullato' })
        .eq('id', trasf.id)

      // Ripristina squadra originale se era cambio squadra
      if (trasf.tipo === 'cambio_squadra' && trasf.squadra_origine_id) {
        const personaAss = persone.find(p => p.persona.id === trasf.persona_id)
        if (personaAss) {
          await supabase
            .from('assegnazioni_progetto')
            .update({ squadra_id: trasf.squadra_origine_id })
            .eq('id', personaAss.id)
        }
      }

      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCompleta = async (id) => {
    await supabase
      .from('trasferimenti')
      .update({ stato: 'completato' })
      .eq('id', id)
    loadData()
  }

  // Filtra trasferimenti
  const filteredTrasferimenti = trasferimenti.filter(t => {
    if (filter === 'attivi') return t.stato === 'attivo'
    if (filter === 'completati') return t.stato === 'completato'
    if (filter === 'annullati') return t.stato === 'annullato'
    return true
  })

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'cambio_squadra': return { label: 'Cambio Squadra', emoji: '🔄', color: 'blue' }
      case 'cambio_progetto': return { label: 'Cambio Progetto', emoji: '🏗️', color: 'purple' }
      case 'prestito': return { label: 'Prestito', emoji: '⏳', color: 'orange' }
      default: return { label: tipo, emoji: '📋', color: 'gray' }
    }
  }

  const getStatoInfo = (stato) => {
    switch (stato) {
      case 'attivo': return { label: 'Attivo', color: 'green', emoji: '✅' }
      case 'completato': return { label: 'Completato', color: 'blue', emoji: '✔️' }
      case 'annullato': return { label: 'Annullato', color: 'red', emoji: '❌' }
      default: return { label: stato, color: 'gray', emoji: '❓' }
    }
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔄 Trasferimenti</h1>
          <p className="text-gray-500">Gestione spostamenti risorse - {progetto?.nome}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            + Nuovo Trasferimento
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-2xl font-bold text-green-700">{trasferimenti.filter(t => t.stato === 'attivo').length}</p>
          <p className="text-sm text-green-600">Attivi</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{trasferimenti.filter(t => t.stato === 'completato').length}</p>
          <p className="text-sm text-blue-600">Completati</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-2xl font-bold text-gray-700">{trasferimenti.filter(t => t.stato === 'annullato').length}</p>
          <p className="text-sm text-gray-600">Annullati</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">➕ Nuovo Trasferimento</h2>

          <div className="grid gap-4">
            {/* Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona da trasferire *</label>
              <select
                value={formData.persona_id}
                onChange={(e) => setFormData({ ...formData, persona_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              >
                <option value="">Seleziona...</option>
                {persone.map(p => (
                  <option key={p.persona.id} value={p.persona.id}>
                    {p.persona.cognome} {p.persona.nome} {p.squadra ? `(${p.squadra.nome})` : '(Nessuna squadra)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo trasferimento</label>
              <div className="flex gap-2">
                {[
                  { value: 'cambio_squadra', label: '🔄 Cambio Squadra' },
                  { value: 'prestito', label: '⏳ Prestito Temporaneo' }
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setFormData({ ...formData, tipo: t.value })}
                    className={`px-4 py-2 rounded-xl font-medium ${
                      formData.tipo === t.value
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Squadra destinazione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Squadra destinazione *</label>
              <select
                value={formData.squadra_destinazione_id}
                onChange={(e) => setFormData({ ...formData, squadra_destinazione_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              >
                <option value="">Seleziona...</option>
                {squadre.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio *</label>
                <input
                  type="date"
                  value={formData.data_inizio}
                  onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
              {formData.tipo === 'prestito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data fine (prestito)</label>
                  <input
                    type="date"
                    value={formData.data_fine}
                    onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                    min={formData.data_inizio}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none"
                rows={2}
                placeholder="Es: Supporto per completamento fase elettrica..."
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl">
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Salvataggio...' : 'Conferma Trasferimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="flex gap-2 mb-4">
        {['attivi', 'completati', 'annullati', 'tutti'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium capitalize ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : filteredTrasferimenti.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">🔄</p>
          <p>Nessun trasferimento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrasferimenti.map(trasf => {
            const tipoInfo = getTipoLabel(trasf.tipo)
            const statoInfo = getStatoInfo(trasf.stato)

            return (
              <div key={trasf.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${tipoInfo.color}-100`}>
                    {tipoInfo.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">
                        {trasf.persona?.cognome} {trasf.persona?.nome}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${statoInfo.color}-100 text-${statoInfo.color}-700`}>
                        {statoInfo.emoji} {statoInfo.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {trasf.squadra_origine?.nome || 'Nessuna squadra'} 
                      <span className="mx-2">→</span>
                      <span className="font-medium">{trasf.squadra_destinazione?.nome}</span>
                    </p>

                    <p className="text-sm text-gray-500">
                      📅 Dal {new Date(trasf.data_inizio).toLocaleDateString('it-IT')}
                      {trasf.data_fine && <> al {new Date(trasf.data_fine).toLocaleDateString('it-IT')}</>}
                    </p>

                    {trasf.motivo && (
                      <p className="text-sm text-gray-400 mt-1">💬 {trasf.motivo}</p>
                    )}

                    {trasf.creato_da_persona && (
                      <p className="text-xs text-gray-400 mt-2">
                        Creato da {trasf.creato_da_persona.nome} {trasf.creato_da_persona.cognome}
                      </p>
                    )}
                  </div>

                  {trasf.stato === 'attivo' && (
                    <div className="flex flex-col gap-2">
                      {trasf.tipo === 'prestito' && (
                        <button
                          onClick={() => handleCompleta(trasf.id)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                        >
                          ✔️ Completa
                        </button>
                      )}
                      <button
                        onClick={() => handleAnnulla(trasf)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                      >
                        ↩️ Annulla
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
