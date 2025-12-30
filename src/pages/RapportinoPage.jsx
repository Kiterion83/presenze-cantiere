import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import FirmaDigitale from '../components/FirmaDigitale'

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
  const [showFirma, setShowFirma] = useState(false)
  const [tipoFirma, setTipoFirma] = useState(null) // 'caposquadra' o 'supervisore'
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
    if (!formData.descrizione || !formData.ore) { setMessage({ type: 'error', text: 'Descrizione e ore obbligatorie' }); return }
    setSaving(true); setMessage(null)
    try {
      const rap = await getOrCreateRapportino()
      await supabase.from('attivita_rapportino').insert({ rapportino_id: rap.id, centro_costo_id: formData.centro_costo_id || null, descrizione: formData.descrizione, ore: parseFloat(formData.ore), quantita: formData.quantita ? parseFloat(formData.quantita) : null, unita_misura: formData.unita_misura || null, note: formData.note || null })
      setMessage({ type: 'success', text: 'Attività aggiunta!' })
      setFormData({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', unita_misura: '', note: '' })
      setShowForm(false)
      loadData()
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDeleteAttivita = async (id) => {
    if (!confirm('Eliminare questa attività?')) return
    await supabase.from('attivita_rapportino').delete().eq('id', id)
    loadData()
  }

  const handleChangeStato = async (nuovoStato) => {
    if (!rapportino) return
    await supabase.from('rapportini').update({ stato: nuovoStato }).eq('id', rapportino.id)
    loadData()
  }

  // Gestione firma
  const handleOpenFirma = (tipo) => {
    setTipoFirma(tipo)
    setShowFirma(true)
  }

  const handleSaveFirma = async (firmaDataUrl) => {
    if (!rapportino) return
    setSaving(true)
    
    try {
      const updateData = {}
      if (tipoFirma === 'caposquadra') {
        updateData.firma_caposquadra = firmaDataUrl
        updateData.firma_caposquadra_data = new Date().toISOString()
      } else if (tipoFirma === 'supervisore') {
        updateData.firma_supervisore = firmaDataUrl
        updateData.firma_supervisore_data = new Date().toISOString()
        updateData.stato = 'approvato'
      }
      
      await supabase.from('rapportini').update(updateData).eq('id', rapportino.id)
      setMessage({ type: 'success', text: 'Firma salvata!' })
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
      setShowFirma(false)
      setTipoFirma(null)
    }
  }

  const totaleOre = attivita.reduce((s, a) => s + (parseFloat(a.ore) || 0), 0)
  const totaleOrePresenze = presenze.reduce((s, p) => s + (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0), 0)

  const statoColors = { bozza: 'bg-gray-100 text-gray-700', inviato: 'bg-blue-100 text-blue-700', approvato: 'bg-green-100 text-green-700', rifiutato: 'bg-red-100 text-red-700' }

  return (
    <div className="p-4 lg:p-8">
      {/* Modal Firma */}
      {showFirma && (
        <FirmaDigitale
          titolo={tipoFirma === 'caposquadra' ? 'Firma Caposquadra' : 'Firma Supervisore'}
          onSave={handleSaveFirma}
          onCancel={() => { setShowFirma(false); setTipoFirma(null) }}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📝 Rapportino</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 border rounded-xl" />
          {rapportino && <span className={`px-3 py-1 rounded-full text-sm font-medium ${statoColors[rapportino.stato]}`}>{rapportino.stato}</span>}
        </div>
      </div>

      {message && <div className={`mb-4 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Form Attività */}
            {(!rapportino || rapportino.stato === 'bozza') && (
              showForm ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold text-gray-700 mb-4">➕ Nuova Attività</h3>
                  <div className="grid gap-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                      <select value={formData.centro_costo_id} onChange={(e) => setFormData({...formData, centro_costo_id: e.target.value})} className="px-4 py-3 border rounded-xl">
                        <option value="">Centro di costo</option>
                        {centriCosto.map(cc => <option key={cc.id} value={cc.id}>{cc.codice} - {cc.descrizione}</option>)}
                      </select>
                      <input type="number" value={formData.ore} onChange={(e) => setFormData({...formData, ore: e.target.value})} placeholder="Ore *" step="0.5" className="px-4 py-3 border rounded-xl" />
                    </div>
                    <input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} placeholder="Descrizione attività *" className="px-4 py-3 border rounded-xl" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={formData.quantita} onChange={(e) => setFormData({...formData, quantita: e.target.value})} placeholder="Quantità" className="px-4 py-3 border rounded-xl" />
                      <input type="text" value={formData.unita_misura} onChange={(e) => setFormData({...formData, unita_misura: e.target.value})} placeholder="Unità (m, kg...)" className="px-4 py-3 border rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
                      <button onClick={handleAddAttivita} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:bg-blue-300">{saving ? '...' : 'Aggiungi'}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)} className="w-full p-4 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 border-2 border-dashed border-blue-200">
                  ➕ Aggiungi Attività
                </button>
              )
            )}

            {/* Lista Attività */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-700">📋 Attività del Giorno</h3>
                  <p className="text-sm text-gray-500">{attivita.length} attività</p>
                </div>
                {rapportino && rapportino.stato === 'bozza' && attivita.length > 0 && (
                  <button onClick={() => handleChangeStato('inviato')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">📤 Invia</button>
                )}
              </div>
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

            {/* Sezione Firme */}
            {rapportino && attivita.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-700">✍️ Firme</h3>
                </div>
                <div className="p-4 grid lg:grid-cols-2 gap-4">
                  {/* Firma Caposquadra */}
                  <div className={`p-4 rounded-xl border-2 ${rapportino.firma_caposquadra ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200'}`}>
                    <p className="font-medium text-gray-700 mb-2">👷 Caposquadra</p>
                    {rapportino.firma_caposquadra ? (
                      <div>
                        <img src={rapportino.firma_caposquadra} alt="Firma" className="h-16 object-contain" />
                        <p className="text-xs text-gray-500 mt-2">
                          Firmato: {new Date(rapportino.firma_caposquadra_data).toLocaleString('it-IT')}
                        </p>
                      </div>
                    ) : (
                      isAtLeast('foreman') && rapportino.stato !== 'bozza' && (
                        <button
                          onClick={() => handleOpenFirma('caposquadra')}
                          className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200"
                        >
                          ✍️ Firma come Caposquadra
                        </button>
                      )
                    )}
                    {!rapportino.firma_caposquadra && rapportino.stato === 'bozza' && (
                      <p className="text-sm text-gray-400">Invia il rapportino per firmare</p>
                    )}
                  </div>

                  {/* Firma Supervisore */}
                  <div className={`p-4 rounded-xl border-2 ${rapportino.firma_supervisore ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200'}`}>
                    <p className="font-medium text-gray-700 mb-2">📋 Supervisore</p>
                    {rapportino.firma_supervisore ? (
                      <div>
                        <img src={rapportino.firma_supervisore} alt="Firma" className="h-16 object-contain" />
                        <p className="text-xs text-gray-500 mt-2">
                          Firmato: {new Date(rapportino.firma_supervisore_data).toLocaleString('it-IT')}
                        </p>
                      </div>
                    ) : (
                      isAtLeast('supervisor') && rapportino.firma_caposquadra && (
                        <button
                          onClick={() => handleOpenFirma('supervisore')}
                          className="w-full py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200"
                        >
                          ✍️ Firma e Approva
                        </button>
                      )
                    )}
                    {!rapportino.firma_supervisore && !rapportino.firma_caposquadra && rapportino.stato !== 'bozza' && (
                      <p className="text-sm text-gray-400">In attesa firma caposquadra</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonna Presenze */}
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

            {/* Riepilogo Rapportino */}
            {rapportino && (
              <div className="bg-white rounded-xl shadow-sm border mt-4 p-4">
                <h3 className="font-semibold text-gray-700 mb-3">📊 Riepilogo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stato</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoColors[rapportino.stato]}`}>{rapportino.stato}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attività</span>
                    <span className="font-medium">{attivita.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ore attività</span>
                    <span className="font-medium">{totaleOre}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ore presenze</span>
                    <span className="font-medium">{totaleOrePresenze.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-500">Firma CS</span>
                    <span>{rapportino.firma_caposquadra ? '✅' : '⏳'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Firma Sup.</span>
                    <span>{rapportino.firma_supervisore ? '✅' : '⏳'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
