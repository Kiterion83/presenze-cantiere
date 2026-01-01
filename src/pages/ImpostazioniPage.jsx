import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import FlussiTab from '../components/FlussiTab'  // NUOVO: Import FlussiTab

export default function ImpostazioniPage() {
  const { progetto, isAtLeast } = useAuth()
  const [activeTab, setActiveTab] = useState('progetto')

  // AGGIORNATO: Aggiunto tab Flussi
  const menuItems = [
    { id: 'progetto', label: 'Progetto', emoji: '🏗️', minRole: 'admin' },
    { id: 'persone', label: 'Persone', emoji: '👥', minRole: 'admin' },
    { id: 'ditte', label: 'Ditte', emoji: '🏢', minRole: 'admin' },
    { id: 'squadre', label: 'Squadre', emoji: '👷', minRole: 'admin' },
    { id: 'dipartimenti', label: 'Dipartimenti', emoji: '🏛️', minRole: 'admin' },  // NUOVO
    { id: 'centriCosto', label: 'Centri Costo', emoji: '💰', minRole: 'admin' },
    { id: 'flussi', label: 'Flussi Approvazione', emoji: '🔄', minRole: 'admin' },  // NUOVO
    { id: 'qrCodes', label: 'QR Codes', emoji: '📱', minRole: 'admin' },
    { id: 'progetti', label: 'Tutti i Progetti', emoji: '📋', minRole: 'admin' },
    { id: 'datiTest', label: 'Dati Test', emoji: '🧪', minRole: 'admin' },
  ].filter(item => isAtLeast(item.minRole))

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Impostazioni</h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden sticky top-4">
            <div className="p-4 border-b"><h3 className="font-semibold text-gray-700">Menu</h3></div>
            <nav className="p-2">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{item.emoji}</span><span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'progetto' && <ProgettoTab />}
          {activeTab === 'persone' && <PersoneTab />}
          {activeTab === 'ditte' && <DitteTab />}
          {activeTab === 'squadre' && <SquadreTab />}
          {activeTab === 'dipartimenti' && <DipartimentiTab />}
          {activeTab === 'centriCosto' && <CentriCostoTab />}
          {activeTab === 'flussi' && <FlussiTab />}
          {activeTab === 'qrCodes' && <QRCodesTab />}
          {activeTab === 'progetti' && <TuttiProgettiTab />}
          {activeTab === 'datiTest' && <DatiTestTab />}
        </div>
      </div>
    </div>
  )
}

