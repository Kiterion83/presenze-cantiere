import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ConstructionTab() {
  const { progetto } = useAuth()
  const [activeSection, setActiveSection] = useState('discipline')
  
  const sections = [
    { id: 'discipline', label: 'Discipline', emoji: '📂', desc: 'Piping, Civil, E&I...' },
    { id: 'tipi', label: 'Tipi Componenti', emoji: '📦', desc: 'Spool, Support, Cable...' },
    { id: 'fasi', label: 'Fasi Workflow', emoji: '🔄', desc: 'Warehouse → Site → Completed' },
    { id: 'workpackages', label: 'Work Packages', emoji: '📋', desc: 'Raggruppamenti lavori' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🏗️ Construction Progress Tracking
        </h2>
        <p className="text-blue-100 mt-1">
          Configura discipline, componenti e fasi di avanzamento per il progetto
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              activeSection === section.id
                ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <span className="text-lg">{section.emoji}</span>
            <div className="text-left">
              <p className="font-medium">{section.label}</p>
              <p className="text-xs opacity-70">{section.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSection === 'discipline' && <DisciplineSection progettoId={progetto?.id} />}
      {activeSection === 'tipi' && <TipiComponenteSection progettoId={progetto?.id} />}
      {activeSection === 'fasi' && <FasiWorkflowSection progettoId={progetto?.id} />}
      {activeSection === 'workpackages' && <WorkPackagesSection progettoId={progetto?.id} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCIPLINE SECTION
// ═══════════════════════════════════════════════════════════════════════════
function DisciplineSection({ progettoId }) {
  const [discipline, setDiscipline] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6' })

  const icone = ['📦', '🔧', '🏗️', '⚡', '⚙️', '🔩', '🧱', '🎨', '🔬', '📐', '🛠️', '⛽']
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#6366F1', '#14B8A6']

  const loadDiscipline = useCallback(async () => {
    if (!progettoId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('ordine')
      
      if (error) throw error
      setDiscipline(data || [])
    } catch (error) {
      console.error('Errore caricamento discipline:', error)
    } finally {
      setLoading(false)
    }
  }, [progettoId])

  useEffect(() => {
    loadDiscipline()
  }, [loadDiscipline])

  const handleSave = async () => {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('discipline')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const maxOrdine = Math.max(0, ...discipline.map(d => d.ordine || 0))
        const { error } = await supabase
          .from('discipline')
          .insert({ ...form, progetto_id: progettoId, ordine: maxOrdine + 1 })
        if (error) throw error
      }
      setShowForm(false)
      setEditing(null)
      setForm({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6' })
      loadDiscipline()
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (disciplina) => {
    setForm({
      nome: disciplina.nome || '',
      codice: disciplina.codice || '',
      descrizione: disciplina.descrizione || '',
      icona: disciplina.icona || '📦',
      colore: disciplina.colore || '#3B82F6'
    })
    setEditing(disciplina)
    setShowForm(true)
  }

  const handleDelete = async (disciplina) => {
    if (!confirm(`Eliminare la disciplina "${disciplina.nome}"? Verranno eliminati anche tutti i tipi componenti e le fasi associate.`)) return
    try {
      const { error } = await supabase.from('discipline').delete().eq('id', disciplina.id)
      if (error) throw error
      loadDiscipline()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const handleToggleAttivo = async (disciplina) => {
    try {
      const { error } = await supabase
        .from('discipline')
        .update({ attivo: !disciplina.attivo })
        .eq('id', disciplina.id)
      if (error) throw error
      loadDiscipline()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-800">📂 Discipline</h3>
          <p className="text-sm text-gray-500">Aree di lavoro: Piping, Civil, E&I, Mechanical...</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6' }) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>+</span> Nuova Disciplina
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? 'Modifica Disciplina' : 'Nuova Disciplina'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="es. Piping"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
              <input
                type="text"
                value={form.codice}
                onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                placeholder="es. PIP"
                maxLength={10}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
              <input
                type="text"
                value={form.descrizione}
                onChange={e => setForm({ ...form, descrizione: e.target.value })}
                placeholder="Descrizione opzionale..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icona</label>
              <div className="flex flex-wrap gap-2">
                {icone.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.icona === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
              <div className="flex flex-wrap gap-2">
                {colori.map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setForm({ ...form, colore: col })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      form.colore === col ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvataggio...' : (editing ? 'Salva Modifiche' : 'Crea Disciplina')}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="divide-y">
        {discipline.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📂</p>
            <p>Nessuna disciplina configurata</p>
            <p className="text-sm">Crea la prima disciplina per iniziare</p>
          </div>
        ) : (
          discipline.map((d, index) => (
            <div key={d.id} className={`p-4 flex items-center gap-4 ${!d.attivo ? 'opacity-50 bg-gray-50' : ''}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: d.colore + '20' }}>
                {d.icona}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{d.nome}</p>
                  {d.codice && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{d.codice}</span>}
                  {!d.attivo && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">Disattivato</span>}
                </div>
                {d.descrizione && <p className="text-sm text-gray-500 truncate">{d.descrizione}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleAttivo(d)}
                  className={`p-2 rounded-lg transition-colors ${d.attivo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  title={d.attivo ? 'Disattiva' : 'Attiva'}>
                  {d.attivo ? '✅' : '⭕'}
                </button>
                <button onClick={() => handleEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifica">✏️</button>
                <button onClick={() => handleDelete(d)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Elimina">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPI COMPONENTE SECTION
// ═══════════════════════════════════════════════════════════════════════════
function TipiComponenteSection({ progettoId }) {
  const [discipline, setDiscipline] = useState([])
  const [selectedDisciplina, setSelectedDisciplina] = useState(null)
  const [tipi, setTipi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', nome_plurale: '', unita_misura: 'pz', icona: '📦', descrizione: '' })

  const unitaMisura = ['pz', 'mt', 'm²', 'm³', 'kg', 'ton', 'lt', 'set']
  const icone = ['📦', '🔩', '📐', '🔌', '🔴', '⬛', '🟫', '🔶', '📏', '🧱', '🪨', '🔗']

  useEffect(() => {
    const loadDiscipline = async () => {
      if (!progettoId) return
      const { data } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
        .order('ordine')
      setDiscipline(data || [])
      if (data?.length > 0 && !selectedDisciplina) {
        setSelectedDisciplina(data[0].id)
      }
      setLoading(false)
    }
    loadDiscipline()
  }, [progettoId])

  useEffect(() => {
    const loadTipi = async () => {
      if (!selectedDisciplina) return
      const { data } = await supabase
        .from('tipi_componente')
        .select('*')
        .eq('disciplina_id', selectedDisciplina)
        .order('nome')
      setTipi(data || [])
    }
    loadTipi()
  }, [selectedDisciplina])

  const handleSave = async () => {
    if (!form.nome.trim() || !selectedDisciplina) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        nome_plurale: form.nome_plurale || form.nome + 's',
        disciplina_id: selectedDisciplina
      }
      if (editing) {
        const { error } = await supabase.from('tipi_componente').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tipi_componente').insert(payload)
        if (error) throw error
      }
      setShowForm(false)
      setEditing(null)
      setForm({ nome: '', nome_plurale: '', unita_misura: 'pz', icona: '📦', descrizione: '' })
      // Reload
      const { data } = await supabase.from('tipi_componente').select('*').eq('disciplina_id', selectedDisciplina).order('nome')
      setTipi(data || [])
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tipo) => {
    if (!confirm(`Eliminare il tipo "${tipo.nome}"?`)) return
    try {
      const { error } = await supabase.from('tipi_componente').delete().eq('id', tipo.id)
      if (error) throw error
      setTipi(tipi.filter(t => t.id !== tipo.id))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (discipline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-gray-600">Prima crea almeno una disciplina</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">📦 Tipi Componenti</h3>
            <p className="text-sm text-gray-500">Definisci i tipi di elementi da tracciare per ogni disciplina</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDisciplina || ''}
              onChange={e => setSelectedDisciplina(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {discipline.map(d => (
                <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', nome_plurale: '', unita_misura: 'pz', icona: '📦', descrizione: '' }) }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              + Aggiungi
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? 'Modifica Tipo' : 'Nuovo Tipo Componente'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="es. Spool"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Plurale</label>
              <input
                type="text"
                value={form.nome_plurale}
                onChange={e => setForm({ ...form, nome_plurale: e.target.value })}
                placeholder="es. Spools"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unità di Misura</label>
              <select
                value={form.unita_misura}
                onChange={e => setForm({ ...form, unita_misura: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {unitaMisura.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icona</label>
              <div className="flex flex-wrap gap-1">
                {icone.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-8 h-8 rounded text-lg flex items-center justify-center ${form.icona === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
              <input
                type="text"
                value={form.descrizione}
                onChange={e => setForm({ ...form, descrizione: e.target.value })}
                placeholder="Descrizione opzionale"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Salvataggio...' : (editing ? 'Salva' : 'Crea')}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="divide-y">
        {tipi.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📦</p>
            <p>Nessun tipo componente per questa disciplina</p>
          </div>
        ) : (
          tipi.map(tipo => (
            <div key={tipo.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">
                {tipo.icona}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{tipo.nome}</p>
                <p className="text-sm text-gray-500">
                  Plurale: {tipo.nome_plurale || tipo.nome + 's'} • Unità: {tipo.unita_misura}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(tipo); setForm({ ...tipo }); setShowForm(true) }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(tipo)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FASI WORKFLOW SECTION (con drag & drop per ordine + obbligatorio/facoltativo)
// ═══════════════════════════════════════════════════════════════════════════
function FasiWorkflowSection({ progettoId }) {
  const [discipline, setDiscipline] = useState([])
  const [selectedDisciplina, setSelectedDisciplina] = useState(null)
  const [fasi, setFasi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [form, setForm] = useState({ 
    nome: '', codice: '', descrizione: '', icona: '📋', colore: '#6B7280', 
    obbligatorio: true, is_iniziale: false, is_finale: false 
  })

  const icone = ['📦', '🚚', '🏗️', '🔩', '🔥', '🔬', '🎨', '✅', '📋', '⏸️', '🔄', '📍']
  const colori = ['#6B7280', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#14B8A6']

  useEffect(() => {
    const loadDiscipline = async () => {
      if (!progettoId) return
      const { data } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
        .order('ordine')
      setDiscipline(data || [])
      if (data?.length > 0 && !selectedDisciplina) {
        setSelectedDisciplina(data[0].id)
      }
      setLoading(false)
    }
    loadDiscipline()
  }, [progettoId])

  useEffect(() => {
    const loadFasi = async () => {
      if (!selectedDisciplina) return
      const { data } = await supabase
        .from('fasi_workflow')
        .select('*')
        .eq('disciplina_id', selectedDisciplina)
        .order('ordine')
      setFasi(data || [])
    }
    loadFasi()
  }, [selectedDisciplina])

  const handleSave = async () => {
    if (!form.nome.trim() || !selectedDisciplina) return
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('fasi_workflow').update(form).eq('id', editing.id)
        if (error) throw error
      } else {
        const maxOrdine = Math.max(0, ...fasi.map(f => f.ordine || 0))
        const { error } = await supabase.from('fasi_workflow').insert({ 
          ...form, 
          disciplina_id: selectedDisciplina,
          ordine: maxOrdine + 1
        })
        if (error) throw error
      }
      setShowForm(false)
      setEditing(null)
      setForm({ nome: '', codice: '', descrizione: '', icona: '📋', colore: '#6B7280', obbligatorio: true, is_iniziale: false, is_finale: false })
      // Reload
      const { data } = await supabase.from('fasi_workflow').select('*').eq('disciplina_id', selectedDisciplina).order('ordine')
      setFasi(data || [])
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (fase) => {
    if (!confirm(`Eliminare la fase "${fase.nome}"?`)) return
    try {
      const { error } = await supabase.from('fasi_workflow').delete().eq('id', fase.id)
      if (error) throw error
      setFasi(fasi.filter(f => f.id !== fase.id))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (e, fase) => {
    setDraggedItem(fase)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetFase) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetFase.id) return

    const oldIndex = fasi.findIndex(f => f.id === draggedItem.id)
    const newIndex = fasi.findIndex(f => f.id === targetFase.id)

    const newFasi = [...fasi]
    newFasi.splice(oldIndex, 1)
    newFasi.splice(newIndex, 0, draggedItem)

    // Update ordine for all items
    const updates = newFasi.map((fase, index) => ({
      id: fase.id,
      ordine: index + 1
    }))

    setFasi(newFasi.map((f, i) => ({ ...f, ordine: i + 1 })))

    // Save to DB
    try {
      for (const update of updates) {
        await supabase.from('fasi_workflow').update({ ordine: update.ordine }).eq('id', update.id)
      }
    } catch (error) {
      console.error('Errore riordino:', error)
    }

    setDraggedItem(null)
  }

  const handleToggleObbligatorio = async (fase) => {
    try {
      const { error } = await supabase
        .from('fasi_workflow')
        .update({ obbligatorio: !fase.obbligatorio })
        .eq('id', fase.id)
      if (error) throw error
      setFasi(fasi.map(f => f.id === fase.id ? { ...f, obbligatorio: !f.obbligatorio } : f))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (discipline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-gray-600">Prima crea almeno una disciplina</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">🔄 Fasi Workflow</h3>
            <p className="text-sm text-gray-500">Definisci le fasi di avanzamento • Trascina per riordinare</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDisciplina || ''}
              onChange={e => setSelectedDisciplina(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {discipline.map(d => (
                <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', codice: '', descrizione: '', icona: '📋', colore: '#6B7280', obbligatorio: true, is_iniziale: false, is_finale: false }) }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              + Aggiungi
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? 'Modifica Fase' : 'Nuova Fase Workflow'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="es. In Warehouse"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
              <input
                type="text"
                value={form.codice}
                onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                placeholder="es. WAREHOUSE"
                maxLength={20}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Fase</label>
              <select
                value={form.obbligatorio ? 'obbligatorio' : 'facoltativo'}
                onChange={e => setForm({ ...form, obbligatorio: e.target.value === 'obbligatorio' })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="obbligatorio">🔴 Obbligatorio</option>
                <option value="facoltativo">🟡 Facoltativo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icona</label>
              <div className="flex flex-wrap gap-1">
                {icone.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-8 h-8 rounded text-lg flex items-center justify-center ${form.icona === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
              <div className="flex flex-wrap gap-1">
                {colori.map(col => (
                  <button key={col} type="button" onClick={() => setForm({ ...form, colore: col })}
                    className={`w-8 h-8 rounded ${form.colore === col ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: col }} />
                ))}
              </div>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_iniziale}
                  onChange={e => setForm({ ...form, is_iniziale: e.target.checked, is_finale: e.target.checked ? false : form.is_finale })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Fase Iniziale</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_finale}
                  onChange={e => setForm({ ...form, is_finale: e.target.checked, is_iniziale: e.target.checked ? false : form.is_iniziale })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Fase Finale</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Salvataggio...' : (editing ? 'Salva' : 'Crea')}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Lista Fasi - Draggable */}
      <div className="divide-y">
        {fasi.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">🔄</p>
            <p>Nessuna fase configurata per questa disciplina</p>
            <p className="text-sm mt-1">Aggiungi le fasi del workflow (es. Warehouse → Site → Completed)</p>
          </div>
        ) : (
          fasi.map((fase, index) => (
            <div
              key={fase.id}
              draggable
              onDragStart={(e) => handleDragStart(e, fase)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, fase)}
              className={`p-4 flex items-center gap-4 cursor-move hover:bg-gray-50 transition-colors ${
                draggedItem?.id === fase.id ? 'opacity-50 bg-blue-50' : ''
              }`}
            >
              {/* Drag Handle */}
              <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                <span className="text-lg">⠿</span>
              </div>

              {/* Order Number */}
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {index + 1}
              </div>

              {/* Icon with color */}
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white"
                style={{ backgroundColor: fase.colore }}
              >
                {fase.icona}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{fase.nome}</p>
                  {fase.codice && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{fase.codice}</span>}
                  {fase.is_iniziale && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Iniziale</span>}
                  {fase.is_finale && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Finale</span>}
                </div>
                {fase.descrizione && <p className="text-sm text-gray-500">{fase.descrizione}</p>}
              </div>

              {/* Obbligatorio Toggle */}
              <div className="flex items-center gap-2">
                <select
                  value={fase.obbligatorio ? 'obbligatorio' : 'facoltativo'}
                  onChange={() => handleToggleObbligatorio(fase)}
                  className={`px-2 py-1 text-xs rounded-lg border ${
                    fase.obbligatorio 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}
                >
                  <option value="obbligatorio">🔴 Obbligatorio</option>
                  <option value="facoltativo">🟡 Facoltativo</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button 
                  onClick={() => { setEditing(fase); setForm({ ...fase }); setShowForm(true) }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(fase)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      {fasi.length > 0 && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>⠿ Trascina per riordinare</span>
            <span>🔴 Obbligatorio = deve essere completato</span>
            <span>🟡 Facoltativo = può essere saltato</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WORK PACKAGES SECTION (placeholder per ora)
// ═══════════════════════════════════════════════════════════════════════════
function WorkPackagesSection({ progettoId }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
      <p className="text-4xl mb-4">📋</p>
      <h3 className="font-semibold text-gray-800 mb-2">Work Packages</h3>
      <p className="text-gray-500 mb-4">
        Gestione dei Work Packages e import da Excel/CSV
      </p>
      <p className="text-sm text-blue-600">
        🚧 In arrivo nella prossima fase...
      </p>
    </div>
  )
}
