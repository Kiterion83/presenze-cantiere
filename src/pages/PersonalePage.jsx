import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  Save,
  Loader2,
  Building,
  UserPlus,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react'

export default function PersonalePage() {
  const { assegnazione, isAtLeast } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [persone, setPersone] = useState([])
  const [ditte, setDitte] = useState([])
  const [progetti, setProgetti] = useState([])
  const [search, setSearch] = useState('')
  const [filterRuolo, setFilterRuolo] = useState('tutti')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState(null)
  const [formMode, setFormMode] = useState('persona') // 'persona' o 'assegnazione'
  const [form, setForm] = useState({
    // Persona
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    codice_fiscale: '',
    // Assegnazione
    progetto_id: '',
    ditta_id: '',
    ruolo: 'helper',
    qualifica: '',
    badge_number: '',
    tariffa_oraria: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica persone con assegnazioni
      const { data: personeData } = await supabase
        .from('persone')
        .select(`
          *,
          assegnazioni:assegnazioni_progetto(
            *,
            progetto:progetti(id, nome, codice),
            ditta:ditte(id, ragione_sociale)
          )
        `)
        .eq('attivo', true)
        .order('cognome')

      setPersone(personeData || [])

      // Carica ditte
      const { data: ditteData } = await supabase
        .from('ditte')
        .select('*')
        .eq('attiva', true)
        .order('ragione_sociale')

      setDitte(ditteData || [])

      // Carica progetti
      const { data: progettiData } = await supabase
        .from('progetti')
        .select('*')
        .eq('stato', 'attivo')
        .order('nome')

      setProgetti(progettiData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      codice_fiscale: '',
      progetto_id: assegnazione.progetto_id,
      ditta_id: '',
      ruolo: 'helper',
      qualifica: '',
      badge_number: '',
      tariffa_oraria: ''
    })
    setEditingPersona(null)
    setShowForm(false)
    setFormMode('persona')
  }

  const handleEditPersona = (persona) => {
    setForm({
      nome: persona.nome || '',
      cognome: persona.cognome || '',
      email: persona.email || '',
      telefono: persona.telefono || '',
      codice_fiscale: persona.codice_fiscale || '',
      progetto_id: assegnazione.progetto_id,
      ditta_id: '',
      ruolo: 'helper',
      qualifica: '',
      badge_number: '',
      tariffa_oraria: ''
    })
    setEditingPersona(persona)
    setFormMode('persona')
    setShowForm(true)
  }

  const handleAddAssegnazione = (persona) => {
    setForm({
      nome: persona.nome,
      cognome: persona.cognome,
      email: persona.email || '',
      telefono: persona.telefono || '',
      codice_fiscale: persona.codice_fiscale || '',
      progetto_id: assegnazione.progetto_id,
      ditta_id: '',
      ruolo: 'helper',
      qualifica: '',
      badge_number: '',
      tariffa_oraria: ''
    })
    setEditingPersona(persona)
    setFormMode('assegnazione')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.cognome) {
      setMessage({ type: 'error', text: 'Nome e cognome sono obbligatori' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      let personaId = editingPersona?.id

      if (formMode === 'persona') {
        const personaData = {
          nome: form.nome,
          cognome: form.cognome,
          email: form.email || null,
          telefono: form.telefono || null,
          codice_fiscale: form.codice_fiscale || null,
          attivo: true
        }

        if (editingPersona) {
          // Update persona
          const { error } = await supabase
            .from('persone')
            .update(personaData)
            .eq('id', editingPersona.id)

          if (error) throw error
        } else {
          // Insert nuova persona
          const { data, error } = await supabase
            .from('persone')
            .insert(personaData)
            .select()
            .single()

          if (error) throw error
          personaId = data.id
        }
      }

      // Se c'è assegnazione da creare
      if (formMode === 'assegnazione' || (!editingPersona && form.progetto_id && form.ditta_id)) {
        if (!form.progetto_id || !form.ditta_id || !form.ruolo) {
          setMessage({ type: 'error', text: 'Progetto, ditta e ruolo sono obbligatori per l\'assegnazione' })
          setSaving(false)
          return
        }

        const assegnazioneData = {
          persona_id: personaId,
          progetto_id: form.progetto_id,
          ditta_id: form.ditta_id,
          ruolo: form.ruolo,
          qualifica: form.qualifica || null,
          badge_number: form.badge_number || null,
          tariffa_oraria: form.tariffa_oraria ? parseFloat(form.tariffa_oraria) : null,
          attivo: true
        }

        const { error } = await supabase
          .from('assegnazioni_progetto')
          .insert(assegnazioneData)

        if (error) throw error
      }

      setMessage({ type: 'success', text: editingPersona ? 'Salvato!' : 'Persona creata!' })
      resetForm()
      loadData()

    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAssegnazione = async (assegnazioneId) => {
    if (!confirm('Rimuovere questa assegnazione?')) return

    try {
      const { error } = await supabase
        .from('assegnazioni_progetto')
        .update({ attivo: false })
        .eq('id', assegnazioneId)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Assegnazione rimossa' })
      loadData()

    } catch (error) {
      console.error('Delete error:', error)
      setMessage({ type: 'error', text: 'Errore durante la rimozione' })
    }
  }

  const getRuoloLabel = (ruolo) => {
    const labels = {
      admin: 'Admin',
      cm: 'Construction Manager',
      supervisor: 'Supervisor',
      foreman: 'Capo Squadra',
      helper: 'Operatore',
      office: 'Impiegato'
    }
    return labels[ruolo] || ruolo
  }

  const getRuoloColor = (ruolo) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      cm: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-green-100 text-green-800',
      foreman: 'bg-orange-100 text-orange-800',
      helper: 'bg-gray-100 text-gray-800',
      office: 'bg-pink-100 text-pink-800'
    }
    return colors[ruolo] || 'bg-gray-100 text-gray-800'
  }

  // Filtra persone
  const personeFiltrate = persone.filter(p => {
    const matchSearch = 
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cognome.toLowerCase().includes(search.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase())
    
    if (filterRuolo === 'tutti') return matchSearch
    
    return matchSearch && p.assegnazioni?.some(a => a.ruolo === filterRuolo && a.attivo)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestione Personale</h1>
          <p className="text-sm text-gray-500">{persone.length} persone</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); setFormMode('persona'); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus size={18} />
          Nuovo
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 
          message.type === 'error' ? 'bg-red-50 text-red-700' : ''
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome, cognome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['tutti', 'cm', 'supervisor', 'foreman', 'helper'].map(ruolo => (
            <button
              key={ruolo}
              type="button"
              onClick={() => setFilterRuolo(ruolo)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                filterRuolo === ruolo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {ruolo === 'tutti' ? 'Tutti' : getRuoloLabel(ruolo)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Persone */}
      <div className="space-y-3">
        {personeFiltrate.map(persona => (
          <div key={persona.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {persona.nome[0]}{persona.cognome[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {persona.nome} {persona.cognome}
                    </h3>
                    {persona.email && (
                      <p className="text-xs text-gray-500">{persona.email}</p>
                    )}
                    {persona.telefono && (
                      <p className="text-xs text-gray-400">{persona.telefono}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditPersona(persona)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAssegnazione(persona)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Aggiungi assegnazione"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Assegnazioni */}
              {persona.assegnazioni?.filter(a => a.attivo).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {persona.assegnazioni.filter(a => a.attivo).map(ass => (
                    <div key={ass.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRuoloColor(ass.ruolo)}`}>
                          {getRuoloLabel(ass.ruolo)}
                        </span>
                        <span className="text-sm text-gray-600">{ass.progetto?.nome}</span>
                        {ass.ditta && (
                          <span className="text-xs text-gray-400">• {ass.ditta.ragione_sociale}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAssegnazione(ass.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(!persona.assegnazioni || persona.assegnazioni.filter(a => a.attivo).length === 0) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 italic">Nessuna assegnazione attiva</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {personeFiltrate.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nessuna persona trovata</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {formMode === 'assegnazione' 
                  ? `Nuova Assegnazione - ${form.nome} ${form.cognome}`
                  : editingPersona ? 'Modifica Persona' : 'Nuova Persona'}
              </h2>
              <button type="button" onClick={resetForm}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {formMode === 'persona' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={form.nome}
                        onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                      <input
                        type="text"
                        value={form.cognome}
                        onChange={(e) => setForm(prev => ({ ...prev, cognome: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                    <input
                      type="text"
                      value={form.codice_fiscale}
                      onChange={(e) => setForm(prev => ({ ...prev, codice_fiscale: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      maxLength={16}
                    />
                  </div>

                  {!editingPersona && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-gray-800 mb-3">Assegnazione (opzionale)</h3>
                    </div>
                  )}
                </>
              )}

              {(formMode === 'assegnazione' || !editingPersona) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progetto *</label>
                    <select
                      value={form.progetto_id}
                      onChange={(e) => setForm(prev => ({ ...prev, progetto_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleziona progetto...</option>
                      {progetti.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ditta *</label>
                    <select
                      value={form.ditta_id}
                      onChange={(e) => setForm(prev => ({ ...prev, ditta_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleziona ditta...</option>
                      {ditte.map(d => (
                        <option key={d.id} value={d.id}>{d.ragione_sociale}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo *</label>
                    <select
                      value={form.ruolo}
                      onChange={(e) => setForm(prev => ({ ...prev, ruolo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="helper">Operatore</option>
                      <option value="foreman">Capo Squadra</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="cm">Construction Manager</option>
                      <option value="office">Impiegato</option>
                      {isAtLeast('admin') && <option value="admin">Admin</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualifica</label>
                    <input
                      type="text"
                      value={form.qualifica}
                      onChange={(e) => setForm(prev => ({ ...prev, qualifica: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Es: Saldatore, Elettricista..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                      <input
                        type="text"
                        value={form.badge_number}
                        onChange={(e) => setForm(prev => ({ ...prev, badge_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Es: 001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tariffa €/h</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.tariffa_oraria}
                        onChange={(e) => setForm(prev => ({ ...prev, tariffa_oraria: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
