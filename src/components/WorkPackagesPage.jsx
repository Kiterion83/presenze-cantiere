// WorkPackagesPage.jsx - Pagina dedicata Work Packages (menu Construction)
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import WorkPackageDetail from './WorkPackageDetail'

export default function WorkPackagesPage() {
  const { progetto } = useAuth()
  const { language } = useI18n()
  const progettoId = progetto?.id

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
  
  // Filtri lista WP
  const [filterStato, setFilterStato] = useState('')
  const [filterSquadra, setFilterSquadra] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
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
  
  // Componenti e fasi selezionati
  const [selectedComponents, setSelectedComponents] = useState([])
  const [selectedFasi, setSelectedFasi] = useState([])
  
  // Filtri per selettore componenti
  const [filters, setFilters] = useState({
    disciplina: '',
    categoria: '',
    search: '',
    soloNonAssegnati: true
  })

  // Funzione per caricare WP
  const loadWorkPackages = useCallback(async () => {
    if (!progettoId) return []
    try {
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
        const { data: compData } = await supabase
          .from('work_package_componenti')
          .select('id')
          .eq('work_package_id', wp.id)
        const componenti_count = compData?.length || 0
        
        // Conta fasi
        const { data: fasiData } = await supabase
          .from('work_package_fasi')
          .select('id')
          .eq('work_package_id', wp.id)
        const fasi_count = fasiData?.length || 0
        
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
          componenti_count,
          fasi_count
        }
      }))
      
      return enrichedWP
    } catch (error) {
      console.error('Errore:', error)
      return []
    }
  }, [progettoId])

  // Load iniziale
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
        
        // Fasi workflow
        if (discData?.length > 0) {
          const { data: fasiData } = await supabase
            .from('fasi_workflow')
            .select('*, disciplina:discipline(nome)')
            .in('disciplina_id', discData.map(d => d.id))
            .order('ordine')
          setFasiWorkflow(fasiData || [])
        }
        
      } catch (error) {
        console.error('Errore:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [progettoId, loadWorkPackages])

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
      if (!progettoId || !showComponentSelector) return
      
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
    loadComponenti()
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
      
      // Salva componenti - SEMPRE delete poi insert
      await supabase.from('work_package_componenti').delete().eq('work_package_id', wpId)
      if (selectedComponents.length > 0) {
        const compRows = selectedComponents.map((cId, idx) => ({
          work_package_id: wpId,
          componente_id: cId,
          ordine: idx
        }))
        const { error: compError } = await supabase.from('work_package_componenti').insert(compRows)
        if (compError) console.error('Errore salvataggio componenti:', compError)
      }
      
      // Salva fasi - SEMPRE delete poi insert
      await supabase.from('work_package_fasi').delete().eq('work_package_id', wpId)
      if (selectedFasi.length > 0) {
        const fasiRows = selectedFasi.map((fId, idx) => ({
          work_package_id: wpId,
          fase_workflow_id: fId,
          ordine: idx
        }))
        const { error: fasiError } = await supabase.from('work_package_fasi').insert(fasiRows)
        if (fasiError) console.error('Errore salvataggio fasi:', fasiError)
      }
      
      setMessage({ type: 'success', text: language === 'it' ? 'Salvato!' : 'Saved!' })
      setShowForm(false)
      resetForm()
      
      // Reload
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
      setMessage({ type: 'success', text: language === 'it' ? 'Eliminato!' : 'Deleted!' })
    } catch (error) {
      console.error('Errore:', error)
      setMessage({ type: 'error', text: error.message })
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

  // Filtra WP
  const filteredWP = workPackages.filter(wp => {
    if (filterStato && wp.stato !== filterStato) return false
    if (filterSquadra && wp.squadra_id !== filterSquadra) return false
    if (searchTerm && !wp.codice.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !wp.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Stats
  const stats = {
    totale: workPackages.length,
    pianificati: workPackages.filter(w => w.stato === 'pianificato').length,
    inCorso: workPackages.filter(w => w.stato === 'in_corso').length,
    completati: workPackages.filter(w => w.stato === 'completato').length,
    bloccati: workPackages.filter(w => w.stato === 'bloccato').length
  }

  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              📋 Work Packages
            </h1>
            <p className="text-white/80 mt-1">
              {language === 'it' 
                ? 'Gestisci i pacchetti di lavoro, assegna componenti e pianifica le attività' 
                : 'Manage work packages, assign components and plan activities'}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors"
          >
            + {language === 'it' ? 'Nuovo WP' : 'New WP'}
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.totale}</p>
            <p className="text-xs text-white/80">{language === 'it' ? 'Totale' : 'Total'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.pianificati}</p>
            <p className="text-xs text-white/80">{language === 'it' ? 'Pianificati' : 'Planned'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.inCorso}</p>
            <p className="text-xs text-white/80">{language === 'it' ? 'In Corso' : 'In Progress'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.completati}</p>
            <p className="text-xs text-white/80">{language === 'it' ? 'Completati' : 'Completed'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.bloccati}</p>
            <p className="text-xs text-white/80">{language === 'it' ? 'Bloccati' : 'Blocked'}</p>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={language === 'it' ? '🔍 Cerca per codice o nome...' : '🔍 Search by code or name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <select value={filterStato} onChange={e => setFilterStato(e.target.value)}
            className="px-4 py-2 border rounded-lg">
            <option value="">{language === 'it' ? 'Tutti gli stati' : 'All statuses'}</option>
            <option value="pianificato">{language === 'it' ? 'Pianificato' : 'Planned'}</option>
            <option value="in_corso">{language === 'it' ? 'In Corso' : 'In Progress'}</option>
            <option value="completato">{language === 'it' ? 'Completato' : 'Completed'}</option>
            <option value="bloccato">{language === 'it' ? 'Bloccato' : 'Blocked'}</option>
          </select>
          <select value={filterSquadra} onChange={e => setFilterSquadra(e.target.value)}
            className="px-4 py-2 border rounded-lg">
            <option value="">{language === 'it' ? 'Tutte le squadre' : 'All teams'}</option>
            {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Lista WP */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {filteredWP.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium">{language === 'it' ? 'Nessun Work Package' : 'No Work Packages'}</p>
            <p className="text-sm mt-1">{language === 'it' ? 'Crea il primo WP per iniziare' : 'Create the first WP to start'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredWP.map(wp => (
              <div key={wp.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Colore */}
                  <div className="w-2 h-20 rounded-full flex-shrink-0" style={{ backgroundColor: wp.colore }} />
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700 text-lg">{wp.codice}</span>
                      <span className="font-medium text-gray-800">{wp.nome}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        wp.stato === 'completato' ? 'bg-green-100 text-green-700' :
                        wp.stato === 'in_corso' ? 'bg-amber-100 text-amber-700' :
                        wp.stato === 'bloccato' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{wp.stato}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      {wp.squadra && <span className="flex items-center gap-1">👷 {wp.squadra.nome}</span>}
                      {wp.foreman && <span className="flex items-center gap-1">👤 {wp.foreman.nome} {wp.foreman.cognome}</span>}
                      {wp.data_inizio_pianificata && (
                        <span className="flex items-center gap-1">
                          📅 {new Date(wp.data_inizio_pianificata).toLocaleDateString()} 
                          {wp.data_fine_pianificata && ` → ${new Date(wp.data_fine_pianificata).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        📦 {wp.componenti_count} {language === 'it' ? 'componenti' : 'components'}
                      </span>
                      <span className="text-sm bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        🔄 {wp.fasi_count} {language === 'it' ? 'fasi' : 'phases'}
                      </span>
                      {wp.predecessore && (
                        <span className="text-sm bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                          🔗 {language === 'it' ? 'dopo' : 'after'} {wp.predecessore.codice}
                        </span>
                      )}
                    </div>
                    
                    {wp.descrizione && <p className="text-sm text-gray-400 mt-2 line-clamp-1">{wp.descrizione}</p>}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setShowDetail(wp)} 
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title={language === 'it' ? 'Dettaglio e Pianificazione' : 'Detail and Planning'}>
                      📊
                    </button>
                    <button onClick={() => handleEdit(wp)} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={language === 'it' ? 'Modifica' : 'Edit'}>
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(wp)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={language === 'it' ? 'Elimina' : 'Delete'}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form WP */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">
                {editing 
                  ? (language === 'it' ? 'Modifica Work Package' : 'Edit Work Package') 
                  : (language === 'it' ? 'Nuovo Work Package' : 'New Work Package')}
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info base */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Codice' : 'Code'} *</label>
                  <input type="text" value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                    placeholder="WP-P-001" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Nome' : 'Name'} *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Area A03 - Piping Principale" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">{language === 'it' ? 'Descrizione' : 'Description'}</label>
                  <textarea value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border rounded-lg" placeholder={language === 'it' ? 'Descrizione opzionale del work package...' : 'Optional work package description...'} />
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
                        className={`w-8 h-8 rounded transition-transform ${form.colore === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Fasi Workflow */}
              <div>
                <label className="block text-sm font-medium mb-2">{language === 'it' ? 'Fasi Workflow (sequenza di lavoro)' : 'Workflow Phases (work sequence)'}</label>
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-xl min-h-[60px]">
                  {fasiWorkflow.length === 0 ? (
                    <p className="text-gray-400 text-sm">{language === 'it' ? 'Nessuna fase disponibile. Configura le fasi in Impostazioni.' : 'No phases available. Configure phases in Settings.'}</p>
                  ) : (
                    fasiWorkflow.map(fase => (
                      <button key={fase.id} type="button" onClick={() => toggleFase(fase.id)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                          selectedFasi.includes(fase.id) 
                            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                            : 'bg-white border hover:bg-gray-100'
                        }`}>
                        <span>{fase.icona}</span>
                        <span>{fase.nome}</span>
                        {selectedFasi.includes(fase.id) && (
                          <span className="w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                            {selectedFasi.indexOf(fase.id) + 1}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{language === 'it' ? 'Clicca per selezionare, il numero indica l\'ordine di esecuzione' : 'Click to select, number shows execution order'}</p>
              </div>
              
              {/* Componenti */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">{language === 'it' ? 'Componenti assegnati' : 'Assigned Components'} ({selectedComponents.length})</label>
                  <button type="button" onClick={() => setShowComponentSelector(true)}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors">
                    + {language === 'it' ? 'Seleziona Componenti' : 'Select Components'}
                  </button>
                </div>
                {selectedComponents.length > 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {selectedComponents.slice(0, 30).map(cId => {
                        const comp = componenti.find(c => c.id === cId)
                        return (
                          <span key={cId} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                            {comp?.codice || cId.slice(0, 8)}
                          </span>
                        )
                      })}
                      {selectedComponents.length > 30 && (
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs">+{selectedComponents.length - 30} {language === 'it' ? 'altri' : 'more'}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-sm">
                    {language === 'it' ? 'Nessun componente selezionato' : 'No components selected'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors">
                {language === 'it' ? 'Annulla' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 hover:bg-blue-700 transition-colors">
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
              <h4 className="font-bold text-lg">{language === 'it' ? 'Seleziona Componenti' : 'Select Components'}</h4>
              <p className="text-sm text-gray-500">{language === 'it' ? 'Filtra e seleziona i componenti da assegnare al Work Package' : 'Filter and select components to assign to the Work Package'}</p>
            </div>
            
            {/* Filtri */}
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.disciplina} onChange={e => setFilters({ ...filters, disciplina: e.target.value, categoria: '' })}
                  className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">{language === 'it' ? 'Tutte Discipline' : 'All Disciplines'}</option>
                  {discipline.map(d => <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>)}
                </select>
                <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm" disabled={!filters.disciplina}>
                  <option value="">{language === 'it' ? 'Tutte Categorie' : 'All Categories'}</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.prefisso_codice} - {c.nome}</option>)}
                </select>
                <input type="text" placeholder="🔍" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm" />
                <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border">
                  <input type="checkbox" checked={filters.soloNonAssegnati} onChange={e => setFilters({ ...filters, soloNonAssegnati: e.target.checked })} />
                  {language === 'it' ? 'Solo liberi' : 'Only free'}
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllFiltered} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                  ✅ {language === 'it' ? 'Seleziona tutti' : 'Select all'} ({componenti.length})
                </button>
                <button type="button" onClick={deselectAllFiltered} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                  ❌ {language === 'it' ? 'Deseleziona filtrati' : 'Deselect filtered'}
                </button>
                <span className="ml-auto text-sm text-gray-500 flex items-center">
                  <span className="font-bold text-blue-600 mr-1">{selectedComponents.length}</span> {language === 'it' ? 'selezionati' : 'selected'}
                </span>
              </div>
            </div>
            
            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-4">
              {componenti.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{language === 'it' ? 'Nessun componente trovato' : 'No components found'}</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {componenti.map(comp => (
                    <button key={comp.id} type="button" onClick={() => toggleComponent(comp.id)}
                      className={`p-3 rounded-lg text-left text-sm transition-all ${
                        selectedComponents.includes(comp.id)
                          ? 'bg-blue-100 ring-2 ring-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                      <span className="font-mono font-medium">{comp.codice}</span>
                      {comp.tipo && <span className="text-xs text-gray-500 ml-2">{comp.tipo.prefisso_codice}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => setShowComponentSelector(false)} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
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
