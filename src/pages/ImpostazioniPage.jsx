import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ImpostazioniPage() {
  const { progetto, isAtLeast } = useAuth()
  const [activeTab, setActiveTab] = useState('progetto')

  const menuItems = [
    { id: 'progetto', label: 'Progetto', emoji: '🏗️', minRole: 'cm' },
    { id: 'aree', label: 'Aree Lavoro', emoji: '📍', minRole: 'cm' },
    { id: 'persone', label: 'Persone', emoji: '👥', minRole: 'cm' },
    { id: 'ditte', label: 'Ditte', emoji: '🏢', minRole: 'admin' },
    { id: 'squadre', label: 'Squadre', emoji: '👷', minRole: 'cm' },
    { id: 'centriCosto', label: 'Centri Costo', emoji: '💰', minRole: 'cm' },
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
          {activeTab === 'aree' && <AreeLavoroTab />}
          {activeTab === 'persone' && <PersoneTab />}
          {activeTab === 'ditte' && <DitteTab />}
          {activeTab === 'squadre' && <SquadreTab />}
          {activeTab === 'centriCosto' && <CentriCostoTab />}
        </div>
      </div>
    </div>
  )
}

// ==================== PROGETTO TAB ====================
function ProgettoTab() {
  const { progetto } = useAuth()
  const [formData, setFormData] = useState({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (progetto) {
      setFormData({
        nome: progetto.nome || '', codice: progetto.codice || '', indirizzo: progetto.indirizzo || '', citta: progetto.citta || '',
        data_inizio: progetto.data_inizio || '', data_fine_prevista: progetto.data_fine_prevista || '',
        latitudine: progetto.latitudine || '', longitudine: progetto.longitudine || ''
      })
    }
  }, [progetto])

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

  return (
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
          {saving ? 'Salvataggio...' : '💾 Salva'}
        </button>
      </div>
    </div>
  )
}

