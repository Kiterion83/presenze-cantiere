import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function PianificazionePage() {
  const { progettoId, progetto, persona, isAtLeast, canAccess } = useAuth()
  
  // Dati
  const [pianificazioni, setPianificazioni] = useState([])
  const [componenti, setComponenti] = useState([])
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
  
  // Form assegnazione
  const [assignForm, setAssignForm] = useState({
    componente_id: '',
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
  
  // Stati attività
  const statiAttivita = [
    { value: 'pianificato', label: 'Pianificato', color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-300' },
    { value: 'in_corso', label: 'In Corso', color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-300' },
    { value: 'completato', label: 'Completato', color: 'bg-green-100 text-green-700', borderColor: 'border-green-300' },
    { value: 'rimandato', label: 'Rimandato', color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-300' },
    { value: 'bloccato', label: 'Bloccato', color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' }
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
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
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
        { data: discData },
        { data: fasiData },
        { data: squadreData }
      ] = await Promise.all([
        // Pianificazioni della CW selezionata
        supabase
          .from('pianificazione_cw')
          .select(`
            *,
            componente:componenti(
              id, codice, descrizione, stato, quantita, unita_misura,
              disciplina:discipline(id, nome, codice, icona, colore),
              tipo:tipi_componente(id, nome, icona)
            ),
            fase:fasi_workflow(id, nome, icona, colore),
            squadra:squadre(id, nome),
            completato_da_persona:persone!pianificazione_cw_completato_da_fkey(nome, cognome)
          `)
          .eq('progetto_id', progettoId)
          .eq('anno', selectedYear)
          .eq('settimana', selectedWeek)
          .order('priorita'),
        // Tutti i componenti non completati (per assegnazione)
        supabase
          .from('componenti')
          .select(`
            id, codice, descrizione, stato, quantita, unita_misura,
            cw_lavoro_anno, cw_lavoro_settimana,
            disciplina:discipline(id, nome, codice, icona, colore),
            tipo:tipi_componente(id, nome, icona)
          `)
          .eq('progetto_id', progettoId)
          .neq('stato', 'completato')
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
      setDiscipline(discData || [])
      setFasiWorkflow(fasiData || [])
      setSquadre(squadreData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
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
    
    const percentuale = totale > 0 ? Math.round((completate / totale) * 100) : 0
    
    // Per disciplina
    const byDisciplina = {}
    pianificazioni.forEach(p => {
      const discNome = p.componente?.disciplina?.nome || 'N/D'
      if (!byDisciplina[discNome]) {
        byDisciplina[discNome] = { totale: 0, completate: 0, colore: p.componente?.disciplina?.colore || '#6B7280' }
      }
      byDisciplina[discNome].totale++
      if (p.stato === 'completato') byDisciplina[discNome].completate++
    })
    
    return { totale, completate, inCorso, pianificate, problemi, bloccate, percentuale, byDisciplina }
  }, [pianificazioni])
  
  // Filtra attività
  const attivitaFiltrate = useMemo(() => {
    return pianificazioni.filter(p => {
      if (filtri.disciplina && p.componente?.disciplina?.id !== filtri.disciplina) return false
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
  
  // Componenti non ancora assegnati a questa CW
  const componentiDisponibili = useMemo(() => {
    const assegnatiIds = new Set(pianificazioni.map(p => p.componente_id))
    return componenti.filter(c => !assegnatiIds.has(c.id))
  }, [componenti, pianificazioni])

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
  
  const openBulkAssignModal = () => {
    setSelectedComponentIds([])
    setBulkAssignData({
      fase_target_id: '',
      azione: '',
      squadra_id: ''
    })
    setShowBulkAssignModal(true)
  }
  
  const handleAssign = async () => {
    if (!assignForm.componente_id) {
      alert('Seleziona un componente')
      return
    }
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .insert({
          progetto_id: progettoId,
          componente_id: assignForm.componente_id,
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
      console.error('Errore assegnazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const handleBulkAssign = async () => {
    if (selectedComponentIds.length === 0) {
      alert('Seleziona almeno un componente')
      return
    }
    
    try {
      const inserts = selectedComponentIds.map((compId, index) => ({
        progetto_id: progettoId,
        componente_id: compId,
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
      console.error('Errore assegnazione multipla:', error)
      alert('Errore: ' + error.message)
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
      console.error('Errore aggiornamento:', error)
      alert('Errore: ' + error.message)
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
      console.error('Errore segnalazione:', error)
      alert('Errore: ' + error.message)
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
      console.error('Errore risoluzione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const deleteActivity = async (activityId) => {
    if (!confirm('Rimuovere questa attività dalla pianificazione?')) return
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .delete()
        .eq('id', activityId)
      
      if (error) throw error
      
      loadData()
      if (showDetailModal) setShowDetailModal(false)
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const postponeActivity = async (activityId) => {
    // Sposta alla settimana successiva
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
      console.error('Errore rinvio:', error)
      alert('Errore: ' + error.message)
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
          <p className="text-gray-500">Caricamento pianificazione...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">📅 Pianificazione CW</h1>
            <p className="text-gray-600 mt-1">{progetto?.nome}</p>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={openBulkAssignModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                📦 Assegna multipli
              </button>
              <button
                onClick={openAssignModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                ➕ Assegna a CW
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
                Oggi
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
              {[2024, 2025, 2026].map(y => (
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
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          {isCurrentWeek(selectedYear, selectedWeek) && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              ✨ Settimana corrente
            </span>
          )}
          {isPastWeek(selectedYear, selectedWeek) && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              📜 Settimana passata
            </span>
          )}
          <span className="text-sm text-gray-500">
            {stats.totale} attività pianificate
          </span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.totale}</div>
          <div className="text-sm text-gray-500">Totale</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats.pianificate}</div>
          <div className="text-sm text-blue-600">Pianificate</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-yellow-600">{stats.inCorso}</div>
          <div className="text-sm text-yellow-600">In Corso</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-green-600">{stats.completate}</div>
          <div className="text-sm text-green-600">Completate</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-red-600">{stats.problemi}</div>
          <div className="text-sm text-red-600">Problemi</div>
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
          <h3 className="font-semibold text-gray-700 mb-3">📊 Progress per Disciplina</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.byDisciplina).map(([nome, data]) => {
              const perc = data.totale > 0 ? Math.round((data.completate / data.totale) * 100) : 0
              return (
                <div key={nome} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{nome}</span>
                      <span className="text-gray-500">{data.completate}/{data.totale}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ width: `${perc}%`, backgroundColor: data.colore }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{perc}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Filtri */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina</label>
            <select
              value={filtri.disciplina}
              onChange={e => setFiltri({...filtri, disciplina: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tutte</option>
              {discipline.map(d => (
                <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
            <select
              value={filtri.stato}
              onChange={e => setFiltri({...filtri, stato: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tutti</option>
              {statiAttivita.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Squadra</label>
            <select
              value={filtri.squadra}
              onChange={e => setFiltri({...filtri, squadra: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tutte</option>
              {squadre.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Colonna Pianificati */}
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-800">📋 Pianificati</h3>
            <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
              {attivitaPerStato.pianificato.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {attivitaPerStato.pianificato.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onClick={() => openDetailModal(activity)}
                onStatusChange={updateActivityStatus}
                canEdit={canEdit}
              />
            ))}
            {attivitaPerStato.pianificato.length === 0 && (
              <p className="text-sm text-blue-600 text-center py-4">Nessuna attività</p>
            )}
          </div>
        </div>
        
        {/* Colonna In Corso */}
        <div className="bg-yellow-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-yellow-800">🔄 In Corso</h3>
            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
              {attivitaPerStato.in_corso.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {attivitaPerStato.in_corso.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onClick={() => openDetailModal(activity)}
                onStatusChange={updateActivityStatus}
                canEdit={canEdit}
              />
            ))}
            {attivitaPerStato.in_corso.length === 0 && (
              <p className="text-sm text-yellow-600 text-center py-4">Nessuna attività</p>
            )}
          </div>
        </div>
        
        {/* Colonna Completati */}
        <div className="bg-green-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800">✅ Completati</h3>
            <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
              {attivitaPerStato.completato.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {attivitaPerStato.completato.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onClick={() => openDetailModal(activity)}
                canEdit={canEdit}
              />
            ))}
            {attivitaPerStato.completato.length === 0 && (
              <p className="text-sm text-green-600 text-center py-4">Nessuna attività</p>
            )}
          </div>
        </div>
        
        {/* Colonna Problemi */}
        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-red-800">⚠️ Problemi</h3>
            <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-medium">
              {attivitaPerStato.problemi.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {attivitaPerStato.problemi.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onClick={() => openDetailModal(activity)}
                onResolve={() => resolveProblem(activity.id)}
                showProblem
                canEdit={canEdit}
              />
            ))}
            {attivitaPerStato.problemi.length === 0 && (
              <p className="text-sm text-red-600 text-center py-4">Nessun problema 🎉</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Lista vuota */}
      {pianificazioni.length === 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center mt-6">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nessuna attività pianificata</h3>
          <p className="text-gray-500 mb-4">
            Questa settimana non ha ancora attività. Assegna componenti per iniziare.
          </p>
          {canEdit && (
            <button
              onClick={openAssignModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ➕ Assegna primo componente
            </button>
          )}
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Assegna singolo
          ══════════════════════════════════════════════════════════════════════ */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">➕ Assegna a CW {selectedWeek}</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              {/* Componente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Componente *</label>
                <select
                  value={assignForm.componente_id}
                  onChange={e => setAssignForm({...assignForm, componente_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona componente...</option>
                  {componentiDisponibili.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codice} - {c.descrizione || c.tipo?.nome || 'N/D'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{componentiDisponibili.length} componenti disponibili</p>
              </div>
              
              {/* Fase target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase target</label>
                <select
                  value={assignForm.fase_target_id}
                  onChange={e => setAssignForm({...assignForm, fase_target_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona fase...</option>
                  {fasiWorkflow.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.icona} {f.nome} ({f.disciplina?.nome})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Azione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azione</label>
                <input
                  type="text"
                  value={assignForm.azione}
                  onChange={e => setAssignForm({...assignForm, azione: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Es. Erection, Fit-up, Welding..."
                />
              </div>
              
              {/* Squadra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Squadra</label>
                <select
                  value={assignForm.squadra_id}
                  onChange={e => setAssignForm({...assignForm, squadra_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Nessuna squadra assegnata</option>
                  {squadre.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Priorità */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorità (ordine esecuzione)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Istruzioni</label>
                <textarea
                  value={assignForm.istruzioni}
                  onChange={e => setAssignForm({...assignForm, istruzioni: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Istruzioni specifiche per il campo..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Annulla
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assegna
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Assegna multipli
          ══════════════════════════════════════════════════════════════════════ */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">📦 Assegna multipli a CW {selectedWeek}</h2>
              <button onClick={() => setShowBulkAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Opzioni comuni */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fase target</label>
                  <select
                    value={bulkAssignData.fase_target_id}
                    onChange={e => setBulkAssignData({...bulkAssignData, fase_target_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Nessuna</option>
                    {fasiWorkflow.map(f => (
                      <option key={f.id} value={f.id}>{f.icona} {f.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Azione</label>
                  <input
                    type="text"
                    value={bulkAssignData.azione}
                    onChange={e => setBulkAssignData({...bulkAssignData, azione: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Es. Erection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Squadra</label>
                  <select
                    value={bulkAssignData.squadra_id}
                    onChange={e => setBulkAssignData({...bulkAssignData, squadra_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Nessuna</option>
                    {squadre.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Lista componenti */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedComponentIds.length} selezionati di {componentiDisponibili.length}
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
                  {selectedComponentIds.length === componentiDisponibili.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
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
                  <p className="p-4 text-center text-gray-500">Tutti i componenti sono già assegnati</p>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Annulla
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedComponentIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assegna {selectedComponentIds.length} componenti
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
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTI HELPER
// ══════════════════════════════════════════════════════════════════════

function ActivityCard({ activity, onClick, onStatusChange, onResolve, showProblem, canEdit }) {
  const comp = activity.componente
  
  return (
    <div 
      className="bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-medium truncate">{comp?.codice}</div>
          <div className="text-xs text-gray-500 truncate">{comp?.descrizione || comp?.tipo?.nome}</div>
        </div>
        <span 
          className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ 
            backgroundColor: (comp?.disciplina?.colore || '#6B7280') + '20', 
            color: comp?.disciplina?.colore || '#6B7280' 
          }}
        >
          {comp?.disciplina?.icona}
        </span>
      </div>
      
      {activity.azione && (
        <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mb-2">
          {activity.azione}
        </div>
      )}
      
      {activity.squadra && (
        <div className="text-xs text-gray-500 mb-2">
          👥 {activity.squadra.nome}
        </div>
      )}
      
      {showProblem && activity.problema_descrizione && (
        <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mb-2">
          ⚠️ {activity.problema_descrizione}
        </div>
      )}
      
      {/* Quick actions */}
      {canEdit && activity.stato !== 'completato' && !showProblem && (
        <div className="flex gap-1 mt-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
          {activity.stato === 'pianificato' && (
            <button
              onClick={() => onStatusChange(activity.id, 'in_corso')}
              className="flex-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              ▶️ Inizia
            </button>
          )}
          {activity.stato === 'in_corso' && (
            <button
              onClick={() => onStatusChange(activity.id, 'completato')}
              className="flex-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              ✅ Completa
            </button>
          )}
        </div>
      )}
      
      {showProblem && canEdit && (
        <div className="mt-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
          <button
            onClick={onResolve}
            className="w-full text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            ✅ Problema risolto
          </button>
        </div>
      )}
    </div>
  )
}

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
  squadre
}) {
  const [problemDescription, setProblemDescription] = useState('')
  const [showProblemForm, setShowProblemForm] = useState(false)
  const comp = activity.componente
  
  const handleReportProblem = () => {
    if (!problemDescription.trim()) {
      alert('Descrivi il problema')
      return
    }
    onReportProblem(activity.id, problemDescription)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">📋 Dettaglio Attività</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Componente */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span 
                className="text-2xl w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (comp?.disciplina?.colore || '#6B7280') + '20' }}
              >
                {comp?.disciplina?.icona || '📦'}
              </span>
              <div>
                <div className="font-mono font-bold">{comp?.codice}</div>
                <div className="text-sm text-gray-500">{comp?.descrizione || comp?.tipo?.nome}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Disciplina:</span>
                <span className="ml-2">{comp?.disciplina?.nome}</span>
              </div>
              <div>
                <span className="text-gray-500">Tipo:</span>
                <span className="ml-2">{comp?.tipo?.nome}</span>
              </div>
              <div>
                <span className="text-gray-500">Quantità:</span>
                <span className="ml-2">{comp?.quantita} {comp?.unita_misura}</span>
              </div>
              <div>
                <span className="text-gray-500">Stato comp.:</span>
                <span className="ml-2">{comp?.stato}</span>
              </div>
            </div>
          </div>
          
          {/* Dettagli attività */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Stato:</span>
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
                <span className="text-gray-500">Azione:</span>
                <span>{activity.azione}</span>
              </div>
            )}
            
            {activity.fase && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fase target:</span>
                <span>{activity.fase.icona} {activity.fase.nome}</span>
              </div>
            )}
            
            {activity.squadra && (
              <div className="flex justify-between">
                <span className="text-gray-500">Squadra:</span>
                <span>👥 {activity.squadra.nome}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-500">Priorità:</span>
              <span>#{activity.priorita}</span>
            </div>
            
            {activity.istruzioni && (
              <div>
                <span className="text-gray-500 block mb-1">Istruzioni:</span>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                  {activity.istruzioni}
                </div>
              </div>
            )}
            
            {activity.completato_il && (
              <div className="flex justify-between">
                <span className="text-gray-500">Completato:</span>
                <span>{new Date(activity.completato_il).toLocaleString('it-IT')}</span>
              </div>
            )}
            
            {activity.completato_da_persona && (
              <div className="flex justify-between">
                <span className="text-gray-500">Completato da:</span>
                <span>{activity.completato_da_persona.nome} {activity.completato_da_persona.cognome}</span>
              </div>
            )}
          </div>
          
          {/* Problema */}
          {activity.ha_problema && (
            <div className={`mt-4 p-4 rounded-lg ${activity.problema_risolto ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${activity.problema_risolto ? 'text-green-700' : 'text-red-700'}`}>
                  {activity.problema_risolto ? '✅ Problema risolto' : '⚠️ Problema segnalato'}
                </span>
              </div>
              <p className="text-sm text-gray-700">{activity.problema_descrizione}</p>
              {activity.problema_segnalato_il && (
                <p className="text-xs text-gray-500 mt-2">
                  Segnalato: {new Date(activity.problema_segnalato_il).toLocaleString('it-IT')}
                </p>
              )}
              {!activity.problema_risolto && canEdit && (
                <button
                  onClick={() => onResolveProblem(activity.id)}
                  className="mt-2 w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  ✅ Segna come risolto
                </button>
              )}
            </div>
          )}
          
          {/* Form segnalazione problema */}
          {showProblemForm && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">⚠️ Segnala problema</h4>
              <textarea
                value={problemDescription}
                onChange={e => setProblemDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows="3"
                placeholder="Descrivi il problema..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowProblemForm(false)}
                  className="flex-1 px-3 py-2 border rounded-lg hover:bg-white text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleReportProblem}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Segnala
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Azioni */}
        {canEdit && (
          <div className="p-4 border-t bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {activity.stato === 'pianificato' && (
                <button
                  onClick={() => onStatusChange(activity.id, 'in_corso')}
                  className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                >
                  ▶️ Inizia
                </button>
              )}
              {activity.stato === 'in_corso' && (
                <button
                  onClick={() => onStatusChange(activity.id, 'completato')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  ✅ Completa
                </button>
              )}
              {activity.stato !== 'completato' && (
                <button
                  onClick={() => onPostpone(activity.id)}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                >
                  📅 Rimanda a CW+1
                </button>
              )}
              {!activity.ha_problema && activity.stato !== 'completato' && (
                <button
                  onClick={() => setShowProblemForm(true)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  ⚠️ Segnala problema
                </button>
              )}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => onDelete(activity.id)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                🗑️ Rimuovi
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
