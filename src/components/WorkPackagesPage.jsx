// WorkPackagesPage.jsx - Work Packages + Azioni Parallele
// FIX: Disciplina obbligatoria, fasi filtrate, multi-CW
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import WorkPackageDetail from './WorkPackageDetail'
import ImportWPExcel from './ImportWPExcel'

export default function WorkPackagesPage() {
  const { progetto } = useAuth()
  const { language } = useI18n()
  const progettoId = progetto?.id

  // Tab attivo: 'wp' o 'azioni'
  const [activeTab, setActiveTab] = useState('wp')
  
  // Import Excel
  const [showImport, setShowImport] = useState(false)

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
  const [fasiFiltrate, setFasiFiltrate] = useState([]) // FIX: Fasi filtrate per disciplina WP
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Filtri lista WP
  const [filterStato, setFilterStato] = useState('')
  const [filterSquadra, setFilterSquadra] = useState('')
  const [filterDisciplina, setFilterDisciplina] = useState('') // FIX: Filtro disciplina lista
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form WP - FIX: Aggiunto disciplina_id
  const [form, setForm] = useState({
    codice: '', nome: '', descrizione: '', 
    disciplina_id: '', // FIX: Campo obbligatorio
    squadra_id: '', foreman_id: '',
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

  // Helper settimana ISO
  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  // FIX: Calcola tutte le settimane tra due date
  function getWeeksInRange(startDate, endDate) {
    const weeks = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    // Assicurati che current sia all'inizio della settimana
    while (current <= end) {
      const year = current.getFullYear()
      const week = getWeekNumber(current)
      
      // Evita duplicati
      const key = `${year}-${week}`
      if (!weeks.find(w => `${w.year}-${w.week}` === key)) {
        weeks.push({ year, week })
      }
      
      // Avanza di 7 giorni
      current.setDate(current.getDate() + 7)
    }
    
    return weeks
  }

  // === LOAD WORK PACKAGES ===
  const loadWorkPackages = useCallback(async () => {
    if (!progettoId) return []
    try {
      // Query base semplice
      const { data: wpData, error } = await supabase
        .from('work_packages')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Errore query WP:', error)
        return []
      }
      
      // Arricchisci ogni WP con dati correlati
      const enrichedWP = await Promise.all((wpData || []).map(async (wp) => {
        // Conta componenti e fasi
        const [{ count: compCount }, { count: fasiCount }] = await Promise.all([
          supabase.from('work_package_componenti').select('*', { count: 'exact', head: true }).eq('work_package_id', wp.id),
          supabase.from('work_package_fasi').select('*', { count: 'exact', head: true }).eq('work_package_id', wp.id)
        ])
        
        // Carica dati correlati separatamente
        let disciplina = null, squadra = null, foreman = null, predecessore = null
        
        if (wp.disciplina_id) {
          const { data } = await supabase.from('discipline').select('id, nome, codice, icona, colore').eq('id', wp.disciplina_id).single()
          disciplina = data
        }
        if (wp.squadra_id) {
          const { data } = await supabase.from('squadre').select('id, nome, colore').eq('id', wp.squadra_id).single()
          squadra = data
        }
        if (wp.foreman_id) {
          const { data } = await supabase.from('persone').select('id, nome, cognome').eq('id', wp.foreman_id).single()
          foreman = data
        }
        if (wp.predecessore_id) {
          const { data } = await supabase.from('work_packages').select('id, codice, nome').eq('id', wp.predecessore_id).single()
          predecessore = data
        }
        
        return { 
          ...wp, 
          disciplina,
          squadra,
          foreman,
          predecessore,
          componenti_count: compCount || 0, 
          fasi_count: fasiCount || 0 
        }
      }))
      
      return enrichedWP
    } catch (error) { 
      console.error('Errore loadWorkPackages:', error)
      return [] 
    }
  }, [progettoId])

  // === LOAD AZIONI ===
  const loadAzioni = useCallback(async () => {
    if (!progettoId) return []
    try {
      const { data: azioniData, error } = await supabase
        .from('azioni')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      
      if (error) {
        // Se la tabella non esiste, ritorna array vuoto senza errore
        if (error.code === '42P01') {
          console.warn('Tabella azioni non esiste ancora')
          return []
        }
        console.error('Errore query azioni:', error)
        return []
      }
      
      // Arricchisci ogni azione con dati correlati
      const enrichedAzioni = await Promise.all((azioniData || []).map(async (az) => {
        const { count } = await supabase
          .from('azioni_componenti')
          .select('*', { count: 'exact', head: true })
          .eq('azione_id', az.id)
        
        let fase = null, squadra = null, foreman = null
        
        if (az.fase_workflow_id) {
          const { data } = await supabase.from('fasi_workflow').select('id, nome, icona, colore').eq('id', az.fase_workflow_id).single()
          fase = data
        }
        if (az.squadra_id) {
          const { data } = await supabase.from('squadre').select('id, nome').eq('id', az.squadra_id).single()
          squadra = data
        }
        if (az.foreman_id) {
          const { data } = await supabase.from('persone').select('id, nome, cognome').eq('id', az.foreman_id).single()
          foreman = data
        }
        
        return { ...az, fase, squadra, foreman, componenti_count: count || 0 }
      }))
      
      return enrichedAzioni
    } catch (error) { 
      console.error('Errore loadAzioni:', error)
      return [] 
    }
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
        
        // Carica dati di supporto
        const { data: sqData } = await supabase
          .from('squadre')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
        setSquadre(sqData || [])
        
        // Persone: tabella globale, carica tutte le persone attive
        const { data: persData } = await supabase
          .from('persone')
          .select('*')
          .eq('attivo', true)
          .order('cognome')
        setPersone(persData || [])
        
        const { data: discData } = await supabase
          .from('discipline')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('ordine')
        setDiscipline(discData || [])
        
        // Carica TUTTE le fasi (poi filtreremo per disciplina)
        if (discData?.length > 0) {
          const { data: fasiData } = await supabase
            .from('fasi_workflow')
            .select('*, disciplina:discipline(id, nome, codice)')
            .in('disciplina_id', discData.map(d => d.id))
            .order('ordine')
          setFasiWorkflow(fasiData || [])
        }
      } catch (error) { 
        console.error('Errore load iniziale:', error) 
      }
      finally { setLoading(false) }
    }
    loadData()
  }, [progettoId, loadWorkPackages, loadAzioni])

  // FIX: Quando cambia disciplina nel form, filtra le fasi e resetta selezione
  useEffect(() => {
    if (form.disciplina_id) {
      const filtered = fasiWorkflow.filter(f => f.disciplina_id === form.disciplina_id)
      setFasiFiltrate(filtered)
      // Se le fasi selezionate non appartengono alla nuova disciplina, resetta
      const validFasi = selectedFasi.filter(fId => filtered.some(f => f.id === fId))
      if (validFasi.length !== selectedFasi.length) {
        setSelectedFasi(validFasi)
      }
    } else {
      setFasiFiltrate([])
    }
  }, [form.disciplina_id, fasiWorkflow])

  // FIX: Quando cambia disciplina nel form, pre-filtra componenti
  useEffect(() => {
    if (form.disciplina_id && showForm) {
      setFilters(prev => ({ ...prev, disciplina: form.disciplina_id }))
    }
  }, [form.disciplina_id, showForm])

  // Load categorie quando cambia filtro disciplina
  useEffect(() => {
    const loadCategorie = async () => {
      if (!filters.disciplina) { setCategorie([]); return }
      const { data } = await supabase
        .from('tipi_componente')
        .select('*')
        .eq('disciplina_id', filters.disciplina)
        .order('nome')
      setCategorie(data || [])
    }
    loadCategorie()
  }, [filters.disciplina])

  // Load componenti
  useEffect(() => {
    const loadComponenti = async () => {
      if (!progettoId || (!showComponentSelector && !showAzioneComponentSelector && !showForm)) return
      
      let query = supabase
        .from('componenti')
        .select(`*, tipo:tipi_componente(id, nome, prefisso_codice), disciplina:discipline(id, nome, icona)`)
        .eq('progetto_id', progettoId)
      
      // FIX: Se c'è una disciplina nel form WP, filtra per quella
      const discFilter = filters.disciplina || form.disciplina_id
      if (discFilter) query = query.eq('disciplina_id', discFilter)
      if (filters.categoria) query = query.eq('tipo_componente_id', filters.categoria)
      if (filters.search) query = query.ilike('codice', `%${filters.search}%`)
      
      const { data } = await query.order('codice').limit(500)
      
      if (filters.soloNonAssegnati && data && (showComponentSelector || showAzioneComponentSelector)) {
        const { data: assignedWP } = await supabase.from('work_package_componenti').select('componente_id')
        const { data: assignedAz } = await supabase.from('azioni_componenti').select('componente_id')
        const assignedIds = new Set([
          ...((assignedWP || []).map(a => a.componente_id)), 
          ...((assignedAz || []).map(a => a.componente_id))
        ])
        // Mantieni i componenti già selezionati nel WP corrente
        setComponenti(data.filter(c => !assignedIds.has(c.id) || selectedComponents.includes(c.id)))
      } else { 
        setComponenti(data || []) 
      }
    }
    loadComponenti()
  }, [progettoId, filters, form.disciplina_id, showComponentSelector, showAzioneComponentSelector, showForm, selectedComponents])

  // === SALVA WP ===
  const handleSaveWP = async () => {
    // FIX: Validazione disciplina obbligatoria
    if (!form.codice.trim() || !form.nome.trim()) { 
      setMessage({ type: 'error', text: 'Codice e nome obbligatori' })
      return 
    }
    if (!form.disciplina_id) {
      setMessage({ type: 'error', text: 'Seleziona una disciplina' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      const payload = { 
        ...form, 
        progetto_id: progettoId, 
        disciplina_id: form.disciplina_id, // FIX: Salva disciplina
        squadra_id: form.squadra_id || null, 
        foreman_id: form.foreman_id || null, 
        predecessore_id: form.predecessore_id || null, 
        data_inizio_pianificata: form.data_inizio_pianificata || null, 
        data_fine_pianificata: form.data_fine_pianificata || null 
      }
      
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
      
      // Tabella di join work_package_componenti
      await supabase.from('work_package_componenti').delete().eq('work_package_id', wpId)
      if (selectedComponents.length > 0) {
        const { error } = await supabase.from('work_package_componenti')
          .insert(selectedComponents.map((cId, idx) => ({ 
            work_package_id: wpId, 
            componente_id: cId, 
            ordine: idx 
          })))
        if (error) throw new Error(`Errore componenti: ${error.message}`)
      }
      
      // Aggiorna work_package_id nella tabella componenti
      await supabase.from('componenti').update({ work_package_id: null }).eq('work_package_id', wpId)
      if (selectedComponents.length > 0) {
        await supabase.from('componenti').update({ work_package_id: wpId }).in('id', selectedComponents)
      }
      
      // Tabella join work_package_fasi
      await supabase.from('work_package_fasi').delete().eq('work_package_id', wpId)
      if (selectedFasi.length > 0) {
        const { error } = await supabase.from('work_package_fasi')
          .insert(selectedFasi.map((fId, idx) => ({ 
            work_package_id: wpId, 
            fase_workflow_id: fId, 
            ordine: idx 
          })))
        if (error) throw new Error(`Errore fasi: ${error.message}`)
      }
      
      // === FIX: ASSEGNAZIONE MULTI-CW ===
      // Rimuovi pianificazioni esistenti per questo WP
      await supabase.from('pianificazione_cw')
        .delete()
        .eq('work_package_id', wpId)
        .is('componente_id', null)
      
      // Se ci sono date, crea entry per OGNI settimana nel range
      if (form.data_inizio_pianificata) {
        const dataInizio = new Date(form.data_inizio_pianificata)
        const dataFine = form.data_fine_pianificata 
          ? new Date(form.data_fine_pianificata) 
          : dataInizio // Se non c'è fine, usa solo inizio
        
        const weeks = getWeeksInRange(dataInizio, dataFine)
        
        // Inserisci una entry per ogni settimana
        const pianificazioni = weeks.map((w, idx) => ({
          progetto_id: progettoId,
          work_package_id: wpId,
          componente_id: null,
          anno: w.year,
          settimana: w.week,
          stato: idx === 0 ? 'pianificato' : 'pianificato', // Prima settimana = inizio
          squadra_id: form.squadra_id || null,
          priorita: form.priorita || 0
        }))
        
        if (pianificazioni.length > 0) {
          const { error: pianError } = await supabase
            .from('pianificazione_cw')
            .insert(pianificazioni)
          if (pianError) console.warn('Errore pianificazione automatica:', pianError)
        }
      }
      
      setMessage({ type: 'success', text: `Salvato! ${form.data_inizio_pianificata ? `(${getWeeksInRange(new Date(form.data_inizio_pianificata), form.data_fine_pianificata ? new Date(form.data_fine_pianificata) : new Date(form.data_inizio_pianificata)).length} settimane pianificate)` : ''}` })
      setShowForm(false)
      resetWPForm()
      setWorkPackages(await loadWorkPackages())
      
    } catch (error) { 
      console.error('Errore salvataggio WP:', error)
      setMessage({ type: 'error', text: error.message }) 
    }
    finally { setSaving(false) }
  }

  const resetWPForm = () => { 
    setForm({ 
      codice: '', nome: '', descrizione: '', 
      disciplina_id: '', // FIX: Reset disciplina
      squadra_id: '', foreman_id: '', 
      data_inizio_pianificata: '', data_fine_pianificata: '', 
      predecessore_id: '', colore: '#3B82F6', priorita: 0 
    })
    setEditing(null)
    setSelectedComponents([])
    setSelectedFasi([])
    setFilters({ disciplina: '', categoria: '', search: '', soloNonAssegnati: true })
  }

  const handleEditWP = async (wp) => {
    setForm({ 
      codice: wp.codice, 
      nome: wp.nome, 
      descrizione: wp.descrizione || '', 
      disciplina_id: wp.disciplina_id || '', // FIX: Carica disciplina
      squadra_id: wp.squadra_id || '', 
      foreman_id: wp.foreman_id || '', 
      data_inizio_pianificata: wp.data_inizio_pianificata || '', 
      data_fine_pianificata: wp.data_fine_pianificata || '', 
      predecessore_id: wp.predecessore_id || '', 
      colore: wp.colore || '#3B82F6', 
      priorita: wp.priorita || 0 
    })
    setEditing(wp)
    
    const { data: compData } = await supabase
      .from('work_package_componenti')
      .select('componente_id')
      .eq('work_package_id', wp.id)
    setSelectedComponents((compData || []).map(c => c.componente_id))
    
    const { data: fasiData } = await supabase
      .from('work_package_fasi')
      .select('fase_workflow_id')
      .eq('work_package_id', wp.id)
      .order('ordine')
    setSelectedFasi((fasiData || []).map(f => f.fase_workflow_id))
    
    setShowForm(true)
  }

  const handleDeleteWP = async (wp) => {
    if (!confirm(`Eliminare WP "${wp.codice}"?\nVerranno rimosse anche le pianificazioni associate.`)) return
    
    try {
      // Rimuovi le pianificazioni
      await supabase.from('pianificazione_cw').delete().eq('work_package_id', wp.id)
      // Rimuovi il riferimento work_package_id dai componenti
      await supabase.from('componenti').update({ work_package_id: null }).eq('work_package_id', wp.id)
      // Elimina il WP (cascade rimuove join tables)
      await supabase.from('work_packages').delete().eq('id', wp.id)
      
      setWorkPackages(workPackages.filter(w => w.id !== wp.id))
      setMessage({ type: 'success', text: 'Eliminato!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  // === SALVA AZIONE ===
  const handleSaveAzione = async () => {
    if (!azioneForm.titolo.trim() || !azioneForm.fase_workflow_id) { 
      setMessage({ type: 'error', text: 'Titolo e tipo attività obbligatori' })
      return 
    }
    setSaving(true)
    setMessage(null)
    
    try {
      const payload = { 
        ...azioneForm, 
        progetto_id: progettoId, 
        squadra_id: azioneForm.squadra_id || null, 
        foreman_id: azioneForm.foreman_id || null, 
        data_scadenza: azioneForm.data_scadenza || null 
      }
      
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
        const { error } = await supabase.from('azioni_componenti')
          .insert(selectedAzioneComponents.map(cId => ({ azione_id: azioneId, componente_id: cId })))
        if (error) throw new Error(`Errore componenti: ${error.message}`)
      }
      
      setMessage({ type: 'success', text: 'Azione salvata!' })
      setShowAzioneForm(false)
      resetAzioneForm()
      setAzioni(await loadAzioni())
    } catch (error) { 
      setMessage({ type: 'error', text: error.message }) 
    }
    finally { setSaving(false) }
  }

  const resetAzioneForm = () => { 
    setAzioneForm({ 
      titolo: '', descrizione: '', fase_workflow_id: '', 
      squadra_id: '', foreman_id: '', data_scadenza: '', 
      priorita: 0, anno: new Date().getFullYear(), settimana: getWeekNumber(new Date()) 
    })
    setEditingAzione(null)
    setSelectedAzioneComponents([]) 
  }

  const handleEditAzione = async (az) => {
    setAzioneForm({ 
      titolo: az.titolo, 
      descrizione: az.descrizione || '', 
      fase_workflow_id: az.fase_workflow_id || '', 
      squadra_id: az.squadra_id || '', 
      foreman_id: az.foreman_id || '', 
      data_scadenza: az.data_scadenza || '', 
      priorita: az.priorita || 0, 
      anno: az.anno || new Date().getFullYear(), 
      settimana: az.settimana || getWeekNumber(new Date()) 
    })
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

  // Toggle componente selezione
  const toggleComponent = (compId, isAzione = false) => {
    if (isAzione) {
      setSelectedAzioneComponents(prev => 
        prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId]
      )
    } else {
      setSelectedComponents(prev => 
        prev.includes(compId) ? prev.filter(id => id !== compId) : [...prev, compId]
      )
    }
  }

  // Seleziona/Deseleziona tutti
  const selectAllFiltered = (isAzione = false) => {
    const ids = componenti.map(c => c.id)
    if (isAzione) {
      setSelectedAzioneComponents(ids)
    } else {
      setSelectedComponents(ids)
    }
  }
  
  const deselectAllFiltered = (isAzione = false) => {
    if (isAzione) {
      setSelectedAzioneComponents([])
    } else {
      setSelectedComponents([])
    }
  }

  // Toggle fase selezione
  const toggleFase = (faseId) => {
    setSelectedFasi(prev => 
      prev.includes(faseId) ? prev.filter(id => id !== faseId) : [...prev, faseId]
    )
  }

  // Colori stato
  const getStatoBadge = (stato) => {
    const stati = {
      pianificato: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pianificato' },
      in_corso: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Corso' },
      completato: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completato' },
      sospeso: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Sospeso' },
      annullato: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annullato' }
    }
    return stati[stato] || stati.pianificato
  }

  // Filtra WP per lista
  const filteredWP = workPackages.filter(wp => {
    if (filterStato && wp.stato !== filterStato) return false
    if (filterSquadra && wp.squadra_id !== filterSquadra) return false
    if (filterDisciplina && wp.disciplina_id !== filterDisciplina) return false // FIX: Filtro disciplina
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      if (!wp.codice?.toLowerCase().includes(search) && 
          !wp.nome?.toLowerCase().includes(search)) return false
    }
    return true
  })

  // Filtra azioni
  const filteredAzioni = azioni.filter(az => {
    if (filterAzioneStato && az.stato !== filterAzioneStato) return false
    return true
  })

  // Loading
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header con tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 Work Packages & Attività</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('wp')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'wp' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
          >
            📦 Work Packages ({workPackages.length})
          </button>
          <button
            onClick={() => setActiveTab('azioni')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'azioni' ? 'bg-white shadow text-purple-600' : 'text-gray-600'}`}
          >
            ⚡ Azioni ({azioni.length})
          </button>
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* === TAB WORK PACKAGES === */}
      {activeTab === 'wp' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-2xl font-bold text-gray-800">{workPackages.length}</p>
              <p className="text-sm text-gray-500">📦 Totale WP</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-2xl font-bold text-gray-400">{workPackages.filter(wp => wp.stato === 'draft' || !wp.stato).length}</p>
              <p className="text-sm text-gray-500">📝 Bozza</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-cyan-200 bg-cyan-50">
              <p className="text-2xl font-bold text-cyan-600">{workPackages.filter(wp => wp.stato === 'pianificato').length}</p>
              <p className="text-sm text-gray-500">📋 Pianificati</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 bg-amber-50">
              <p className="text-2xl font-bold text-amber-600">{workPackages.filter(wp => wp.stato === 'in_corso').length}</p>
              <p className="text-sm text-gray-500">🔄 In Corso</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50">
              <p className="text-2xl font-bold text-green-600">{workPackages.filter(wp => wp.stato === 'completato').length}</p>
              <p className="text-sm text-gray-500">✅ Completati</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Filtri */}
              <div className="flex-1 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="🔍 Cerca codice o nome..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border rounded-xl text-sm min-w-[200px]"
                />
                {/* FIX: Filtro disciplina */}
                <select
                  value={filterDisciplina}
                  onChange={e => setFilterDisciplina(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Tutte Discipline</option>
                  {discipline.map(d => (
                    <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
                  ))}
                </select>
                <select
                  value={filterStato}
                  onChange={e => setFilterStato(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Tutti gli stati</option>
                  <option value="pianificato">📋 Pianificato</option>
                  <option value="in_corso">🔄 In Corso</option>
                  <option value="completato">✅ Completato</option>
                  <option value="sospeso">⏸️ Sospeso</option>
                </select>
                <select
                  value={filterSquadra}
                  onChange={e => setFilterSquadra(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Tutte le squadre</option>
                  {squadre.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              {/* Azioni */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImport(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center gap-2"
                >
                  📥 Import Excel
                </button>
                <button
                  onClick={() => { resetWPForm(); setShowForm(true) }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                >
                  ➕ Nuovo WP
                </button>
              </div>
            </div>
          </div>

          {/* Lista WP */}
          {filteredWP.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun Work Package</h3>
              <p className="text-gray-500 mb-4">Crea il primo Work Package per organizzare i componenti</p>
              <button
                onClick={() => { resetWPForm(); setShowForm(true) }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                ➕ Crea Work Package
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWP.map(wp => {
                const statoBadge = getStatoBadge(wp.stato)
                return (
                  <div 
                    key={wp.id}
                    className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setShowDetail(wp)}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {/* FIX: Badge disciplina */}
                            {wp.disciplina && (
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: (wp.disciplina.colore || '#6B7280') + '20',
                                  color: wp.disciplina.colore || '#6B7280'
                                }}
                              >
                                {wp.disciplina.icona} {wp.disciplina.nome}
                              </span>
                            )}
                          </div>
                          <h3 className="font-mono font-bold text-blue-600">{wp.codice}</h3>
                          <p className="text-gray-700 font-medium truncate">{wp.nome}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statoBadge.bg} ${statoBadge.text}`}>
                          {statoBadge.label}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="space-y-1 text-sm text-gray-500 mb-3">
                        {wp.squadra && (
                          <div className="flex items-center gap-1">
                            <span>👥</span>
                            <span>{wp.squadra.nome}</span>
                          </div>
                        )}
                        {wp.foreman && (
                          <div className="flex items-center gap-1">
                            <span>👷</span>
                            <span>{wp.foreman.nome} {wp.foreman.cognome}</span>
                          </div>
                        )}
                        {wp.data_inizio_pianificata && (
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>
                              {new Date(wp.data_inizio_pianificata).toLocaleDateString('it-IT')}
                              {wp.data_fine_pianificata && ` → ${new Date(wp.data_fine_pianificata).toLocaleDateString('it-IT')}`}
                            </span>
                          </div>
                        )}
                        {wp.predecessore && (
                          <div className="flex items-center gap-1">
                            <span>🔗</span>
                            <span className="font-mono text-xs">{wp.predecessore.codice}</span>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                          📦 {wp.componenti_count} comp.
                        </span>
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium">
                          ⚙️ {wp.fasi_count} fasi
                        </span>
                        {wp.priorita > 0 && (
                          <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                            🔥 P{wp.priorita}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 border-t bg-gray-50 flex gap-2 rounded-b-2xl">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditWP(wp) }}
                        className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50"
                      >
                        ✏️ Modifica
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteWP(wp) }}
                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === TAB AZIONI === */}
      {activeTab === 'azioni' && (
        <div className="space-y-6">
          {/* KPI Cards Azioni */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-2xl font-bold text-gray-800">{azioni.length}</p>
              <p className="text-sm text-gray-500">⚡ Totale Azioni</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-2xl font-bold text-gray-400">{azioni.filter(az => az.stato === 'da_fare' || !az.stato).length}</p>
              <p className="text-sm text-gray-500">📝 Da Fare</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 bg-amber-50">
              <p className="text-2xl font-bold text-amber-600">{azioni.filter(az => az.stato === 'in_corso').length}</p>
              <p className="text-sm text-gray-500">🔄 In Corso</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50">
              <p className="text-2xl font-bold text-green-600">{azioni.filter(az => az.stato === 'completato').length}</p>
              <p className="text-sm text-gray-500">✅ Completate</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50">
              <p className="text-2xl font-bold text-red-600">{azioni.filter(az => az.stato === 'bloccato').length}</p>
              <p className="text-sm text-gray-500">🚫 Bloccate</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <select
                  value={filterAzioneStato}
                  onChange={e => setFilterAzioneStato(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Tutti gli stati</option>
                  <option value="pianificato">📋 Pianificato</option>
                  <option value="in_corso">🔄 In Corso</option>
                  <option value="completato">✅ Completato</option>
                </select>
              </div>
              <button
                onClick={() => { resetAzioneForm(); setShowAzioneForm(true) }}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2"
              >
                ➕ Nuova Azione
              </button>
            </div>
          </div>

          {/* Lista Azioni */}
          {filteredAzioni.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna Azione</h3>
              <p className="text-gray-500 mb-4">Le azioni sono attività singole non raggruppate in WP</p>
              <button
                onClick={() => { resetAzioneForm(); setShowAzioneForm(true) }}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                ➕ Crea Azione
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAzioni.map(az => {
                const statoBadge = getStatoBadge(az.stato)
                return (
                  <div key={az.id} className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">{az.titolo}</h3>
                          {az.fase && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mt-1"
                              style={{ backgroundColor: (az.fase.colore || '#6B7280') + '20', color: az.fase.colore }}
                            >
                              {az.fase.icona} {az.fase.nome}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statoBadge.bg} ${statoBadge.text}`}>
                          {statoBadge.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>📅 CW{String(az.settimana).padStart(2, '0')}/{az.anno}</div>
                        {az.squadra && <div>👥 {az.squadra.nome}</div>}
                        {az.foreman && <div>👷 {az.foreman.nome} {az.foreman.cognome}</div>}
                      </div>
                      {az.componenti_count > 0 && (
                        <div className="mt-2">
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs">
                            📦 {az.componenti_count} comp.
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t bg-gray-50 flex gap-2 rounded-b-2xl">
                      <button onClick={() => handleEditAzione(az)} className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50">
                        ✏️ Modifica
                      </button>
                      <button onClick={() => handleDeleteAzione(az)} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === MODAL FORM WP === */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">{editing ? '✏️ Modifica Work Package' : '➕ Nuovo Work Package'}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Codice e Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codice *</label>
                  <input
                    type="text"
                    value={form.codice}
                    onChange={e => setForm({ ...form, codice: e.target.value.toUpperCase() })}
                    placeholder="WP-XXX-001"
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome descrittivo"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* FIX: DISCIPLINA OBBLIGATORIA - Prima di tutto! */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <label className="block text-sm font-medium mb-2 text-blue-800">
                  🎯 Disciplina * <span className="font-normal text-blue-600">(seleziona prima della scelta componenti/fasi)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {discipline.map(disc => (
                    <button
                      key={disc.id}
                      type="button"
                      onClick={() => setForm({ ...form, disciplina_id: disc.id })}
                      className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all border-2 ${
                        form.disciplina_id === disc.id 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-transparent bg-white hover:bg-gray-50'
                      }`}
                      style={{ 
                        backgroundColor: form.disciplina_id === disc.id ? (disc.colore || '#6B7280') + '20' : undefined,
                        borderColor: form.disciplina_id === disc.id ? disc.colore : undefined
                      }}
                    >
                      <span className="text-lg">{disc.icona}</span>
                      <span>{disc.nome}</span>
                    </button>
                  ))}
                </div>
                {!form.disciplina_id && (
                  <p className="text-sm text-blue-600 mt-2">⚠️ Seleziona una disciplina per abilitare componenti e fasi</p>
                )}
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea
                  value={form.descrizione}
                  onChange={e => setForm({ ...form, descrizione: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Descrizione delle attività..."
                />
              </div>

              {/* Squadra e Foreman */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Squadra</label>
                  <select
                    value={form.squadra_id}
                    onChange={e => setForm({ ...form, squadra_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">- Seleziona -</option>
                    {squadre.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Foreman</label>
                  <select
                    value={form.foreman_id}
                    onChange={e => setForm({ ...form, foreman_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">- Seleziona -</option>
                    {persone.map(p => (
                      <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Inizio Pianificata</label>
                  <input
                    type="date"
                    value={form.data_inizio_pianificata}
                    onChange={e => setForm({ ...form, data_inizio_pianificata: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Fine Pianificata</label>
                  <input
                    type="date"
                    value={form.data_fine_pianificata}
                    onChange={e => setForm({ ...form, data_fine_pianificata: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Info CW */}
              {form.data_inizio_pianificata && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                  <span className="font-medium text-green-800">📅 Pianificazione automatica:</span>
                  <span className="ml-2 text-green-700">
                    {(() => {
                      const start = new Date(form.data_inizio_pianificata)
                      const end = form.data_fine_pianificata ? new Date(form.data_fine_pianificata) : start
                      const weeks = getWeeksInRange(start, end)
                      return weeks.map(w => `CW${String(w.week).padStart(2, '0')}`).join(', ')
                    })()}
                  </span>
                </div>
              )}

              {/* Predecessore e Priorità */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Predecessore</label>
                  <select
                    value={form.predecessore_id}
                    onChange={e => setForm({ ...form, predecessore_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">- Nessuno -</option>
                    {workPackages.filter(w => w.id !== editing?.id).map(w => (
                      <option key={w.id} value={w.id}>{w.codice} - {w.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priorità</label>
                  <select
                    value={form.priorita}
                    onChange={e => setForm({ ...form, priorita: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value={0}>Normale</option>
                    <option value={1}>🔥 Alta (1)</option>
                    <option value={2}>🔥🔥 Urgente (2)</option>
                    <option value={3}>🔥🔥🔥 Critica (3)</option>
                  </select>
                </div>
              </div>

              {/* FIX: Fasi Workflow - Solo se disciplina selezionata */}
              <div className={!form.disciplina_id ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-medium mb-2">
                  Fasi Workflow ({selectedFasi.length})
                  {!form.disciplina_id && <span className="text-gray-400 ml-2">← seleziona prima la disciplina</span>}
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                  {fasiFiltrate.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {form.disciplina_id ? 'Nessuna fase definita per questa disciplina' : 'Seleziona una disciplina'}
                    </p>
                  ) : (
                    fasiFiltrate.map(fase => (
                      <button
                        key={fase.id}
                        type="button"
                        onClick={() => toggleFase(fase.id)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                          selectedFasi.includes(fase.id) 
                            ? 'ring-2 ring-blue-500' 
                            : 'bg-white hover:bg-gray-100'
                        }`}
                        style={{ 
                          backgroundColor: selectedFasi.includes(fase.id) ? (fase.colore || '#6B7280') + '30' : undefined 
                        }}
                      >
                        <span className="text-lg">{fase.icona}</span>
                        <span>{fase.nome}</span>
                        {selectedFasi.includes(fase.id) && <span className="text-green-600">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* FIX: Componenti - Solo se disciplina selezionata */}
              <div className={!form.disciplina_id ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">
                    Componenti ({selectedComponents.length})
                    {!form.disciplina_id && <span className="text-gray-400 ml-2">← seleziona prima la disciplina</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowComponentSelector(true)}
                    disabled={!form.disciplina_id}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    + Seleziona
                  </button>
                </div>
                {selectedComponents.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex flex-wrap gap-1">
                      {selectedComponents.map(cId => {
                        const comp = componenti.find(c => c.id === cId)
                        return (
                          <span 
                            key={cId} 
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                          >
                            {comp?.codice || '...'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Colore */}
              <div>
                <label className="block text-sm font-medium mb-1">Colore</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, colore: c })}
                      className={`w-8 h-8 rounded-full transition-all ${form.colore === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button
                onClick={() => { setShowForm(false); resetWPForm() }}
                className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveWP}
                disabled={saving || !form.codice || !form.nome || !form.disciplina_id}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? '⏳ Salvataggio...' : '💾 Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL FORM AZIONE === */}
      {showAzioneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">{editingAzione ? '✏️ Modifica Azione' : '➕ Nuova Azione'}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titolo *</label>
                <input
                  type="text"
                  value={azioneForm.titolo}
                  onChange={e => setAzioneForm({ ...azioneForm, titolo: e.target.value })}
                  placeholder="Titolo azione"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo Attività *</label>
                <div className="flex flex-wrap gap-2">
                  {fasiWorkflow.map(fase => (
                    <button
                      key={fase.id}
                      type="button"
                      onClick={() => setAzioneForm({ ...azioneForm, fase_workflow_id: fase.id })}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                        azioneForm.fase_workflow_id === fase.id ? 'ring-2 ring-purple-500' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      style={{ 
                        backgroundColor: azioneForm.fase_workflow_id === fase.id ? (fase.colore || '#9CA3AF') + '30' : '' 
                      }}
                    >
                      <span className="text-lg">{fase.icona}</span>
                      <span>{fase.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea
                  value={azioneForm.descrizione}
                  onChange={e => setAzioneForm({ ...azioneForm, descrizione: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Squadra</label>
                  <select
                    value={azioneForm.squadra_id}
                    onChange={e => setAzioneForm({ ...azioneForm, squadra_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-</option>
                    {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Foreman</label>
                  <select
                    value={azioneForm.foreman_id}
                    onChange={e => setAzioneForm({ ...azioneForm, foreman_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-</option>
                    {persone.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Anno</label>
                  <select
                    value={azioneForm.anno}
                    onChange={e => setAzioneForm({ ...azioneForm, anno: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Settimana</label>
                  <select
                    value={azioneForm.settimana}
                    onChange={e => setAzioneForm({ ...azioneForm, settimana: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>CW{String(w).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scadenza</label>
                  <input
                    type="date"
                    value={azioneForm.data_scadenza}
                    onChange={e => setAzioneForm({ ...azioneForm, data_scadenza: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Componenti ({selectedAzioneComponents.length})</label>
                  <button
                    type="button"
                    onClick={() => setShowAzioneComponentSelector(true)}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm"
                  >
                    + Seleziona
                  </button>
                </div>
                {selectedAzioneComponents.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex flex-wrap gap-1">
                      {selectedAzioneComponents.map(cId => {
                        const comp = componenti.find(c => c.id === cId)
                        return (
                          <span key={cId} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                            {comp?.codice || '...'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end sticky bottom-0">
              <button
                onClick={() => { setShowAzioneForm(false); resetAzioneForm() }}
                className="px-4 py-2 bg-gray-200 rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveAzione}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl disabled:bg-gray-300"
              >
                {saving ? '...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL SELETTORE COMPONENTI === */}
      {(showComponentSelector || showAzioneComponentSelector) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-bold">Seleziona Componenti</h4>
              {form.disciplina_id && (
                <p className="text-sm text-blue-600">
                  Filtrati per disciplina: {discipline.find(d => d.id === form.disciplina_id)?.nome}
                </p>
              )}
            </div>
            <div className="p-4 border-b bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select
                  value={filters.disciplina}
                  onChange={e => setFilters({ ...filters, disciplina: e.target.value, categoria: '' })}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Tutte Discipline</option>
                  {discipline.map(d => <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>)}
                </select>
                <select
                  value={filters.categoria}
                  onChange={e => setFilters({ ...filters, categoria: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                  disabled={!filters.disciplina}
                >
                  <option value="">Tutte Categorie</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.prefisso_codice} - {c.nome}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="🔍 Cerca..."
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <label className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={filters.soloNonAssegnati}
                    onChange={e => setFilters({ ...filters, soloNonAssegnati: e.target.checked })}
                  />
                  Solo liberi
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectAllFiltered(showAzioneComponentSelector)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm"
                >
                  ✅ Tutti ({componenti.length})
                </button>
                <button
                  type="button"
                  onClick={() => deselectAllFiltered(showAzioneComponentSelector)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
                >
                  ❌ Nessuno
                </button>
                <span className="ml-auto text-sm text-gray-500">
                  <strong className="text-blue-600">
                    {showAzioneComponentSelector ? selectedAzioneComponents.length : selectedComponents.length}
                  </strong> selezionati
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {componenti.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nessun componente trovato</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {componenti.map(comp => {
                    const isSelected = showAzioneComponentSelector 
                      ? selectedAzioneComponents.includes(comp.id) 
                      : selectedComponents.includes(comp.id)
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => toggleComponent(comp.id, showAzioneComponentSelector)}
                        className={`p-3 rounded-lg text-left text-sm transition-all ${
                          isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-mono font-medium">{comp.codice}</span>
                        {comp.disciplina && (
                          <span className="ml-2 text-xs opacity-60">{comp.disciplina.icona}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button
                onClick={() => { setShowComponentSelector(false); setShowAzioneComponentSelector(false) }}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl"
              >
                Conferma ({showAzioneComponentSelector ? selectedAzioneComponents.length : selectedComponents.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WP Detail */}
      {showDetail && (
        <WorkPackageDetail
          wp={showDetail}
          onClose={() => setShowDetail(null)}
          onUpdate={async () => setWorkPackages(await loadWorkPackages())}
          language={language}
        />
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <ImportWPExcel
          onClose={() => setShowImport(false)}
          onSuccess={async () => setWorkPackages(await loadWorkPackages())}
          discipline={discipline}
          fasiWorkflow={fasiWorkflow}
          squadre={squadre}
        />
      )}
    </div>
  )
}
