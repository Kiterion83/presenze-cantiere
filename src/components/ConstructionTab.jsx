import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import WorkPackageDetail from './WorkPackageDetail'

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
  
  // Icone SVG stilizzate per categorie piping
  const IconaSupporto = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="12" cy="8" r="6" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1"/>
      <path d="M6 14 L8 12 L16 12 L18 14" fill="none" stroke="#3B82F6" strokeWidth="2"/>
      <rect x="9" y="14" width="2" height="6" fill="#3B82F6"/>
      <rect x="13" y="14" width="2" height="6" fill="#3B82F6"/>
      <rect x="7" y="20" width="10" height="2" fill="#3B82F6"/>
    </svg>
  )
  
  const IconaSpool = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <ellipse cx="4" cy="12" rx="3" ry="5" fill="none" stroke="#6B7280" strokeWidth="1.5"/>
      <ellipse cx="20" cy="12" rx="3" ry="5" fill="none" stroke="#6B7280" strokeWidth="1.5"/>
      <rect x="4" y="10" width="16" height="4" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
      <line x1="12" y1="6" x2="12" y2="4" stroke="#6B7280" strokeWidth="2"/>
      <rect x="10" y="2" width="4" height="3" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    </svg>
  )
  
  const IconaFlangia = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
      <circle cx="12" cy="4" r="1.5" fill="white"/>
      <circle cx="12" cy="20" r="1.5" fill="white"/>
      <circle cx="4" cy="12" r="1.5" fill="white"/>
      <circle cx="20" cy="12" r="1.5" fill="white"/>
      <circle cx="6.3" cy="6.3" r="1.5" fill="white"/>
      <circle cx="17.7" cy="6.3" r="1.5" fill="white"/>
      <circle cx="6.3" cy="17.7" r="1.5" fill="white"/>
      <circle cx="17.7" cy="17.7" r="1.5" fill="white"/>
    </svg>
  )
  
  const IconaFitting = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M4 20 L4 14 Q4 8 10 8 L20 8 L20 4" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="4" cy="20" rx="2" ry="3" fill="#374151"/>
      <ellipse cx="20" cy="4" rx="3" ry="2" fill="#374151"/>
    </svg>
  )
  
  const IconaValvola = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="2" y="10" width="6" height="4" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
      <rect x="16" y="10" width="6" height="4" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
      <rect x="8" y="8" width="8" height="8" fill="#9CA3AF" stroke="#374151" strokeWidth="1"/>
      <line x1="12" y1="8" x2="12" y2="4" stroke="#374151" strokeWidth="2"/>
      <ellipse cx="12" cy="3" rx="4" ry="1.5" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
    </svg>
  )
  
  const IconaStrumento = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="6" y="4" width="12" height="16" rx="2" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1.5"/>
      <rect x="8" y="6" width="8" height="6" fill="white" stroke="#0EA5E9" strokeWidth="1"/>
      <circle cx="12" cy="16" r="2" fill="#0EA5E9"/>
      <line x1="10" y1="9" x2="14" y2="9" stroke="#0EA5E9" strokeWidth="0.5"/>
      <line x1="12" y1="7" x2="12" y2="11" stroke="#0EA5E9" strokeWidth="0.5"/>
    </svg>
  )

  // Mappa icone per categoria
  const iconeCategorie = {
    supporto: <IconaSupporto />,
    spool: <IconaSpool />,
    flangia: <IconaFlangia />,
    fitting: <IconaFitting />,
    valvola: <IconaValvola />,
    strumento: <IconaStrumento />,
  }
  
  // Icone emoji di base
  const iconeBase = ['📦', '🔩', '⚙️', '🔗', '🛢️', '📡']

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
                onChange={e => setForm({ ...form, prefisso_codice: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder={language === 'it' ? 'es. SPL' : 'e.g. SPL'}
                maxLength={3}
                className="w-full px-3 py-2 border rounded-lg font-mono text-center text-lg tracking-wider"
              />
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
              <div className="flex flex-wrap gap-2">
                {/* Icone SVG stilizzate per piping */}
                {Object.entries(iconeCategorie).map(([key, IconComponent]) => (
                  <button 
                    key={key} 
                    type="button" 
                    onClick={() => setForm({ ...form, icona: key })}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      form.icona === key 
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {IconComponent}
                  </button>
                ))}
                {/* Icone emoji di base */}
                {iconeBase.map(ic => (
                  <button 
                    key={ic} 
                    type="button" 
                    onClick={() => setForm({ ...form, icona: ic })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.icona === ic 
                        ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
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
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                {iconeCategorie[cat.icona] || <span className="text-2xl">{cat.icona}</span>}
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
// COMPONENTI SECTION
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
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [editingComp, setEditingComp] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Icone SVG stilizzate
  const IconaSupporto = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="12" cy="8" r="6" fill="#60A5FA" stroke="#3B82F6" strokeWidth="1"/>
      <path d="M6 14 L8 12 L16 12 L18 14" fill="none" stroke="#3B82F6" strokeWidth="2"/>
      <rect x="9" y="14" width="2" height="6" fill="#3B82F6"/>
      <rect x="13" y="14" width="2" height="6" fill="#3B82F6"/>
      <rect x="7" y="20" width="10" height="2" fill="#3B82F6"/>
    </svg>
  )
  const IconaSpool = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <ellipse cx="4" cy="12" rx="3" ry="5" fill="none" stroke="#6B7280" strokeWidth="1.5"/>
      <ellipse cx="20" cy="12" rx="3" ry="5" fill="none" stroke="#6B7280" strokeWidth="1.5"/>
      <rect x="4" y="10" width="16" height="4" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
      <line x1="12" y1="6" x2="12" y2="4" stroke="#6B7280" strokeWidth="2"/>
      <rect x="10" y="2" width="4" height="3" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
    </svg>
  )
  const IconaFlangia = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
      <circle cx="12" cy="4" r="1.5" fill="white"/>
      <circle cx="12" cy="20" r="1.5" fill="white"/>
      <circle cx="4" cy="12" r="1.5" fill="white"/>
      <circle cx="20" cy="12" r="1.5" fill="white"/>
      <circle cx="6.3" cy="6.3" r="1.5" fill="white"/>
      <circle cx="17.7" cy="6.3" r="1.5" fill="white"/>
      <circle cx="6.3" cy="17.7" r="1.5" fill="white"/>
      <circle cx="17.7" cy="17.7" r="1.5" fill="white"/>
    </svg>
  )
  const IconaFitting = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M4 20 L4 14 Q4 8 10 8 L20 8 L20 4" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="4" cy="20" rx="2" ry="3" fill="#374151"/>
      <ellipse cx="20" cy="4" rx="3" ry="2" fill="#374151"/>
    </svg>
  )
  const IconaValvola = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="2" y="10" width="6" height="4" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
      <rect x="16" y="10" width="6" height="4" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
      <rect x="8" y="8" width="8" height="8" fill="#9CA3AF" stroke="#374151" strokeWidth="1"/>
      <line x1="12" y1="8" x2="12" y2="4" stroke="#374151" strokeWidth="2"/>
      <ellipse cx="12" cy="3" rx="4" ry="1.5" fill="#6B7280" stroke="#374151" strokeWidth="1"/>
    </svg>
  )
  const IconaStrumento = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="6" y="4" width="12" height="16" rx="2" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="1.5"/>
      <rect x="8" y="6" width="8" height="6" fill="white" stroke="#0EA5E9" strokeWidth="1"/>
      <circle cx="12" cy="16" r="2" fill="#0EA5E9"/>
    </svg>
  )
  const iconeCategorie = {
    supporto: <IconaSupporto />,
    spool: <IconaSpool />,
    flangia: <IconaFlangia />,
    fitting: <IconaFitting />,
    valvola: <IconaValvola />,
    strumento: <IconaStrumento />,
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
      if (data?.length > 0) setSelectedDisciplina(data[0].id)
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
      if (data?.length > 0) setSelectedCategoria(data[0].id)
      else setSelectedCategoria(null)
    }
    loadCategorie()
  }, [selectedDisciplina])

  useEffect(() => {
    const loadComponenti = async () => {
      if (!selectedCategoria) { setComponenti([]); return }
      const { data } = await supabase
        .from('componenti')
        .select('*')
        .eq('tipo_componente_id', selectedCategoria)
        .order('codice')
      setComponenti(data || [])
    }
    loadComponenti()
  }, [selectedCategoria])

  // Drag & Drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setImportText(await file.text())
  }
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (file) setImportText(await file.text())
  }

  // Import componenti
  const handleImport = async () => {
    if (!selectedCategoria || !importText.trim()) return
    setImporting(true)
    setMessage(null)
    try {
      const codici = importText.split('\n').map(c => c.trim()).filter(c => c.length > 0)
      if (codici.length === 0) {
        setMessage({ type: 'error', text: language === 'it' ? 'Nessun codice valido' : 'No valid codes' })
        setImporting(false)
        return
      }
      // Check duplicati
      const { data: existing } = await supabase
        .from('componenti')
        .select('codice')
        .eq('tipo_componente_id', selectedCategoria)
        .in('codice', codici)
      const existingSet = new Set(existing?.map(e => e.codice) || [])
      const newCodici = codici.filter(c => !existingSet.has(c))
      const duplicati = codici.length - newCodici.length
      if (newCodici.length === 0) {
        setMessage({ type: 'error', text: language === 'it' ? 'Tutti i codici esistono già!' : 'All codes already exist!' })
        setImporting(false)
        return
      }
      // Insert
      const newComponents = newCodici.map(codice => ({
        tipo_componente_id: selectedCategoria,
        disciplina_id: selectedDisciplina,
        codice,
        stato: 'nuovo',
        progetto_id: progettoId
      }))
      const { error } = await supabase.from('componenti').insert(newComponents)
      if (error) throw error
      let msg = language === 'it' ? `✅ Importati ${newCodici.length} componenti` : `✅ Imported ${newCodici.length} components`
      if (duplicati > 0) msg += language === 'it' ? ` (${duplicati} duplicati ignorati)` : ` (${duplicati} duplicates ignored)`
      setMessage({ type: 'success', text: msg })
      setShowImportModal(false)
      setImportText('')
      // Reload
      const { data } = await supabase.from('componenti').select('*').eq('tipo_componente_id', selectedCategoria).order('codice')
      setComponenti(data || [])
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setImporting(false)
    }
  }

  // Modifica componente
  const handleSaveEdit = async () => {
    if (!editingComp || !editValue.trim()) return
    try {
      const { data: existing } = await supabase
        .from('componenti')
        .select('id')
        .eq('tipo_componente_id', selectedCategoria)
        .eq('codice', editValue.trim())
        .neq('id', editingComp.id)
        .limit(1)
      if (existing?.length > 0) {
        setMessage({ type: 'error', text: language === 'it' ? 'Codice già esistente!' : 'Code already exists!' })
        return
      }
      const { error } = await supabase.from('componenti').update({ codice: editValue.trim() }).eq('id', editingComp.id)
      if (error) throw error
      setComponenti(componenti.map(c => c.id === editingComp.id ? { ...c, codice: editValue.trim() } : c))
      setEditingComp(null)
      setEditValue('')
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // Elimina componente
  const handleDelete = async (comp) => {
    if (!confirm(language === 'it' ? `Eliminare "${comp.codice}"?` : `Delete "${comp.codice}"?`)) return
    try {
      await supabase.from('componenti').delete().eq('id', comp.id)
      setComponenti(componenti.filter(c => c.id !== comp.id))
    } catch (error) {
      console.error(error)
    }
  }

  // Filtra e ordina
  const filtered = componenti
    .filter(c => c.codice.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const cmp = a.codice.localeCompare(b.codice, undefined, { numeric: true })
      return sortOrder === 'asc' ? cmp : -cmp
    })

  const selectedCat = categorie.find(c => c.id === selectedCategoria)

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  if (discipline.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-gray-600">{language === 'it' ? 'Prima crea discipline e categorie' : 'First create disciplines and categories'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">🔧 {language === 'it' ? 'Componenti' : 'Components'}</h3>
            <p className="text-sm text-gray-500">{language === 'it' ? 'Gestisci i componenti con codici parlanti' : 'Manage components with engineering codes'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedDisciplina || ''} onChange={e => setSelectedDisciplina(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
              {discipline.map(d => <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>)}
            </select>
            <select value={selectedCategoria || ''} onChange={e => setSelectedCategoria(e.target.value)} className="px-3 py-2 border rounded-lg bg-white" disabled={!categorie.length}>
              {categorie.length === 0 
                ? <option value="">{language === 'it' ? 'Nessuna categoria' : 'No categories'}</option>
                : categorie.map(c => <option key={c.id} value={c.id}>{c.prefisso_codice} - {c.nome}</option>)
              }
            </select>
            <button onClick={() => { setShowImportModal(true); setImportText('') }} disabled={!selectedCategoria} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300">
              + Import
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

      {/* Info + Ricerca + Ordinamento */}
      {selectedCat && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                {iconeCategorie[selectedCat.icona] || <span className="text-2xl">{selectedCat.icona}</span>}
              </div>
              <div>
                <p className="font-medium">{selectedCat.nome}</p>
                <p className="text-sm text-gray-600">
                  <span className="font-mono font-bold text-purple-700">{selectedCat.prefisso_codice}</span>
                  {' • '}{componenti.length} {language === 'it' ? 'componenti' : 'components'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder={language === 'it' ? '🔍 Cerca codice...' : '🔍 Search code...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 sm:w-64 px-4 py-2 border rounded-lg"
              />
              <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50">
                {sortOrder === 'asc' ? '⬆️ A-Z' : '⬇️ Z-A'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista Componenti */}
      <div className="max-h-[500px] overflow-y-auto">
        {!selectedCategoria ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">📦</p>
            <p>{language === 'it' ? 'Seleziona una categoria' : 'Select a category'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">🔧</p>
            <p>{searchTerm ? (language === 'it' ? 'Nessun risultato' : 'No results') : (language === 'it' ? 'Nessun componente' : 'No components')}</p>
            {!searchTerm && <p className="text-sm mt-1">{language === 'it' ? 'Usa "Import" per caricare i codici' : 'Use "Import" to load codes'}</p>}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(comp => (
              <div key={comp.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 group">
                {editingComp?.id === comp.id ? (
                  <>
                    <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} className="flex-1 font-mono px-3 py-1 border-2 border-blue-500 rounded" autoFocus />
                    <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">✅</button>
                    <button onClick={() => { setEditingComp(null); setEditValue('') }} className="p-1 text-gray-600 hover:bg-gray-100 rounded">❌</button>
                  </>
                ) : (
                  <>
                    <span className="font-mono font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded flex-1">{comp.codice}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${comp.stato === 'completato' ? 'bg-green-100 text-green-700' : comp.stato === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{comp.stato || 'nuovo'}</span>
                    <button onClick={() => { setEditingComp(comp); setEditValue(comp.codice) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100">✏️</button>
                    <button onClick={() => handleDelete(comp)} className="p-1 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100">🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conteggio */}
      {searchTerm && filtered.length > 0 && (
        <div className="p-3 bg-gray-50 border-t text-sm text-gray-500 text-center">
          {filtered.length} {language === 'it' ? 'risultati' : 'results'}
        </div>
      )}

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">📥 {language === 'it' ? 'Import Componenti' : 'Import Components'}</h3>
            
            {selectedCat && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  {iconeCategorie[selectedCat.icona] || <span className="text-xl">{selectedCat.icona}</span>}
                </div>
                <div>
                  <p className="font-medium">{selectedCat.nome}</p>
                  <p className="text-sm text-gray-600 font-mono">{selectedCat.prefisso_codice}</p>
                </div>
              </div>
            )}
            
            {/* Drag & Drop */}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center mb-4 transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
              <p className="text-4xl mb-2">📄</p>
              <p className="text-gray-600 mb-2">{language === 'it' ? 'Trascina un file CSV o TXT' : 'Drag a CSV or TXT file'}</p>
              <p className="text-gray-400 text-sm mb-3">{language === 'it' ? 'oppure' : 'or'}</p>
              <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200">
                {language === 'it' ? 'Seleziona file' : 'Select file'}
                <input type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
            
            {/* Textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">{language === 'it' ? 'Oppure incolla i codici (uno per riga):' : 'Or paste codes (one per line):'}</label>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="ABC-123-456&#10;DEF-789-012&#10;GHI-345-678" rows={8} className="w-full px-3 py-2 border rounded-lg font-mono text-sm resize-none" />
            </div>
            
            {/* Preview */}
            {importText && (
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  {language === 'it' ? 'Codici trovati:' : 'Codes found:'} <strong>{importText.split('\n').filter(c => c.trim()).length}</strong>
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => { setShowImportModal(false); setImportText('') }} className="flex-1 px-4 py-2 bg-gray-200 rounded-xl">
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button onClick={handleImport} disabled={importing || !importText.trim()} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl disabled:bg-gray-300">
                {importing ? '...' : (language === 'it' ? 'Importa' : 'Import')}
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
  const [workPackages, setWorkPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showComponentSelector, setShowComponentSelector] = useState(false)
  const [squadre, setSquadre] = useState([])
  const [persone, setPersone] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [categorie, setCategorie] = useState([])
  const [componenti, setComponenti] = useState([])
  const [fasiWorkflow, setFasiWorkflow] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Form WP
  const [form, setForm] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    squadra_id: '',
    foreman_id: '',
    data_inizio_pianificata: '',
    data_fine_pianificata: '',
    predecessore_id: '',
    colore: '#3B82F6',
    priorita: 0
  })
  const [editing, setEditing] = useState(null)
  
  // Componenti selezionati per il WP
  const [selectedComponents, setSelectedComponents] = useState([])
  const [selectedFasi, setSelectedFasi] = useState([])
  
  // Filtri per selezionare componenti
  const [filters, setFilters] = useState({
    disciplina: '',
    categoria: '',
    search: '',
    soloNonAssegnati: true
  })

  // Funzione per caricare WP
  const loadWorkPackages = async () => {
    try {
      // Query base semplificata
      const { data: wpData, error } = await supabase
        .from('work_packages')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Errore caricamento WP:', error)
        return []
      }
      
      // Arricchisci con dati correlati
      const enrichedWP = await Promise.all((wpData || []).map(async (wp) => {
        // Conta componenti
        const { count } = await supabase
          .from('work_package_componenti')
          .select('*', { count: 'exact', head: true })
          .eq('work_package_id', wp.id)
        
        // Squadra
        let squadra = null
        if (wp.squadra_id) {
          const { data } = await supabase.from('squadre').select('id, nome').eq('id', wp.squadra_id).single()
          squadra = data
        }
        
        // Foreman
        let foreman = null
        if (wp.foreman_id) {
          const { data } = await supabase.from('persone').select('id, nome, cognome').eq('id', wp.foreman_id).single()
          foreman = data
        }
        
        // Predecessore
        let predecessore = null
        if (wp.predecessore_id) {
          const { data } = await supabase.from('work_packages').select('id, codice, nome').eq('id', wp.predecessore_id).single()
          predecessore = data
        }
        
        return {
          ...wp,
          squadra,
          foreman,
          predecessore,
          componenti_count: count || 0
        }
      }))
      
      return enrichedWP
    } catch (error) {
      console.error('Errore:', error)
      return []
    }
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!progettoId) return
      setLoading(true)
      try {
        // WP
        const wpData = await loadWorkPackages()
        setWorkPackages(wpData)
        
        // Squadre
        const { data: sqData } = await supabase
          .from('squadre')
          .select('*')
          .eq('progetto_id', progettoId)
        setSquadre(sqData || [])
        
        // Persone (foreman)
        const { data: persData } = await supabase
          .from('persone')
          .select('*')
          .order('cognome')
        setPersone(persData || [])
        
        // Discipline
        const { data: discData } = await supabase
          .from('discipline')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
        setDiscipline(discData || [])
        
        // Fasi workflow (tutte le discipline)
        const { data: fasiData } = await supabase
          .from('fasi_workflow')
          .select('*, disciplina:discipline(nome)')
          .in('disciplina_id', (discData || []).map(d => d.id))
          .order('ordine')
        setFasiWorkflow(fasiData || [])
        
      } catch (error) {
        console.error('Errore:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [progettoId])

  // Load categorie quando cambia disciplina
  useEffect(() => {
    const loadCategorie = async () => {
      if (!filters.disciplina) {
        setCategorie([])
        return
      }
      const { data } = await supabase
        .from('tipi_componente')
        .select('*')
        .eq('disciplina_id', filters.disciplina)
      setCategorie(data || [])
    }
    loadCategorie()
  }, [filters.disciplina])

  // Load componenti con filtri
  useEffect(() => {
    const loadComponenti = async () => {
      if (!progettoId) return
      
      let query = supabase
        .from('componenti')
        .select(`
          *,
          tipo:tipi_componente(id, nome, prefisso_codice, disciplina_id),
          disciplina:discipline(id, nome)
        `)
        .eq('progetto_id', progettoId)
      
      if (filters.disciplina) {
        query = query.eq('disciplina_id', filters.disciplina)
      }
      if (filters.categoria) {
        query = query.eq('tipo_componente_id', filters.categoria)
      }
      if (filters.search) {
        query = query.ilike('codice', `%${filters.search}%`)
      }
      
      const { data } = await query.order('codice').limit(500)
      
      // Filtra non assegnati se richiesto
      if (filters.soloNonAssegnati && data) {
        const { data: assigned } = await supabase
          .from('work_package_componenti')
          .select('componente_id')
        const assignedIds = new Set((assigned || []).map(a => a.componente_id))
        setComponenti(data.filter(c => !assignedIds.has(c.id)))
      } else {
        setComponenti(data || [])
      }
    }
    
    if (showComponentSelector) {
      loadComponenti()
    }
  }, [progettoId, filters, showComponentSelector])

  // Salva WP
  const handleSave = async () => {
    if (!form.codice.trim() || !form.nome.trim()) {
      setMessage({ type: 'error', text: language === 'it' ? 'Codice e nome obbligatori' : 'Code and name required' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      const payload = {
        ...form,
        progetto_id: progettoId,
        squadra_id: form.squadra_id || null,
        foreman_id: form.foreman_id || null,
        predecessore_id: form.predecessore_id || null,
        data_inizio_pianificata: form.data_inizio_pianificata || null,
        data_fine_pianificata: form.data_fine_pianificata || null
      }
      
      let wpId
      
      if (editing) {
        const { error } = await supabase
          .from('work_packages')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        wpId = editing.id
      } else {
        const { data, error } = await supabase
          .from('work_packages')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        wpId = data.id
      }
      
      // Salva componenti
      if (selectedComponents.length > 0) {
        // Rimuovi vecchi
        await supabase.from('work_package_componenti').delete().eq('work_package_id', wpId)
        // Inserisci nuovi
        const compRows = selectedComponents.map((cId, idx) => ({
          work_package_id: wpId,
          componente_id: cId,
          ordine: idx
        }))
        await supabase.from('work_package_componenti').insert(compRows)
      }
      
      // Salva fasi
      if (selectedFasi.length > 0) {
        await supabase.from('work_package_fasi').delete().eq('work_package_id', wpId)
        const fasiRows = selectedFasi.map((fId, idx) => ({
          work_package_id: wpId,
          fase_workflow_id: fId,
          ordine: idx
        }))
        await supabase.from('work_package_fasi').insert(fasiRows)
      }
      
      setMessage({ type: 'success', text: language === 'it' ? 'Salvato!' : 'Saved!' })
      setShowForm(false)
      resetForm()
      
      // Reload usando la funzione
      const wpData = await loadWorkPackages()
      setWorkPackages(wpData)
      
    } catch (error) {
      console.error('Errore:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({
      codice: '', nome: '', descrizione: '', squadra_id: '', foreman_id: '',
      data_inizio_pianificata: '', data_fine_pianificata: '', predecessore_id: '',
      colore: '#3B82F6', priorita: 0
    })
    setEditing(null)
    setSelectedComponents([])
    setSelectedFasi([])
  }

  const handleEdit = async (wp) => {
    setForm({
      codice: wp.codice,
      nome: wp.nome,
      descrizione: wp.descrizione || '',
      squadra_id: wp.squadra_id || '',
      foreman_id: wp.foreman_id || '',
      data_inizio_pianificata: wp.data_inizio_pianificata || '',
      data_fine_pianificata: wp.data_fine_pianificata || '',
      predecessore_id: wp.predecessore_id || '',
      colore: wp.colore || '#3B82F6',
      priorita: wp.priorita || 0
    })
    setEditing(wp)
    
    // Carica componenti esistenti
    const { data: compData } = await supabase
      .from('work_package_componenti')
      .select('componente_id')
      .eq('work_package_id', wp.id)
    setSelectedComponents((compData || []).map(c => c.componente_id))
    
    // Carica fasi esistenti
    const { data: fasiData } = await supabase
      .from('work_package_fasi')
      .select('fase_workflow_id')
      .eq('work_package_id', wp.id)
      .order('ordine')
    setSelectedFasi((fasiData || []).map(f => f.fase_workflow_id))
    
    setShowForm(true)
  }

  const handleDelete = async (wp) => {
    if (!confirm(language === 'it' ? `Eliminare WP "${wp.codice}"?` : `Delete WP "${wp.codice}"?`)) return
    try {
      await supabase.from('work_packages').delete().eq('id', wp.id)
      setWorkPackages(workPackages.filter(w => w.id !== wp.id))
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const toggleComponent = (compId) => {
    setSelectedComponents(prev => 
      prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId]
    )
  }

  const selectAllFiltered = () => {
    const ids = componenti.map(c => c.id)
    setSelectedComponents(prev => [...new Set([...prev, ...ids])])
  }

  const deselectAllFiltered = () => {
    const ids = new Set(componenti.map(c => c.id))
    setSelectedComponents(prev => prev.filter(id => !ids.has(id)))
  }

  const toggleFase = (faseId) => {
    setSelectedFasi(prev =>
      prev.includes(faseId) ? prev.filter(id => id !== faseId) : [...prev, faseId]
    )
  }

  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-800">📋 Work Packages</h3>
            <p className="text-sm text-gray-500">{language === 'it' ? 'Pacchetti di lavoro organizzati per foreman e squadre' : 'Work packages organized for foremen and teams'}</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            + {language === 'it' ? 'Nuovo WP' : 'New WP'}
          </button>
        </div>

        {message && (
          <div className={`m-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Lista WP */}
        <div className="divide-y">
          {workPackages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">📋</p>
              <p>{language === 'it' ? 'Nessun Work Package creato' : 'No Work Packages created'}</p>
            </div>
          ) : (
            workPackages.map(wp => (
              <div key={wp.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Colore */}
                  <div className="w-2 h-16 rounded-full" style={{ backgroundColor: wp.colore }} />
                  
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700">{wp.codice}</span>
                      <span className="font-medium text-gray-800">{wp.nome}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        wp.stato === 'completato' ? 'bg-green-100 text-green-700' :
                        wp.stato === 'in_corso' ? 'bg-amber-100 text-amber-700' :
                        wp.stato === 'bloccato' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{wp.stato}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                      {wp.squadra && <span>👷 {wp.squadra.nome}</span>}
                      {wp.foreman && <span>👤 {wp.foreman.nome} {wp.foreman.cognome}</span>}
                      {wp.data_inizio_pianificata && (
                        <span>📅 {new Date(wp.data_inizio_pianificata).toLocaleDateString()} → {wp.data_fine_pianificata ? new Date(wp.data_fine_pianificata).toLocaleDateString() : '?'}</span>
                      )}
                      <span>📦 {wp.componenti_count || 0} {language === 'it' ? 'componenti' : 'components'}</span>
                      {wp.predecessore && <span>🔗 dopo {wp.predecessore.codice}</span>}
                    </div>
                    
                    {wp.descrizione && <p className="text-sm text-gray-400 mt-1 truncate">{wp.descrizione}</p>}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1">
                    <button onClick={() => setShowDetail(wp)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Dettaglio">📊</button>
                    <button onClick={() => handleEdit(wp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                    <button onClick={() => handleDelete(wp)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Form WP */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{editing ? (language === 'it' ? 'Modifica Work Package' : 'Edit Work Package') : (language === 'it' ? 'Nuovo Work Package' : 'New Work Package')}</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info base */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Codice' : 'Code'} *</label>
                  <input type="text" value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                    placeholder="WP-001" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Nome' : 'Name'} *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Line 101 Fuel Gas" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Descrizione' : 'Description'}</label>
                  <textarea value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              
              {/* Assegnazione */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Squadra' : 'Team'}</label>
                  <select value={form.squadra_id} onChange={e => setForm({ ...form, squadra_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Foreman</label>
                  <select value={form.foreman_id} onChange={e => setForm({ ...form, foreman_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {persone.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Predecessore' : 'Predecessor'}</label>
                  <select value={form.predecessore_id} onChange={e => setForm({ ...form, predecessore_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {workPackages.filter(w => w.id !== editing?.id).map(w => (
                      <option key={w.id} value={w.id}>{w.codice} - {w.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Date e colore */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Data Inizio' : 'Start Date'}</label>
                  <input type="date" value={form.data_inizio_pianificata} onChange={e => setForm({ ...form, data_inizio_pianificata: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Data Fine' : 'End Date'}</label>
                  <input type="date" value={form.data_fine_pianificata} onChange={e => setForm({ ...form, data_fine_pianificata: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Priorità' : 'Priority'}</label>
                  <input type="number" value={form.priorita} onChange={e => setForm({ ...form, priorita: parseInt(e.target.value) || 0 })}
                    min={0} max={10} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Colore' : 'Color'}</label>
                  <div className="flex gap-1">
                    {colori.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, colore: c })}
                        className={`w-8 h-8 rounded ${form.colore === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Fasi Workflow */}
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'it' ? 'Fasi Workflow (sequenza)' : 'Workflow Phases (sequence)'}</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px]">
                  {fasiWorkflow.map(fase => (
                    <button key={fase.id} type="button" onClick={() => toggleFase(fase.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                        selectedFasi.includes(fase.id) 
                          ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                          : 'bg-white border hover:bg-gray-100'
                      }`}>
                      <span>{fase.icona}</span>
                      <span>{fase.nome}</span>
                      {selectedFasi.includes(fase.id) && (
                        <span className="ml-1 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                          {selectedFasi.indexOf(fase.id) + 1}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{language === 'it' ? 'Clicca per selezionare, il numero indica l\'ordine' : 'Click to select, number shows order'}</p>
              </div>
              
              {/* Componenti */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">{language === 'it' ? 'Componenti' : 'Components'} ({selectedComponents.length})</label>
                  <button type="button" onClick={() => setShowComponentSelector(true)}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                    + {language === 'it' ? 'Seleziona Componenti' : 'Select Components'}
                  </button>
                </div>
                {selectedComponents.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {selectedComponents.slice(0, 20).map(cId => {
                        const comp = componenti.find(c => c.id === cId)
                        return (
                          <span key={cId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                            {comp?.codice || cId.slice(0, 8)}
                          </span>
                        )
                      })}
                      {selectedComponents.length > 20 && (
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">+{selectedComponents.length - 20} {language === 'it' ? 'altri' : 'more'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 bg-gray-200 rounded-xl">
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-300">
                {saving ? '...' : (language === 'it' ? 'Salva' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selettore Componenti */}
      {showComponentSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-bold">{language === 'it' ? 'Seleziona Componenti' : 'Select Components'}</h4>
            </div>
            
            {/* Filtri */}
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.disciplina} onChange={e => setFilters({ ...filters, disciplina: e.target.value, categoria: '' })}
                  className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">{language === 'it' ? 'Tutte Discipline' : 'All Disciplines'}</option>
                  {discipline.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
                <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm" disabled={!filters.disciplina}>
                  <option value="">{language === 'it' ? 'Tutte Categorie' : 'All Categories'}</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.prefisso_codice} - {c.nome}</option>)}
                </select>
                <input type="text" placeholder="🔍" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={filters.soloNonAssegnati} onChange={e => setFilters({ ...filters, soloNonAssegnati: e.target.checked })} />
                  {language === 'it' ? 'Solo liberi' : 'Only free'}
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllFiltered} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                  {language === 'it' ? 'Seleziona tutti' : 'Select all'} ({componenti.length})
                </button>
                <button type="button" onClick={deselectAllFiltered} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
                  {language === 'it' ? 'Deseleziona filtrati' : 'Deselect filtered'}
                </button>
                <span className="ml-auto text-sm text-gray-500">
                  {selectedComponents.length} {language === 'it' ? 'selezionati' : 'selected'}
                </span>
              </div>
            </div>
            
            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                {componenti.map(comp => (
                  <button key={comp.id} type="button" onClick={() => toggleComponent(comp.id)}
                    className={`p-2 rounded text-left text-sm transition-all ${
                      selectedComponents.includes(comp.id)
                        ? 'bg-blue-100 ring-1 ring-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}>
                    <span className="font-mono text-xs">{comp.codice}</span>
                    {comp.tipo && <span className="text-xs text-gray-500 ml-1">{comp.tipo.prefisso_codice}</span>}
                  </button>
                ))}
              </div>
              {componenti.length === 0 && (
                <p className="text-center text-gray-500 py-8">{language === 'it' ? 'Nessun componente trovato' : 'No components found'}</p>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setShowComponentSelector(false)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">
                {language === 'it' ? 'Conferma' : 'Confirm'} ({selectedComponents.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio WP */}
      {showDetail && (
        <WorkPackageDetail
          wp={showDetail}
          onClose={() => setShowDetail(null)}
          onUpdate={async () => {
            const wpData = await loadWorkPackages()
            setWorkPackages(wpData)
          }}
          language={language}
        />
      )}
    </div>
  )
}
