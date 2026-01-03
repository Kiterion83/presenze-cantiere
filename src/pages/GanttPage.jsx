import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function GanttPage() {
  const { progetto } = useAuth()
  const { t } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('weeks') // weeks, months
  const [showCompleted, setShowCompleted] = useState(true)
  
  // Dati
  const [workPackages, setWorkPackages] = useState([])
  const [testPackages, setTestPackages] = useState([]) // NUOVO
  const [pianificazioni, setPianificazioni] = useState([])
  
  // Range date
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  // Modal CW Detail
  const [selectedCW, setSelectedCW] = useState(null)
  const [cwSearch, setCwSearch] = useState('')
  
  // Filtro vista
  const [viewFilter, setViewFilter] = useState('all') // all, wp, tp
  
  // Scroll ref
  const ganttRef = useRef(null)

  // === FUNZIONI HELPER (definite prima dell'uso) ===
  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  }

  function isCurrentWeek(date) {
    const now = new Date()
    const currentWeek = getWeekNumber(now)
    const checkWeek = getWeekNumber(date)
    return currentWeek === checkWeek && now.getFullYear() === date.getFullYear()
  }
  
  function getCurrentWeek() {
    return getWeekNumber(new Date())
  }
  
  function getCurrentYear() {
    return new Date().getFullYear()
  }

  // Carica dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)

    try {
      // Work Packages con disciplina
      const { data: wpData } = await supabase
        .from('work_packages')
        .select(`
          *,
          disciplina:discipline(id, nome, colore, icona),
          squadra:squadre(id, nome),
          foreman:persone!work_packages_foreman_id_fkey(id, nome, cognome)
        `)
        .eq('progetto_id', progetto.id)
        .order('data_inizio_pianificata')

      setWorkPackages(wpData || [])

      // NUOVO: Test Packages con disciplina
      const { data: tpData } = await supabase
        .from('test_packages')
        .select(`
          *,
          disciplina:discipline(id, nome, colore, icona),
          squadra:squadre(id, nome),
          foreman:persone!test_packages_foreman_id_fkey(id, nome, cognome),
          fase_corrente:test_package_fasi(id, nome, codice, icona, colore, ordine)
        `)
        .eq('progetto_id', progetto.id)
        .order('data_inizio_pianificata')

      setTestPackages(tpData || [])

      // Pianificazioni CW con componenti, work_packages E test_packages
      const { data: pianData } = await supabase
        .from('pianificazione_cw')
        .select(`
          *,
          componente:componenti(
            id, codice, descrizione, stato,
            disciplina:discipline(id, nome, colore, icona)
          ),
          work_package:work_packages(
            id, codice, nome, descrizione, colore,
            disciplina:discipline(id, nome, colore, icona),
            squadra:squadre(id, nome),
            foreman:persone!work_packages_foreman_id_fkey(id, nome, cognome)
          ),
          test_package:test_packages(
            id, codice, nome, descrizione, tipo, colore, stato,
            pressione_test, durata_holding_minuti,
            disciplina:discipline(id, nome, colore, icona),
            squadra:squadre(id, nome),
            foreman:persone!test_packages_foreman_id_fkey(id, nome, cognome)
          ),
          squadra:squadre(id, nome),
          fase:fasi_workflow(id, nome, icona, colore)
        `)
        .eq('progetto_id', progetto.id)
        .order('anno')
        .order('settimana')

      setPianificazioni(pianData || [])

      // Calcola range date
      const oggi = new Date()
      const inizio = new Date(progetto.data_inizio || oggi)
      inizio.setDate(1) // Primo del mese
      inizio.setMonth(inizio.getMonth() - 1) // Un mese prima
      
      const fine = new Date(progetto.data_fine_prevista || oggi)
      fine.setMonth(fine.getMonth() + 3)
      
      setDateRange({ start: inizio, end: fine })

    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }, [progetto?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Genera settimane per il range
  const weeks = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return []
    
    const result = []
    const current = new Date(dateRange.start)
    
    while (current <= dateRange.end) {
      const weekStart = new Date(current)
      const weekNum = getWeekNumber(current)
      const year = current.getFullYear()
      
      result.push({
        year,
        week: weekNum,
        start: new Date(weekStart),
        label: `CW${weekNum}`,
        month: current.toLocaleString('it-IT', { month: 'short' }),
        isCurrentWeek: isCurrentWeek(current)
      })
      
      current.setDate(current.getDate() + 7)
    }
    
    return result
  }, [dateRange])

  // Genera mesi per header
  const months = useMemo(() => {
    if (!weeks.length) return []
    
    const monthMap = {}
    weeks.forEach((w, i) => {
      const key = `${w.year}-${w.start.getMonth()}`
      if (!monthMap[key]) {
        monthMap[key] = {
          label: w.start.toLocaleString('it-IT', { month: 'long', year: 'numeric' }),
          startIndex: i,
          count: 0
        }
      }
      monthMap[key].count++
    })
    
    return Object.values(monthMap)
  }, [weeks])

  // Raggruppa pianificazioni per disciplina - AGGIORNATO con Test Packages
  const ganttRows = useMemo(() => {
    const byDiscipline = {}
    
    // Filtra in base a viewFilter
    const filteredPian = pianificazioni.filter(p => {
      if (viewFilter === 'all') return true
      if (viewFilter === 'wp') return p.work_package_id && !p.test_package_id
      if (viewFilter === 'tp') return p.test_package_id
      return true
    })
    
    filteredPian.forEach(p => {
      // Determina se è un WP, TP o un componente
      const isWP = p.work_package_id && !p.componente_id && !p.test_package_id
      const isTP = p.test_package_id
      const item = isTP ? p.test_package : (isWP ? p.work_package : p.componente)
      
      // Disciplina dal TP, WP o dal componente
      const disc = item?.disciplina?.nome || 'Senza Disciplina'
      const color = item?.disciplina?.colore || '#6B7280'
      const icona = item?.disciplina?.icona || '📦'
      
      if (!byDiscipline[disc]) {
        byDiscipline[disc] = {
          name: disc,
          color,
          icona,
          items: [],
          expanded: true
        }
      }
      
      // Determina tipo e icona
      let tipo = 'COMP'
      let tipoIcona = '🔩'
      if (isTP) {
        tipo = 'TP'
        tipoIcona = getTipoTestIcon(p.test_package?.tipo)
      } else if (isWP) {
        tipo = 'WP'
        tipoIcona = '📦'
      }
      
      byDiscipline[disc].items.push({
        id: p.id,
        tipo,
        tipoIcona,
        codice: isTP ? p.test_package?.codice : (isWP ? p.work_package?.codice : p.componente?.codice),
        nome: isTP ? p.test_package?.nome : (isWP ? p.work_package?.nome : p.componente?.descrizione),
        descrizione: isTP ? p.test_package?.descrizione : (isWP ? p.work_package?.descrizione : p.componente?.descrizione),
        stato: p.stato || 'pianificato',
        statoTP: isTP ? p.test_package?.stato : null,
        anno: p.anno,
        settimana: p.settimana,
        azione: p.azione,
        priorita: p.priorita,
        squadra: isTP ? p.test_package?.squadra?.nome : (isWP ? p.work_package?.squadra?.nome : p.squadra?.nome),
        foreman: isTP 
          ? (p.test_package?.foreman ? `${p.test_package.foreman.nome} ${p.test_package.foreman.cognome}` : null)
          : (isWP ? (p.work_package?.foreman ? `${p.work_package.foreman.nome} ${p.work_package.foreman.cognome}` : null) : null),
        fase: p.fase,
        work_package: p.work_package,
        test_package: p.test_package,
        componente: p.componente,
        colore: isTP ? (p.test_package?.colore || '#8B5CF6') : (isWP ? (p.work_package?.colore || '#3B82F6') : null),
        // Info extra per TP
        pressione_test: isTP ? p.test_package?.pressione_test : null,
        durata_holding: isTP ? p.test_package?.durata_holding_minuti : null
      })
    })
    
    return Object.values(byDiscipline).sort((a, b) => a.name.localeCompare(b.name))
  }, [pianificazioni, viewFilter])

  // Helper per icona tipo test
  const getTipoTestIcon = (tipo) => {
    const icons = {
      hydrotest: '💧',
      pneumatic: '💨',
      leak_test: '🔍',
      functional: '⚙️',
      electrical: '⚡',
      loop_check: '🔄',
      cleaning: '🧹',
      drying: '☀️'
    }
    return icons[tipo] || '🧪'
  }

  // Attività per una specifica CW (per il modal) - AGGIORNATO con TP
  const getActivitiesForCW = (year, week) => {
    return pianificazioni.filter(p => p.anno === year && p.settimana === week).map(p => {
      const isWP = p.work_package_id && !p.componente_id && !p.test_package_id
      const isTP = p.test_package_id
      const item = isTP ? p.test_package : (isWP ? p.work_package : p.componente)
      
      let tipo = 'COMP'
      if (isTP) tipo = 'TP'
      else if (isWP) tipo = 'WP'
      
      return {
        id: p.id,
        tipo,
        tipoIcona: isTP ? getTipoTestIcon(p.test_package?.tipo) : (isWP ? '📦' : '🔩'),
        codice: isTP ? p.test_package?.codice : (isWP ? p.work_package?.codice : p.componente?.codice),
        nome: isTP ? p.test_package?.nome : (isWP ? p.work_package?.nome : p.componente?.descrizione),
        stato: p.stato,
        statoTP: isTP ? p.test_package?.stato : null,
        disciplina: item?.disciplina,
        squadra: isTP ? p.test_package?.squadra?.nome : (isWP ? p.work_package?.squadra?.nome : p.squadra?.nome),
        foreman: isTP 
          ? (p.test_package?.foreman ? `${p.test_package.foreman.nome} ${p.test_package.foreman.cognome}` : null)
          : (isWP ? (p.work_package?.foreman ? `${p.work_package.foreman.nome} ${p.work_package.foreman.cognome}` : null) : null),
        fase: p.fase,
        priorita: p.priorita,
        azione: p.azione,
        colore: isTP ? (p.test_package?.colore || '#8B5CF6') : (isWP ? (p.work_package?.colore || '#3B82F6') : null),
        pressione_test: isTP ? p.test_package?.pressione_test : null,
        tipo_test: isTP ? p.test_package?.tipo : null
      }
    })
  }

  // Scroll to today
  const scrollToToday = () => {
    const currentWeekIndex = weeks.findIndex(w => w.isCurrentWeek)
    if (currentWeekIndex >= 0 && ganttRef.current) {
      const scrollPos = Math.max(0, currentWeekIndex * 60 - 200)
      ganttRef.current.scrollLeft = scrollPos
    }
  }

  useEffect(() => {
    if (weeks.length > 0) {
      setTimeout(scrollToToday, 100)
    }
  }, [weeks])

  // Colori stato
  const getStatusColor = (stato) => {
    switch (stato) {
      case 'completato': return 'bg-green-500'
      case 'passed': return 'bg-green-500'
      case 'in_corso': return 'bg-blue-500'
      case 'in_progress': return 'bg-blue-500'
      case 'holding': return 'bg-purple-500'
      case 'al_site': return 'bg-purple-500'
      case 'ready': return 'bg-indigo-500'
      case 'in_warehouse': return 'bg-amber-500'
      case 'planned': return 'bg-cyan-500'
      case 'pianificato': return 'bg-gray-400'
      case 'draft': return 'bg-gray-300'
      case 'failed': return 'bg-red-500'
      case 'da_ordinare': return 'bg-red-400'
      default: return 'bg-gray-400'
    }
  }
  
  // Badge per tipo TP
  const getTPBadgeColor = (tipo) => {
    switch (tipo) {
      case 'TP': return 'bg-purple-100 text-purple-700'
      case 'WP': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Empty state
  if (ganttRows.length === 0 && workPackages.length === 0 && testPackages.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📊 Gantt Chart
            </h1>
            <p className="text-gray-500">{progetto?.nome}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna attività pianificata</h3>
          <p className="text-gray-500">Vai alla sezione Pianificazione per assegnare attività alle settimane</p>
        </div>
      </div>
    )
  }

  const currentWeekIndex = weeks.findIndex(w => w.isCurrentWeek)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📊 Gantt Chart
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* NUOVO: Filtro Vista */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tutti
            </button>
            <button
              onClick={() => setViewFilter('wp')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'wp' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 WP
            </button>
            <button
              onClick={() => setViewFilter('tp')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'tp' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💧 TP
            </button>
          </div>
          
          <button
            onClick={scrollToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            📍 Oggi
          </button>
          
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Mostra completati
          </label>
        </div>
      </div>

      {/* Stats Cards - AGGIORNATO con TP */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-800">{workPackages.length}</p>
          <p className="text-sm text-gray-500">📦 Work Packages</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-purple-600">{testPackages.length}</p>
          <p className="text-sm text-gray-500">💧 Test Packages</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">{pianificazioni.length}</p>
          <p className="text-sm text-gray-500">📅 Pianificazioni</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">
            {pianificazioni.filter(p => p.stato === 'completato').length}
          </p>
          <p className="text-sm text-gray-500">✅ Completate</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-amber-600">
            {testPackages.filter(tp => tp.stato === 'passed').length}
          </p>
          <p className="text-sm text-gray-500">🏆 Test Superati</p>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {/* Legend */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Legenda:</span>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">WP</span>
            <span className="text-xs text-gray-500">Work Package</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">TP</span>
            <span className="text-xs text-gray-500">Test Package</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">COMP</span>
            <span className="text-xs text-gray-500">Componente</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-xs text-gray-500">Completato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-500">In corso</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-xs text-gray-500">Holding</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span className="text-xs text-gray-500">Pianificato</span>
            </div>
          </div>
        </div>
        
        {/* Gantt Body */}
        <div ref={ganttRef} className="overflow-x-auto">
          <div style={{ minWidth: `${weeks.length * 60 + 300}px` }}>
            {/* Header - Months */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-10">
              <div className="w-[300px] flex-shrink-0 p-3 font-medium text-gray-600 border-r">
                Attività
              </div>
              <div className="flex">
                {months.map((month, idx) => (
                  <div 
                    key={idx}
                    className="text-center py-2 px-1 border-r border-gray-200 text-sm font-medium text-gray-600 capitalize"
                    style={{ width: `${month.count * 60}px` }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Header - Weeks */}
            <div className="flex border-b sticky top-[44px] z-10 bg-white">
              <div className="w-[300px] flex-shrink-0 p-2 text-sm text-gray-500 border-r">
                {ganttRows.reduce((acc, d) => acc + d.items.length, 0)} attività
              </div>
              <div className="flex">
                {weeks.map((week, idx) => (
                  <div 
                    key={idx}
                    className={`w-[60px] text-center py-2 text-xs border-r cursor-pointer transition-colors ${
                      week.isCurrentWeek 
                        ? 'bg-blue-100 text-blue-700 font-bold' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => { setSelectedCW(week); setCwSearch('') }}
                    title={`Clicca per dettagli CW${week.week}`}
                  >
                    <div className="font-medium">{week.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows by Discipline */}
            {ganttRows.map((discipline, dIdx) => (
              <div key={dIdx} className="border-b last:border-b-0">
                {/* Discipline Header */}
                <div 
                  className="flex items-center p-3 bg-gray-50 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    const newRows = [...ganttRows]
                    newRows[dIdx].expanded = !newRows[dIdx].expanded
                  }}
                >
                  <span className="mr-2">{discipline.icona}</span>
                  <span 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: discipline.color }}
                  ></span>
                  <span>{discipline.name}</span>
                  <span className="ml-2 text-gray-400 text-sm">({discipline.items.length})</span>
                </div>

                {/* Items */}
                {discipline.expanded !== false && discipline.items
                  .filter(item => showCompleted || (item.stato !== 'completato' && item.statoTP !== 'passed'))
                  .map((item, iIdx) => {
                    const weekIndex = weeks.findIndex(w => w.year === item.anno && w.week === item.settimana)
                    
                    return (
                      <div key={iIdx} className="flex border-t border-gray-100 hover:bg-gray-50">
                        {/* Item label */}
                        <div className="w-[300px] flex-shrink-0 p-2 border-r flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getTPBadgeColor(item.tipo)}`}>
                            {item.tipoIcona}
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-700 truncate">
                            {item.codice}
                          </span>
                          {item.nome && (
                            <span className="text-xs text-gray-400 truncate hidden lg:inline">
                              {item.nome.substring(0, 20)}...
                            </span>
                          )}
                          {item.pressione_test && (
                            <span className="text-xs text-purple-500 ml-auto">
                              {item.pressione_test} bar
                            </span>
                          )}
                        </div>
                        
                        {/* Timeline */}
                        <div className="flex relative">
                          {weeks.map((week, wIdx) => {
                            const isActive = wIdx === weekIndex
                            const isCurrent = week.isCurrentWeek
                            
                            return (
                              <div 
                                key={wIdx}
                                className={`w-[60px] h-10 border-r border-gray-100 relative ${
                                  isCurrent ? 'bg-blue-50' : ''
                                }`}
                              >
                                {isActive && (
                                  <div 
                                    className={`absolute inset-1 rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                                      item.tipo === 'TP' 
                                        ? getStatusColor(item.statoTP || item.stato)
                                        : getStatusColor(item.stato)
                                    }`}
                                    style={item.colore && !['completato', 'passed', 'failed'].includes(item.stato) && !['completato', 'passed', 'failed'].includes(item.statoTP) ? {
                                      backgroundColor: item.colore
                                    } : {}}
                                    title={`${item.codice} - ${item.nome || ''}\nStato: ${item.statoTP || item.stato}`}
                                  >
                                    {item.tipo === 'TP' ? item.tipoIcona : (item.stato === 'completato' ? '✓' : '')}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          
                          {/* Current week indicator line */}
                          {currentWeekIndex >= 0 && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                              style={{ left: `${currentWeekIndex * 60 + 30}px` }}
                            ></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work Packages Summary */}
      {workPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📦 Work Packages ({workPackages.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workPackages.map((wp, idx) => {
              // Calcola progresso reale
              const wpPianificazioni = pianificazioni.filter(p => p.work_package_id === wp.id)
              const completati = wpPianificazioni.filter(p => p.stato === 'completato').length
              const progress = wpPianificazioni.length > 0 ? Math.round((completati / wpPianificazioni.length) * 100) : 0
              
              return (
                <div key={idx} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-bold text-blue-600">{wp.codice}</span>
                      <p className="text-sm text-gray-600 mt-0.5">{wp.nome}</p>
                    </div>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: (wp.disciplina?.colore || '#6B7280') + '20',
                        color: wp.disciplina?.colore || '#6B7280'
                      }}
                    >
                      {wp.disciplina?.nome || 'N/D'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2 space-y-1">
                    {wp.squadra && <div>👥 {wp.squadra.nome}</div
