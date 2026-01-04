import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Colori status materiale
const STATUS_COLORS = {
  missing: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', label: 'Missing' },
  arrived: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500', label: 'Arrived' },
  checked: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300', dot: 'bg-cyan-500', label: 'Checked' },
  on_site: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', dot: 'bg-rose-700', label: 'On Site' },
  installed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500', label: 'Installed' }
}

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.missing
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
      {colors.label}
    </span>
  )
}

const StatusSelect = ({ value, onChange, className = '' }) => (
  <select 
    value={value || 'missing'} 
    onChange={(e) => onChange(e.target.value)}
    className={`px-2 py-1 rounded-lg border text-sm ${className}`}
    style={{
      backgroundColor: STATUS_COLORS[value]?.bg.replace('bg-', '').replace('-100', '') || '#fef2f2',
    }}
  >
    {Object.entries(STATUS_COLORS).map(([key, val]) => (
      <option key={key} value={key}>{val.label}</option>
    ))}
  </select>
)

export default function IsometriciPage() {
  const { progettoId, progetto } = useAuth()
  
  // Stati principali
  const [isometrici, setIsometrici] = useState([])
  const [selectedIso, setSelectedIso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('spool')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Stati per i dettagli dell'isometrico selezionato
  const [spool, setSpool] = useState([])
  const [supporti, setSupporti] = useState([])
  const [fittings, setFittings] = useState([])
  const [saldature, setSaldature] = useState([])
  const [accoppiamenti, setAccoppiamenti] = useState([])
  
  // Modali
  const [showNewIso, setShowNewIso] = useState(false)
  const [showNewItem, setShowNewItem] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Form nuovo isometrico
  const [newIsoForm, setNewIsoForm] = useState({
    codice: '',
    linea: '',
    diametro: '',
    schedule: '',
    materiale: '',
    classe_rating: '',
    descrizione: ''
  })

  // Carica isometrici
  useEffect(() => {
    if (progettoId) loadIsometrici()
  }, [progettoId])

  // Carica dettagli quando si seleziona un isometrico
  useEffect(() => {
    if (selectedIso) loadIsoDetails(selectedIso.id)
  }, [selectedIso])

  const loadIsometrici = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('isometrici')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('codice')

      if (error) throw error
      setIsometrici(data || [])
    } catch (e) {
      console.error('Errore caricamento isometrici:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadIsoDetails = async (isoId) => {
    try {
      // Carica tutti i dettagli in parallelo
      const [spoolRes, supportiRes, fittingsRes, saldatureRes, accoppiamentiRes] = await Promise.all([
        supabase.from('spool').select('*').eq('isometrico_id', isoId).order('codice'),
        supabase.from('supporti').select('*').eq('isometrico_id', isoId).order('codice'),
        supabase.from('fittings').select('*').eq('isometrico_id', isoId).order('codice'),
        supabase.from('saldature').select('*').eq('isometrico_id', isoId).order('numero_saldatura'),
        supabase.from('accoppiamenti_flangiati').select('*, erection_materials(*)').eq('isometrico_id', isoId).order('codice')
      ])

      setSpool(spoolRes.data || [])
      setSupporti(supportiRes.data || [])
      setFittings(fittingsRes.data || [])
      setSaldature(saldatureRes.data || [])
      setAccoppiamenti(accoppiamentiRes.data || [])
    } catch (e) {
      console.error('Errore caricamento dettagli:', e)
    }
  }

  // Crea nuovo isometrico
  const handleCreateIso = async () => {
    if (!newIsoForm.codice.trim()) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('isometrici')
        .insert({
          progetto_id: progettoId,
          ...newIsoForm
        })
        .select()
        .single()

      if (error) throw error

      setIsometrici([...isometrici, data])
      setSelectedIso(data)
      setShowNewIso(false)
      setNewIsoForm({ codice: '', linea: '', diametro: '', schedule: '', materiale: '', classe_rating: '', descrizione: '' })
    } catch (e) {
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Aggiorna status materiale
  const updateStatus = async (table, id, newStatus) => {
    try {
      const updateData = { status_materiale: newStatus }
      
      // Aggiungi data appropriata
      const now = new Date().toISOString().split('T')[0]
      if (newStatus === 'arrived') updateData.data_arrivo = now
      else if (newStatus === 'checked') updateData.data_controllo = now
      else if (newStatus === 'on_site') updateData.data_sito = now
      else if (newStatus === 'installed') updateData.data_installazione = now

      await supabase.from(table).update(updateData).eq('id', id)
      
      // Ricarica dati
      loadIsoDetails(selectedIso.id)
    } catch (e) {
      console.error('Errore update status:', e)
    }
  }

  // Aggiungi spool
  const handleAddSpool = async (spoolData) => {
    try {
      const { error } = await supabase
        .from('spool')
        .insert({
          isometrico_id: selectedIso.id,
          ...spoolData
        })

      if (error) throw error
      loadIsoDetails(selectedIso.id)
      setShowNewItem(false)
    } catch (e) {
      alert('Errore: ' + e.message)
    }
  }

  // Aggiungi supporto
  const handleAddSupporto = async (supportoData) => {
    try {
      const { error } = await supabase
        .from('supporti')
        .insert({
          isometrico_id: selectedIso.id,
          ...supportoData
        })

      if (error) throw error
      loadIsoDetails(selectedIso.id)
      setShowNewItem(false)
    } catch (e) {
      alert('Errore: ' + e.message)
    }
  }

  // Aggiungi saldatura
  const handleAddSaldatura = async (saldaturaData) => {
    try {
      const { error } = await supabase
        .from('saldature')
        .insert({
          isometrico_id: selectedIso.id,
          ...saldaturaData
        })

      if (error) throw error
      loadIsoDetails(selectedIso.id)
      setShowNewItem(false)
    } catch (e) {
      alert('Errore: ' + e.message)
    }
  }

  // Aggiungi accoppiamento
  const handleAddAccoppiamento = async (accData) => {
    try {
      const { erection_materials, ...accDataClean } = accData
      
      const { data: newAcc, error } = await supabase
        .from('accoppiamenti_flangiati')
        .insert({
          isometrico_id: selectedIso.id,
          ...accDataClean
        })
        .select()
        .single()

      if (error) throw error

      // Inserisci erection materials
      if (erection_materials && erection_materials.length > 0) {
        await supabase
          .from('erection_materials')
          .insert(erection_materials.map(em => ({
            accoppiamento_id: newAcc.id,
            ...em
          })))
      }

      loadIsoDetails(selectedIso.id)
      setShowNewItem(false)
    } catch (e) {
      alert('Errore: ' + e.message)
    }
  }

  // Filtra isometrici
  const filteredIso = isometrici.filter(iso => 
    iso.codice.toLowerCase().includes(searchTerm.toLowerCase()) ||
    iso.linea?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcola stats per isometrico
  const getIsoStats = (iso) => {
    const isoSpool = spool.filter(s => s.isometrico_id === iso.id)
    const missing = isoSpool.filter(s => s.status_materiale === 'missing').length
    const total = isoSpool.length
    return { missing, total }
  }

  if (!progettoId) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">📐</div>
        <h1 className="text-xl font-bold text-gray-700">Seleziona un progetto</h1>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Sidebar Lista Isometrici */}
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800">Isometrici</h1>
            <button
              onClick={() => setShowNewIso(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="Cerca isometrico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : filteredIso.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nessun risultato' : 'Nessun isometrico'}
            </div>
          ) : (
            filteredIso.map(iso => (
              <button
                key={iso.id}
                onClick={() => setSelectedIso(iso)}
                className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                  selectedIso?.id === iso.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-white border border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-medium text-gray-800">{iso.codice}</div>
                {iso.linea && <div className="text-sm text-gray-500">{iso.linea}</div>}
                <div className="flex items-center gap-2 mt-1">
                  {iso.diametro && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{iso.diametro}</span>}
                  {iso.schedule && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{iso.schedule}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Area principale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedIso ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📐</div>
              <p>Seleziona un isometrico dalla lista</p>
              <p className="text-sm">o creane uno nuovo</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header Isometrico */}
            <div className="bg-white border-b p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedIso.codice}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedIso.linea && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">{selectedIso.linea}</span>
                    )}
                    {selectedIso.diametro && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">{selectedIso.diametro}</span>
                    )}
                    {selectedIso.schedule && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">{selectedIso.schedule}</span>
                    )}
                    {selectedIso.materiale && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">{selectedIso.materiale}</span>
                    )}
                    {selectedIso.classe_rating && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm">{selectedIso.classe_rating}</span>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{spool.length}</div>
                    <div className="text-xs text-gray-500">Spool</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{supporti.length}</div>
                    <div className="text-xs text-gray-500">Supporti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{saldature.length}</div>
                    <div className="text-xs text-gray-500">Saldature</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{accoppiamenti.length}</div>
                    <div className="text-xs text-gray-500">Giunti</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {['spool', 'supporti', 'fittings', 'saldature', 'accoppiamenti'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="ml-1 text-xs opacity-70">
                      ({tab === 'spool' ? spool.length : 
                        tab === 'supporti' ? supporti.length :
                        tab === 'fittings' ? fittings.length :
                        tab === 'saldature' ? saldature.length :
                        accoppiamenti.length})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenuto Tab */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Tab SPOOL */}
              {activeTab === 'spool' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Spool</h3>
                    <button
                      onClick={() => { setActiveTab('spool'); setShowNewItem(true); setEditingItem({ type: 'spool' }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Spool
                    </button>
                  </div>

                  {spool.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessuno spool registrato</div>
                  ) : (
                    <div className="space-y-2">
                      {spool.map(s => (
                        <div key={s.id} className={`p-4 rounded-xl border ${STATUS_COLORS[s.status_materiale]?.border || 'border-gray-200'} bg-white`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[s.status_materiale]?.dot || 'bg-gray-400'}`}></div>
                              <div>
                                <span className="font-medium">{s.codice}</span>
                                {s.mark_number && <span className="text-gray-500 ml-2">({s.mark_number})</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusSelect 
                                value={s.status_materiale} 
                                onChange={(v) => updateStatus('spool', s.id, v)}
                              />
                            </div>
                          </div>
                          {s.descrizione && <div className="text-sm text-gray-500 mt-1 ml-6">{s.descrizione}</div>}
                          <div className="flex gap-4 mt-2 ml-6 text-xs text-gray-400">
                            {s.peso_kg && <span>Peso: {s.peso_kg} kg</span>}
                            {s.lunghezza_mm && <span>Lunghezza: {s.lunghezza_mm} mm</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab SUPPORTI */}
              {activeTab === 'supporti' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Supporti</h3>
                    <button
                      onClick={() => { setShowNewItem(true); setEditingItem({ type: 'supporto' }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Supporto
                    </button>
                  </div>

                  {supporti.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessun supporto registrato</div>
                  ) : (
                    <div className="space-y-2">
                      {supporti.map(s => (
                        <div key={s.id} className={`p-4 rounded-xl border ${STATUS_COLORS[s.status_materiale]?.border || 'border-gray-200'} bg-white`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[s.status_materiale]?.dot || 'bg-gray-400'}`}></div>
                              <div>
                                <span className="font-medium">{s.codice}</span>
                                {s.tipo && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">{s.tipo}</span>}
                              </div>
                            </div>
                            <StatusSelect 
                              value={s.status_materiale} 
                              onChange={(v) => updateStatus('supporti', s.id, v)}
                            />
                          </div>
                          {s.spool_id && (
                            <div className="text-sm text-blue-600 mt-1 ml-6">
                              Spool: {spool.find(sp => sp.id === s.spool_id)?.codice}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab FITTINGS */}
              {activeTab === 'fittings' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Fittings</h3>
                    <button
                      onClick={() => { setShowNewItem(true); setEditingItem({ type: 'fitting' }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Fitting
                    </button>
                  </div>

                  {fittings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessun fitting registrato</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {fittings.map(f => (
                        <div key={f.id} className={`p-3 rounded-xl border ${STATUS_COLORS[f.status_materiale]?.border || 'border-gray-200'} bg-white`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[f.status_materiale]?.dot || 'bg-gray-400'}`}></div>
                              <span className="font-medium text-sm">{f.codice}</span>
                            </div>
                            <StatusSelect 
                              value={f.status_materiale} 
                              onChange={(v) => updateStatus('fittings', f.id, v)}
                              className="text-xs"
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{f.tipo} {f.dimensione}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab SALDATURE */}
              {activeTab === 'saldature' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Saldature</h3>
                    <button
                      onClick={() => { setShowNewItem(true); setEditingItem({ type: 'saldatura' }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Saldatura
                    </button>
                  </div>

                  {saldature.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessuna saldatura registrata</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 text-sm font-medium text-gray-600">N. Saldatura</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600">Tipo</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600">Elemento 1</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600">Elemento 2</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                            <th className="text-left p-3 text-sm font-medium text-gray-600">NDT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saldature.map(s => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium">{s.numero_saldatura}</td>
                              <td className="p-3">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {s.tipo_collegamento}
                                </span>
                              </td>
                              <td className="p-3">{s.elemento_1_codice}</td>
                              <td className="p-3">{s.elemento_2_codice}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  s.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="p-3">
                                {s.ndt_required && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    s.ndt_status === 'passed' ? 'bg-green-100 text-green-700' :
                                    s.ndt_status === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {s.ndt_tipo} {s.ndt_status || 'pending'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab ACCOPPIAMENTI */}
              {activeTab === 'accoppiamenti' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Accoppiamenti Flangiati</h3>
                    <button
                      onClick={() => { setShowNewItem(true); setEditingItem({ type: 'accoppiamento' }) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Aggiungi Accoppiamento
                    </button>
                  </div>

                  {accoppiamenti.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessun accoppiamento registrato</div>
                  ) : (
                    <div className="space-y-4">
                      {accoppiamenti.map(a => (
                        <div key={a.id} className="p-4 rounded-xl border bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-lg">{a.codice}</span>
                              {a.ident_code && (
                                <span className="ml-2 text-sm text-gray-500">Ident: {a.ident_code}</span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              a.tipo === 'flangia-flangia' ? 'bg-blue-100 text-blue-700' :
                              a.tipo === 'flangia-equipment' ? 'bg-purple-100 text-purple-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {a.tipo}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Flangia 1:</span> {a.flangia_1_codice}
                            </div>
                            <div>
                              <span className="text-gray-500">Flangia 2:</span> {a.flangia_2_codice || a.equipment_tag || '-'}
                            </div>
                            <div>
                              <span className="text-gray-500">Dim/Rating:</span> {a.dimensione} {a.rating}
                            </div>
                          </div>

                          {a.has_orifice && (
                            <div className="mt-2 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                              Con Orifice: {a.orifice_tag} ({a.orifice_size})
                            </div>
                          )}

                          {/* Erection Materials */}
                          {a.erection_materials && a.erection_materials.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium text-gray-500 mb-2">ERECTION MATERIALS</div>
                              <div className="grid grid-cols-4 gap-2">
                                {a.erection_materials.map(em => (
                                  <div key={em.id} className={`text-xs p-2 rounded ${STATUS_COLORS[em.status_materiale]?.bg || 'bg-gray-50'}`}>
                                    <div className="font-medium">{em.tipo}</div>
                                    <div className="text-gray-500">{em.dimensione} x{em.quantita}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Nuovo Isometrico */}
      {showNewIso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">Nuovo Isometrico</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Codice Isometrico *</label>
                <input
                  type="text"
                  value={newIsoForm.codice}
                  onChange={(e) => setNewIsoForm({ ...newIsoForm, codice: e.target.value })}
                  placeholder="Es: ISO-PIP-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero Linea</label>
                <input
                  type="text"
                  value={newIsoForm.linea}
                  onChange={(e) => setNewIsoForm({ ...newIsoForm, linea: e.target.value })}
                  placeholder="Es: 6-HC-1001-A1A"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diametro</label>
                  <input
                    type="text"
                    value={newIsoForm.diametro}
                    onChange={(e) => setNewIsoForm({ ...newIsoForm, diametro: e.target.value })}
                    placeholder='Es: 6"'
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                  <input
                    type="text"
                    value={newIsoForm.schedule}
                    onChange={(e) => setNewIsoForm({ ...newIsoForm, schedule: e.target.value })}
                    placeholder="Es: SCH40"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materiale</label>
                  <input
                    type="text"
                    value={newIsoForm.materiale}
                    onChange={(e) => setNewIsoForm({ ...newIsoForm, materiale: e.target.value })}
                    placeholder="Es: A106 Gr.B"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe/Rating</label>
                  <input
                    type="text"
                    value={newIsoForm.classe_rating}
                    onChange={(e) => setNewIsoForm({ ...newIsoForm, classe_rating: e.target.value })}
                    placeholder="Es: 150#"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={newIsoForm.descrizione}
                  onChange={(e) => setNewIsoForm({ ...newIsoForm, descrizione: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewIso(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateIso}
                disabled={!newIsoForm.codice.trim() || saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Crea Isometrico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuovo Item (Spool, Supporto, etc.) */}
      {showNewItem && editingItem && (
        <NewItemModal
          type={editingItem.type}
          isometrico={selectedIso}
          spool={spool}
          fittings={fittings}
          onClose={() => { setShowNewItem(false); setEditingItem(null) }}
          onSave={(data) => {
            if (editingItem.type === 'spool') handleAddSpool(data)
            else if (editingItem.type === 'supporto') handleAddSupporto(data)
            else if (editingItem.type === 'saldatura') handleAddSaldatura(data)
            else if (editingItem.type === 'accoppiamento') handleAddAccoppiamento(data)
            else if (editingItem.type === 'fitting') {
              supabase.from('fittings').insert({ isometrico_id: selectedIso.id, ...data })
                .then(() => loadIsoDetails(selectedIso.id))
              setShowNewItem(false)
            }
          }}
        />
      )}
    </div>
  )
}

// Componente Modal per nuovi item
function NewItemModal({ type, isometrico, spool, fittings, onClose, onSave }) {
  const [form, setForm] = useState({})
  const [erectionMaterials, setErectionMaterials] = useState([])

  const handleSubmit = () => {
    if (type === 'accoppiamento') {
      onSave({ ...form, erection_materials: erectionMaterials })
    } else {
      onSave(form)
    }
  }

  const addErectionMaterial = () => {
    setErectionMaterials([...erectionMaterials, { tipo: '', dimensione: '', quantita: 1, status_materiale: 'missing' }])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {type === 'spool' && 'Nuovo Spool'}
          {type === 'supporto' && 'Nuovo Supporto'}
          {type === 'fitting' && 'Nuovo Fitting'}
          {type === 'saldatura' && 'Nuova Saldatura'}
          {type === 'accoppiamento' && 'Nuovo Accoppiamento Flangiato'}
        </h3>

        {/* Form SPOOL */}
        {type === 'spool' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input
                  type="text"
                  value={form.codice || ''}
                  onChange={(e) => setForm({ ...form, codice: e.target.value })}
                  placeholder="SP-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mark Number</label>
                <input
                  type="text"
                  value={form.mark_number || ''}
                  onChange={(e) => setForm({ ...form, mark_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Peso (kg)</label>
                <input
                  type="number"
                  value={form.peso_kg || ''}
                  onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lunghezza (mm)</label>
                <input
                  type="number"
                  value={form.lunghezza_mm || ''}
                  onChange={(e) => setForm({ ...form, lunghezza_mm: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form SUPPORTO */}
        {type === 'supporto' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input
                  type="text"
                  value={form.codice || ''}
                  onChange={(e) => setForm({ ...form, codice: e.target.value })}
                  placeholder="HGR-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={form.tipo || ''}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona...</option>
                  <option value="HGR">HGR - Hanger</option>
                  <option value="SPR">SPR - Spring</option>
                  <option value="SHO">SHO - Shoe</option>
                  <option value="GDE">GDE - Guide</option>
                  <option value="ANC">ANC - Anchor</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Spool associato</label>
              <select
                value={form.spool_id || ''}
                onChange={(e) => setForm({ ...form, spool_id: e.target.value || null })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Nessuno (supporto indipendente)</option>
                {spool.map(s => (
                  <option key={s.id} value={s.id}>{s.codice}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Form FITTING */}
        {type === 'fitting' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input
                  type="text"
                  value={form.codice || ''}
                  onChange={(e) => setForm({ ...form, codice: e.target.value })}
                  placeholder="FLG-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={form.tipo || ''}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona...</option>
                  <option value="FLANGE">Flangia</option>
                  <option value="VALVE">Valvola</option>
                  <option value="ELBOW">Curva</option>
                  <option value="TEE">Tee</option>
                  <option value="REDUCER">Riduzione</option>
                  <option value="CAP">Cap</option>
                  <option value="ORIFICE">Orifice</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dimensione</label>
                <input
                  type="text"
                  value={form.dimensione || ''}
                  onChange={(e) => setForm({ ...form, dimensione: e.target.value })}
                  placeholder='6"'
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rating</label>
                <input
                  type="text"
                  value={form.rating || ''}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="150#"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form SALDATURA */}
        {type === 'saldatura' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numero Saldatura *</label>
              <input
                type="text"
                value={form.numero_saldatura || ''}
                onChange={(e) => setForm({ ...form, numero_saldatura: e.target.value })}
                placeholder="WLD-001"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo Collegamento *</label>
              <select
                value={form.tipo_collegamento || ''}
                onChange={(e) => setForm({ ...form, tipo_collegamento: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Seleziona...</option>
                <option value="spool-spool">Spool - Spool</option>
                <option value="spool-fitting">Spool - Fitting</option>
                <option value="fitting-fitting">Fitting - Fitting</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Elemento 1</label>
                <input
                  type="text"
                  value={form.elemento_1_codice || ''}
                  onChange={(e) => setForm({ ...form, elemento_1_codice: e.target.value, elemento_1_tipo: form.tipo_collegamento?.split('-')[0] })}
                  placeholder="SP-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Elemento 2</label>
                <input
                  type="text"
                  value={form.elemento_2_codice || ''}
                  onChange={(e) => setForm({ ...form, elemento_2_codice: e.target.value, elemento_2_tipo: form.tipo_collegamento?.split('-')[1] })}
                  placeholder="SP-002"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">WPS</label>
                <input
                  type="text"
                  value={form.wps || ''}
                  onChange={(e) => setForm({ ...form, wps: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={form.ndt_required || false}
                  onChange={(e) => setForm({ ...form, ndt_required: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Richiede NDT</label>
              </div>
            </div>
          </div>
        )}

        {/* Form ACCOPPIAMENTO */}
        {type === 'accoppiamento' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input
                  type="text"
                  value={form.codice || ''}
                  onChange={(e) => setForm({ ...form, codice: e.target.value })}
                  placeholder="JNT-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ident Code</label>
                <input
                  type="text"
                  value={form.ident_code || ''}
                  onChange={(e) => setForm({ ...form, ident_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select
                value={form.tipo || ''}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Seleziona...</option>
                <option value="flangia-flangia">Flangia - Flangia</option>
                <option value="flangia-equipment">Flangia - Equipment</option>
                <option value="flangia-orifice-flangia">Flangia - Orifice - Flangia</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Flangia 1</label>
                <input
                  type="text"
                  value={form.flangia_1_codice || ''}
                  onChange={(e) => setForm({ ...form, flangia_1_codice: e.target.value })}
                  placeholder="FLG-001"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Flangia 2 / Equipment</label>
                <input
                  type="text"
                  value={form.flangia_2_codice || form.equipment_tag || ''}
                  onChange={(e) => {
                    if (form.tipo === 'flangia-equipment') {
                      setForm({ ...form, equipment_tag: e.target.value })
                    } else {
                      setForm({ ...form, flangia_2_codice: e.target.value })
                    }
                  }}
                  placeholder={form.tipo === 'flangia-equipment' ? 'P-101' : 'FLG-002'}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dimensione</label>
                <input
                  type="text"
                  value={form.dimensione || ''}
                  onChange={(e) => setForm({ ...form, dimensione: e.target.value })}
                  placeholder='6"'
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rating</label>
                <input
                  type="text"
                  value={form.rating || ''}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="150#"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Erection Materials */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Erection Materials</label>
                <button
                  type="button"
                  onClick={addErectionMaterial}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Aggiungi
                </button>
              </div>
              {erectionMaterials.map((em, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select
                    value={em.tipo}
                    onChange={(e) => {
                      const updated = [...erectionMaterials]
                      updated[idx].tipo = e.target.value
                      setErectionMaterials(updated)
                    }}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  >
                    <option value="">Tipo...</option>
                    <option value="stud_bolt">Stud Bolt</option>
                    <option value="nut">Nut</option>
                    <option value="washer">Washer</option>
                    <option value="gasket">Gasket</option>
                    <option value="tie_rod">Tie Rod</option>
                  </select>
                  <input
                    type="text"
                    value={em.dimensione}
                    onChange={(e) => {
                      const updated = [...erectionMaterials]
                      updated[idx].dimensione = e.target.value
                      setErectionMaterials(updated)
                    }}
                    placeholder="Dimensione"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="number"
                    value={em.quantita}
                    onChange={(e) => {
                      const updated = [...erectionMaterials]
                      updated[idx].quantita = parseInt(e.target.value) || 1
                      setErectionMaterials(updated)
                    }}
                    className="w-16 px-2 py-1 border rounded text-sm"
                  />
                  <button
                    onClick={() => setErectionMaterials(erectionMaterials.filter((_, i) => i !== idx))}
                    className="text-red-500 px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.codice && type !== 'saldatura'}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  )
}
