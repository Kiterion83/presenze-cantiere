import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function PianificazionePage() {
  const { progettoId, progetto, persona, isAtLeast, canAccess } = useAuth()
  const { t, language } = useI18n()
  
  // Dati
  const [pianificazioni, setPianificazioni] = useState([])
  const [componenti, setComponenti] = useState([])
  const [workPackages, setWorkPackages] = useState([]) // NUOVO: WP
  const [discipline, setDiscipline] = useState([])
  const [fasiWorkflow, setFasiWorkflow] = useState([])
  const [squadre, setSquadre] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Navigazione CW
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  
  // Filtri
  const [filtri, setFiltri] = useState({
    disciplina: '',
    stato: '',
    squadra: ''
  })
  
  // Modali
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [showWPAssignModal, setShowWPAssignModal] = useState(false) // NUOVO: modale WP
  
  // Form assegnazione componente singolo
  const [assignForm, setAssignForm] = useState({
    componente_id: '',
    fase_target_id: '',
    azione: '',
    priorita: 1,
    squadra_id: '',
    istruzioni: ''
  })
  
  // Form assegnazione WP
  const [wpAssignForm, setWpAssignForm] = useState({
    work_package_id: '',
    fase_target_id: '',
    azione: '',
    priorita: 1,
    squadra_id: '',
    istruzioni: ''
  })
  
  // Selezione multipla per assegnazione bulk
  const [selectedComponentIds, setSelectedComponentIds] = useState([])
  const [bulkAssignData, setBulkAssignData] = useState({
    fase_target_id: '',
    azione: '',
    squadra_id: ''
  })
  
  // Stati attività - tradotti
  const statiAttivita = [
    { value: 'pianificato', labelKey: 'planned', color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-300' },
    { value: 'in_corso', labelKey: 'inProgress', color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-300' },
    { value: 'completato', labelKey: 'completed', color: 'bg-green-100 text-green-700', borderColor: 'border-green-300' },
    { value: 'rimandato', labelKey: 'postponed', color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-300' },
    { value: 'bloccato', labelKey: 'blocked', color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' }
  ]

  // ══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════
  
  function getCurrentWeek() {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }
  
  function getWeekDates(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dayOfWeek = simple.getDay()
    const ISOweekStart = new Date(simple)
    if (dayOfWeek <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
    }
    const ISOweekEnd = new Date(ISOweekStart)
    ISOweekEnd.setDate(ISOweekStart.getDate() + 6)
    return { start: ISOweekStart, end: ISOweekEnd }
  }
  
  function formatDate(date) {
    const locale = language === 'en' ? 'en-GB' : 'it-IT'
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
  }
  
  function isCurrentWeek(year, week) {
    return year === new Date().getFullYear() && week === getCurrentWeek()
  }
  
  function isPastWeek(year, week) {
    const currentYear = new Date().getFullYear()
    const currentWeek = getCurrentWeek()
    return year < currentYear || (year === currentYear && week < currentWeek)
  }

  // ══════════════════════════════════════════════════════════════════════
  // CARICAMENTO DATI
  // ══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (progettoId) {
      loadData()
    }
  }, [progettoId, selectedYear, selectedWeek])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: pianData },
        { data: compData },
        { data: wpData },
        { data: discData },
        { data: fasiData },
        { data: squadreData }
      ] = await Promise.all([
        // Pianificazioni della CW selezionata (include sia componenti che WP)
        supabase
          .from('pianificazione_cw')
          .select(`
            *,
            componente:componenti(
              id, codice, descrizione, stato, quantita, unita_misura,
              work_package_id,
              disciplina:discipline(id, nome, codice, icona, colore),
              tipo:tipi_componente(id, nome, icona)
            ),
            work_package:work_packages(
              id, codice, nome, descrizione,
              disciplina:discipline(id, nome, codice, icona, colore)
            ),
            fase:fasi_workflow(id, nome, icona, colore),
            squadra:squadre(id, nome),
            completato_da_persona:persone!pianificazione_cw_completato_da_fkey(nome, cognome)
          `)
          .eq('progetto_id', progettoId)
          .eq('anno', selectedYear)
          .eq('settimana', selectedWeek)
          .order('priorita'),
        // Tutti i componenti non completati (per assegnazione singola)
        // INCLUDE work_package_id per filtro
        supabase
          .from('componenti')
          .select(`
            id, codice, descrizione, stato, quantita, unita_misura,
            work_package_id,
            cw_lavoro_anno, cw_lavoro_settimana,
            disciplina:discipline(id, nome, codice, icona, colore),
            tipo:tipi_componente(id, nome, icona)
          `)
          .eq('progetto_id', progettoId)
          .neq('stato', 'completato')
          .order('codice'),
        // Work Packages attivi
        supabase
          .from('work_packages')
          .select(`
            id, codice, nome, descrizione,
            disciplina:discipline(id, nome, codice, icona, colore),
            componenti:componenti(count)
          `)
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('codice'),
        // Discipline
        supabase
          .from('discipline')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('ordine'),
        // Fasi workflow
        supabase
          .from('fasi_workflow')
          .select('*, disciplina:discipline(id, nome)')
          .eq('attivo', true)
          .order('ordine'),
        // Squadre
        supabase
          .from('squadre')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attiva', true)
      ])
      
      setPianificazioni(pianData || [])
      setComponenti(compData || [])
      setWorkPackages(wpData || [])
      setDiscipline(discData || [])
      setFasiWorkflow(fasiData || [])
      setSquadre(squadreData || [])
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // STATISTICHE E KPI
  // ══════════════════════════════════════════════════════════════════════
  
  const stats = useMemo(() => {
    const totale = pianificazioni.length
    const completate = pianificazioni.filter(p => p.stato === 'completato').length
    const inCorso = pianificazioni.filter(p => p.stato === 'in_corso').length
    const pianificate = pianificazioni.filter(p => p.stato === 'pianificato').length
    const problemi = pianificazioni.filter(p => p.ha_problema && !p.problema_risolto).length
    const bloccate = pianificazioni.filter(p => p.stato === 'bloccato').length
    
    // Conta WP vs Componenti singoli
    const wpCount = pianificazioni.filter(p => p.work_package_id).length
    const compCount = pianificazioni.filter(p => p.componente_id && !p.work_package_id).length
    
    const percentuale = totale > 0 ? Math.round((completate / totale) * 100) : 0
    
    // Per disciplina (considera sia componenti che WP)
    const byDisciplina = {}
    pianificazioni.forEach(p => {
      const discNome = p.componente?.disciplina?.nome || p.work_package?.disciplina?.nome || 'N/D'
      const colore = p.componente?.disciplina?.colore || p.work_package?.disciplina?.colore || '#6B7280'
      if (!byDisciplina[discNome]) {
        byDisciplina[discNome] = { totale: 0, completate: 0, colore }
      }
      byDisciplina[discNome].totale++
      if (p.stato === 'completato') byDisciplina[discNome].completate++
    })
    
    return { totale, completate, inCorso, pianificate, problemi, bloccate, percentuale, byDisciplina, wpCount, compCount }
  }, [pianificazioni])
  
  // Filtra attività
  const attivitaFiltrate = useMemo(() => {
    return pianificazioni.filter(p => {
      const disc = p.componente?.disciplina || p.work_package?.disciplina
      if (filtri.disciplina && disc?.id !== filtri.disciplina) return false
      if (filtri.stato && p.stato !== filtri.stato) return false
      if (filtri.squadra && p.squadra_id !== filtri.squadra) return false
      return true
    })
  }, [pianificazioni, filtri])
  
  // Raggruppa per stato (Kanban)
  const attivitaPerStato = useMemo(() => {
    const grouped = {
      pianificato: [],
      in_corso: [],
      completato: [],
      problemi: []
    }
    
    attivitaFiltrate.forEach(p => {
      if (p.ha_problema && !p.problema_risolto) {
        grouped.problemi.push(p)
      } else if (grouped[p.stato]) {
        grouped[p.stato].push(p)
      } else {
        grouped.pianificato.push(p)
      }
    })
    
    return grouped
  }, [attivitaFiltrate])
  
  // Componenti disponibili per assegnazione singola
  // ESCLUDE: componenti già assegnati in questa CW E componenti che fanno parte di un WP
  const componentiDisponibili = useMemo(() => {
    const assegnatiIds = new Set(pianificazioni.filter(p => p.componente_id).map(p => p.componente_id))
    return componenti.filter(c => 
      !assegnatiIds.has(c.id) && 
      !c.work_package_id // ESCLUDE componenti già in un WP
    )
  }, [componenti, pianificazioni])
  
  // Work Package disponibili per assegnazione
  // ESCLUDE: WP già assegnati in questa CW
  const wpDisponibili = useMemo(() => {
    const wpAssegnatiIds = new Set(pianificazioni.filter(p => p.work_package_id).map(p => p.work_package_id))
    return workPackages.filter(wp => !wpAssegnatiIds.has(wp.id))
  }, [workPackages, pianificazioni])

  // ══════════════════════════════════════════════════════════════════════
  // AZIONI
  // ══════════════════════════════════════════════════════════════════════
  
  const navigateWeek = (delta) => {
    let newWeek = selectedWeek + delta
    let newYear = selectedYear
    
    if (newWeek < 1) {
      newYear--
      newWeek = 52
    } else if (newWeek > 52) {
      newYear++
      newWeek = 1
    }
    
    setSelectedYear(newYear)
    setSelectedWeek(newWeek)
  }
  
  const goToCurrentWeek = () => {
    setSelectedYear(new Date().getFullYear())
    setSelectedWeek(getCurrentWeek())
  }
  
  const openAssignModal = () => {
    setAssignForm({
      componente_id: '',
      fase_target_id: '',
      azione: '',
      priorita: pianificazioni.length + 1,
      squadra_id: '',
      istruzioni: ''
    })
    setShowAssignModal(true)
  }
  
  const openWPAssignModal = () => {
    setWpAssignForm({
      work_package_id: '',
      fase_target_id: '',
      azione: '',
      priorita: pianificazioni.length + 1,
      squadra_id: '',
      istruzioni: ''
    })
    setShowWPAssignModal(true)
  }
  
  const openBulkAssignModal = () => {
    setSelectedComponentIds([])
    setBulkAssignData({
      fase_target_id: '',
      azione: '',
      squadra_id: ''
    })
    setShowBulkAssignModal(true)
  }
  
  // Assegna componente singolo
  const handleAssign = async () => {
    if (!assignForm.componente_id) {
      alert(t('selectComponent'))
      return
    }
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .insert({
          progetto_id: progettoId,
          componente_id: assignForm.componente_id,
          work_package_id: null, // esplicito: è un componente singolo
          anno: selectedYear,
          settimana: selectedWeek,
          fase_target_id: assignForm.fase_target_id || null,
          azione: assignForm.azione || null,
          priorita: assignForm.priorita,
          squadra_id: assignForm.squadra_id || null,
          istruzioni: assignForm.istruzioni || null,
          stato: 'pianificato',
          created_by: persona?.id
        })
      
      if (error) throw error
      
      setShowAssignModal(false)
      loadData()
    } catch (error) {
      console.error('Error assigning:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  // Assegna Work Package
  const handleWPAssign = async () => {
    if (!wpAssignForm.work_package_id) {
      alert(t('selectWorkPackage') || 'Seleziona un Work Package')
      return
    }
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .insert({
          progetto_id: progettoId,
          componente_id: null, // esplicito: è un WP, non un componente
          work_package_id: wpAssignForm.work_package_id,
          anno: selectedYear,
          settimana: selectedWeek,
          fase_target_id: wpAssignForm.fase_target_id || null,
          azione: wpAssignForm.azione || null,
          priorita: wpAssignForm.priorita,
          squadra_id: wpAssignForm.squadra_id || null,
          istruzioni: wpAssignForm.istruzioni || null,
          stato: 'pianificato',
          created_by: persona?.id
        })
      
      if (error) throw error
      
      setShowWPAssignModal(false)
      loadData()
    } catch (error) {
      console.error('Error assigning WP:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const handleBulkAssign = async () => {
    if (selectedComponentIds.length === 0) {
      alert(t('selectAtLeastOne'))
      return
    }
    
    try {
      const inserts = selectedComponentIds.map((compId, index) => ({
        progetto_id: progettoId,
        componente_id: compId,
        work_package_id: null,
        anno: selectedYear,
        settimana: selectedWeek,
        fase_target_id: bulkAssignData.fase_target_id || null,
        azione: bulkAssignData.azione || null,
        priorita: pianificazioni.length + index + 1,
        squadra_id: bulkAssignData.squadra_id || null,
        stato: 'pianificato',
        created_by: persona?.id
      }))
      
      const { error } = await supabase
        .from('pianificazione_cw')
        .insert(inserts)
      
      if (error) throw error
      
      setShowBulkAssignModal(false)
      loadData()
    } catch (error) {
      console.error('Error bulk assigning:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const openDetailModal = (activity) => {
    setSelectedActivity(activity)
    setShowDetailModal(true)
  }
  
  const updateActivityStatus = async (activityId, newStatus) => {
    try {
      const updateData = { stato: newStatus }
      
      if (newStatus === 'completato') {
        updateData.completato_il = new Date().toISOString()
        updateData.completato_da = persona?.id
      }
      
      const { error } = await supabase
        .from('pianificazione_cw')
        .update(updateData)
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
      if (showDetailModal) setShowDetailModal(false)
    } catch (error) {
      console.error('Error updating:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const reportProblem = async (activityId, description) => {
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          ha_problema: true,
          problema_descrizione: description,
          problema_segnalato_da: persona?.id,
          problema_segnalato_il: new Date().toISOString()
        })
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Error reporting:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const resolveProblem = async (activityId) => {
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          problema_risolto: true,
          problema_risolto_il: new Date().toISOString(),
          problema_risolto_da: persona?.id
        })
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
    } catch (error) {
      console.error('Error resolving:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const deleteActivity = async (activityId) => {
    if (!confirm(t('confirmRemoveActivity'))) return
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .delete()
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
      if (showDetailModal) setShowDetailModal(false)
    } catch (error) {
      console.error('Error deleting:', error)
      alert(t('error') + ': ' + error.message)
    }
  }
  
  const postponeActivity = async (activityId) => {
    try {
      let newWeek = selectedWeek + 1
      let newYear = selectedYear
      if (newWeek > 52) {
        newYear++
        newWeek = 1
      }
      
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          anno: newYear,
          settimana: newWeek,
          stato: 'rimandato'
        })
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
      if (showDetailModal) setShowDetailModal(false)
    } catch (error) {
      console.error('Error postponing:', error)
      alert(t('error') + ': ' + error.message)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  const weekDates = getWeekDates(selectedYear, selectedWeek)
  const canEdit = canAccess ? canAccess('construction') : isAtLeast('engineer')

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📅 {t('planningTitle')}</h1>
            <p className="text-gray-600 mt-1">{progetto?.nome}</p>
          </div>
          
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openWPAssignModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                📦 {t('assignWP') || 'Assegna WP'}
              </button>
              <button
                onClick={openBulkAssignModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                📋 {t('assignMultiple')}
              </button>
              <button
                onClick={openAssignModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                ➕ {t('assignToCW')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigazione CW */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ◀️
            </button>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                CW {String(selectedWeek).padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(weekDates.start)} - {formatDate(weekDates.end)} {selectedYear}
              </div>
            </div>
            
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ▶️
            </button>
            
            {!isCurrentWeek(selectedYear, selectedWeek) && (
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                {t('today')}
              </button>
            )}
          </div>
          
          {/* Quick jump */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>CW {String(w).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Indicatori */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          {isCurrentWeek(selectedYear, selectedWeek) && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              ✨ {t('currentWeek')}
            </span>
          )}
          {isPastWeek(selectedYear, selectedWeek) && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              📜 {t('pastWeek')}
            </span>
          )}
          <span className="text-sm text-gray-500">
            {stats.totale} {t('activitiesPlanned')}
          </span>
          {stats.wpCount > 0 && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
              📦 {stats.wpCount} WP
            </span>
          )}
          {stats.compCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              🔧 {stats.compCount} {t('components')}
            </span>
          )}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.totale}</div>
          <div className="text-sm text-gray-500">{t('total')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats.pianificate}</div>
          <div className="text-sm text-blue-600">{t('planned')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-yellow-600">{stats.inCorso}</div>
          <div className="text-sm text-yellow-600">{t('inProgress')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-green-600">{stats.completate}</div>
          <div className="text-sm text-green-600">{t('completed')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-red-600">{stats.problemi}</div>
          <div className="text-sm text-red-600">{t('problems')}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-gray-900">{stats.percentuale}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all" 
              style={{ width: `${stats.percentuale}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Progress per disciplina */}
      {Object.keys(stats.byDisciplina).length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">📊 {t('byDiscipline')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.byDisciplina).map(([nome, data]) => {
              const perc = data.totale > 0 ? Math.round((data.completate / data.totale) * 100) : 0
              return (
                <div key={nome} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{nome}</span>
                    <span className="text-xs text-gray-500">
                      {data.completate}/{data.totale} ({perc}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{ width: `${perc}%`, backgroundColor: data.colore }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Filtri */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={filtri.disciplina}
            onChange={e => setFiltri({...filtri, disciplina: e.target.value})}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">{t('allDisciplines')}</option>
            {discipline.map(d => (
              <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
            ))}
          </select>
          <select
            value={filtri.stato}
            onChange={e => setFiltri({...filtri, stato: e.target.value})}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">{t('allStatuses')}</option>
            {statiAttivita.map(s => (
              <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
            ))}
          </select>
          <select
            value={filtri.squadra}
            onChange={e => setFiltri({...filtri, squadra: e.target.value})}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">{t('allSquads')}</option>
            {squadre.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Colonna: Pianificato */}
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <h3 className="font-semibold text-blue-700">{t('planned')}</h3>
            <span className="ml-auto text-sm text-blue-600">{attivitaPerStato.pianificato.length}</span>
          </div>
          <div className="space-y-2">
            {attivitaPerStato.pianificato.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => openDetailModal(a)}
                onStatusChange={updateActivityStatus}
                canEdit={canEdit}
                t={t}
              />
            ))}
            {attivitaPerStato.pianificato.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">{t('noActivities')}</p>
            )}
          </div>
        </div>
        
        {/* Colonna: In Corso */}
        <div className="bg-yellow-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <h3 className="font-semibold text-yellow-700">{t('inProgress')}</h3>
            <span className="ml-auto text-sm text-yellow-600">{attivitaPerStato.in_corso.length}</span>
          </div>
          <div className="space-y-2">
            {attivitaPerStato.in_corso.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => openDetailModal(a)}
                onStatusChange={updateActivityStatus}
                canEdit={canEdit}
                t={t}
              />
            ))}
            {attivitaPerStato.in_corso.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">{t('noActivities')}</p>
            )}
          </div>
        </div>
        
        {/* Colonna: Completato */}
        <div className="bg-green-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <h3 className="font-semibold text-green-700">{t('completed')}</h3>
            <span className="ml-auto text-sm text-green-600">{attivitaPerStato.completato.length}</span>
          </div>
          <div className="space-y-2">
            {attivitaPerStato.completato.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => openDetailModal(a)}
                canEdit={canEdit}
                t={t}
              />
            ))}
            {attivitaPerStato.completato.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">{t('noActivities')}</p>
            )}
          </div>
        </div>
        
        {/* Colonna: Problemi */}
        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <h3 className="font-semibold text-red-700">⚠️ {t('problems')}</h3>
            <span className="ml-auto text-sm text-red-600">{attivitaPerStato.problemi.length}</span>
          </div>
          <div className="space-y-2">
            {attivitaPerStato.problemi.map(a => (
              <ActivityCard
                key={a.id}
                activity={a}
                onClick={() => openDetailModal(a)}
                onResolve={() => resolveProblem(a.id)}
                showProblem
                canEdit={canEdit}
                t={t}
              />
            ))}
            {attivitaPerStato.problemi.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">👍 {t('noProblems')}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Assegna componente singolo
          ══════════════════════════════════════════════════════════════════════ */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">🔧 {t('assignComponent')} - CW {selectedWeek}</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-150px)]">
              {/* Info: solo componenti senza WP */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                ℹ️ {t('onlyComponentsWithoutWP') || 'Solo componenti non appartenenti a Work Package'}
              </div>
              
              {/* Selezione componente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('component')} *</label>
                <select
                  value={assignForm.componente_id}
                  onChange={e => setAssignForm({...assignForm, componente_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('selectComponent')}</option>
                  {componentiDisponibili.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codice} - {c.descrizione || c.tipo?.nome}
                    </option>
                  ))}
                </select>
                {componentiDisponibili.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    {t('noAvailableComponents') || 'Nessun componente disponibile (tutti assegnati o in WP)'}
                  </p>
                )}
              </div>
              
              {/* Fase target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phase')}</label>
                <select
                  value={assignForm.fase_target_id}
                  onChange={e => setAssignForm({...assignForm, fase_target_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('noSpecificPhase')}</option>
                  {fasiWorkflow.map(f => (
                    <option key={f.id} value={f.id}>{f.icona} {f.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Azione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('action')}</label>
                <input
                  type="text"
                  value={assignForm.azione}
                  onChange={e => setAssignForm({...assignForm, azione: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={t('actionPlaceholder')}
                />
              </div>
              
              {/* Squadra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('squad')}</label>
                <select
                  value={assignForm.squadra_id}
                  onChange={e => setAssignForm({...assignForm, squadra_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('noSquadAssigned')}</option>
                  {squadre.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Priorità */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority')}</label>
                <input
                  type="number"
                  value={assignForm.priorita}
                  onChange={e => setAssignForm({...assignForm, priorita: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              
              {/* Istruzioni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('instructions')}</label>
                <textarea
                  value={assignForm.istruzioni}
                  onChange={e => setAssignForm({...assignForm, istruzioni: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder={t('instructionsPlaceholder')}
                />
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignForm.componente_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {t('assign')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Assegna Work Package
          ══════════════════════════════════════════════════════════════════════ */}
      {showWPAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-purple-50">
              <h2 className="text-lg font-semibold text-purple-900">📦 {t('assignWP') || 'Assegna Work Package'} - CW {selectedWeek}</h2>
              <button onClick={() => setShowWPAssignModal(false)} className="p-2 hover:bg-purple-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-150px)]">
              {/* Selezione WP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Package *</label>
                <select
                  value={wpAssignForm.work_package_id}
                  onChange={e => setWpAssignForm({...wpAssignForm, work_package_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('selectWorkPackage') || 'Seleziona Work Package'}</option>
                  {wpDisponibili.map(wp => (
                    <option key={wp.id} value={wp.id}>
                      {wp.codice} - {wp.nome} ({wp.componenti?.[0]?.count || 0} comp.)
                    </option>
                  ))}
                </select>
                {wpDisponibili.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    {t('allWPAssigned') || 'Tutti i Work Package sono già assegnati a questa CW'}
                  </p>
                )}
              </div>
              
              {/* Preview WP selezionato */}
              {wpAssignForm.work_package_id && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  {(() => {
                    const wp = workPackages.find(w => w.id === wpAssignForm.work_package_id)
                    return wp ? (
                      <div>
                        <div className="font-semibold text-purple-900">{wp.codice}</div>
                        <div className="text-sm text-purple-700">{wp.nome}</div>
                        {wp.descrizione && <div className="text-xs text-purple-600 mt-1">{wp.descrizione}</div>}
                        <div className="mt-2 text-xs text-purple-600">
                          📦 {wp.componenti?.[0]?.count || 0} {t('components')}
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
              
              {/* Fase target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phase')}</label>
                <select
                  value={wpAssignForm.fase_target_id}
                  onChange={e => setWpAssignForm({...wpAssignForm, fase_target_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('noSpecificPhase')}</option>
                  {fasiWorkflow.map(f => (
                    <option key={f.id} value={f.id}>{f.icona} {f.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Azione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('action')}</label>
                <input
                  type="text"
                  value={wpAssignForm.azione}
                  onChange={e => setWpAssignForm({...wpAssignForm, azione: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={t('actionPlaceholder')}
                />
              </div>
              
              {/* Squadra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('squad')}</label>
                <select
                  value={wpAssignForm.squadra_id}
                  onChange={e => setWpAssignForm({...wpAssignForm, squadra_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">{t('noSquadAssigned')}</option>
                  {squadre.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Priorità */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority')}</label>
                <input
                  type="number"
                  value={wpAssignForm.priorita}
                  onChange={e => setWpAssignForm({...wpAssignForm, priorita: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              
              {/* Istruzioni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('instructions')}</label>
                <textarea
                  value={wpAssignForm.istruzioni}
                  onChange={e => setWpAssignForm({...wpAssignForm, istruzioni: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder={t('instructionsPlaceholder')}
                />
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowWPAssignModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleWPAssign}
                disabled={!wpAssignForm.work_package_id}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {t('assign')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Assegna multipli (solo componenti senza WP)
          ══════════════════════════════════════════════════════════════════════ */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">📋 {t('assignMultiple')} - CW {selectedWeek}</h2>
              <button onClick={() => setShowBulkAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Info */}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4">
                ℹ️ {t('onlyComponentsWithoutWP') || 'Solo componenti non appartenenti a Work Package'}
              </div>
              
              {/* Opzioni comuni */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('phase')}</label>
                  <select
                    value={bulkAssignData.fase_target_id}
                    onChange={e => setBulkAssignData({...bulkAssignData, fase_target_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">{t('none')}</option>
                    {fasiWorkflow.map(f => (
                      <option key={f.id} value={f.id}>{f.icona} {f.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('action')}</label>
                  <input
                    type="text"
                    value={bulkAssignData.azione}
                    onChange={e => setBulkAssignData({...bulkAssignData, azione: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder={t('actionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('squad')}</label>
                  <select
                    value={bulkAssignData.squadra_id}
                    onChange={e => setBulkAssignData({...bulkAssignData, squadra_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">{t('none')}</option>
                    {squadre.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Lista componenti */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedComponentIds.length} {t('selectedOf')} {componentiDisponibili.length}
                </span>
                <button
                  onClick={() => {
                    if (selectedComponentIds.length === componentiDisponibili.length) {
                      setSelectedComponentIds([])
                    } else {
                      setSelectedComponentIds(componentiDisponibili.map(c => c.id))
                    }
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedComponentIds.length === componentiDisponibili.length ? t('deselectAll') : t('selectAll')}
                </button>
              </div>
              
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {componentiDisponibili.map(c => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedComponentIds.includes(c.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedComponentIds.includes(c.id)}
                      onChange={() => {
                        setSelectedComponentIds(prev =>
                          prev.includes(c.id) 
                            ? prev.filter(id => id !== c.id)
                            : [...prev, c.id]
                        )
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium truncate">{c.codice}</div>
                      <div className="text-xs text-gray-500 truncate">{c.descrizione || c.tipo?.nome}</div>
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                      style={{ 
                        backgroundColor: (c.disciplina?.colore || '#6B7280') + '20', 
                        color: c.disciplina?.colore || '#6B7280' 
                      }}
                    >
                      {c.disciplina?.nome}
                    </span>
                  </label>
                ))}
                {componentiDisponibili.length === 0 && (
                  <p className="p-4 text-center text-gray-500">{t('allComponentsAssigned')}</p>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedComponentIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {t('assign')} {selectedComponentIds.length} {t('components')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Dettaglio attività
          ══════════════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setShowDetailModal(false)}
          onStatusChange={updateActivityStatus}
          onDelete={deleteActivity}
          onPostpone={postponeActivity}
          onReportProblem={reportProblem}
          onResolveProblem={resolveProblem}
          canEdit={canEdit}
          fasiWorkflow={fasiWorkflow}
          squadre={squadre}
          t={t}
          language={language}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE: Activity Card (supporta sia Componenti che WP)
// ══════════════════════════════════════════════════════════════════════

function ActivityCard({ activity, onClick, onStatusChange, onResolve, showProblem, canEdit, t }) {
  const isWP = !!activity.work_package_id && !activity.componente_id
  const item = isWP ? activity.work_package : activity.componente
  const disc = item?.disciplina
  
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-3 border shadow-sm hover:shadow-md cursor-pointer transition-all ${
        isWP ? 'border-l-4 border-l-purple-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <span 
          className="text-xl w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: (disc?.colore || '#6B7280') + '20' }}
        >
          {isWP ? '📦' : (disc?.icona || '🔧')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-medium truncate">
            {isWP && <span className="text-purple-600 mr-1">[WP]</span>}
            {item?.codice}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {isWP ? item?.nome : (item?.descrizione || item?.tipo?.nome)}
          </div>
        </div>
      </div>
      
      {/* Info */}
      {activity.azione && (
        <div className="text-xs text-gray-600 mb-2 truncate">
          🔧 {activity.azione}
        </div>
      )}
      
      {activity.squadra && (
        <div className="text-xs text-gray-500 mb-2">
          👥 {activity.squadra.nome}
        </div>
      )}
      
      {/* Badge WP con conteggio componenti */}
      {isWP && activity.work_package?.componenti && (
        <div className="text-xs text-purple-600 mb-2">
          📦 {activity.work_package.componenti[0]?.count || 0} componenti
        </div>
      )}
      
      {/* Problema */}
      {showProblem && activity.ha_problema && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
          ⚠️ {activity.problema_descrizione?.slice(0, 50)}...
          {canEdit && onResolve && (
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(); }}
              className="block mt-1 text-green-600 hover:underline"
            >
              ✅ {t('markResolved')}
            </button>
          )}
        </div>
      )}
      
      {/* Quick actions */}
      {canEdit && onStatusChange && activity.stato === 'pianificato' && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(activity.id, 'in_corso'); }}
          className="mt-2 w-full text-xs py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
        >
          ▶️ {t('start')}
        </button>
      )}
      {canEdit && onStatusChange && activity.stato === 'in_corso' && (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusChange(activity.id, 'completato'); }}
          className="mt-2 w-full text-xs py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
        >
          ✅ {t('complete')}
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE: Activity Detail Modal (supporta sia Componenti che WP)
// ══════════════════════════════════════════════════════════════════════

function ActivityDetailModal({ 
  activity, 
  onClose, 
  onStatusChange, 
  onDelete, 
  onPostpone, 
  onReportProblem, 
  onResolveProblem,
  canEdit,
  fasiWorkflow,
  squadre,
  t,
  language
}) {
  const [showProblemForm, setShowProblemForm] = useState(false)
  const [problemDescription, setProblemDescription] = useState('')
  
  const isWP = !!activity.work_package_id && !activity.componente_id
  const item = isWP ? activity.work_package : activity.componente
  const disc = item?.disciplina
  const locale = language === 'en' ? 'en-GB' : 'it-IT'
  
  const handleReportProblem = () => {
    if (!problemDescription.trim()) return
    onReportProblem(activity.id, problemDescription)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isWP ? 'bg-purple-50' : ''}`}>
          <h2 className="text-lg font-semibold">
            {isWP ? '📦 Work Package' : t('details')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Item info */}
          <div className={`mb-4 p-4 rounded-xl ${isWP ? 'bg-purple-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span 
                className="text-2xl w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (disc?.colore || '#6B7280') + '20' }}
              >
                {isWP ? '📦' : (disc?.icona || '🔧')}
              </span>
              <div>
                <div className="font-mono font-bold">
                  {isWP && <span className="text-purple-600 mr-1">[WP]</span>}
                  {item?.codice}
                </div>
                <div className="text-sm text-gray-500">
                  {isWP ? item?.nome : (item?.descrizione || item?.tipo?.nome)}
                </div>
              </div>
            </div>
            
            {isWP ? (
              // Info WP
              <div className="space-y-2 text-sm">
                {item?.descrizione && (
                  <div>
                    <span className="text-gray-500">{t('description')}:</span>
                    <span className="ml-2">{item.descrizione}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">{t('discipline')}:</span>
                  <span className="ml-2">{disc?.nome || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('components')}:</span>
                  <span className="ml-2 font-semibold text-purple-600">
                    {item?.componenti?.[0]?.count || 0}
                  </span>
                </div>
              </div>
            ) : (
              // Info Componente
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">{t('discipline')}:</span>
                  <span className="ml-2">{disc?.nome}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('type')}:</span>
                  <span className="ml-2">{item?.tipo?.nome}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('quantity')}:</span>
                  <span className="ml-2">{item?.quantita} {item?.unita_misura}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('componentStatus')}:</span>
                  <span className="ml-2">{item?.stato}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Dettagli attività */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('status')}:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                activity.stato === 'completato' ? 'bg-green-100 text-green-700' :
                activity.stato === 'in_corso' ? 'bg-yellow-100 text-yellow-700' :
                activity.stato === 'bloccato' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {activity.stato}
              </span>
            </div>
            
            {activity.azione && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('action')}:</span>
                <span>{activity.azione}</span>
              </div>
            )}
            
            {activity.fase && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('phase')}:</span>
                <span>{activity.fase.icona} {activity.fase.nome}</span>
              </div>
            )}
            
            {activity.squadra && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('squad')}:</span>
                <span>👥 {activity.squadra.nome}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-500">{t('priority')}:</span>
              <span>#{activity.priorita}</span>
            </div>
            
            {activity.istruzioni && (
              <div>
                <span className="text-gray-500 block mb-1">{t('instructions')}:</span>
                <p className="text-sm bg-gray-50 p-2 rounded">{activity.istruzioni}</p>
              </div>
            )}
            
            {activity.completato_il && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('completedAt')}:</span>
                <span>{new Date(activity.completato_il).toLocaleDateString(locale)}</span>
              </div>
            )}
          </div>
          
          {/* Problema */}
          {activity.ha_problema && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-700 mb-1">⚠️ {t('problem')}</h4>
              <p className="text-sm text-red-600">{activity.problema_descrizione}</p>
              {activity.problema_risolto ? (
                <p className="text-xs text-green-600 mt-2">
                  ✅ {t('resolved')} {activity.problema_risolto_il && new Date(activity.problema_risolto_il).toLocaleDateString(locale)}
                </p>
              ) : canEdit && (
                <button
                  onClick={() => onResolveProblem(activity.id)}
                  className="mt-2 text-sm text-green-600 hover:underline"
                >
                  ✅ {t('markResolved')}
                </button>
              )}
            </div>
          )}
          
          {/* Form segnala problema */}
          {canEdit && !activity.ha_problema && (
            <div className="mt-4">
              {showProblemForm ? (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <textarea
                    value={problemDescription}
                    onChange={e => setProblemDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows="2"
                    placeholder={t('describeProblem')}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setShowProblemForm(false)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleReportProblem}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {t('report')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProblemForm(true)}
                  className="text-sm text-orange-600 hover:underline"
                >
                  ⚠️ {t('reportProblem')}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {canEdit && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {activity.stato === 'pianificato' && (
                <button
                  onClick={() => onStatusChange(activity.id, 'in_corso')}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  ▶️ {t('start')}
                </button>
              )}
              {activity.stato === 'in_corso' && (
                <button
                  onClick={() => onStatusChange(activity.id, 'completato')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  ✅ {t('complete')}
                </button>
              )}
              {activity.stato !== 'completato' && (
                <button
                  onClick={() => onPostpone(activity.id)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  ⏭️ {t('postpone')}
                </button>
              )}
              <button
                onClick={() => onDelete(activity.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ml-auto"
              >
                🗑️ {t('remove')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
