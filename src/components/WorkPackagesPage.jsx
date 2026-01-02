// WorkPackagesPage.jsx - Work Packages + Azioni Parallele
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import WorkPackageDetail from './WorkPackageDetail'

export default function WorkPackagesPage() {
  const { progetto } = useAuth()
  const { language } = useI18n()
  const progettoId = progetto?.id

  // Tab attivo: 'wp' o 'azioni'
  const [activeTab, setActiveTab] = useState('wp')

  // === STATI WORK PACKAGES ===
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
    codice: '', nome: '', descrizione: '', squadra_id: '', foreman_id: '',
    data_inizio_pianificata: '', data_fine_pianificata: '', predecessore_id: '',
    colore: '#3B82F6', priorita: 0
  })
  const [editing, setEditing] = useState(null)
  const [selectedComponents, setSelectedComponents] = useState([])
  const [selectedFasi, setSelectedFasi] = useState([])
  const [filters, setFilters] = useState({ disciplina: '', categoria: '', search: '', soloNonAssegnati: true })

  // === STATI AZIONI ===
  const [azioni, setAzioni] = useState([])
  const [showAzioneForm, setShowAzioneForm] = useState(false)
  const [editingAzione, setEditingAzione] = useState(null)
  const [azioneForm, setAzioneForm] = useState({
    titolo: '', descrizione: '', fase_workflow_id: '', squadra_id: '', foreman_id: '',
    data_scadenza: '', priorita: 0, anno: new Date().getFullYear(), settimana: getWeekNumber(new Date())
  })
  const [selectedAzioneComponents, setSelectedAzioneComponents] = useState([])
  const [showAzioneComponentSelector, setShowAzioneComponentSelector] = useState(false)
  const [filterAzioneStato, setFilterAzioneStato] = useState('')

  // Helper settimana
  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  // === LOAD WORK PACKAGES ===
  const loadWorkPackages = useCallback(async () => {
    if (!progettoId) return []
    try {
      const { data: wpData, error } = await supabase
        .from('work_packages').select('*').eq('progetto_id', progettoId).order('created_at', { ascending: false })
      if (error) return []
      
      const enrichedWP = await Promise.all((wpData || []).map(async (wp) => {
        const { data: compData } = await supabase.from('work_package_componenti').select('id').eq('work_package_id', wp.id)
        const { data: fasiData } = await supabase.from('work_package_fasi').select('id').eq('work_package_id', wp.id)
        let squadra = null, foreman = null, predecessore = null
        if (wp.squadra_id) { const { data } = await supabase.from('squadre').select('id, nome').eq('id', wp.squadra_id).single(); squadra = data }
        if (wp.foreman_id) { const { data } = await supabase.from('persone').select('id, nome, cognome').eq('id', wp.foreman_id).single(); foreman = data }
        if (wp.predecessore_id) { const { data } = await supabase.from('work_packages').select('id, codice, nome').eq('id', wp.predecessore_id).single(); predecessore = data }
        return { ...wp, squadra, foreman, predecessore, componenti_count: compData?.length || 0, fasi_count: fasiData?.length || 0 }
      }))
      return enrichedWP
    } catch (error) { return [] }
  }, [progettoId])

  // === LOAD AZIONI ===
  const loadAzioni = useCallback(async () => {
    if (!progettoId) return []
    try {
      const { data: azioniData, error } = await supabase
        .from('azioni').select('*').eq('progetto_id', progettoId).order('created_at', { ascending: false })
      if (error) return []
      
      const enrichedAzioni = await Promise.all((azioniData || []).map(async (az) => {
        const { data: compData } = await supabase.from('azioni_componenti').select('id').eq('azione_id', az.id)
        let fase = null, squadra = null, foreman = null
        if (az.fase_workflow_id) { const { data } = await supabase.from('fasi_workflow').select('id, nome, icona, colore').eq('id', az.fase_workflow_id).single(); fase = data }
        if (az.squadra_id) { const { data } = await supabase.from('squadre').select('id, nome').eq('id', az.squadra_id).single(); squadra = data }
        if (az.foreman_id) { const { data } = await supabase.from('persone').select('id, nome, cognome').eq('id', az.foreman_id).single(); foreman = data }
        return { ...az, fase, squadra, foreman, componenti_count: compData?.length || 0 }
      }))
      return enrichedAzioni
    } catch (error) { return [] }
  }, [progettoId])

  // === LOAD INIZIALE ===
  useEffect(() => {
    const loadData = async () => {
      if (!progettoId) return
      setLoading(true)
      try {
        const [wpData, azioniData] = await Promise.all([loadWorkPackages(), loadAzioni()])
        setWorkPackages(wpData)
        setAzioni(azioniData)
        
        const { data: sqData } = await supabase.from('squadre').select('*').eq('progetto_id', progettoId)
        setSquadre(sqData || [])
        const { data: persData } = await supabase.from('persone').select('*').order('cognome')
        setPersone(persData || [])
        const { data: discData } = await supabase.from('discipline').select('*').eq('progetto_id', progettoId).eq('attivo', true)
        setDiscipline(discData || [])
        if (discData?.length > 0) {
          const { data: fasiData } = await supabase.from('fasi_workflow').select('*, disciplina:discipline(nome)').in('disciplina_id', discData.map(d => d.id)).order('ordine')
          setFasiWorkflow(fasiData || [])
        }
      } catch (error) { console.error('Errore:', error) }
      finally { setLoading(false) }
    }
    loadData()
  }, [progettoId, loadWorkPackages, loadAzioni])

  // Load categorie
  useEffect(() => {
    const loadCategorie = async () => {
      if (!filters.disciplina) { setCategorie([]); return }
      const { data } = await supabase.from('tipi_componente').select('*').eq('disciplina_id', filters.disciplina)
      setCategorie(data || [])
    }
    loadCategorie()
  }, [filters.disciplina])

  // Load componenti
  useEffect(() => {
    const loadComponenti = async () => {
      if (!progettoId || (!showComponentSelector && !showAzioneComponentSelector)) return
      let query = supabase.from('componenti').select(`*, tipo:tipi_componente(id, nome, prefisso_codice), disciplina:discipline(id, nome)`).eq('progetto_id', progettoId)
      if (filters.disciplina) query = query.eq('disciplina_id', filters.disciplina)
      if (filters.categoria) query = query.eq('tipo_componente_id', filters.categoria)
      if (filters.search) query = query.ilike('codice', `%${filters.search}%`)
      const { data } = await query.order('codice').limit(500)
      
      if (filters.soloNonAssegnati && data) {
        const { data: assignedWP } = await supabase.from('work_package_componenti').select('componente_id')
        const { data: assignedAz } = await supabase.from('azioni_componenti').select('componente_id')
        const assignedIds = new Set([...((assignedWP || []).map(a => a.componente_id)), ...((assignedAz || []).map(a => a.componente_id))])
        setComponenti(data.filter(c => !assignedIds.has(c.id)))
      } else { setComponenti(data || []) }
    }
    loadComponenti()
  }, [progettoId, filters, showComponentSelector, showAzioneComponentSelector])

  // === SALVA WP ===
  const handleSaveWP = async () => {
    if (!form.codice.trim() || !form.nome.trim()) { setMessage({ type: 'error', text: 'Codice e nome obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { ...form, progetto_id: progettoId, squadra_id: form.squadra_id || null, foreman_id: form.foreman_id || null, predecessore_id: form.predecessore_id || null, data_inizio_pianificata: form.data_inizio_pianificata || null, data_fine_pianificata: form.data_fine_pianificata || null }
      let wpId
      if (editing) {
        const { error } = await supabase.from('work_packages').update(payload).eq('id', editing.id)
        if (error) throw error
        wpId = editing.id
      } else {
        const { data, error } = await supabase.from('work_packages').insert(payload).select().single()
        if (error) throw error
        wpId = data.id
      }
      
      await supabase.from('work_package_componenti').delete().eq('work_package_id', wpId)
      if (selectedComponents.length > 0) {
        const { error } = await supabase.from('work_package_componenti').insert(selectedComponents.map((cId, idx) => ({ work_package_id: wpId, componente_id: cId, ordine: idx })))
        if (error) throw new Error(`Errore componenti: ${error.message}`)
      }
      await supabase.from('work_package_fasi').delete().eq('work_package_id', wpId)
      if (selectedFasi.length > 0) {
        const { error } = await supabase.from('work_package_fasi').insert(selectedFasi.map((fId, idx) => ({ work_package_id: wpId, fase_workflow_id: fId, ordine: idx })))
        if (error) throw new Error(`Errore fasi: ${error.message}`)
      }
      
      setMessage({ type: 'success', text: 'Salvato!' }); setShowForm(false); resetWPForm()
      setWorkPackages(await loadWorkPackages())
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setSaving(false) }
  }

  const resetWPForm = () => { setForm({ codice: '', nome: '', descrizione: '', squadra_id: '', foreman_id: '', data_inizio_pianificata: '', data_fine_pianificata: '', predecessore_id: '', colore: '#3B82F6', priorita: 0 }); setEditing(null); setSelectedComponents([]); setSelectedFasi([]) }

  const handleEditWP = async (wp) => {
    setForm({ codice: wp.codice, nome: wp.nome, descrizione: wp.descrizione || '', squadra_id: wp.squadra_id || '', foreman_id: wp.foreman_id || '', data_inizio_pianificata: wp.data_inizio_pianificata || '', data_fine_pianificata: wp.data_fine_pianificata || '', predecessore_id: wp.predecessore_id || '', colore: wp.colore || '#3B82F6', priorita: wp.priorita || 0 })
    setEditing(wp)
    const { data: compData } = await supabase.from('work_package_componenti').select('componente_id').eq('work_package_id', wp.id)
    setSelectedComponents((compData || []).map(c => c.componente_id))
    const { data: fasiData } = await supabase.from('work_package_fasi').select('fase_workflow_id').eq('work_package_id', wp.id).order('ordine')
    setSelectedFasi((fasiData || []).map(f => f.fase_workflow_id))
    setShowForm(true)
  }

  const handleDeleteWP = async (wp) => {
    if (!confirm(`Eliminare WP "${wp.codice}"?`)) return
    await supabase.from('work_packages').delete().eq('id', wp.id)
    setWorkPackages(workPackages.filter(w => w.id !== wp.id))
    setMessage({ type: 'success', text: 'Eliminato!' })
  }

  // === SALVA AZIONE ===
  const handleSaveAzione = async () => {
    if (!azioneForm.titolo.trim() || !azioneForm.fase_workflow_id) { setMessage({ type: 'error', text: 'Titolo e tipo attività obbligatori' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { ...azioneForm, progetto_id: progettoId, squadra_id: azioneForm.squadra_id || null, foreman_id: azioneForm.foreman_id || null, data_scadenza: azioneForm.data_scadenza || null }
      let azioneId
      if (editingAzione) {
        const { error } = await supabase.from('azioni').update(payload).eq('id', editingAzione.id)
        if (error) throw error
        azioneId = editingAzione.id
      } else {
        const { data, error } = await supabase.from('azioni').insert(payload).select().single()
        if (error) throw error
        azioneId = data.id
      }
      
      await supabase.from('azioni_componenti').delete().eq('azione_id', azioneId)
      if (selectedAzioneComponents.length > 0) {
        const { error } = await supabase.from('azioni_componenti').insert(selectedAzioneComponents.map(cId => ({ azione_id: azioneId, componente_id: cId })))
        if (error) throw new Error(`Errore componenti: ${error.message}`)
      }
      
      setMessage({ type: 'success', text: 'Azione salvata!' }); setShowAzioneForm(false); resetAzioneForm()
      setAzioni(await loadAzioni())
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setSaving(false) }
  }

  const resetAzioneForm = () => { setAzioneForm({ titolo: '', descrizione: '', fase_workflow_id: '', squadra_id: '', foreman_id: '', data_scadenza: '', priorita: 0, anno: new Date().getFullYear(), settimana: getWeekNumber(new Date()) }); setEditingAzione(null); setSelectedAzioneComponents([]) }

  const handleEditAzione = async (az) => {
    setAzioneForm({ titolo: az.titolo, descrizione: az.descrizione || '', fase_workflow_id: az.fase_workflow_id || '', squadra_id: az.squadra_id || '', foreman_id: az.foreman_id || '', data_scadenza: az.data_scadenza || '', priorita: az.priorita || 0, anno: az.anno || new Date().getFullYear(), settimana: az.settimana || getWeekNumber(new Date()) })
    setEditingAzione(az)
    const { data: compData } = await supabase.from('azioni_componenti').select('componente_id').eq('azione_id', az.id)
    setSelectedAzioneComponents((compData || []).map(c => c.componente_id))
    setShowAzioneForm(true)
  }

  const handleDeleteAzione = async (az) => {
    if (!confirm(`Eliminare azione "${az.titolo}"?`)) return
    await supabase.from('azioni').delete().eq('id', az.id)
    setAzioni(azioni.filter(a => a.id !== az.id))
    setMessage({ type: 'success', text: 'Eliminata!' })
  }

  const handleChangeAzioneStato = async (az, nuovoStato) => {
    const updates = { stato: nuovoStato }
    if (nuovoStato === 'completato') updates.data_completamento = new Date().toISOString().split('T')[0]
    await supabase.from('azioni').update(updates).eq('id', az.id)
    setAzioni(await loadAzioni())
  }

  // Helpers
  const toggleComponent = (compId, forAzione = false) => {
    if (forAzione) setSelectedAzioneComponents(prev => prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId])
    else setSelectedComponents(prev => prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId])
  }
  const selectAllFiltered = (forAzione = false) => {
    const ids = componenti.map(c => c.id)
    if (forAzione) setSelectedAzioneComponents(prev => [...new Set([...prev, ...ids])])
    else setSelectedComponents(prev => [...new Set([...prev, ...ids])])
  }
  const deselectAllFiltered = (forAzione = false) => {
    const ids = new Set(componenti.map(c => c.id))
    if (forAzione) setSelectedAzioneComponents(prev => prev.filter(id => !ids.has(id)))
    else setSelectedComponents(prev => prev.filter(id => !ids.has(id)))
  }
  const toggleFase = (faseId) => setSelectedFasi(prev => prev.includes(faseId) ? prev.filter(id => id !== faseId) : [...prev, faseId])

  // Filtri
  const filteredWP = workPackages.filter(wp => {
    if (filterStato && wp.stato !== filterStato) return false
    if (filterSquadra && wp.squadra_id !== filterSquadra) return false
    if (searchTerm && !wp.codice.toLowerCase().includes(searchTerm.toLowerCase()) && !wp.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })
  const filteredAzioni = azioni.filter(az => {
    if (filterAzioneStato && az.stato !== filterAzioneStato) return false
    if (searchTerm && !az.titolo.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Stats
  const wpStats = { totale: workPackages.length, pianificati: workPackages.filter(w => w.stato === 'pianificato').length, inCorso: workPackages.filter(w => w.stato === 'in_corso').length, completati: workPackages.filter(w => w.stato === 'completato').length }
  const azioniStats = { totale: azioni.length, daFare: azioni.filter(a => a.stato === 'da_fare').length, inCorso: azioni.filter(a => a.stato === 'in_corso').length, completate: azioni.filter(a => a.stato === 'completato').length }
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (loading) return <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  return (
    <div className="space-y-6">
      {/* Header con Tabs */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{activeTab === 'wp' ? '📋 Work Packages' : '⚡ Azioni Parallele'}</h1>
            <p className="text-white/80 mt-1">{activeTab === 'wp' ? (language === 'it' ? 'Pacchetti di lavoro organizzati' : 'Organized work packages') : (language === 'it' ? 'Attività ad-hoc fuori dai WP' : 'Ad-hoc activities outside WP')}</p>
          </div>
          <button onClick={() => activeTab === 'wp' ? (resetWPForm(), setShowForm(true)) : (resetAzioneForm(), setShowAzioneForm(true))} className="px-4 py-2 bg-white text-blue-600 font-medium rounded-xl hover:bg-blue-50">
            + {activeTab === 'wp' ? (language === 'it' ? 'Nuovo WP' : 'New WP') : (language === 'it' ? 'Nuova Azione' : 'New Action')}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab('wp')} className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'wp' ? 'bg-white text-blue-600' : 'bg-white/20 hover:bg-white/30'}`}>
            📋 Work Packages ({wpStats.totale})
          </button>
          <button onClick={() => setActiveTab('azioni')} className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'azioni' ? 'bg-white text-purple-600' : 'bg-white/20 hover:bg-white/30'}`}>
            ⚡ Azioni ({azioniStats.totale})
          </button>
        </div>
        
        {/* Stats */}
        {activeTab === 'wp' ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{wpStats.totale}</p><p className="text-xs text-white/80">Totale</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{wpStats.pianificati}</p><p className="text-xs text-white/80">Pianificati</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{wpStats.inCorso}</p><p className="text-xs text-white/80">In Corso</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{wpStats.completati}</p><p className="text-xs text-white/80">Completati</p></div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{azioniStats.totale}</p><p className="text-xs text-white/80">Totale</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{azioniStats.daFare}</p><p className="text-xs text-white/80">Da Fare</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{azioniStats.inCorso}</p><p className="text-xs text-white/80">In Corso</p></div>
            <div className="bg-white/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold">{azioniStats.completate}</p><p className="text-xs text-white/80">Completate</p></div>
          </div>
        )}
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input type="text" placeholder="🔍 Cerca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          {activeTab === 'wp' ? (
            <>
              <select value={filterStato} onChange={e => setFilterStato(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="">Tutti gli stati</option>
                <option value="pianificato">Pianificato</option>
                <option value="in_corso">In Corso</option>
                <option value="completato">Completato</option>
                <option value="bloccato">Bloccato</option>
              </select>
              <select value={filterSquadra} onChange={e => setFilterSquadra(e.target.value)} className="px-4 py-2 border rounded-lg">
                <option value="">Tutte le squadre</option>
                {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </>
          ) : (
            <select value={filterAzioneStato} onChange={e => setFilterAzioneStato(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="">Tutti gli stati</option>
              <option value="da_fare">Da Fare</option>
              <option value="in_corso">In Corso</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
            </select>
          )}
        </div>
      </div>

      {/* Messaggio */}
      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}

      {/* === LISTA WORK PACKAGES === */}
      {activeTab === 'wp' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {filteredWP.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg font-medium">Nessun Work Package</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredWP.map(wp => (
                <div key={wp.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-20 rounded-full flex-shrink-0" style={{ backgroundColor: wp.colore }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-700 text-lg">{wp.codice}</span>
                        <span className="font-medium text-gray-800">{wp.nome}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${wp.stato === 'completato' ? 'bg-green-100 text-green-700' : wp.stato === 'in_corso' ? 'bg-amber-100 text-amber-700' : wp.stato === 'bloccato' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{wp.stato}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        {wp.squadra && <span>👷 {wp.squadra.nome}</span>}
                        {wp.foreman && <span>👤 {wp.foreman.nome} {wp.foreman.cognome}</span>}
                        {wp.data_inizio_pianificata && <span>📅 {new Date(wp.data_inizio_pianificata).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">📦 {wp.componenti_count} comp.</span>
                        <span className="text-sm bg-purple-50 text-purple-700 px-2 py-0.5 rounded">🔄 {wp.fasi_count} fasi</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setShowDetail(wp)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">📊</button>
                      <button onClick={() => handleEditWP(wp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                      <button onClick={() => handleDeleteWP(wp)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === LISTA AZIONI === */}
      {activeTab === 'azioni' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {filteredAzioni.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-5xl mb-4">⚡</p>
              <p className="text-lg font-medium">Nessuna Azione</p>
              <p className="text-sm mt-1">Crea azioni parallele per attività fuori dai WP</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredAzioni.map(az => (
                <div key={az.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: (az.fase?.colore || '#9CA3AF') + '20' }}>
                      {az.fase?.icona || '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{az.titolo}</span>
                        <span className="text-sm text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{az.fase?.nome || '-'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${az.stato === 'completato' ? 'bg-green-100 text-green-700' : az.stato === 'in_corso' ? 'bg-amber-100 text-amber-700' : az.stato === 'annullato' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{az.stato}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        {az.squadra && <span>👷 {az.squadra.nome}</span>}
                        {az.foreman && <span>👤 {az.foreman.nome} {az.foreman.cognome}</span>}
                        {az.anno && az.settimana && <span>📅 CW{String(az.settimana).padStart(2, '0')}/{az.anno}</span>}
                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">📦 {az.componenti_count} comp.</span>
                      </div>
                      {az.descrizione && <p className="text-sm text-gray-400 mt-1 line-clamp-1">{az.descrizione}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <select value={az.stato} onChange={e => handleChangeAzioneStato(az, e.target.value)} className={`text-xs px-2 py-1 rounded border ${az.stato === 'completato' ? 'bg-green-50 border-green-200' : az.stato === 'in_corso' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                        <option value="da_fare">Da Fare</option>
                        <option value="in_corso">In Corso</option>
                        <option value="completato">Completato</option>
                        <option value="annullato">Annullato</option>
                      </select>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditAzione(az)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                        <button onClick={() => handleDeleteAzione(az)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === MODAL FORM WP === */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{editing ? 'Modifica WP' : 'Nuovo WP'}</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codice *</label>
                  <input type="text" value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })} placeholder="WP-P-001" className="w-full px-3 py-2 border rounded-lg font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Descrizione</label>
                  <textarea value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Squadra</label>
                  <select value={form.squadra_id} onChange={e => setForm({ ...form, squadra_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Foreman</label>
                  <select value={form.foreman_id} onChange={e => setForm({ ...form, foreman_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {persone.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Predecessore</label>
                  <select value={form.predecessore_id} onChange={e => setForm({ ...form, predecessore_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {workPackages.filter(w => w.id !== editing?.id).map(w => <option key={w.id} value={w.id}>{w.codice}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Inizio</label>
                  <input type="date" value={form.data_inizio_pianificata} onChange={e => setForm({ ...form, data_inizio_pianificata: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Fine</label>
                  <input type="date" value={form.data_fine_pianificata} onChange={e => setForm({ ...form, data_fine_pianificata: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priorità</label>
                  <input type="number" value={form.priorita} onChange={e => setForm({ ...form, priorita: parseInt(e.target.value) || 0 })} min={0} max={10} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colore</label>
                  <div className="flex gap-1">{colori.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, colore: c })} className={`w-7 h-7 rounded ${form.colore === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />)}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fasi Workflow</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                  {fasiWorkflow.map(fase => (
                    <button key={fase.id} type="button" onClick={() => toggleFase(fase.id)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${selectedFasi.includes(fase.id) ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-white border'}`}>
                      {fase.icona} {fase.nome}
                      {selectedFasi.includes(fase.id) && <span className="w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">{selectedFasi.indexOf(fase.id) + 1}</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Componenti ({selectedComponents.length})</label>
                  <button type="button" onClick={() => setShowComponentSelector(true)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">+ Seleziona</button>
                </div>
                {selectedComponents.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">{selectedComponents.slice(0, 20).map(cId => { const comp = componenti.find(c => c.id === cId); return <span key={cId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">{comp?.codice || '...'}</span> })}{selectedComponents.length > 20 && <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">+{selectedComponents.length - 20}</span>}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button onClick={() => { setShowForm(false); resetWPForm() }} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
              <button onClick={handleSaveWP} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-300">{saving ? '...' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL FORM AZIONE === */}
      {showAzioneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold">{editingAzione ? 'Modifica Azione' : 'Nuova Azione'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titolo *</label>
                <input type="text" value={azioneForm.titolo} onChange={e => setAzioneForm({ ...azioneForm, titolo: e.target.value })} placeholder="Es: Prefab 2 spool mancanti" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo Attività *</label>
                <div className="flex flex-wrap gap-2">
                  {fasiWorkflow.map(fase => (
                    <button key={fase.id} type="button" onClick={() => setAzioneForm({ ...azioneForm, fase_workflow_id: fase.id })} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${azioneForm.fase_workflow_id === fase.id ? 'ring-2 ring-purple-500' : 'bg-gray-50 hover:bg-gray-100'}`} style={{ backgroundColor: azioneForm.fase_workflow_id === fase.id ? (fase.colore || '#9CA3AF') + '30' : '' }}>
                      <span className="text-lg">{fase.icona}</span>
                      <span>{fase.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea value={azioneForm.descrizione} onChange={e => setAzioneForm({ ...azioneForm, descrizione: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Squadra</label>
                  <select value={azioneForm.squadra_id} onChange={e => setAzioneForm({ ...azioneForm, squadra_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Foreman</label>
                  <select value={azioneForm.foreman_id} onChange={e => setAzioneForm({ ...azioneForm, foreman_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-</option>
                    {persone.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Anno</label>
                  <select value={azioneForm.anno} onChange={e => setAzioneForm({ ...azioneForm, anno: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Settimana</label>
                  <select value={azioneForm.settimana} onChange={e => setAzioneForm({ ...azioneForm, settimana: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg">
                    {Array.from({ length: 53 }, (_, i) => i + 1).map(w => <option key={w} value={w}>CW{String(w).padStart(2, '0')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scadenza</label>
                  <input type="date" value={azioneForm.data_scadenza} onChange={e => setAzioneForm({ ...azioneForm, data_scadenza: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Componenti ({selectedAzioneComponents.length})</label>
                  <button type="button" onClick={() => setShowAzioneComponentSelector(true)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">+ Seleziona</button>
                </div>
                {selectedAzioneComponents.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex flex-wrap gap-1">{selectedAzioneComponents.map(cId => { const comp = componenti.find(c => c.id === cId); return <span key={cId} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">{comp?.codice || '...'}</span> })}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button onClick={() => { setShowAzioneForm(false); resetAzioneForm() }} className="px-4 py-2 bg-gray-200 rounded-xl">Annulla</button>
              <button onClick={handleSaveAzione} disabled={saving} className="px-6 py-2 bg-purple-600 text-white rounded-xl disabled:bg-gray-300">{saving ? '...' : 'Salva'}</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL SELETTORE COMPONENTI === */}
      {(showComponentSelector || showAzioneComponentSelector) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b"><h4 className="font-bold">Seleziona Componenti</h4></div>
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={filters.disciplina} onChange={e => setFilters({ ...filters, disciplina: e.target.value, categoria: '' })} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Tutte Discipline</option>
                  {discipline.map(d => <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>)}
                </select>
                <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" disabled={!filters.disciplina}>
                  <option value="">Tutte Categorie</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.prefisso_codice} - {c.nome}</option>)}
                </select>
                <input type="text" placeholder="🔍" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border">
                  <input type="checkbox" checked={filters.soloNonAssegnati} onChange={e => setFilters({ ...filters, soloNonAssegnati: e.target.checked })} />
                  Solo liberi
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => selectAllFiltered(showAzioneComponentSelector)} className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">✅ Tutti ({componenti.length})</button>
                <button type="button" onClick={() => deselectAllFiltered(showAzioneComponentSelector)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">❌ Nessuno</button>
                <span className="ml-auto text-sm text-gray-500"><strong className="text-blue-600">{showAzioneComponentSelector ? selectedAzioneComponents.length : selectedComponents.length}</strong> selezionati</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {componenti.length === 0 ? <p className="text-center text-gray-500 py-8">Nessun componente trovato</p> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {componenti.map(comp => {
                    const isSelected = showAzioneComponentSelector ? selectedAzioneComponents.includes(comp.id) : selectedComponents.includes(comp.id)
                    return <button key={comp.id} type="button" onClick={() => toggleComponent(comp.id, showAzioneComponentSelector)} className={`p-3 rounded-lg text-left text-sm transition-all ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}><span className="font-mono font-medium">{comp.codice}</span></button>
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowComponentSelector(false); setShowAzioneComponentSelector(false) }} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Conferma ({showAzioneComponentSelector ? selectedAzioneComponents.length : selectedComponents.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WP Detail */}
      {showDetail && <WorkPackageDetail wp={showDetail} onClose={() => setShowDetail(null)} onUpdate={async () => setWorkPackages(await loadWorkPackages())} language={language} />}
    </div>
  )
}