// ==================== AREE LAVORO TAB ====================
function AreeLavoroTab() {
  const { assegnazione } = useAuth()
  const [aree, setAree] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [formData, setFormData] = useState({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => { if (assegnazione?.progetto_id) loadAree() }, [assegnazione?.progetto_id])

  const loadAree = async () => {
    setLoading(true)
    const { data } = await supabase.from('aree_lavoro').select('*').eq('progetto_id', assegnazione.progetto_id).order('nome')
    setAree(data || [])
    setLoading(false)
  }

  const resetForm = () => { setFormData({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' }); setEditingArea(null); setShowForm(false); setMessage(null) }

  const handleEdit = (area) => {
    setFormData({ nome: area.nome, descrizione: area.descrizione || '', latitudine: area.latitudine?.toString() || '', longitudine: area.longitudine?.toString() || '', raggio_metri: area.raggio_metri || 100, colore: area.colore || '#3B82F6' })
    setEditingArea(area); setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.latitudine || !formData.longitudine) { setMessage({ type: 'error', text: 'Compila nome e coordinate' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { progetto_id: assegnazione.progetto_id, nome: formData.nome, descrizione: formData.descrizione || null, latitudine: parseFloat(formData.latitudine), longitudine: parseFloat(formData.longitudine), raggio_metri: parseInt(formData.raggio_metri), colore: formData.colore }
      if (editingArea) { await supabase.from('aree_lavoro').update(payload).eq('id', editingArea.id) }
      else { await supabase.from('aree_lavoro').insert(payload) }
      setMessage({ type: 'success', text: editingArea ? 'Area aggiornata!' : 'Area creata!' })
      loadAree(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm('Eliminare?')) return; await supabase.from('aree_lavoro').delete().eq('id', id); loadAree() }

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setFormData({...formData, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8)}),
      () => setMessage({ type: 'error', text: 'Errore GPS' })
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-gray-800">📍 Aree di Lavoro</h2><p className="text-sm text-gray-500">Zone del cantiere per check-in GPS</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ Nuova Area</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingArea ? '✏️ Modifica' : '➕ Nuova Area'}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="Es: Ingresso Cantiere" /></div>
              <div><label className="block text-sm font-medium mb-1">Descrizione</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium mb-1">Latitudine *</label><input type="text" value={formData.latitudine} onChange={(e) => setFormData({...formData, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Longitudine *</label><input type="text" value={formData.longitudine} onChange={(e) => setFormData({...formData, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Raggio (m)</label><input type="number" value={formData.raggio_metri} onChange={(e) => setFormData({...formData, raggio_metri: e.target.value})} className="w-full px-4 py-3 border rounded-xl" min="10" max="500" /></div>
              <div className="flex items-end"><button onClick={getCurrentLocation} className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200">📍 GPS</button></div>
            </div>
            <div><label className="block text-sm font-medium mb-2">Colore</label><div className="flex gap-2">{colori.map(c => (<button key={c} onClick={() => setFormData({...formData, colore: c})} className={`w-8 h-8 rounded-full border-2 ${formData.colore === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? 'Salvataggio...' : 'Salva'}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : aree.length === 0 ? (
        <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">📍</p><p>Nessuna area definita</p></div>
      ) : (
        <div className="space-y-3">
          {aree.map(area => (
            <div key={area.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: area.colore }} />
              <div className="flex-1"><p className="font-medium">{area.nome}</p><p className="text-sm text-gray-500">{area.latitudine?.toFixed(6)}, {area.longitudine?.toFixed(6)} • Raggio: {area.raggio_metri}m</p></div>
              <div className="flex gap-2"><button onClick={() => handleEdit(area)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(area.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState(null)
  const [formData, setFormData] = useState({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [filter, setFilter] = useState('')
  const ruoli = [{ value: 'helper', label: 'Operaio' }, { value: 'office', label: 'Impiegato' }, { value: 'foreman', label: 'Caposquadra' }, { value: 'supervisor', label: 'Supervisore' }, { value: 'cm', label: 'CM' }, { value: 'admin', label: 'Admin' }]

  useEffect(() => { if (assegnazione?.progetto_id) loadData() }, [assegnazione?.progetto_id])

  const loadData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('assegnazioni_progetto').select('*, persona:persone(*), ditta:ditte(id, nome), squadra:squadre(id, nome)').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('ruolo')
    setPersone(p || [])
    const { data: d } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome')
    setDitte(d || [])
    const { data: s } = await supabase.from('squadre').select('*').eq('progetto_id', assegnazione.progetto_id).eq('attivo', true).order('nome')
    setSquadre(s || [])
    setLoading(false)
  }

  const resetForm = () => { setFormData({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', ruolo: 'helper', ditta_id: '', squadra_id: '' }); setEditingPersona(null); setShowForm(false); setMessage(null) }

  const handleEdit = (ass) => {
    setFormData({ nome: ass.persona.nome || '', cognome: ass.persona.cognome || '', email: ass.persona.email || '', telefono: ass.persona.telefono || '', codice_fiscale: ass.persona.codice_fiscale || '', ruolo: ass.ruolo || 'helper', ditta_id: ass.ditta_id || '', squadra_id: ass.squadra_id || '' })
    setEditingPersona(ass); setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.cognome) { setMessage({ type: 'error', text: 'Nome e cognome obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      if (editingPersona) {
        await supabase.from('persone').update({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).eq('id', editingPersona.persona.id)
        await supabase.from('assegnazioni_progetto').update({ ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null }).eq('id', editingPersona.id)
      } else {
        const { data: newP, error: e1 } = await supabase.from('persone').insert({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null, codice_fiscale: formData.codice_fiscale || null }).select().single()
        if (e1) throw e1
        await supabase.from('assegnazioni_progetto').insert({ persona_id: newP.id, progetto_id: assegnazione.progetto_id, ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, attivo: true })
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
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Ruolo</label><select value={formData.ruolo} onChange={(e) => setFormData({...formData, ruolo: e.target.value})} className="w-full px-4 py-3 border rounded-xl">{ruoli.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Ditta</label><select value={formData.ditta_id} onChange={(e) => setFormData({...formData, ditta_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Committente</option>{ditte.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Squadra</label><select value={formData.squadra_id} onChange={(e) => setFormData({...formData, squadra_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">Nessuna</option>{squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
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
              <div className="flex-1 min-w-0"><p className="font-medium truncate">{ass.persona.nome} {ass.persona.cognome}</p><p className="text-xs text-gray-500">{ruoli.find(r => r.value === ass.ruolo)?.label} • {ass.ditta?.nome || 'Committente'}</p></div>
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
