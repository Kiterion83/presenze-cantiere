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
function TuttiProgettiTab() {
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadProgetti() }, [])

  const loadProgetti = async () => {
    setLoading(true)
    const { data } = await supabase.from('progetti').select('*').order('created_at', { ascending: false })
    setProgetti(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '' })
    setShowForm(false)
    setMessage(null)
  }

  const handleCreate = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('progetti').insert({
        nome: formData.nome,
        codice: formData.codice || null,
        indirizzo: formData.indirizzo || null,
        citta: formData.citta || null,
        data_inizio: formData.data_inizio || null,
        data_fine_prevista: formData.data_fine_prevista || null,
        stato: 'attivo'
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Progetto creato!' })
      loadProgetti()
      setTimeout(resetForm, 1500)
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
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Centrale Gas Milano" /></div>
              <div><label className="block text-sm font-medium mb-1">Codice</label>
                <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="PRJ-MILANO-001" /></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Indirizzo</label>
                <input type="text" value={formData.indirizzo} onChange={(e) => setFormData({...formData, indirizzo: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Città</label>
                <input type="text" value={formData.citta} onChange={(e) => setFormData({...formData, citta: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Data Inizio</label>
                <input type="date" value={formData.data_inizio} onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Data Fine Prevista</label>
                <input type="date" value={formData.data_fine_prevista} onChange={(e) => setFormData({...formData, data_fine_prevista: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? 'Creazione...' : 'Crea Progetto'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="space-y-3">
          {progetti.map(prog => (
            <div key={prog.id} className={`p-4 rounded-xl border ${prog.stato === 'attivo' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${prog.stato === 'attivo' ? 'bg-green-100' : 'bg-gray-200'}`}>
                  🏗️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{prog.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prog.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {prog.stato === 'attivo' ? '✅ Attivo' : '📦 Completato'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{prog.codice || 'Nessun codice'} • {prog.citta || 'Località non specificata'}</p>
                  {prog.data_inizio && (
                    <p className="text-xs text-gray-400">
                      📅 {new Date(prog.data_inizio).toLocaleDateString('it-IT')}
                      {prog.data_fine_prevista && <> → {new Date(prog.data_fine_prevista).toLocaleDateString('it-IT')}</>}
                    </p>
                  )}
                </div>
                <button onClick={() => handleToggleStato(prog)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${prog.stato === 'attivo' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
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
  const [ditte, setDitte] = useState([])
  const [squadre, setSquadre] = useState([])
  const [dipartimenti, setDipartimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState(null)
  const [formData, setFormData] = useState({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '', dipartimento_id: '' })
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
    const { data: p } = await supabase.from('assegnazioni_progetto').select('*, persona:persone(*), ditta:ditte(id, nome), squadra:squadre(id, nome), dipartimento:dipartimenti(id, nome)').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('ruolo')
    setPersone(p || [])
    const { data: d } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome')
    setDitte(d || [])
    const { data: s } = await supabase.from('squadre').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('nome')
    setSquadre(s || [])
    const { data: dip } = await supabase.from('dipartimenti').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setDipartimenti(dip || [])
    setLoading(false)
  }

  const resetForm = () => { setFormData({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '', dipartimento_id: '' }); setEditingPersona(null); setShowForm(false); setMessage(null) }

  const handleEdit = (ass) => {
    setFormData({ nome: ass.persona.nome || '', cognome: ass.persona.cognome || '', email: ass.persona.email || '', telefono: ass.persona.telefono || '', codice_fiscale: ass.persona.codice_fiscale || '', ruolo: ass.ruolo || 'helper', ditta_id: ass.ditta_id || '', squadra_id: ass.squadra_id || '', dipartimento_id: ass.dipartimento_id || '' })
    setEditingPersona(ass); setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.cognome) { setMessage({ type: 'error', text: 'Nome e cognome obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      if (editingPersona) {
        await supabase.from('persone').update({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).eq('id', editingPersona.persona.id)
        await supabase.from('assegnazioni_progetto').update({ ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, dipartimento_id: formData.dipartimento_id || null }).eq('id', editingPersona.id)
      } else {
        const { data: newP, error: e1 } = await supabase.from('persone').insert({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).select().single()
        if (e1) throw e1
        await supabase.from('assegnazioni_progetto').insert({ persona_id: newP.id, progetto_id: assegnazione.progetto_id, ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, dipartimento_id: formData.dipartimento_id || null, attivo: true })
      }
      setMessage({ type: 'success', text: editingPersona ? 'Aggiornato!' : 'Creato!' })
      loadData(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDisable = async (ass) => { if (!confirm('Disattivare?')) return; await supabase.from('assegnazioni_progetto').update({ attivo: false }).eq('id', ass.id); loadData() }

  const filteredPersone = persone.filter(p => !filter || p.persona.nome?.toLowerCase().includes(filter.toLowerCase()) || p.persona.cognome?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-gray-800">👥 Persone</h2><p className="text-sm text-gray-500">{persone.length} nel progetto</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingPersona ? '✏️ Modifica' : '➕ Nuova'}</h3>
          <div className="grid gap-4">
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
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
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
              <div className="flex gap-1"><button onClick={() => handleEdit(ass)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDisable(ass)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DITTE TAB ====================
function DitteTab() {
  const [ditte, setDitte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDitta, setEditingDitta] = useState(null)
  const [formData, setFormData] = useState({ nome: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadDitte() }, [])

  const loadDitte = async () => { setLoading(true); const { data } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome'); setDitte(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ nome: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '' }); setEditingDitta(null); setShowForm(false); setMessage(null) }
  const handleEdit = (d) => { setFormData({ nome: d.nome || '', ragione_sociale: d.ragione_sociale || '', partita_iva: d.partita_iva || '', indirizzo: d.indirizzo || '', telefono: d.telefono || '', email: d.email || '' }); setEditingDitta(d); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: 'Nome obbligatorio' }); return }
    setSaving(true); setMessage(null)
    try {
      if (editingDitta) { await supabase.from('ditte').update(formData).eq('id', editingDitta.id) }
      else { await supabase.from('ditte').insert({ ...formData, attivo: true }) }
      setMessage({ type: 'success', text: 'Salvato!' }); loadDitte(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm('Disattivare?')) return; await supabase.from('ditte').update({ attivo: false }).eq('id', id); loadDitte() }

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
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Ragione Sociale</label><input type="text" value={formData.ragione_sociale} onChange={(e) => setFormData({...formData, ragione_sociale: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">P.IVA</label><input type="text" value={formData.partita_iva} onChange={(e) => setFormData({...formData, partita_iva: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Telefono</label><input type="tel" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
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
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">{d.nome?.[0]}</div>
              <div className="flex-1"><p className="font-medium">{d.nome}</p><p className="text-xs text-gray-500">{d.partita_iva || 'P.IVA non inserita'}</p></div>
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSquadra, setEditingSquadra] = useState(null)
  const [formData, setFormData] = useState({ nome: '', descrizione: '', colore: '#3B82F6' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => { if (assegnazione?.progetto_id) loadSquadre() }, [assegnazione?.progetto_id])

  const loadSquadre = async () => { setLoading(true); const { data } = await supabase.from('squadre').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('nome'); setSquadre(data || []); setLoading(false) }
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
            <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDip, setEditingDip] = useState(null)
  const [formData, setFormData] = useState({ nome: '', codice: '', descrizione: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (assegnazione?.progetto_id) loadDipartimenti() }, [assegnazione?.progetto_id])

  const loadDipartimenti = async () => { 
    setLoading(true)
    const { data } = await supabase.from('dipartimenti').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setDipartimenti(data || [])
    setLoading(false) 
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
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Engineering" /></div>
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCentro, setEditingCentro] = useState(null)
  const [formData, setFormData] = useState({ codice: '', descrizione: '', budget_ore: '', budget_euro: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (assegnazione?.progetto_id) loadCentri() }, [assegnazione?.progetto_id])

  const loadCentri = async () => { setLoading(true); const { data } = await supabase.from('centri_costo').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('codice'); setCentri(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ codice: '', descrizione: '', budget_ore: '', budget_euro: '' }); setEditingCentro(null); setShowForm(false); setMessage(null) }
  const handleEdit = (cc) => { setFormData({ codice: cc.codice || '', descrizione: cc.descrizione || '', budget_ore: cc.budget_ore?.toString() || '', budget_euro: cc.budget_euro?.toString() || '' }); setEditingCentro(cc); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.codice || !formData.descrizione) { setMessage({ type: 'error', text: 'Codice e descrizione obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { codice: formData.codice, descrizione: formData.descrizione, budget_ore: formData.budget_ore ? parseFloat(formData.budget_ore) : null, budget_euro: formData.budget_euro ? parseFloat(formData.budget_euro) : null, progetto_id: assegnazione.progetto_id }
      if (editingCentro) { await supabase.from('centri_costo').update(payload).eq('id', editingCentro.id) }
      else { await supabase.from('centri_costo').insert({ ...payload, attivo: true }) }
      setMessage({ type: 'success', text: 'Salvato!' }); loadCentri(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm('Disattivare?')) return; await supabase.from('centri_costo').update({ attivo: false }).eq('id', id); loadCentri() }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">💰 Centri di Costo</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Aggiungi</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingCentro ? '✏️ Modifica' : '➕ Nuovo'}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Codice *</label><input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Descrizione *</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Budget Ore</label><input type="number" value={formData.budget_ore} onChange={(e) => setFormData({...formData, budget_ore: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Budget €</label><input type="number" value={formData.budget_euro} onChange={(e) => setFormData({...formData, budget_euro: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? '...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <div className="space-y-2">
          {centri.map(cc => (
            <div key={cc.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-mono font-bold text-sm">{cc.codice}</div>
              <div className="flex-1"><p className="font-medium">{cc.descrizione}</p><p className="text-xs text-gray-500">{cc.budget_ore && `${cc.budget_ore}h`}{cc.budget_ore && cc.budget_euro && ' • '}{cc.budget_euro && `€${cc.budget_euro.toLocaleString()}`}</p></div>
              <div className="flex gap-1"><button onClick={() => handleEdit(cc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(cc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
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
