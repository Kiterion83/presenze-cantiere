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
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', unita_misura: '', note: '' })

  useEffect(() => {
    if (assegnazione?.progetto_id) loadData()
  }, [assegnazione?.progetto_id, selectedDate])

  const loadData = async () => {
    setLoading(true)
    const { data: cc } = await supabase.from('centri_costo').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('codice')
    setCentriCosto(cc || [])

    const { data: rap } = await supabase.from('rapportini').select('*').eq('progetto_id', assegnazione.progetto_id).eq('data', selectedDate).single()
    setRapportino(rap || null)

    if (rap) {
      const { data: att } = await supabase.from('attivita_rapportino').select('*, centro_costo:centri_costo(codice, descrizione)').eq('rapportino_id', rap.id).order('created_at')
      setAttivita(att || [])
    } else {
      setAttivita([])
    }

    const { data: pres } = await supabase.from('presenze').select('*, persona:persone(nome, cognome)').eq('progetto_id', assegnazione.progetto_id).eq('data', selectedDate).not('ora_uscita', 'is', null)
    setPresenze(pres || [])
    setLoading(false)
  }

  const getOrCreateRapportino = async () => {
    if (rapportino) return rapportino
    const { data, error } = await supabase.from('rapportini').insert({ progetto_id: assegnazione.progetto_id, data: selectedDate, compilato_da: persona.id, stato: 'bozza' }).select().single()
    if (error) throw error
    setRapportino(data)
    return data
  }

  const handleAddAttivita = async () => {
    if (!formData.centro_costo_id || !formData.descrizione || !formData.ore) {
      setMessage({ type: 'error', text: 'Compila i campi obbligatori' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const rap = await getOrCreateRapportino()
      const { error } = await supabase.from('attivita_rapportino').insert({
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
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDeleteAttivita = async (id) => {
    if (!confirm('Eliminare?')) return
    await supabase.from('attivita_rapportino').delete().eq('id', id)
    loadData()
  }

  const handleChangeStato = async (newStato) => {
    if (!rapportino) return
    setSaving(true)
    await supabase.from('rapportini').update({ stato: newStato, ...(newStato === 'approvato' ? { approvato_da: persona.id, approvato_il: new Date().toISOString() } : {}) }).eq('id', rapportino.id)
    loadData()
    setSaving(false)
  }

  const totaleOre = attivita.reduce((s, a) => s + parseFloat(a.ore || 0), 0)
  const totaleOrePresenze = presenze.reduce((s, p) => s + parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0), 0)

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📝 Rapportino</h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
          <div className="text-center">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-lg font-semibold bg-transparent border-none text-center cursor-pointer" />
            <p className="text-sm text-gray-500">{new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long' })}</p>
          </div>
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {rapportino && (
              <div className={`rounded-xl p-4 ${rapportino.stato === 'approvato' ? 'bg-green-50 border-green-200' : rapportino.stato === 'inviato' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'} border`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rapportino.stato === 'approvato' ? '✅' : rapportino.stato === 'inviato' ? '📤' : '📝'}</span>
                    <div>
                      <p className="font-medium">{rapportino.stato === 'approvato' ? 'Approvato' : rapportino.stato === 'inviato' ? 'In attesa' : 'Bozza'}</p>
                      <p className="text-sm text-gray-500">{totaleOre}h su {attivita.length} attività</p>
                    </div>
                  </div>
                  {rapportino.stato === 'bozza' && isAtLeast('foreman') && (
                    <button onClick={() => handleChangeStato('inviato')} disabled={saving || !attivita.length} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">Invia</button>
                  )}
                  {rapportino.stato === 'inviato' && isAtLeast('supervisor') && (
                    <div className="flex gap-2">
                      <button onClick={() => handleChangeStato('bozza')} className="px-4 py-2 bg-gray-200 rounded-lg">Rifiuta</button>
                      <button onClick={() => handleChangeStato('approvato')} className="px-4 py-2 bg-green-600 text-white rounded-lg">Approva</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Attività svolte</h3>
                {(!rapportino || rapportino.stato === 'bozza') && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">+ Aggiungi</button>}
              </div>

              {showForm && (
                <div className="p-4 bg-blue-50 border-b">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium mb-1">Centro di Costo *</label>
                      <select value={formData.centro_costo_id} onChange={(e) => setFormData({...formData, centro_costo_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Seleziona...</option>
                        {centriCosto.map(cc => <option key={cc.id} value={cc.id}>{cc.codice} - {cc.descrizione}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium mb-1">Descrizione *</label>
                      <input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ore *</label>
                      <input type="number" step="0.5" value={formData.ore} onChange={(e) => setFormData({...formData, ore: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Quantità</label>
                      <div className="flex gap-2">
                        <input type="number" value={formData.quantita} onChange={(e) => setFormData({...formData, quantita: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg" />
                        <input type="text" value={formData.unita_misura} onChange={(e) => setFormData({...formData, unita_misura: e.target.value})} className="w-20 px-3 py-2 border rounded-lg" placeholder="ml" />
                      </div>
                    </div>
                  </div>
                  {message && <div className={`mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Annulla</button>
                    <button onClick={handleAddAttivita} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">{saving ? 'Salvataggio...' : 'Salva'}</button>
                  </div>
                </div>
              )}

              {attivita.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nessuna attività registrata</div>
              ) : (
                <div className="divide-y">
                  {attivita.map(att => (
                    <div key={att.id} className="p-4 hover:bg-gray-50 flex items-start justify-between">
                      <div>
                        <p className="font-medium">{att.descrizione}</p>
                        <p className="text-sm text-gray-500">{att.centro_costo?.codice}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold">{att.ore}h</p>
                          {att.quantita && <p className="text-sm text-gray-500">{att.quantita} {att.unita_misura}</p>}
                        </div>
                        {(!rapportino || rapportino.stato === 'bozza') && <button onClick={() => handleDeleteAttivita(att.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attivita.length > 0 && <div className="p-4 bg-gray-50 border-t flex justify-between font-semibold"><span>Totale</span><span>{totaleOre}h</span></div>}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-700">👷 Presenze</h3>
                <p className="text-sm text-gray-500">{presenze.length} persone • {totaleOrePresenze.toFixed(1)}h</p>
              </div>
              {presenze.length === 0 ? (
                <div className="p-4 text-center text-gray-400">Nessuna presenza</div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {presenze.map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.persona?.nome} {p.persona?.cognome}</p>
                        <p className="text-xs text-gray-500">{p.ora_entrata} - {p.ora_uscita}</p>
                      </div>
                      <p className="font-semibold">{(parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)).toFixed(1)}h</p>
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