// ==================== PROGETTO + AREE LAVORO TAB ====================
function ProgettoTab() {
  const { progetto, assegnazione } = useAuth()
  const [formData, setFormData] = useState({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Aree Lavoro
  const [aree, setAree] = useState([])
  const [loadingAree, setLoadingAree] = useState(true)
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [areaForm, setAreaForm] = useState({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' })
  const [savingArea, setSavingArea] = useState(false)
  const [areaMessage, setAreaMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => {
    if (progetto) {
      setFormData({
        nome: progetto.nome || '', codice: progetto.codice || '', indirizzo: progetto.indirizzo || '', citta: progetto.citta || '',
        data_inizio: progetto.data_inizio || '', data_fine_prevista: progetto.data_fine_prevista || '',
        latitudine: progetto.latitudine || '', longitudine: progetto.longitudine || ''
      })
    }
    if (assegnazione?.progetto_id) loadAree()
  }, [progetto, assegnazione?.progetto_id])

  const loadAree = async () => {
    setLoadingAree(true)
    const { data } = await supabase.from('aree_lavoro').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setAree(data || [])
    setLoadingAree(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('progetti').update({
        nome: formData.nome, codice: formData.codice, indirizzo: formData.indirizzo, citta: formData.citta,
        data_inizio: formData.data_inizio || null, data_fine_prevista: formData.data_fine_prevista || null,
        latitudine: formData.latitudine ? parseFloat(formData.latitudine) : null,
        longitudine: formData.longitudine ? parseFloat(formData.longitudine) : null
      }).eq('id', progetto.id)
      if (error) throw error
      setMessage({ type: 'success', text: 'Progetto aggiornato!' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setFormData({...formData, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8)}),
      () => setMessage({ type: 'error', text: 'Errore GPS' })
    )
  }

  // Area functions
  const resetAreaForm = () => { setAreaForm({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' }); setEditingArea(null); setShowAreaForm(false); setAreaMessage(null) }

  const handleEditArea = (area) => {
    setAreaForm({ nome: area.nome, descrizione: area.descrizione || '', latitudine: area.latitudine?.toString() || '', longitudine: area.longitudine?.toString() || '', raggio_metri: area.raggio_metri || 100, colore: area.colore || '#3B82F6' })
    setEditingArea(area); setShowAreaForm(true)
  }

  const handleSaveArea = async () => {
    if (!areaForm.nome || !areaForm.latitudine || !areaForm.longitudine) { setAreaMessage({ type: 'error', text: 'Compila nome e coordinate' }); return }
    setSavingArea(true); setAreaMessage(null)
    try {
      const payload = { progetto_id: assegnazione.progetto_id, nome: areaForm.nome, descrizione: areaForm.descrizione || null, latitudine: parseFloat(areaForm.latitudine), longitudine: parseFloat(areaForm.longitudine), raggio_metri: parseInt(areaForm.raggio_metri), colore: areaForm.colore }
      if (editingArea) { await supabase.from('aree_lavoro').update(payload).eq('id', editingArea.id) }
      else { await supabase.from('aree_lavoro').insert(payload) }
      setAreaMessage({ type: 'success', text: editingArea ? 'Area aggiornata!' : 'Area creata!' })
      loadAree(); setTimeout(resetAreaForm, 1000)
    } catch (err) { setAreaMessage({ type: 'error', text: err.message }) }
    finally { setSavingArea(false) }
  }

  const handleDeleteArea = async (id) => { if (!confirm('Eliminare questa area?')) return; await supabase.from('aree_lavoro').delete().eq('id', id); loadAree() }

  const getAreaLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setAreaForm({...areaForm, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8)}),
      () => setAreaMessage({ type: 'error', text: 'Errore GPS' })
    )
  }

  return (
    <div className="space-y-6">
      {/* Dettagli Progetto */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-6">🏗️ Dettagli Progetto</h2>
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
              <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
              <input type="text" value={formData.indirizzo} onChange={(e) => setFormData({...formData, indirizzo: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
              <input type="text" value={formData.citta} onChange={(e) => setFormData({...formData, citta: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
              <input type="date" value={formData.data_inizio} onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fine Prevista</label>
              <input type="date" value={formData.data_fine_prevista} onChange={(e) => setFormData({...formData, data_fine_prevista: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3">📍 Coordinate GPS Centro Cantiere</h3>
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Latitudine</label>
                <input type="text" value={formData.latitudine} onChange={(e) => setFormData({...formData, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="44.80150000" /></div>
              <div><label className="block text-sm font-medium mb-1">Longitudine</label>
                <input type="text" value={formData.longitudine} onChange={(e) => setFormData({...formData, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="10.32790000" /></div>
              <div className="flex items-end">
                <button onClick={getCurrentLocation} className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200">📍 Usa GPS</button>
              </div>
            </div>
          </div>
          {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? 'Salvataggio...' : '💾 Salva Progetto'}
          </button>
        </div>
      </div>

      {/* Aree di Lavoro */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📍 Aree di Lavoro</h2>
            <p className="text-sm text-gray-500">Zone del cantiere per validazione check-in GPS</p>
          </div>
          {!showAreaForm && (
            <button onClick={() => setShowAreaForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
              + Nuova Area
            </button>
          )}
        </div>

        {showAreaForm && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-6">
            <h3 className="font-semibold text-green-800 mb-4">{editingArea ? '✏️ Modifica Area' : '➕ Nuova Area'}</h3>
            <div className="grid gap-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Nome Area *</label>
                  <input type="text" value={areaForm.nome} onChange={(e) => setAreaForm({...areaForm, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Ingresso Cantiere" /></div>
                <div><label className="block text-sm font-medium mb-1">Descrizione</label>
                  <input type="text" value={areaForm.descrizione} onChange={(e) => setAreaForm({...areaForm, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div className="grid lg:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-1">Latitudine *</label>
                  <input type="text" value={areaForm.latitudine} onChange={(e) => setAreaForm({...areaForm, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Longitudine *</label>
                  <input type="text" value={areaForm.longitudine} onChange={(e) => setAreaForm({...areaForm, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Raggio (m)</label>
                  <input type="number" value={areaForm.raggio_metri} onChange={(e) => setAreaForm({...areaForm, raggio_metri: e.target.value})} className="w-full px-4 py-3 border rounded-xl" min="10" max="500" /></div>
                <div className="flex items-end">
                  <button onClick={getAreaLocation} className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200">📍 GPS</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Colore</label>
                <div className="flex gap-2">
                  {colori.map(c => (
                    <button key={c} onClick={() => setAreaForm({...areaForm, colore: c})}
                      className={`w-8 h-8 rounded-full border-2 ${areaForm.colore === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {areaMessage && <div className={`p-3 rounded-xl ${areaMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{areaMessage.text}</div>}
              <div className="flex gap-2">
                <button onClick={resetAreaForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
                <button onClick={handleSaveArea} disabled={savingArea} className="px-4 py-2 bg-green-600 text-white rounded-xl">{savingArea ? 'Salvataggio...' : 'Salva Area'}</button>
              </div>
            </div>
          </div>
        )}

        {loadingAree ? (
          <div className="text-center py-8 text-gray-500">Caricamento...</div>
        ) : aree.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
            <p className="text-4xl mb-2">📍</p>
            <p>Nessuna area definita</p>
            <p className="text-sm">Crea aree per validare i check-in GPS</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aree.map(area => (
              <div key={area.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: area.colore }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{area.nome}</p>
                  <p className="text-sm text-gray-500">{area.latitudine?.toFixed(6)}, {area.longitudine?.toFixed(6)} • Raggio: {area.raggio_metri}m</p>
                  {area.descrizione && <p className="text-xs text-gray-400">{area.descrizione}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditArea(area)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                  <button onClick={() => handleDeleteArea(area.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== TUTTI I PROGETTI TAB (Admin) ====================
// ==================== TUTTI PROGETTI TAB (AGGIORNATO v2.1) ====================
// Nuove funzionalità:
// - Autocomplete indirizzo con OpenStreetMap
// - Coordinate GPS + Raggio nel form creazione
// - Crea dati default: flussi, discipline, fasi workflow
function TuttiProgettiTab() {
  const { persona } = useAuth()
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '', codice: '', indirizzo: '', citta: '',
    data_inizio: '', data_fine_prevista: '',
    latitudine: '', longitudine: '', raggio_checkin: 200
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Autocomplete indirizzo
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addressTimeout, setAddressTimeout] = useState(null)

  useEffect(() => { loadProgetti() }, [])

  const loadProgetti = async () => {
    setLoading(true)
    const { data } = await supabase.from('progetti').select('*').order('created_at', { ascending: false })
    setProgetti(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '', raggio_checkin: 200 })
    setShowForm(false)
    setMessage(null)
    setAddressSuggestions([])
    setShowSuggestions(false)
  }

  // ========== AUTOCOMPLETE INDIRIZZO (OpenStreetMap Nominatim) ==========
  const searchAddress = async (query) => {
    if (query.length < 3) { setAddressSuggestions([]); return }
    setSearchingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'it', 'User-Agent': 'PTS-ProjectTrackingSystem/2.0' } }
      )
      const data = await response.json()
      setAddressSuggestions(data.map(item => ({
        display: item.display_name,
        indirizzo: [item.address?.road, item.address?.house_number].filter(Boolean).join(' ') || item.display_name.split(',')[0],
        citta: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '',
        lat: item.lat, lon: item.lon
      })))
      setShowSuggestions(true)
    } catch (err) { console.error('Errore ricerca indirizzo:', err) }
    setSearchingAddress(false)
  }

  const handleAddressChange = (value) => {
    setFormData({ ...formData, indirizzo: value })
    if (addressTimeout) clearTimeout(addressTimeout)
    setAddressTimeout(setTimeout(() => searchAddress(value), 500))
  }

  const selectAddress = (suggestion) => {
    setFormData({ ...formData, indirizzo: suggestion.indirizzo, citta: suggestion.citta, latitudine: suggestion.lat, longitudine: suggestion.lon })
    setShowSuggestions(false)
    setAddressSuggestions([])
  }

  // ========== GPS CORRENTE ==========
  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setMessage({ type: 'error', text: 'Geolocalizzazione non supportata' }); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ ...formData, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8) })
        setMessage({ type: 'success', text: 'Coordinate GPS acquisite!' })
        setTimeout(() => setMessage(null), 2000)
      },
      (err) => setMessage({ type: 'error', text: 'Errore GPS: ' + err.message }),
      { enableHighAccuracy: true }
    )
  }

  // ========== CREAZIONE PROGETTO ==========
  const handleCreate = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true)
    setMessage(null)
    try {
      // 1. Crea il progetto
      const { data: newProject, error: errProj } = await supabase.from('progetti').insert({
        nome: formData.nome, codice: formData.codice || null,
        indirizzo: formData.indirizzo || null, citta: formData.citta || null,
        data_inizio: formData.data_inizio || null, data_fine_prevista: formData.data_fine_prevista || null,
        latitudine: formData.latitudine ? parseFloat(formData.latitudine) : null,
        longitudine: formData.longitudine ? parseFloat(formData.longitudine) : null,
        raggio_checkin: parseInt(formData.raggio_checkin) || 200,
        stato: 'attivo'
      }).select().single()
      if (errProj) throw errProj

      // 2. Auto-assegna l'utente corrente come admin
      if (persona?.id && newProject?.id) {
        const { error: errAss } = await supabase.from('assegnazioni_progetto').insert({
          persona_id: persona.id, progetto_id: newProject.id, ruolo: 'admin', attivo: true
        })
        if (errAss) console.error('Errore auto-assegnazione:', errAss)
      }

      // 3. Crea dipartimenti predefiniti
      const dipartimentiDefault = [
        { nome: 'Engineering', codice: 'ENG', progetto_id: newProject.id },
        { nome: 'Procurement', codice: 'PROC', progetto_id: newProject.id },
        { nome: 'Construction', codice: 'CONST', progetto_id: newProject.id },
        { nome: 'HSE', codice: 'HSE', progetto_id: newProject.id },
        { nome: 'Administration', codice: 'ADM', progetto_id: newProject.id },
        { nome: 'Quality', codice: 'QA', progetto_id: newProject.id }
      ]
      await supabase.from('dipartimenti').insert(dipartimentiDefault)

      // 4. Crea flussi approvazione predefiniti
      const flussiDefault = [
        { progetto_id: newProject.id, nome: 'Approvazione Ferie', tipo: 'ferie', descrizione: 'Workflow standard per richieste ferie', attivo: true },
        { progetto_id: newProject.id, nome: 'Approvazione Rapportino', tipo: 'rapportino', descrizione: 'Workflow standard per rapportini', attivo: true },
        { progetto_id: newProject.id, nome: 'Approvazione Trasferimento', tipo: 'trasferimento', descrizione: 'Workflow standard per trasferimenti', attivo: true }
      ]
      await supabase.from('flussi_approvazione').insert(flussiDefault)

      // 5. Crea discipline predefinite
      const disciplineDefault = [
        { nome: 'Piping', codice: 'PIP', colore: '#3B82F6', progetto_id: newProject.id },
        { nome: 'Civil', codice: 'CIV', colore: '#22C55E', progetto_id: newProject.id },
        { nome: 'Electrical', codice: 'ELE', colore: '#F59E0B', progetto_id: newProject.id },
        { nome: 'Instrumentation', codice: 'INS', colore: '#8B5CF6', progetto_id: newProject.id },
        { nome: 'Mechanical', codice: 'MEC', colore: '#EF4444', progetto_id: newProject.id },
        { nome: 'Structural', codice: 'STR', colore: '#06B6D4', progetto_id: newProject.id }
      ]
      await supabase.from('discipline').insert(disciplineDefault)

      // 6. Crea fasi workflow predefinite
      const fasiDefault = [
        { nome: 'Da Ordinare', codice: 'ORD', ordine: 1, colore: '#94A3B8', progetto_id: newProject.id },
        { nome: 'Ordinato', codice: 'ORDT', ordine: 2, colore: '#F59E0B', progetto_id: newProject.id },
        { nome: 'In Produzione', codice: 'PROD', ordine: 3, colore: '#8B5CF6', progetto_id: newProject.id },
        { nome: 'In Warehouse', codice: 'WHS', ordine: 4, colore: '#3B82F6', progetto_id: newProject.id },
        { nome: 'At Site', codice: 'SITE', ordine: 5, colore: '#06B6D4', progetto_id: newProject.id },
        { nome: 'In Lavorazione', codice: 'WIP', ordine: 6, colore: '#F97316', progetto_id: newProject.id },
        { nome: 'Completato', codice: 'DONE', ordine: 7, colore: '#22C55E', progetto_id: newProject.id }
      ]
      await supabase.from('fasi_workflow').insert(fasiDefault)

      setMessage({ type: 'success', text: '✅ Progetto creato con successo! Ricarico la pagina...' })
      loadProgetti()
      setTimeout(() => { window.location.reload() }, 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStato = async (prog) => {
    const nuovoStato = prog.stato === 'attivo' ? 'completato' : 'attivo'
    await supabase.from('progetti').update({ stato: nuovoStato }).eq('id', prog.id)
    loadProgetti()
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📋 Tutti i Progetti</h2>
          <p className="text-sm text-gray-500">{progetti.length} progetti totali</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            + Nuovo Progetto
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">➕ Nuovo Progetto</h3>
          <div className="grid gap-4">
            {/* Nome e Codice */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Centrale Gas Milano" /></div>
              <div><label className="block text-sm font-medium mb-1">Codice</label>
                <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="PRJ-MILANO-001" /></div>
            </div>
            
            {/* Indirizzo con Autocomplete */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  Indirizzo {searchingAddress && <span className="ml-2 text-blue-500 text-xs">🔍 Cercando...</span>}
                </label>
                <input type="text" value={formData.indirizzo} 
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-3 border rounded-xl" placeholder="Inizia a digitare l'indirizzo..." />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto">
                    {addressSuggestions.map((suggestion, idx) => (
                      <button key={idx} type="button" onClick={() => selectAddress(suggestion)} className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0">
                        <p className="font-medium text-gray-800 truncate">{suggestion.indirizzo}</p>
                        <p className="text-sm text-gray-500 truncate">{suggestion.citta}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div><label className="block text-sm font-medium mb-1">Città</label>
                <input type="text" value={formData.citta} onChange={(e) => setFormData({...formData, citta: e.target.value})} className="w-full px-4 py-3 border rounded-xl bg-gray-50" placeholder="Auto-compilata" /></div>
            </div>
            
            {/* Coordinate GPS */}
            <div className="p-4 bg-white rounded-xl border">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-blue-800">📍 Coordinate GPS Centro Cantiere</label>
                <button type="button" onClick={getCurrentLocation} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">📍 Usa GPS Attuale</button>
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Latitudine</label>
                  <input type="text" value={formData.latitudine} onChange={(e) => setFormData({...formData, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl bg-gray-50" placeholder="44.80150000" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Longitudine</label>
                  <input type="text" value={formData.longitudine} onChange={(e) => setFormData({...formData, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl bg-gray-50" placeholder="10.32790000" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Raggio Check-in (m)</label>
                  <input type="number" value={formData.raggio_checkin} onChange={(e) => setFormData({...formData, raggio_checkin: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="200" min="50" max="5000" /></div>
              </div>
              {formData.latitudine && formData.longitudine && (
                <p className="mt-2 text-xs text-green-600">✅ I lavoratori potranno fare check-in entro {formData.raggio_checkin}m da questo punto.</p>
              )}
            </div>
            
            {/* Date */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Data Inizio</label>
                <input type="date" value={formData.data_inizio} onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Data Fine Prevista</label>
                <input type="date" value={formData.data_fine_prevista} onChange={(e) => setFormData({...formData, data_fine_prevista: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            
            {/* Info */}
            <div className="p-3 bg-green-50 rounded-xl text-sm text-green-700">
              💡 <strong>Auto-generati:</strong> Dipartimenti, Discipline, Fasi workflow, Flussi approvazione
            </div>
            
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">Annulla</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? '⏳ Creazione...' : '✅ Crea Progetto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista progetti */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="space-y-3">
          {progetti.map(prog => (
            <div key={prog.id} className={`p-4 rounded-xl border ${prog.stato === 'attivo' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${prog.stato === 'attivo' ? 'bg-green-100' : 'bg-gray-200'}`}>🏗️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{prog.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prog.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {prog.stato === 'attivo' ? '✅ Attivo' : '📦 Completato'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{prog.codice || 'Nessun codice'} • {prog.citta || 'Località non specificata'}</p>
                  {prog.data_inizio && (
                    <p className="text-xs text-gray-400">📅 {new Date(prog.data_inizio).toLocaleDateString('it-IT')}{prog.data_fine_prevista && <> → {new Date(prog.data_fine_prevista).toLocaleDateString('it-IT')}</>}</p>
                  )}
                  {prog.latitudine && prog.longitudine && (
                    <p className="text-xs text-blue-500">📍 GPS: {parseFloat(prog.latitudine).toFixed(4)}, {parseFloat(prog.longitudine).toFixed(4)} {prog.raggio_checkin && `(${prog.raggio_checkin}m)`}</p>
                  )}
                </div>
                <button onClick={() => handleToggleStato(prog)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${prog.stato === 'attivo' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {prog.stato === 'attivo' ? 'Completa' : 'Riattiva'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== PERSONE TAB ====================
function PersoneTab() {
  const { assegnazione } = useAuth()
  const [persone, setPersone] = useState([])
  const [tuttePersone, setTuttePersone] = useState([]) // Tutte le persone nel sistema
  const [ditte, setDitte] = useState([])
  const [squadre, setSquadre] = useState([])
  const [dipartimenti, setDipartimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [modalita, setModalita] = useState('nuova') // 'nuova' o 'esistente'
  const [editingPersona, setEditingPersona] = useState(null)
  const [formData, setFormData] = useState({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '', dipartimento_id: '' })
  const [selectedPersonaId, setSelectedPersonaId] = useState('') // Per assegnare esistente
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [filter, setFilter] = useState('')
  
  // AGGIORNATO: Lista ruoli con PM e Dept Manager
  const ruoli = [
    { value: 'helper', label: 'Operaio' },
    { value: 'office', label: 'Impiegato' },
    { value: 'foreman', label: 'Caposquadra' },
    { value: 'dept_manager', label: 'Responsabile Dipartimento' },
    { value: 'supervisor', label: 'Supervisore' },
    { value: 'cm', label: 'Construction Manager' },
    { value: 'pm', label: 'Project Manager' },
    { value: 'admin', label: 'Admin' }
  ]

  useEffect(() => { if (assegnazione?.progetto_id) loadData() }, [assegnazione?.progetto_id])

  const loadData = async () => {
    setLoading(true)
    // Persone assegnate a questo progetto
    const { data: p } = await supabase.from('assegnazioni_progetto').select('*, persona:persone(*), ditta:ditte(id, nome), squadra:squadre(id, nome), dipartimento:dipartimenti(id, nome)').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('ruolo')
    setPersone(p || [])
    
    // TUTTE le persone nel sistema (per assegnare esistenti)
    const { data: allP } = await supabase.from('persone').select('*').order('cognome')
    setTuttePersone(allP || [])
    
    const { data: d } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome')
    setDitte(d || [])
    const { data: s } = await supabase.from('squadre').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('nome')
    setSquadre(s || [])
    const { data: dip } = await supabase.from('dipartimenti').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setDipartimenti(dip || [])
    setLoading(false)
  }

  // Persone disponibili per assegnazione (non già in questo progetto)
  const personeDisponibili = tuttePersone.filter(p => 
    !persone.some(ass => ass.persona.id === p.id)
  )

  const resetForm = () => { 
    setFormData({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '', dipartimento_id: '' })
    setSelectedPersonaId('')
    setEditingPersona(null)
    setShowForm(false)
    setMessage(null)
    setModalita('nuova')
  }

  const handleEdit = (ass) => {
    setFormData({ nome: ass.persona.nome || '', cognome: ass.persona.cognome || '', email: ass.persona.email || '', telefono: ass.persona.telefono || '', codice_fiscale: ass.persona.codice_fiscale || '', ruolo: ass.ruolo || 'helper', ditta_id: ass.ditta_id || '', squadra_id: ass.squadra_id || '', dipartimento_id: ass.dipartimento_id || '' })
    setEditingPersona(ass)
    setModalita('nuova')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true); setMessage(null)
    
    try {
      if (modalita === 'esistente') {
        // Assegna persona esistente al progetto
        if (!selectedPersonaId) { 
          setMessage({ type: 'error', text: 'Seleziona una persona' })
          setSaving(false)
          return 
        }
        
        await supabase.from('assegnazioni_progetto').insert({ 
          persona_id: selectedPersonaId, 
          progetto_id: assegnazione.progetto_id, 
          ruolo: formData.ruolo, 
          ditta_id: formData.ditta_id || null, 
          squadra_id: formData.squadra_id || null, 
          dipartimento_id: formData.dipartimento_id || null, 
          attivo: true 
        })
        setMessage({ type: 'success', text: 'Persona assegnata al progetto!' })
      } else {
        // Crea nuova persona o modifica esistente
        if (!formData.nome || !formData.cognome) { 
          setMessage({ type: 'error', text: 'Nome e cognome obbligatori' })
          setSaving(false)
          return 
        }
        
        if (editingPersona) {
          await supabase.from('persone').update({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).eq('id', editingPersona.persona.id)
          await supabase.from('assegnazioni_progetto').update({ ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, dipartimento_id: formData.dipartimento_id || null }).eq('id', editingPersona.id)
        } else {
          const { data: newP, error: e1 } = await supabase.from('persone').insert({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).select().single()
          if (e1) throw e1
          await supabase.from('assegnazioni_progetto').insert({ persona_id: newP.id, progetto_id: assegnazione.progetto_id, ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, dipartimento_id: formData.dipartimento_id || null, attivo: true })
        }
        setMessage({ type: 'success', text: editingPersona ? 'Aggiornato!' : 'Creato!' })
      }
      
      loadData()
      setTimeout(resetForm, 1000)
    } catch (err) { 
      setMessage({ type: 'error', text: err.message }) 
    }
    finally { setSaving(false) }
  }

  const handleDisable = async (ass) => { if (!confirm('Rimuovere dal progetto?')) return; await supabase.from('assegnazioni_progetto').update({ attivo: false }).eq('id', ass.id); loadData() }

  const filteredPersone = persone.filter(p => !filter || p.persona.nome?.toLowerCase().includes(filter.toLowerCase()) || p.persona.cognome?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-gray-800">👥 Persone</h2><p className="text-sm text-gray-500">{persone.length} nel progetto</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          {/* Toggle Nuova/Esistente */}
          {!editingPersona && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setModalita('nuova')}
                className={`px-4 py-2 rounded-xl font-medium ${modalita === 'nuova' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
              >
                ➕ Nuova Persona
              </button>
              <button
                onClick={() => setModalita('esistente')}
                className={`px-4 py-2 rounded-xl font-medium ${modalita === 'esistente' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border'}`}
              >
                👤 Assegna Esistente
              </button>
            </div>
          )}

          <h3 className="font-semibold text-blue-800 mb-4">
            {editingPersona ? '✏️ Modifica' : modalita === 'esistente' ? '👤 Assegna Persona Esistente' : '➕ Nuova Persona'}
          </h3>
          
          <div className="grid gap-4">
            {modalita === 'esistente' && !editingPersona ? (
              <>
                {/* Selezione persona esistente */}
                <div>
                  <label className="block text-sm font-medium mb-1">Seleziona Persona *</label>
                  <select 
                    value={selectedPersonaId} 
                    onChange={(e) => setSelectedPersonaId(e.target.value)} 
                    className="w-full px-4 py-3 border rounded-xl"
                  >
                    <option value="">-- Seleziona --</option>
                    {personeDisponibili.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.cognome} {p.nome} {p.email ? `(${p.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {personeDisponibili.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">⚠️ Tutte le persone sono già assegnate a questo progetto</p>
                  )}
                </div>
                
                {/* Ruolo e assegnazioni */}
                <div className="grid lg:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Ruolo</label><select value={formData.ruolo} onChange={(e) => setFormData({...formData, ruolo: e.target.value})} className="w-full px-4 py-3 border rounded-xl">{ruoli.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Ditta</label><select value={formData.ditta_id} onChange={(e) => setFormData({...formData, ditta_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Committente</option>{ditte.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Squadra</label><select value={formData.squadra_id} onChange={(e) => setFormData({...formData, squadra_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuna</option>{squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Dipartimento</label><select value={formData.dipartimento_id} onChange={(e) => setFormData({...formData, dipartimento_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuno</option>{dipartimenti.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                </div>
              </>
            ) : (
              <>
                {/* Form nuova persona */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                  <div><label className="block text-sm font-medium mb-1">Cognome *</label><input type="text" value={formData.cognome} onChange={(e) => setFormData({...formData, cognome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                </div>
                <div className="grid lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                  <div><label className="block text-sm font-medium mb-1">Telefono</label><input type="tel" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                  <div><label className="block text-sm font-medium mb-1">CF</label><input type="text" value={formData.codice_fiscale} onChange={(e) => setFormData({...formData, codice_fiscale: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" maxLength={16} /></div>
                </div>
                <div className="grid lg:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Ruolo</label><select value={formData.ruolo} onChange={(e) => setFormData({...formData, ruolo: e.target.value})} className="w-full px-4 py-3 border rounded-xl">{ruoli.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Ditta</label><select value={formData.ditta_id} onChange={(e) => setFormData({...formData, ditta_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Committente</option>{ditte.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Squadra</label><select value={formData.squadra_id} onChange={(e) => setFormData({...formData, squadra_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuna</option>{squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Dipartimento</label><select value={formData.dipartimento_id} onChange={(e) => setFormData({...formData, dipartimento_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuno</option>{dipartimenti.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                </div>
              </>
            )}
            
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
              <button onClick={handleSave} disabled={saving} className={`px-4 py-2 text-white rounded-xl ${modalita === 'esistente' ? 'bg-green-600' : 'bg-blue-600'}`}>
                {saving ? '...' : modalita === 'esistente' ? 'Assegna' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4"><input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="🔍 Cerca..." className="w-full px-4 py-3 border rounded-xl" /></div>

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredPersone.map(ass => (
            <div key={ass.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">{ass.persona.nome?.[0]}{ass.persona.cognome?.[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{ass.persona.nome} {ass.persona.cognome}</p>
                <p className="text-xs text-gray-500">
                  {ruoli.find(r => r.value === ass.ruolo)?.label} • {ass.ditta?.nome || 'Committente'}
                  {ass.dipartimento?.nome && ` • ${ass.dipartimento.nome}`}
                </p>
              </div>
              <div className="flex gap-1"><button onClick={() => handleEdit(ass)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDisable(ass)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rimuovi dal progetto">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
      
      {/* Info box */}
      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-700">
          <strong>💡 Nota:</strong> Rimuovere una persona la disattiva solo da questo progetto. 
          La persona resta nel sistema e può essere ri-assegnata usando "Assegna Esistente".
        </p>
      </div>
    </div>
  )
}

// ==================== DITTE TAB ====================
function DitteTab() {
  const [ditte, setDitte] = useState([])
  const [suggerimenti, setSuggerimenti] = useState([]) // Ditte esistenti per suggerimenti
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDitta, setEditingDitta] = useState(null)
  const [formData, setFormData] = useState({ codice: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '', tipo: 'subappaltatore' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadDitte() }, [])

  const loadDitte = async () => { 
    setLoading(true)
    const { data } = await supabase.from('ditte').select('*').eq('attiva', true).order('ragione_sociale')
    setDitte(data || [])
    
    // Suggerimenti: tutte le ditte per auto-completamento
    const nomiUnici = [...new Set(data?.map(d => d.ragione_sociale).filter(Boolean))]
    setSuggerimenti(nomiUnici)
    setLoading(false) 
  }
  
  const resetForm = () => { setFormData({ codice: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '', tipo: 'subappaltatore' }); setEditingDitta(null); setShowForm(false); setMessage(null) }
  
  const handleEdit = (d) => { 
    setFormData({ 
      codice: d.codice || '', 
      ragione_sociale: d.ragione_sociale || '', 
      partita_iva: d.partita_iva || '', 
      indirizzo: d.indirizzo || '', 
      telefono: d.telefono || '', 
      email: d.email || '',
      tipo: d.tipo || 'subappaltatore'
    })
    setEditingDitta(d)
    setShowForm(true) 
  }
  
  // Quando clicchi su un suggerimento, cerca se quella ditta esiste già
  const handleSuggerimentoClick = (ragSociale) => {
    const dittaEsistente = ditte.find(d => d.ragione_sociale === ragSociale)
    if (dittaEsistente) {
      setFormData({
        codice: dittaEsistente.codice || '',
        ragione_sociale: dittaEsistente.ragione_sociale || '',
        partita_iva: dittaEsistente.partita_iva || '',
        indirizzo: dittaEsistente.indirizzo || '',
        telefono: dittaEsistente.telefono || '',
        email: dittaEsistente.email || '',
        tipo: dittaEsistente.tipo || 'subappaltatore'
      })
    } else {
      setFormData({...formData, ragione_sociale: ragSociale})
    }
  }

  const handleSave = async () => {
    if (!formData.ragione_sociale) { setMessage({ type: 'error', text: 'Ragione sociale obbligatoria' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = {
        codice: formData.codice || null,
        ragione_sociale: formData.ragione_sociale,
        partita_iva: formData.partita_iva || null,
        indirizzo: formData.indirizzo || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        tipo: formData.tipo || 'subappaltatore'
      }
      if (editingDitta) { 
        await supabase.from('ditte').update(payload).eq('id', editingDitta.id) 
      } else { 
        await supabase.from('ditte').insert({ ...payload, attiva: true }) 
      }
      setMessage({ type: 'success', text: 'Salvato!' }); loadDitte(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm('Disattivare?')) return; await supabase.from('ditte').update({ attiva: false }).eq('id', id); loadDitte() }

  // Suggerimenti filtrati (non già nel form)
  const suggerimentiDisponibili = suggerimenti.filter(s => 
    s.toLowerCase() !== formData.ragione_sociale?.toLowerCase()
  ).slice(0, 6)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">🏢 Ditte</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingDitta ? '✏️ Modifica' : '➕ Nuova'}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Codice</label>
                <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: ROSSI" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ragione Sociale *</label>
                <input type="text" value={formData.ragione_sociale} onChange={(e) => setFormData({...formData, ragione_sociale: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Rossi Costruzioni S.r.l." />
                
                {/* Suggerimenti */}
                {!editingDitta && suggerimentiDisponibili.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">💡 Ditte esistenti:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggerimentiDisponibili.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSuggerimentoClick(s)}
                          className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 truncate max-w-[200px]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">P.IVA</label><input type="text" value={formData.partita_iva} onChange={(e) => setFormData({...formData, partita_iva: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Telefono</label><input type="tel" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                <option value="subappaltatore">Subappaltatore</option>
                <option value="cliente">Cliente</option>
                <option value="fornitore">Fornitore</option>
                <option value="consorzio">Consorzio</option>
              </select>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <div className="space-y-2">
          {ditte.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">{d.ragione_sociale?.[0] || '?'}</div>
              <div className="flex-1">
                <p className="font-medium">{d.ragione_sociale}</p>
                <p className="text-xs text-gray-500">{d.codice && `[${d.codice}] `}{d.partita_iva || 'P.IVA non inserita'}</p>
              </div>
              <span className="px-2 py-1 text-xs bg-gray-200 rounded-full">{d.tipo || 'N/D'}</span>
              <div className="flex gap-1"><button onClick={() => handleEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== SQUADRE TAB ====================
function SquadreTab() {
  const { assegnazione } = useAuth()
  const [squadre, setSquadre] = useState([])
  const [suggerimenti, setSuggerimenti] = useState([]) // Nomi usati in altri progetti
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSquadra, setEditingSquadra] = useState(null)
  const [formData, setFormData] = useState({ nome: '', descrizione: '', colore: '#3B82F6' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => { if (assegnazione?.progetto_id) { loadSquadre(); loadSuggerimenti() } }, [assegnazione?.progetto_id])

  const loadSquadre = async () => { 
    setLoading(true)
    const { data } = await supabase.from('squadre').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('nome')
    setSquadre(data || [])
    setLoading(false) 
  }
  
  // Carica nomi squadre da ALTRI progetti (per suggerimenti)
  const loadSuggerimenti = async () => {
    const { data } = await supabase
      .from('squadre')
      .select('nome')
      .neq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
    
    // Nomi unici ordinati per frequenza
    const nomiCount = {}
    data?.forEach(s => { nomiCount[s.nome] = (nomiCount[s.nome] || 0) + 1 })
    const nomiOrdinati = Object.keys(nomiCount).sort((a, b) => nomiCount[b] - nomiCount[a])
    setSuggerimenti(nomiOrdinati)
  }

  const resetForm = () => { setFormData({ nome: '', descrizione: '', colore: '#3B82F6' }); setEditingSquadra(null); setShowForm(false); setMessage(null) }
  const handleEdit = (sq) => { setFormData({ nome: sq.nome || '', descrizione: sq.descrizione || '', colore: sq.colore || '#3B82F6' }); setEditingSquadra(sq); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { nome: formData.nome, descrizione: formData.descrizione || null, colore: formData.colore, progetto_id: assegnazione.progetto_id }
      if (editingSquadra) { await supabase.from('squadre').update(payload).eq('id', editingSquadra.id) }
      else { await supabase.from('squadre').insert({ ...payload, attivo: true }) }
      setMessage({ type: 'success', text: 'Salvato!' }); loadSquadre(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm('Eliminare?')) return; await supabase.from('squadre').update({ attivo: false }).eq('id', id); loadSquadre() }

  // Nomi squadre già esistenti in questo progetto
  const nomiEsistenti = squadre.map(s => s.nome.toLowerCase())
  // Suggerimenti filtrati (non già usati in questo progetto)
  const suggerimentiDisponibili = suggerimenti.filter(s => !nomiEsistenti.includes(s.toLowerCase()))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">👷 Squadre</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingSquadra ? '✏️ Modifica' : '➕ Nuova'}</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Piping, Elettrica..." />
              
              {/* Suggerimenti da altri progetti */}
              {!editingSquadra && suggerimentiDisponibili.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">💡 Usati in altri progetti:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggerimentiDisponibili.slice(0, 8).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({...formData, nome: s})}
                        className="px-2 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div><label className="block text-sm font-medium mb-1">Descrizione</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium mb-2">Colore</label><div className="flex gap-2">{colori.map(c => (<button key={c} onClick={() => setFormData({...formData, colore: c})} className={`w-8 h-8 rounded-full border-2 ${formData.colore === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <div className="space-y-2">
          {squadre.map(sq => (
            <div key={sq.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sq.colore }} />
              <div className="flex-1"><p className="font-medium">{sq.nome}</p>{sq.descrizione && <p className="text-xs text-gray-500">{sq.descrizione}</p>}</div>
              <div className="flex gap-1"><button onClick={() => handleEdit(sq)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(sq.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DIPARTIMENTI TAB (NUOVO) ====================
function DipartimentiTab() {
  const { assegnazione } = useAuth()
  const [dipartimenti, setDipartimenti] = useState([])
  const [suggerimenti, setSuggerimenti] = useState([]) // Nomi usati in altri progetti
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDip, setEditingDip] = useState(null)
  const [formData, setFormData] = useState({ nome: '', codice: '', descrizione: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (assegnazione?.progetto_id) { loadDipartimenti(); loadSuggerimenti() } }, [assegnazione?.progetto_id])

  const loadDipartimenti = async () => { 
    setLoading(true)
    const { data } = await supabase.from('dipartimenti').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setDipartimenti(data || [])
    setLoading(false) 
  }

  // Carica nomi dipartimenti da ALTRI progetti (per suggerimenti)
  const loadSuggerimenti = async () => {
    const { data } = await supabase
      .from('dipartimenti')
      .select('nome, codice')
      .neq('progetto_id', assegnazione.progetto_id)
    
    // Nomi unici con codice
    const nomiMap = {}
    data?.forEach(d => { 
      if (!nomiMap[d.nome]) {
        nomiMap[d.nome] = d.codice 
      }
    })
    setSuggerimenti(Object.entries(nomiMap).map(([nome, codice]) => ({ nome, codice })))
  }

  const resetForm = () => { setFormData({ nome: '', codice: '', descrizione: '' }); setEditingDip(null); setShowForm(false); setMessage(null) }
  
  const handleEdit = (dip) => { 
    setFormData({ nome: dip.nome || '', codice: dip.codice || '', descrizione: dip.descrizione || '' })
    setEditingDip(dip)
    setShowForm(true) 
  }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { nome: formData.nome, codice: formData.codice || null, descrizione: formData.descrizione || null, progetto_id: assegnazione.progetto_id }
      if (editingDip) { await supabase.from('dipartimenti').update(payload).eq('id', editingDip.id) }
      else { await supabase.from('dipartimenti').insert(payload) }
      setMessage({ type: 'success', text: 'Salvato!' }); loadDipartimenti(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { 
    if (!confirm('Eliminare questo dipartimento?')) return
    await supabase.from('dipartimenti').delete().eq('id', id)
    loadDipartimenti() 
  }

  // Nomi già esistenti in questo progetto
  const nomiEsistenti = dipartimenti.map(d => d.nome.toLowerCase())
  // Suggerimenti filtrati
  const suggerimentiDisponibili = suggerimenti.filter(s => !nomiEsistenti.includes(s.nome.toLowerCase()))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🏛️ Dipartimenti</h2>
          <p className="text-sm text-gray-500">Organizza il personale ufficio per dipartimento</p>
        </div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 mb-6">
          <h3 className="font-semibold text-indigo-800 mb-4">{editingDip ? '✏️ Modifica' : '➕ Nuovo'} Dipartimento</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Engineering" />
                
                {/* Suggerimenti da altri progetti */}
                {!editingDip && suggerimentiDisponibili.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">💡 Usati in altri progetti:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggerimentiDisponibili.slice(0, 6).map(s => (
                        <button
                          key={s.nome}
                          type="button"
                          onClick={() => setFormData({...formData, nome: s.nome, codice: s.codice || ''})}
                          className="px-2 py-1 text-xs bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50"
                        >
                          {s.nome} {s.codice && `(${s.codice})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div><label className="block text-sm font-medium mb-1">Codice</label><input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" placeholder="ENG" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Descrizione</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : dipartimenti.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-2">🏛️</p>
          <p>Nessun dipartimento</p>
          <p className="text-sm">I dipartimenti predefiniti vengono creati automaticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dipartimenti.map(dip => (
            <div key={dip.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">{dip.codice || '?'}</div>
              <div className="flex-1">
                <p className="font-medium">{dip.nome}</p>
                {dip.descrizione && <p className="text-xs text-gray-500">{dip.descrizione}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(dip)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(dip.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== CENTRI COSTO TAB ====================
function CentriCostoTab() {
  const { assegnazione } = useAuth()
  const [centri, setCentri] = useState([])
  const [suggerimenti, setSuggerimenti] = useState([]) // Da altri progetti
  const [unitaMisura, setUnitaMisura] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCentro, setEditingCentro] = useState(null)
  const [formData, setFormData] = useState({ codice: '', nome: '', descrizione: '', budget_ore: '', budget_quantita: '', unita_misura_id: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { 
    if (assegnazione?.progetto_id) { 
      loadCentri()
      loadSuggerimenti()
      loadUnitaMisura()
    } 
  }, [assegnazione?.progetto_id])

  const loadCentri = async () => { 
    setLoading(true)
    const { data } = await supabase
      .from('centri_costo')
      .select('*, unita:unita_misura(codice, nome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .order('codice')
    setCentri(data || [])
    setLoading(false) 
  }
  
  const loadSuggerimenti = async () => {
    const { data } = await supabase
      .from('centri_costo')
      .select('codice, nome, descrizione')
      .neq('progetto_id', assegnazione.progetto_id)
    
    // Raggruppa per nome univoco
    const nomiMap = {}
    data?.forEach(cc => { 
      if (!nomiMap[cc.nome]) {
        nomiMap[cc.nome] = { codice: cc.codice, descrizione: cc.descrizione }
      }
    })
    setSuggerimenti(Object.entries(nomiMap).map(([nome, rest]) => ({ nome, ...rest })))
  }
  
  const loadUnitaMisura = async () => {
    const { data } = await supabase.from('unita_misura').select('*').order('codice')
    setUnitaMisura(data || [])
  }

  const resetForm = () => { 
    setFormData({ codice: '', nome: '', descrizione: '', budget_ore: '', budget_quantita: '', unita_misura_id: '' })
    setEditingCentro(null)
    setShowForm(false)
    setMessage(null) 
  }
  
  const handleEdit = (cc) => { 
    setFormData({ 
      codice: cc.codice || '', 
      nome: cc.nome || '',
      descrizione: cc.descrizione || '', 
      budget_ore: cc.budget_ore?.toString() || '', 
      budget_quantita: cc.budget_quantita?.toString() || '',
      unita_misura_id: cc.unita_misura_id || ''
    })
    setEditingCentro(cc)
    setShowForm(true) 
  }
  
  const handleSuggerimentoClick = (sugg) => {
    setFormData({
      ...formData,
      codice: sugg.codice || '',
      nome: sugg.nome || '',
      descrizione: sugg.descrizione || ''
    })
  }

  const handleSave = async () => {
    if (!formData.codice || !formData.nome) { setMessage({ type: 'error', text: 'Codice e nome obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { 
        codice: formData.codice, 
        nome: formData.nome,
        descrizione: formData.descrizione || null, 
        budget_ore: formData.budget_ore ? parseFloat(formData.budget_ore) : null, 
        budget_quantita: formData.budget_quantita ? parseFloat(formData.budget_quantita) : null,
        unita_misura_id: formData.unita_misura_id || null,
        progetto_id: assegnazione.progetto_id,
        stato: 'attivo'
      }
      if (editingCentro) { 
        await supabase.from('centri_costo').update(payload).eq('id', editingCentro.id) 
      } else { 
        await supabase.from('centri_costo').insert(payload) 
      }
      setMessage({ type: 'success', text: 'Salvato!' }); loadCentri(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { 
    if (!confirm('Disattivare?')) return
    await supabase.from('centri_costo').update({ stato: 'disattivo' }).eq('id', id)
    loadCentri() 
  }
  
  // Resa target calcolata
  const calcolaResaTarget = (cc) => {
    if (cc.budget_ore > 0 && cc.budget_quantita > 0) {
      return (cc.budget_quantita / cc.budget_ore).toFixed(2)
    }
    return '-'
  }

  // Suggerimenti filtrati (non già usati in questo progetto)
  const codiciEsistenti = centri.map(c => c.codice.toLowerCase())
  const suggerimentiDisponibili = suggerimenti.filter(s => 
    !codiciEsistenti.includes(s.codice?.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">💰 Centri di Costo</h2>
          <p className="text-sm text-gray-500">Gestisci budget ore e quantità per centro di costo</p>
        </div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-6">
          <h3 className="font-semibold text-amber-800 mb-4">{editingCentro ? '✏️ Modifica' : '➕ Nuovo'} Centro di Costo</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" placeholder="PIP-001" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Piping - Installazione" />
              </div>
            </div>
            
            {/* Suggerimenti da altri progetti */}
            {!editingCentro && suggerimentiDisponibili.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">💡 Usati in altri progetti:</p>
                <div className="flex flex-wrap gap-1">
                  {suggerimentiDisponibili.map(s => (
                    <button
                      key={s.codice}
                      type="button"
                      onClick={() => handleSuggerimentoClick(s)}
                      className="px-2 py-1 text-xs bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50"
                    >
                      [{s.codice}] {s.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Descrizione attività" />
            </div>
            
            <div className="grid lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Budget Ore</label>
                <input type="number" value={formData.budget_ore} onChange={(e) => setFormData({...formData, budget_ore: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Budget Quantità</label>
                <input type="number" step="0.001" value={formData.budget_quantita} onChange={(e) => setFormData({...formData, budget_quantita: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="1000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unità di Misura</label>
                <select value={formData.unita_misura_id} onChange={(e) => setFormData({...formData, unita_misura_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl">
                  <option value="">Seleziona...</option>
                  {unitaMisura.map(um => (
                    <option key={um.id} value={um.id}>{um.codice} - {um.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Resa target preview */}
            {formData.budget_ore && formData.budget_quantita && (
              <div className="p-3 bg-green-50 rounded-xl text-sm">
                <span className="font-medium text-green-700">📊 Resa Target: </span>
                <span className="text-green-800">
                  {(parseFloat(formData.budget_quantita) / parseFloat(formData.budget_ore)).toFixed(2)} 
                  {unitaMisura.find(u => u.id === formData.unita_misura_id)?.codice || ''}/hr
                </span>
              </div>
            )}
            
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : centri.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">💰</p>
          <p>Nessun centro di costo creato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {centri.map(cc => (
            <div key={cc.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-mono font-bold text-xs text-center leading-tight">{cc.codice}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{cc.nome}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                  {cc.budget_ore > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">⏱️ {cc.budget_ore}h</span>}
                  {cc.budget_quantita > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">📦 {cc.budget_quantita} {cc.unita?.codice || ''}</span>}
                  {cc.budget_ore > 0 && cc.budget_quantita > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">📈 {calcolaResaTarget(cc)} {cc.unita?.codice || ''}/hr</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(cc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== QR CODES TAB ====================
function QRCodesTab() {
  const { assegnazione, progetto } = useAuth()
  const [qrCodes, setQrCodes] = useState([])
  const [aree, setAree] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQR, setEditingQR] = useState(null)
  const [formData, setFormData] = useState({ nome: '', descrizione: '', area_lavoro_id: '', scadenza: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (assegnazione?.progetto_id) { loadQRCodes(); loadAree() } }, [assegnazione?.progetto_id])

  const loadQRCodes = async () => {
    setLoading(true)
    const { data } = await supabase.from('qr_codes').select('*, area:aree_lavoro(nome)').eq('progetto_id', assegnazione.progetto_id).order('created_at', { ascending: false })
    setQrCodes(data || [])
    setLoading(false)
  }

  const loadAree = async () => {
    const { data } = await supabase.from('aree_lavoro').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true)
    setAree(data || [])
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'QR-'
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  const resetForm = () => { setFormData({ nome: '', descrizione: '', area_lavoro_id: '', scadenza: '' }); setEditingQR(null); setShowForm(false); setMessage(null) }

  const handleEdit = (qr) => {
    setFormData({ nome: qr.nome || '', descrizione: qr.descrizione || '', area_lavoro_id: qr.area_lavoro_id || '', scadenza: qr.scadenza || '' })
    setEditingQR(qr); setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true); setMessage(null)
    try {
      if (editingQR) {
        await supabase.from('qr_codes').update({ nome: formData.nome, descrizione: formData.descrizione || null, area_lavoro_id: formData.area_lavoro_id || null, scadenza: formData.scadenza || null }).eq('id', editingQR.id)
      } else {
        await supabase.from('qr_codes').insert({ progetto_id: assegnazione.progetto_id, codice: generateCode(), nome: formData.nome, descrizione: formData.descrizione || null, area_lavoro_id: formData.area_lavoro_id || null, scadenza: formData.scadenza || null, attivo: true })
      }
      setMessage({ type: 'success', text: editingQR ? 'Aggiornato!' : 'Creato!' })
      loadQRCodes(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleToggle = async (qr) => {
    await supabase.from('qr_codes').update({ attivo: !qr.attivo }).eq('id', qr.id)
    loadQRCodes()
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo QR Code?')) return
    await supabase.from('qr_codes').delete().eq('id', id)
    loadQRCodes()
  }

  const printQR = (qr) => {
    const html = `<!DOCTYPE html><html><head><title>QR Code - ${qr.nome}</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>body{font-family:Arial,sans-serif;text-align:center;padding:40px}.qr-container{display:inline-block;padding:30px;border:3px solid #333;border-radius:20px;margin:20px}.title{font-size:24px;font-weight:bold;margin-bottom:10px}.code{font-family:monospace;font-size:20px;background:#f0f0f0;padding:10px;border-radius:8px;margin-top:15px}.project{color:#666;margin-top:10px}</style></head>
    <body><div class="qr-container"><div class="title">📍 ${qr.nome}</div><canvas id="qr"></canvas><div class="code">${qr.codice}</div><div class="project">${progetto?.nome}</div></div>
    <script>QRCode.toCanvas(document.getElementById('qr'),JSON.stringify({code:'${qr.codice}',project:'${assegnazione.progetto_id}'}),{width:200,margin:2})</script></body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-gray-800">📱 QR Codes Check-in</h2><p className="text-sm text-gray-500">Punti di timbratura con QR code</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl">+ Nuovo QR</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 mb-6">
          <h3 className="font-semibold text-purple-800 mb-4">{editingQR ? '✏️ Modifica' : '➕ Nuovo'} QR Code</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Ingresso Cantiere" /></div>
              <div><label className="block text-sm font-medium mb-1">Area di Lavoro</label><select value={formData.area_lavoro_id} onChange={(e) => setFormData({...formData, area_lavoro_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuna</option>{aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Descrizione</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Scadenza</label><input type="date" value={formData.scadenza} onChange={(e) => setFormData({...formData, scadenza: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : qrCodes.length === 0 ? (
        <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">📱</p><p>Nessun QR Code creato</p><p className="text-sm">Crea QR codes per permettere il check-in tramite scansione</p></div>
      ) : (
        <div className="space-y-3">
          {qrCodes.map(qr => (
            <div key={qr.id} className={`p-4 rounded-xl border ${qr.attivo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">📱</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{qr.nome}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${qr.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{qr.attivo ? 'Attivo' : 'Disattivo'}</span>
                  </div>
                  <p className="font-mono text-sm text-purple-600 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1">{qr.codice}</p>
                  {qr.area?.nome && <p className="text-xs text-gray-500 mt-1">📍 {qr.area.nome}</p>}
                  {qr.scadenza && <p className="text-xs text-gray-400">Scade: {new Date(qr.scadenza).toLocaleDateString('it-IT')}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => printQR(qr)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Stampa">🖨️</button>
                  <button onClick={() => handleEdit(qr)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                  <button onClick={() => handleToggle(qr)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg">{qr.attivo ? '⏸️' : '▶️'}</button>
                  <button onClick={() => handleDelete(qr.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Come funziona</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Crea un QR Code per ogni punto di timbratura</li>
          <li>Stampa il QR Code e posizionalo nel punto desiderato</li>
          <li>I lavoratori scansionano il QR per fare check-in/out</li>
        </ol>
      </div>
    </div>
  )
}

// ==================== DATI TEST TAB ====================
function DatiTestTab() {
  const { assegnazione, persona } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Conta dati test (email @test.it)
      const { count: personeTest } = await supabase.from('persone').select('*', { count: 'exact', head: true }).like('email', '%@test.it')
      const { count: presenzeTest } = await supabase.from('presenze').select('*', { count: 'exact', head: true })
        .in('persona_id', (await supabase.from('persone').select('id').like('email', '%@test.it')).data?.map(p => p.id) || [])
      const { count: regQuantitaTest } = await supabase.from('registrazioni_quantita').select('*', { count: 'exact', head: true })
      
      setStats({
        persone: personeTest || 0,
        presenze: presenzeTest || 0,
        registrazioni: regQuantitaTest || 0
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const generateTestData = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      // 1. Genera presenze test per le ultime 2 settimane
      const personeTestRes = await supabase.from('persone').select('id').like('email', '%@test.it')
      const personeTestIds = personeTestRes.data?.map(p => p.id) || []
      
      if (personeTestIds.length === 0) {
        setMessage({ type: 'error', text: 'Nessuna persona test trovata. Esegui prima lo script SQL.' })
        setGenerating(false)
        return
      }

      // Ottieni assegnazioni per queste persone in questo progetto
      const { data: assegnazioni } = await supabase
        .from('assegnazioni_progetto')
        .select('id, persona_id')
        .eq('progetto_id', assegnazione.progetto_id)
        .in('persona_id', personeTestIds)
        .eq('attivo', true)

      if (!assegnazioni || assegnazioni.length === 0) {
        setMessage({ type: 'error', text: 'Nessuna assegnazione trovata per persone test in questo progetto.' })
        setGenerating(false)
        return
      }

      // Genera presenze
      const oggi = new Date()
      const presenze = []
      
      for (let i = 1; i <= 10; i++) { // Ultimi 10 giorni lavorativi
        const data = new Date(oggi)
        data.setDate(data.getDate() - i)
        
        // Salta weekend
        if (data.getDay() === 0 || data.getDay() === 6) continue
        
        for (const ass of assegnazioni) {
          presenze.push({
            persona_id: ass.persona_id,
            progetto_id: assegnazione.progetto_id,
            data: data.toISOString().split('T')[0],
            ora_checkin: '07:30:00',
            ora_checkout: `${16 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`,
            note: Math.random() > 0.8 ? 'Lavoro extra' : null
          })
        }
      }

      // Inserisci presenze (ignora duplicati)
      const { error: errPres } = await supabase.from('presenze').upsert(presenze, { 
        onConflict: 'persona_id,progetto_id,data',
        ignoreDuplicates: true 
      })
      if (errPres) console.warn('Errore presenze:', errPres)

      // 2. Genera registrazioni quantità
      const { data: centriCosto } = await supabase
        .from('centri_costo')
        .select('id')
        .eq('progetto_id', assegnazione.progetto_id)
        .limit(5)

      const { data: foremen } = await supabase
        .from('assegnazioni_progetto')
        .select('persona_id')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('ruolo', 'foreman')
        .eq('attivo', true)

      if (centriCosto && foremen && foremen.length > 0) {
        const registrazioni = []
        for (let i = 1; i <= 7; i++) {
          const data = new Date(oggi)
          data.setDate(data.getDate() - i)
          if (data.getDay() === 0 || data.getDay() === 6) continue

          for (const cc of centriCosto) {
            const foreman = foremen[Math.floor(Math.random() * foremen.length)]
            registrazioni.push({
              centro_costo_id: cc.id,
              progetto_id: assegnazione.progetto_id,
              foreman_persona_id: foreman.persona_id,
              data: data.toISOString().split('T')[0],
              numero_persone: 3 + Math.floor(Math.random() * 5),
              ore_lavorate: 20 + Math.floor(Math.random() * 30),
              quantita_prodotta: 10 + Math.floor(Math.random() * 40),
              stato: 'approvato'
            })
          }
        }

        await supabase.from('registrazioni_quantita').upsert(registrazioni, {
          onConflict: 'centro_costo_id,data,foreman_persona_id',
          ignoreDuplicates: true
        })
      }

      setMessage({ type: 'success', text: `Generati dati test: ${presenze.length} presenze` })
      loadStats()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setGenerating(false)
  }

  const deleteTestData = async () => {
    if (!confirm('Sei sicuro? Questa azione cancellerà TUTTE le presenze e registrazioni delle persone test (@test.it)')) return
    
    setDeleting(true)
    setMessage(null)
    try {
      // Ottieni ID persone test
      const { data: personeTest } = await supabase.from('persone').select('id').like('email', '%@test.it')
      const ids = personeTest?.map(p => p.id) || []

      if (ids.length > 0) {
        // Cancella presenze
        await supabase.from('presenze').delete().in('persona_id', ids)
        
        // Cancella registrazioni quantità
        await supabase.from('registrazioni_quantita').delete().in('foreman_persona_id', ids)
      }

      setMessage({ type: 'success', text: 'Dati test cancellati!' })
      loadStats()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setDeleting(false)
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">🧪 Gestione Dati Test</h2>
        <p className="text-sm text-gray-500">Genera e cancella dati fittizi per testare le funzionalità</p>
      </div>

      {/* Statistiche attuali */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-xl text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.persone || 0}</p>
            <p className="text-sm text-blue-700">Persone Test</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.presenze || 0}</p>
            <p className="text-sm text-green-700">Presenze</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl text-center">
            <p className="text-3xl font-bold text-purple-600">{stats?.registrazioni || 0}</p>
            <p className="text-sm text-purple-700">Registrazioni Qtà</p>
          </div>
        </div>
      )}

      {/* Azioni */}
      <div className="space-y-4">
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">➕ Genera Dati Test</h3>
          <p className="text-sm text-green-700 mb-3">
            Crea presenze e registrazioni quantità fittizie per le ultime 2 settimane.
            Le persone test sono quelle con email @test.it (create dallo script SQL).
          </p>
          <button 
            onClick={generateTestData} 
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? '⏳ Generando...' : '🚀 Genera Dati Test'}
          </button>
        </div>

        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">🗑️ Cancella Dati Test</h3>
          <p className="text-sm text-red-700 mb-3">
            Rimuove TUTTE le presenze e registrazioni associate a persone con email @test.it.
            Le persone stesse NON vengono cancellate.
          </p>
          <button 
            onClick={deleteTestData} 
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? '⏳ Cancellando...' : '🗑️ Cancella Dati Test'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-semibold text-gray-700 mb-2">💡 Come funziona</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Le persone test hanno email che finisce con <code className="bg-gray-200 px-1 rounded">@test.it</code></li>
          <li>• Esegui prima lo script SQL per creare le persone test</li>
          <li>• "Genera" crea presenze e quantità per le ultime 2 settimane</li>
          <li>• "Cancella" rimuove solo i dati (presenze, quantità), non le persone</li>
          <li>• I dati reali (persone senza @test.it) non vengono mai toccati</li>
        </ul>
      </div>
    </div>
  )
}
