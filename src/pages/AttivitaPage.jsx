import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function AttivitaPage() {
  const { progettoId, progetto, persona, isAtLeast } = useAuth()
  const { t } = useI18n()
  
  // Stati
  const [attivita, setAttivita] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dati supporto
  const [discipline, setDiscipline] = useState([])
  const [squadre, setSquadre] = useState([])
  const [persone, setPersone] = useState([])
  
  // UI
  const [showForm, setShowForm] = useState(false)
  const [editingAttivita, setEditingAttivita] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  
  // Filtri
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterSquadra, setFilterSquadra] = useState('')
  
  // Form
  const [form, setForm] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    tipo: 'general',
    riferimento_esterno: '',
    richiedente: '',
    data_richiesta: '',
    data_inizio_pianificata: '',
    data_fine_pianificata: '',
    ore_stimate: '',
    disciplina_id: '',
    squadra_id: '',
    responsabile_id: '',
    priorita: 'normale',
    colore: '#10B981',
    note: ''
  })

  // === LOAD ===
  const loadAttivita = useCallback(async () => {
    if (!progettoId) return
    
    try {
      const { data, error } = await supabase
        .from('attivita')
        .select(`
          *,
          disciplina:discipline(id, nome, codice, icona, colore),
          squadra:squadre(id, nome, colore),
          responsabile:persone!attivita_responsabile_id_fkey(id, nome, cognome)
        `)
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAttivita(data || [])
    } catch (e) {
      console.error('Errore caricamento attività:', e)
    } finally {
      setLoading(false)
    }
  }, [progettoId])

  const loadSupportData = useCallback(async () => {
    if (!progettoId) return
    
    try {
      const [{ data: disc }, { data: sq }, { data: pers }] = await Promise.all([
        supabase.from('discipline').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('ordine'),
        supabase.from('squadre').select('*').eq('progetto_id', progettoId).eq('attivo', true),
        supabase.from('persone').select('*').eq('attivo', true).order('cognome')
      ])
      
      setDiscipline(disc || [])
      setSquadre(sq || [])
      setPersone(pers || [])
    } catch (e) {
      console.error('Errore caricamento dati supporto:', e)
    }
  }, [progettoId])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadAttivita(), loadSupportData()]).finally(() => setLoading(false))
  }, [loadAttivita, loadSupportData])

  // === FILTERS ===
  const filteredAttivita = attivita.filter(a => {
    if (searchTerm && !a.codice.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !a.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterTipo && a.tipo !== filterTipo) return false
    if (filterStato && a.stato !== filterStato) return false
    if (filterSquadra && a.squadra_id !== filterSquadra) return false
    return true
  })

  // === FORM HANDLERS ===
  const resetForm = () => {
    setForm({
      codice: '', nome: '', descrizione: '', tipo: 'general',
      riferimento_esterno: '', richiedente: '', data_richiesta: '',
      data_inizio_pianificata: '', data_fine_pianificata: '', ore_stimate: '',
      disciplina_id: '', squadra_id: '', responsabile_id: '',
      priorita: 'normale', colore: '#10B981', note: ''
    })
    setEditingAttivita(null)
  }

  const handleNew = () => {
    resetForm()
    // Auto-genera codice
    const nextNum = attivita.length + 1
    setForm(f => ({ ...f, codice: `AT-${String(nextNum).padStart(3, '0')}` }))
    setShowForm(true)
  }

  const handleEdit = (att) => {
    setForm({
      codice: att.codice || '',
      nome: att.nome || '',
      descrizione: att.descrizione || '',
      tipo: att.tipo || 'general',
      riferimento_esterno: att.riferimento_esterno || '',
      richiedente: att.richiedente || '',
      data_richiesta: att.data_richiesta || '',
      data_inizio_pianificata: att.data_inizio_pianificata || '',
      data_fine_pianificata: att.data_fine_pianificata || '',
      ore_stimate: att.ore_stimate || '',
      disciplina_id: att.disciplina_id || '',
      squadra_id: att.squadra_id || '',
      responsabile_id: att.responsabile_id || '',
      priorita: att.priorita || 'normale',
      colore: att.colore || '#10B981',
      note: att.note || ''
    })
    setEditingAttivita(att)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.codice || !form.nome) {
      alert('Codice e Nome sono obbligatori')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        progetto_id: progettoId,
        codice: form.codice,
        nome: form.nome,
        descrizione: form.descrizione || null,
        tipo: form.tipo,
        riferimento_esterno: form.riferimento_esterno || null,
        richiedente: form.richiedente || null,
        data_richiesta: form.data_richiesta || null,
        data_inizio_pianificata: form.data_inizio_pianificata || null,
        data_fine_pianificata: form.data_fine_pianificata || null,
        ore_stimate: form.ore_stimate ? parseFloat(form.ore_stimate) : null,
        disciplina_id: form.disciplina_id || null,
        squadra_id: form.squadra_id || null,
        responsabile_id: form.responsabile_id || null,
        priorita: form.priorita,
        colore: form.colore,
        note: form.note || null
      }
      
      if (!editingAttivita) {
        payload.stato = form.data_inizio_pianificata ? 'planned' : 'draft'
        payload.created_by = persona?.id
      }
      
      if (editingAttivita) {
        const { error } = await supabase.from('attivita').update(payload).eq('id', editingAttivita.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('attivita').insert(payload)
        if (error) throw error
      }
      
      await loadAttivita()
      setShowForm(false)
      resetForm()
    } catch (e) {
      console.error('Errore salvataggio:', e)
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (att) => {
    if (!confirm(`Eliminare ${att.codice} - ${att.nome}?`)) return
    
    try {
      // Rimuovi pianificazioni
      await supabase.from('pianificazione_cw').delete().eq('attivita_id', att.id)
      // Rimuovi attività
      const { error } = await supabase.from('attivita').delete().eq('id', att.id)
      if (error) throw error
      
      await loadAttivita()
      setShowDetail(null)
    } catch (e) {
      console.error('Errore eliminazione:', e)
      alert('Errore: ' + e.message)
    }
  }

  const handleStatoChange = async (att, nuovoStato) => {
    try {
      const update = { stato: nuovoStato }
      if (nuovoStato === 'in_progress' && !att.data_inizio_effettiva) {
        update.data_inizio_effettiva = new Date().toISOString().split('T')[0]
      }
      if (nuovoStato === 'completed' && !att.data_fine_effettiva) {
        update.data_fine_effettiva = new Date().toISOString().split('T')[0]
      }
      
      const { error } = await supabase.from('attivita').update(update).eq('id', att.id)
      if (error) throw error
      await loadAttivita()
      
      if (showDetail?.id === att.id) {
        setShowDetail({ ...showDetail, stato: nuovoStato, ...update })
      }
    } catch (e) {
      console.error('Errore cambio stato:', e)
    }
  }

  // === HELPERS ===
  const getStatoBadge = (stato) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      planned: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Pianificata' },
      in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Corso' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completata' },
      on_hold: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Sospesa' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annullata' }
    }
    return badges[stato] || badges.draft
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      general: { icon: '📋', label: 'Generale' },
      site_instruction: { icon: '📄', label: 'Site Instruction' },
      variation_order: { icon: '📝', label: 'Variation Order' },
      maintenance: { icon: '🔧', label: 'Manutenzione' },
      support: { icon: '🤝', label: 'Supporto' },
      rework: { icon: '🔄', label: 'Rilavorazione' },
      other: { icon: '📌', label: 'Altro' }
    }
    return labels[tipo] || labels.general
  }

  const getPrioritaBadge = (priorita) => {
    const badges = {
      bassa: { bg: 'bg-gray-100', text: 'text-gray-600' },
      normale: { bg: 'bg-blue-100', text: 'text-blue-600' },
      alta: { bg: 'bg-orange-100', text: 'text-orange-600' },
      urgente: { bg: 'bg-red-100', text: 'text-red-600' }
    }
    return badges[priorita] || badges.normale
  }

  // === RENDER ===
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento attività...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📋 Attività
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        
        {isAtLeast('foreman') && (
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            + Nuova Attività
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-gray-800">{attivita.length}</p>
          <p className="text-sm text-gray-500">Totale</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-gray-500">{attivita.filter(a => a.stato === 'draft').length}</p>
          <p className="text-sm text-gray-500">Bozza</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-cyan-600">{attivita.filter(a => a.stato === 'planned').length}</p>
          <p className="text-sm text-gray-500">Pianificate</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-amber-600">{attivita.filter(a => a.stato === 'in_progress').length}</p>
          <p className="text-sm text-gray-500">In Corso</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-2xl font-bold text-green-600">{attivita.filter(a => a.stato === 'completed').length}</p>
          <p className="text-sm text-gray-500">Completate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input type="text" placeholder="🔍 Cerca codice o nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutti i tipi</option>
            <option value="general">📋 Generale</option>
            <option value="site_instruction">📄 Site Instruction</option>
            <option value="variation_order">📝 Variation Order</option>
            <option value="maintenance">🔧 Manutenzione</option>
            <option value="support">🤝 Supporto</option>
            <option value="rework">🔄 Rilavorazione</option>
          </select>
          <select value={filterStato} onChange={e => setFilterStato(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutti gli stati</option>
            <option value="draft">Bozza</option>
            <option value="planned">Pianificata</option>
            <option value="in_progress">In Corso</option>
            <option value="completed">Completata</option>
            <option value="on_hold">Sospesa</option>
          </select>
          <select value={filterSquadra} onChange={e => setFilterSquadra(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutte le squadre</option>
            {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      {filteredAttivita.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna Attività</h3>
          <p className="text-gray-500">Crea la prima attività per iniziare</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttivita.map(att => {
            const tipoInfo = getTipoLabel(att.tipo)
            const statoInfo = getStatoBadge(att.stato)
            
            return (
              <div 
                key={att.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setShowDetail(att)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${att.colore}20` }}
                    >
                      {tipoInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{att.codice}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statoInfo.bg} ${statoInfo.text}`}>
                          {statoInfo.label}
                        </span>
                        {att.priorita !== 'normale' && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPrioritaBadge(att.priorita).bg} ${getPrioritaBadge(att.priorita).text}`}>
                            {att.priorita}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">{att.nome}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        <span>{tipoInfo.icon} {tipoInfo.label}</span>
                        {att.riferimento_esterno && <span>📎 {att.riferimento_esterno}</span>}
                        {att.data_inizio_pianificata && (
                          <span>📅 {new Date(att.data_inizio_pianificata).toLocaleDateString('it-IT')}</span>
                        )}
                        {att.squadra && <span>👥 {att.squadra.nome}</span>}
                        {att.ore_stimate && <span>⏱️ {att.ore_stimate}h stimate</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 text-sm text-gray-500">
                      {att.ore_effettive > 0 && <p>{att.ore_effettive}h effettive</p>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==================== FORM MODAL ==================== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            <div className="p-6 border-b bg-emerald-50">
              <h2 className="text-xl font-bold text-emerald-800">
                {editingAttivita ? `✏️ Modifica ${editingAttivita.codice}` : '➕ Nuova Attività'}
              </h2>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Info Base */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codice *</label>
                  <input type="text" value={form.codice} onChange={e => setForm({...form, codice: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              {/* Tipo e Riferimento */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="general">📋 Generale</option>
                    <option value="site_instruction">📄 Site Instruction</option>
                    <option value="variation_order">📝 Variation Order</option>
                    <option value="maintenance">🔧 Manutenzione</option>
                    <option value="support">🤝 Supporto</option>
                    <option value="rework">🔄 Rilavorazione</option>
                    <option value="other">📌 Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rif. Esterno</label>
                  <input type="text" value={form.riferimento_esterno} onChange={e => setForm({...form, riferimento_esterno: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. SI-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Richiedente</label>
                  <input type="text" value={form.richiedente} onChange={e => setForm({...form, richiedente: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. Cliente" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Richiesta</label>
                  <input type="date" value={form.data_richiesta} onChange={e => setForm({...form, data_richiesta: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea value={form.descrizione} onChange={e => setForm({...form, descrizione: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" />
              </div>

              {/* Date Pianificate */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Data Inizio</label>
                  <input type="date" value={form.data_inizio_pianificata} onChange={e => setForm({...form, data_inizio_pianificata: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Data Fine</label>
                  <input type="date" value={form.data_fine_pianificata} onChange={e => setForm({...form, data_fine_pianificata: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">⏱️ Ore Stimate</label>
                  <input type="number" value={form.ore_stimate} onChange={e => setForm({...form, ore_stimate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. 40" />
                </div>
              </div>

              {/* Disciplina con Bottoni */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="block text-sm font-medium mb-2 text-emerald-800">
                  🎯 Disciplina
                </label>
                <div className="flex flex-wrap gap-2">
                  {discipline.map(disc => (
                    <button
                      key={disc.id}
                      type="button"
                      onClick={() => setForm({ ...form, disciplina_id: disc.id })}
                      className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all border-2 ${
                        form.disciplina_id === disc.id 
                          ? 'border-emerald-500 shadow-md' 
                          : 'border-transparent bg-white hover:bg-gray-50'
                      }`}
                      style={{ 
                        backgroundColor: form.disciplina_id === disc.id ? (disc.colore || '#10B981') + '20' : undefined,
                        borderColor: form.disciplina_id === disc.id ? disc.colore : undefined
                      }}
                    >
                      <span className="text-lg">{disc.icona}</span>
                      <span>{disc.nome}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assegnazioni */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Squadra</label>
                  <select value={form.squadra_id} onChange={e => setForm({...form, squadra_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleziona...</option>
                    {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Responsabile</label>
                  <select value={form.responsabile_id} onChange={e => setForm({...form, responsabile_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleziona...</option>
                    {persone.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priorità</label>
                  <select value={form.priorita} onChange={e => setForm({...form, priorita: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="bassa">Bassa</option>
                    <option value="normale">Normale</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Colore e Note */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Colore</label>
                  <input type="color" value={form.colore} onChange={e => setForm({...form, colore: e.target.value})} className="w-full h-10 border rounded-lg cursor-pointer" />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium mb-1">Note</label>
                  <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : (editingAttivita ? 'Salva Modifiche' : 'Crea Attività')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: `${showDetail.colore}10` }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${showDetail.colore}20` }}>
                  {getTipoLabel(showDetail.tipo).icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">{showDetail.codice}</h2>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoBadge(showDetail.stato).bg} ${getStatoBadge(showDetail.stato).text}`}>
                      {getStatoBadge(showDetail.stato).label}
                    </span>
                  </div>
                  <p className="text-gray-600">{showDetail.nome}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <p className="font-medium">{getTipoLabel(showDetail.tipo).icon} {getTipoLabel(showDetail.tipo).label}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Priorità</p>
                  <p className="font-medium">{showDetail.priorita}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Ore Stimate</p>
                  <p className="font-medium">{showDetail.ore_stimate || '-'}h</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Ore Effettive</p>
                  <p className="font-medium">{showDetail.ore_effettive || 0}h</p>
                </div>
              </div>
              
              {/* Riferimenti */}
              {(showDetail.riferimento_esterno || showDetail.richiedente) && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-700 mb-2">📎 Riferimenti</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {showDetail.riferimento_esterno && <div><span className="text-gray-500">Rif. Esterno:</span> <span className="font-medium">{showDetail.riferimento_esterno}</span></div>}
                    {showDetail.richiedente && <div><span className="text-gray-500">Richiedente:</span> <span className="font-medium">{showDetail.richiedente}</span></div>}
                    {showDetail.data_richiesta && <div><span className="text-gray-500">Data Richiesta:</span> <span className="font-medium">{new Date(showDetail.data_richiesta).toLocaleDateString('it-IT')}</span></div>}
                  </div>
                </div>
              )}
              
              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📅 Inizio Pianificato</p>
                  <p className="font-medium">{showDetail.data_inizio_pianificata ? new Date(showDetail.data_inizio_pianificata).toLocaleDateString('it-IT') : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📅 Fine Pianificata</p>
                  <p className="font-medium">{showDetail.data_fine_pianificata ? new Date(showDetail.data_fine_pianificata).toLocaleDateString('it-IT') : '-'}</p>
                </div>
              </div>
              
              {/* Assegnazioni */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-2">👥 Assegnazioni</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Disciplina:</span> <span className="font-medium">{showDetail.disciplina?.nome || '-'}</span></div>
                  <div><span className="text-gray-500">Squadra:</span> <span className="font-medium">{showDetail.squadra?.nome || '-'}</span></div>
                  <div><span className="text-gray-500">Responsabile:</span> <span className="font-medium">{showDetail.responsabile ? `${showDetail.responsabile.nome} ${showDetail.responsabile.cognome}` : '-'}</span></div>
                </div>
              </div>
              
              {/* Descrizione */}
              {showDetail.descrizione && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">📝 Descrizione</h4>
                  <p className="text-gray-600">{showDetail.descrizione}</p>
                </div>
              )}
              
              {/* Azioni */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {showDetail.stato === 'draft' && isAtLeast('foreman') && (
                  <button onClick={() => handleStatoChange(showDetail, 'planned')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">📅 Pianifica</button>
                )}
                {showDetail.stato === 'planned' && isAtLeast('foreman') && (
                  <button onClick={() => handleStatoChange(showDetail, 'in_progress')} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">▶️ Inizia</button>
                )}
                {showDetail.stato === 'in_progress' && isAtLeast('foreman') && (
                  <button onClick={() => handleStatoChange(showDetail, 'completed')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">✅ Completa</button>
                )}
                {isAtLeast('foreman') && (
                  <button onClick={() => { handleEdit(showDetail); setShowDetail(null) }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">✏️ Modifica</button>
                )}
                {isAtLeast('cm') && (
                  <button onClick={() => handleDelete(showDetail)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">🗑️ Elimina</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
