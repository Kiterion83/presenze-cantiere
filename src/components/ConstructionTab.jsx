import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function ConstructionTab() {
  const { progetto } = useAuth()
  const { t, language } = useI18n()
  const [activeSection, setActiveSection] = useState('discipline')
  
  const sections = [
    { id: 'discipline', label: language === 'it' ? 'Discipline' : 'Disciplines', emoji: '📂', desc: 'Piping, Civil, E&I...' },
    { id: 'categorie', label: language === 'it' ? 'Categorie' : 'Categories', emoji: '📦', desc: 'Spool, Supporti, Fitting...' },
    { id: 'componenti', label: language === 'it' ? 'Componenti' : 'Components', emoji: '🔧', desc: language === 'it' ? 'SP-0001, SUP-0002...' : 'SP-0001, SUP-0002...' },
    { id: 'fasi', label: language === 'it' ? 'Fasi Workflow' : 'Workflow Phases', emoji: '🔄', desc: 'Warehouse → Site → Completed' },
    { id: 'workpackages', label: 'Work Packages', emoji: '📋', desc: language === 'it' ? 'Raggruppamenti lavori' : 'Work groupings' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🏗️ Construction Progress Tracking
        </h2>
        <p className="text-blue-100 mt-1">
          {language === 'it' 
            ? 'Configura discipline, categorie, componenti e fasi di avanzamento'
            : 'Configure disciplines, categories, components and progress phases'}
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
      {activeSection === 'categorie' && <CategorieSection progettoId={progetto?.id} />}
      {activeSection === 'componenti' && <ComponentiSection progettoId={progetto?.id} />}
      {activeSection === 'fasi' && <FasiWorkflowSection progettoId={progetto?.id} />}
      {activeSection === 'workpackages' && <WorkPackagesSection progettoId={progetto?.id} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCIPLINE SECTION
// ═══════════════════════════════════════════════════════════════════════════
function DisciplineSection({ progettoId }) {
  const { language } = useI18n()
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
      alert(language === 'it' ? 'Errore durante il salvataggio' : 'Error saving')
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
    const msg = language === 'it' 
      ? `Eliminare la disciplina "${disciplina.nome}"? Verranno eliminati anche tutte le categorie e i componenti associati.`
      : `Delete discipline "${disciplina.nome}"? All associated categories and components will also be deleted.`
    if (!confirm(msg)) return
    try {
      const { error } = await supabase.from('discipline').delete().eq('id', disciplina.id)
      if (error) throw error
      loadDiscipline()
    } catch (error) {
      console.error('Errore eliminazione:', error)
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
          <h3 className="font-semibold text-gray-800">📂 {language === 'it' ? 'Discipline' : 'Disciplines'}</h3>
          <p className="text-sm text-gray-500">{language === 'it' ? 'Aree di lavoro: Piping, Civil, E&I, Mechanical...' : 'Work areas: Piping, Civil, E&I, Mechanical...'}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6' }) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>+</span> {language === 'it' ? 'Nuova Disciplina' : 'New Discipline'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? (language === 'it' ? 'Modifica Disciplina' : 'Edit Discipline') : (language === 'it' ? 'Nuova Disciplina' : 'New Discipline')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Nome' : 'Name'} *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="es. Piping"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Codice' : 'Code'}</label>
              <input
                type="text"
                value={form.codice}
                onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                placeholder="es. PIP"
                maxLength={10}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Descrizione' : 'Description'}</label>
              <input
                type="text"
                value={form.descrizione}
                onChange={e => setForm({ ...form, descrizione: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Icona' : 'Icon'}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Colore' : 'Color'}</label>
              <div className="flex flex-wrap gap-1">
                {colori.map(col => (
                  <button key={col} type="button" onClick={() => setForm({ ...form, colore: col })}
                    className={`w-8 h-8 rounded ${form.colore === col ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: col }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? (language === 'it' ? 'Salvataggio...' : 'Saving...') : (editing ? (language === 'it' ? 'Salva' : 'Save') : (language === 'it' ? 'Crea' : 'Create'))}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y">
        {discipline.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📂</p>
            <p>{language === 'it' ? 'Nessuna disciplina configurata' : 'No disciplines configured'}</p>
          </div>
        ) : (
          discipline.map(d => (
            <div key={d.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ backgroundColor: d.colore }}>
                {d.icona}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{d.nome}</p>
                  {d.codice && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{d.codice}</span>}
                  {!d.attivo && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">{language === 'it' ? 'Disattivato' : 'Disabled'}</span>}
                </div>
                {d.descrizione && <p className="text-sm text-gray-500 truncate">{d.descrizione}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleAttivo(d)}
                  className={`p-2 rounded-lg transition-colors ${d.attivo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                  {d.attivo ? '✅' : '⭕'}
                </button>
                <button onClick={() => handleEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(d)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIE SECTION (ex Tipi Componente)
// ═══════════════════════════════════════════════════════════════════════════
function CategorieSection({ progettoId }) {
  const { language } = useI18n()
  const [discipline, setDiscipline] = useState([])
  const [selectedDisciplina, setSelectedDisciplina] = useState(null)
  const [categorie, setCategorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', prefisso_codice: '', unita_misura: 'pz', icona: '📦', descrizione: '' })
  const [message, setMessage] = useState(null)

  const unitaMisura = ['pz', 'mt', 'm²', 'm³', 'kg', 'ton', 'lt', 'set']
  // Nuove icone con cilindro/tubo
  const icone = ['📦', '🔩', '🧪', '🔌', '⬛', '🟫', '🔶', '📏', '🧱', '🪨', '🔗', '⚙️']
  // Icone SVG custom per categorie piping
  const iconeSvg = {
    spool: '🛢️',
    supporto: '📍',
    fitting: '🔩',
    strumento: '📡',
    valvola: '🚰',
    flangia: '⭕',
    tubo: '🔧'
  }

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
    const loadCategorie = async () => {
      if (!selectedDisciplina) return
      const { data } = await supabase
        .from('tipi_componente')
        .select('*')
        .eq('disciplina_id', selectedDisciplina)
        .order('nome')
      setCategorie(data || [])
    }
    loadCategorie()
  }, [selectedDisciplina])

  const handleSave = async () => {
    if (!form.nome.trim() || !selectedDisciplina) return
    if (!form.prefisso_codice.trim()) {
      setMessage({ type: 'error', text: language === 'it' ? 'Prefisso codice obbligatorio!' : 'Code prefix required!' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      // Verifica duplicati
      const { data: existing } = await supabase
        .from('tipi_componente')
        .select('id, nome, prefisso_codice')
        .eq('disciplina_id', selectedDisciplina)
        .or(`nome.ilike.${form.nome},prefisso_codice.ilike.${form.prefisso_codice}`)
      
      if (existing && existing.length > 0) {
        const isDuplicate = existing.some(e => 
          e.id !== editing?.id && 
          (e.nome.toLowerCase() === form.nome.toLowerCase() || 
           e.prefisso_codice?.toLowerCase() === form.prefisso_codice.toLowerCase())
        )
        if (isDuplicate) {
          setMessage({ type: 'error', text: language === 'it' ? 'Categoria o prefisso già esistente!' : 'Category or prefix already exists!' })
          setSaving(false)
          return
        }
      }
      
      const payload = {
        nome: form.nome,
        prefisso_codice: form.prefisso_codice.toUpperCase(),
        nome_plurale: form.nome + 's', // Mantenuto per compatibilità
        unita_misura: form.unita_misura,
        icona: form.icona,
        descrizione: form.descrizione,
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
      setForm({ nome: '', prefisso_codice: '', unita_misura: 'pz', icona: '📦', descrizione: '' })
      setMessage({ type: 'success', text: language === 'it' ? 'Salvato!' : 'Saved!' })
      setTimeout(() => setMessage(null), 2000)
      
      // Reload
      const { data } = await supabase.from('tipi_componente').select('*').eq('disciplina_id', selectedDisciplina).order('nome')
      setCategorie(data || [])
    } catch (error) {
      console.error('Errore:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cat) => {
    setForm({
      nome: cat.nome || '',
      prefisso_codice: cat.prefisso_codice || '',
      unita_misura: cat.unita_misura || 'pz',
      icona: cat.icona || '📦',
      descrizione: cat.descrizione || ''
    })
    setEditing(cat)
    setShowForm(true)
  }

  const handleDelete = async (cat) => {
    const msg = language === 'it' 
      ? `Eliminare la categoria "${cat.nome}"? Verranno eliminati anche tutti i componenti associati.`
      : `Delete category "${cat.nome}"? All associated components will also be deleted.`
    if (!confirm(msg)) return
    try {
      // Prima elimina tutti i componenti della categoria
      await supabase.from('componenti').delete().eq('tipo_componente_id', cat.id)
      // Poi elimina la categoria
      const { error } = await supabase.from('tipi_componente').delete().eq('id', cat.id)
      if (error) throw error
      setCategorie(categorie.filter(c => c.id !== cat.id))
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
        <p className="text-gray-600">{language === 'it' ? 'Prima crea almeno una disciplina' : 'First create at least one discipline'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">📦 {language === 'it' ? 'Categorie Componenti' : 'Component Categories'}</h3>
            <p className="text-sm text-gray-500">{language === 'it' ? 'Definisci le categorie per ogni disciplina (Spool, Supporti, Fitting...)' : 'Define categories for each discipline (Spool, Supports, Fitting...)'}</p>
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
              onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', prefisso_codice: '', unita_misura: 'pz', icona: '📦', descrizione: '' }) }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              + {language === 'it' ? 'Nuova Categoria' : 'New Category'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? (language === 'it' ? 'Modifica Categoria' : 'Edit Category') : (language === 'it' ? 'Nuova Categoria' : 'New Category')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Nome Categoria' : 'Category Name'} *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder={language === 'it' ? 'es. Spool' : 'e.g. Spool'}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Prefisso Codice' : 'Code Prefix'} *</label>
              <input
                type="text"
                value={form.prefisso_codice}
                onChange={e => setForm({ ...form, prefisso_codice: e.target.value.toUpperCase() })}
                placeholder={language === 'it' ? 'es. SP' : 'e.g. SP'}
                maxLength={10}
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">{language === 'it' ? 'I codici saranno: SP-0001, SP-0002...' : 'Codes will be: SP-0001, SP-0002...'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Unità di Misura' : 'Unit of Measure'}</label>
              <select
                value={form.unita_misura}
                onChange={e => setForm({ ...form, unita_misura: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {unitaMisura.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Icona' : 'Icon'}</label>
              <div className="flex flex-wrap gap-1">
                {/* Icone standard */}
                {icone.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-8 h-8 rounded text-lg flex items-center justify-center ${form.icona === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    {ic}
                  </button>
                ))}
                {/* Icone speciali piping */}
                {Object.entries(iconeSvg).map(([key, ic]) => (
                  <button key={key} type="button" onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-8 h-8 rounded text-lg flex items-center justify-center ${form.icona === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}
                    title={key}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Descrizione' : 'Description'}</label>
              <input
                type="text"
                value={form.descrizione}
                onChange={e => setForm({ ...form, descrizione: e.target.value })}
                placeholder={language === 'it' ? 'Descrizione opzionale' : 'Optional description'}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          {message && (
            <div className={`mt-3 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? (language === 'it' ? 'Salvataggio...' : 'Saving...') : (editing ? (language === 'it' ? 'Salva' : 'Save') : (language === 'it' ? 'Crea' : 'Create'))}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setMessage(null) }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {message && !showForm && (
        <div className={`m-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Lista Categorie */}
      <div className="divide-y">
        {categorie.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📦</p>
            <p>{language === 'it' ? 'Nessuna categoria per questa disciplina' : 'No categories for this discipline'}</p>
            <p className="text-sm mt-1">{language === 'it' ? 'Crea categorie come Spool, Supporti, Fitting...' : 'Create categories like Spool, Supports, Fitting...'}</p>
          </div>
        ) : (
          categorie.map(cat => (
            <div key={cat.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
                {cat.icona}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{cat.nome}</p>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-mono">{cat.prefisso_codice || '-'}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{cat.unita_misura}</span>
                </div>
                {cat.descrizione && <p className="text-sm text-gray-500">{cat.descrizione}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(cat)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTI SECTION (nuova!)
// ═══════════════════════════════════════════════════════════════════════════
function ComponentiSection({ progettoId }) {
  const { language } = useI18n()
  const [discipline, setDiscipline] = useState([])
  const [categorie, setCategorie] = useState([])
  const [componenti, setComponenti] = useState([])
  const [selectedDisciplina, setSelectedDisciplina] = useState(null)
  const [selectedCategoria, setSelectedCategoria] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importQuantity, setImportQuantity] = useState(10)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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
      if (data?.length > 0) {
        setSelectedDisciplina(data[0].id)
      }
      setLoading(false)
    }
    loadDiscipline()
  }, [progettoId])

  useEffect(() => {
    const loadCategorie = async () => {
      if (!selectedDisciplina) return
      const { data } = await supabase
        .from('tipi_componente')
        .select('*')
        .eq('disciplina_id', selectedDisciplina)
        .order('nome')
      setCategorie(data || [])
      if (data?.length > 0) {
        setSelectedCategoria(data[0].id)
      } else {
        setSelectedCategoria(null)
      }
    }
    loadCategorie()
  }, [selectedDisciplina])

  useEffect(() => {
    const loadComponenti = async () => {
      if (!selectedCategoria) {
        setComponenti([])
        return
      }
      const { data } = await supabase
        .from('componenti')
        .select('*')
        .eq('tipo_componente_id', selectedCategoria)
        .order('codice')
      setComponenti(data || [])
    }
    loadComponenti()
  }, [selectedCategoria])

  const getNextCode = async (prefisso) => {
    // Trova il numero più alto per questo prefisso
    const { data } = await supabase
      .from('componenti')
      .select('codice')
      .eq('tipo_componente_id', selectedCategoria)
      .order('codice', { ascending: false })
      .limit(1)
    
    if (!data || data.length === 0) {
      return `${prefisso}-0001`
    }
    
    const lastCode = data[0].codice
    const match = lastCode.match(/-(\d+)$/)
    const nextNum = match ? parseInt(match[1]) + 1 : 1
    return `${prefisso}-${String(nextNum).padStart(4, '0')}`
  }

  const handleImport = async () => {
    if (!selectedCategoria || importQuantity < 1) return
    
    setImporting(true)
    setMessage(null)
    
    try {
      const categoria = categorie.find(c => c.id === selectedCategoria)
      if (!categoria?.prefisso_codice) {
        setMessage({ type: 'error', text: language === 'it' ? 'La categoria non ha un prefisso codice!' : 'Category has no code prefix!' })
        setImporting(false)
        return
      }
      
      // Trova ultimo codice esistente
      const { data: lastComp } = await supabase
        .from('componenti')
        .select('codice')
        .eq('tipo_componente_id', selectedCategoria)
        .order('codice', { ascending: false })
        .limit(1)
      
      let startNum = 1
      if (lastComp && lastComp.length > 0) {
        const match = lastComp[0].codice.match(/-(\d+)$/)
        startNum = match ? parseInt(match[1]) + 1 : 1
      }
      
      // Crea i nuovi componenti
      const newComponents = []
      for (let i = 0; i < importQuantity; i++) {
        const num = startNum + i
        newComponents.push({
          tipo_componente_id: selectedCategoria,
          codice: `${categoria.prefisso_codice}-${String(num).padStart(4, '0')}`,
          stato: 'nuovo',
          progetto_id: progettoId
        })
      }
      
      const { error } = await supabase.from('componenti').insert(newComponents)
      if (error) throw error
      
      setMessage({ 
        type: 'success', 
        text: language === 'it' 
          ? `✅ Creati ${importQuantity} componenti (${categoria.prefisso_codice}-${String(startNum).padStart(4, '0')} → ${categoria.prefisso_codice}-${String(startNum + importQuantity - 1).padStart(4, '0')})`
          : `✅ Created ${importQuantity} components (${categoria.prefisso_codice}-${String(startNum).padStart(4, '0')} → ${categoria.prefisso_codice}-${String(startNum + importQuantity - 1).padStart(4, '0')})`
      })
      
      setShowImportModal(false)
      
      // Reload
      const { data } = await supabase
        .from('componenti')
        .select('*')
        .eq('tipo_componente_id', selectedCategoria)
        .order('codice')
      setComponenti(data || [])
      
    } catch (error) {
      console.error('Errore import:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteComponent = async (comp) => {
    const msg = language === 'it' 
      ? `Eliminare il componente "${comp.codice}"?`
      : `Delete component "${comp.codice}"?`
    if (!confirm(msg)) return
    try {
      const { error } = await supabase.from('componenti').delete().eq('id', comp.id)
      if (error) throw error
      setComponenti(componenti.filter(c => c.id !== comp.id))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const filteredComponenti = componenti.filter(c => 
    c.codice.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (discipline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-gray-600">{language === 'it' ? 'Prima crea discipline e categorie' : 'First create disciplines and categories'}</p>
      </div>
    )
  }

  const selectedCat = categorie.find(c => c.id === selectedCategoria)

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">🔧 {language === 'it' ? 'Componenti' : 'Components'}</h3>
            <p className="text-sm text-gray-500">{language === 'it' ? 'Gestisci i singoli componenti con codice identificativo' : 'Manage individual components with identification code'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDisciplina || ''}
              onChange={e => setSelectedDisciplina(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {discipline.map(d => (
                <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
              ))}
            </select>
            <select
              value={selectedCategoria || ''}
              onChange={e => setSelectedCategoria(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
              disabled={categorie.length === 0}
            >
              {categorie.length === 0 ? (
                <option value="">{language === 'it' ? 'Nessuna categoria' : 'No categories'}</option>
              ) : (
                categorie.map(c => (
                  <option key={c.id} value={c.id}>{c.icona} {c.nome}</option>
                ))
              )}
            </select>
            <button
              onClick={() => setShowImportModal(true)}
              disabled={!selectedCategoria}
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              + {language === 'it' ? 'Import Massivo' : 'Bulk Import'}
            </button>
          </div>
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div className={`m-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Info Categoria */}
      {selectedCat && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedCat.icona}</span>
            <div>
              <p className="font-medium">{selectedCat.nome}</p>
              <p className="text-sm text-gray-600">
                {language === 'it' ? 'Prefisso' : 'Prefix'}: <span className="font-mono font-bold text-purple-700">{selectedCat.prefisso_codice}</span>
                {' • '}{componenti.length} {language === 'it' ? 'componenti' : 'components'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ricerca */}
      {componenti.length > 0 && (
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder={language === 'it' ? 'Cerca per codice...' : 'Search by code...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      )}

      {/* Lista Componenti */}
      <div className="max-h-96 overflow-y-auto">
        {!selectedCategoria ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📦</p>
            <p>{language === 'it' ? 'Seleziona una categoria' : 'Select a category'}</p>
          </div>
        ) : filteredComponenti.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">🔧</p>
            <p>{language === 'it' ? 'Nessun componente' : 'No components'}</p>
            <p className="text-sm mt-1">{language === 'it' ? 'Usa "Import Massivo" per creare componenti' : 'Use "Bulk Import" to create components'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredComponenti.map(comp => (
              <div key={comp.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                <span className="font-mono font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded">{comp.codice}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  comp.stato === 'completato' ? 'bg-green-100 text-green-700' :
                  comp.stato === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{comp.stato || 'nuovo'}</span>
                <div className="flex-1" />
                <button onClick={() => handleDeleteComponent(comp)} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">📥 {language === 'it' ? 'Import Massivo Componenti' : 'Bulk Import Components'}</h3>
            
            {selectedCat && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600">{language === 'it' ? 'Categoria:' : 'Category:'} <strong>{selectedCat.nome}</strong></p>
                <p className="text-sm text-gray-600">{language === 'it' ? 'Prefisso:' : 'Prefix:'} <strong className="font-mono">{selectedCat.prefisso_codice}</strong></p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">{language === 'it' ? 'Quanti componenti creare?' : 'How many components to create?'}</label>
              <input
                type="number"
                value={importQuantity}
                onChange={e => setImportQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                min={1}
                max={1000}
                className="w-full px-4 py-3 border rounded-xl text-center text-2xl font-bold"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">{language === 'it' ? 'Max 1000 alla volta' : 'Max 1000 at a time'}</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-600">{language === 'it' ? 'Verranno creati codici:' : 'Codes will be created:'}</p>
              <p className="font-mono font-medium text-blue-700">
                {selectedCat?.prefisso_codice}-{String(componenti.length + 1).padStart(4, '0')} → {selectedCat?.prefisso_codice}-{String(componenti.length + importQuantity).padStart(4, '0')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-xl"
              >
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl disabled:bg-gray-300"
              >
                {importing ? (language === 'it' ? 'Creazione...' : 'Creating...') : (language === 'it' ? `Crea ${importQuantity} Componenti` : `Create ${importQuantity} Components`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FASI WORKFLOW SECTION
// ═══════════════════════════════════════════════════════════════════════════
function FasiWorkflowSection({ progettoId }) {
  const { language } = useI18n()
  const [discipline, setDiscipline] = useState([])
  const [selectedDisciplina, setSelectedDisciplina] = useState(null)
  const [fasi, setFasi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6', obbligatorio: true, is_iniziale: false, is_finale: false })
  const [draggedItem, setDraggedItem] = useState(null)

  const icone = ['📦', '🏭', '🚚', '📍', '🔧', '✅', '⏳', '🔄', '📋', '🎯']
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

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
      const payload = { ...form, disciplina_id: selectedDisciplina }
      if (editing) {
        const { error } = await supabase.from('fasi_workflow').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const maxOrdine = Math.max(0, ...fasi.map(f => f.ordine || 0))
        payload.ordine = maxOrdine + 1
        const { error } = await supabase.from('fasi_workflow').insert(payload)
        if (error) throw error
      }
      setShowForm(false)
      setEditing(null)
      setForm({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6', obbligatorio: true, is_iniziale: false, is_finale: false })
      const { data } = await supabase.from('fasi_workflow').select('*').eq('disciplina_id', selectedDisciplina).order('ordine')
      setFasi(data || [])
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (fase) => {
    if (!confirm(`${language === 'it' ? 'Eliminare la fase' : 'Delete phase'} "${fase.nome}"?`)) return
    try {
      const { error } = await supabase.from('fasi_workflow').delete().eq('id', fase.id)
      if (error) throw error
      setFasi(fasi.filter(f => f.id !== fase.id))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const handleDragStart = (e, fase) => setDraggedItem(fase)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = async (e, targetFase) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetFase.id) return
    const newFasi = [...fasi]
    const dragIndex = newFasi.findIndex(f => f.id === draggedItem.id)
    const targetIndex = newFasi.findIndex(f => f.id === targetFase.id)
    newFasi.splice(dragIndex, 1)
    newFasi.splice(targetIndex, 0, draggedItem)
    setFasi(newFasi)
    setDraggedItem(null)
    for (let i = 0; i < newFasi.length; i++) {
      await supabase.from('fasi_workflow').update({ ordine: i + 1 }).eq('id', newFasi[i].id)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  if (discipline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-gray-600">{language === 'it' ? 'Prima crea almeno una disciplina' : 'First create at least one discipline'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-800">🔄 {language === 'it' ? 'Fasi Workflow' : 'Workflow Phases'}</h3>
            <p className="text-sm text-gray-500">{language === 'it' ? 'Definisci le fasi di avanzamento dei componenti' : 'Define component progress phases'}</p>
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
              onClick={() => { setShowForm(true); setEditing(null); setForm({ nome: '', codice: '', descrizione: '', icona: '📦', colore: '#3B82F6', obbligatorio: true, is_iniziale: false, is_finale: false }) }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              + {language === 'it' ? 'Nuova Fase' : 'New Phase'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-blue-50 border-b">
          <h4 className="font-medium mb-4">{editing ? (language === 'it' ? 'Modifica Fase' : 'Edit Phase') : (language === 'it' ? 'Nuova Fase' : 'New Phase')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Nome' : 'Name'} *</label>
              <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="es. Warehouse" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Codice' : 'Code'}</label>
              <input type="text" value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })} placeholder="es. WH" maxLength={10} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Tipo' : 'Type'}</label>
              <select value={form.obbligatorio ? 'obbligatorio' : 'facoltativo'} onChange={e => setForm({ ...form, obbligatorio: e.target.value === 'obbligatorio' })} className="w-full px-3 py-2 border rounded-lg">
                <option value="obbligatorio">🔴 {language === 'it' ? 'Obbligatorio' : 'Required'}</option>
                <option value="facoltativo">🟡 {language === 'it' ? 'Facoltativo' : 'Optional'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Icona' : 'Icon'}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'it' ? 'Colore' : 'Color'}</label>
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
                <input type="checkbox" checked={form.is_iniziale} onChange={e => setForm({ ...form, is_iniziale: e.target.checked, is_finale: false })} className="w-4 h-4" />
                <span className="text-sm">{language === 'it' ? 'Fase Iniziale' : 'Initial Phase'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_finale} onChange={e => setForm({ ...form, is_finale: e.target.checked, is_iniziale: false })} className="w-4 h-4" />
                <span className="text-sm">{language === 'it' ? 'Fase Finale' : 'Final Phase'}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.nome.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? '...' : (editing ? (language === 'it' ? 'Salva' : 'Save') : (language === 'it' ? 'Crea' : 'Create'))}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
              {language === 'it' ? 'Annulla' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Lista Fasi */}
      <div className="divide-y">
        {fasi.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">🔄</p>
            <p>{language === 'it' ? 'Nessuna fase configurata' : 'No phases configured'}</p>
          </div>
        ) : (
          fasi.map((fase, index) => (
            <div key={fase.id} draggable onDragStart={(e) => handleDragStart(e, fase)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, fase)}
              className={`p-4 flex items-center gap-4 cursor-move hover:bg-gray-50 ${draggedItem?.id === fase.id ? 'opacity-50 bg-blue-50' : ''}`}>
              <span className="text-gray-400">⠿</span>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">{index + 1}</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ backgroundColor: fase.colore }}>{fase.icona}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{fase.nome}</p>
                  {fase.codice && <span className="px-2 py-0.5 bg-gray-100 text-xs rounded">{fase.codice}</span>}
                  {fase.is_iniziale && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{language === 'it' ? 'Iniziale' : 'Initial'}</span>}
                  {fase.is_finale && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{language === 'it' ? 'Finale' : 'Final'}</span>}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${fase.obbligatorio ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {fase.obbligatorio ? '🔴' : '🟡'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(fase); setForm({ ...fase }); setShowForm(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={() => handleDelete(fase)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WORK PACKAGES SECTION
// ═══════════════════════════════════════════════════════════════════════════
function WorkPackagesSection({ progettoId }) {
  const { language } = useI18n()
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
      <p className="text-4xl mb-4">📋</p>
      <h3 className="font-semibold text-gray-800 mb-2">Work Packages</h3>
      <p className="text-gray-500 mb-4">
        {language === 'it' ? 'Gestione dei Work Packages e import da Excel/CSV' : 'Work Packages management and Excel/CSV import'}
      </p>
      <p className="text-sm text-blue-600">
        🚧 {language === 'it' ? 'In arrivo nella prossima fase...' : 'Coming in the next phase...'}
      </p>
    </div>
  )
}
