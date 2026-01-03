import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function GanttPage() {
  const { progetto } = useAuth()
  const { t } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  
  // Dati
  const [workPackages, setWorkPackages] = useState([])
  const [testPackages, setTestPackages] = useState([])
  const [pianificazioni, setPianificazioni] = useState([])
  
  // Range date - NUOVO: controlli flessibili
  const [rangePreset, setRangePreset] = useState('6months') // 3months, 6months, 1year, custom
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  // Modal CW Detail
  const [selectedCW, setSelectedCW] = useState(null)
  const [cwSearch, setCwSearch] = useState('')
  
  // Filtro vista
  const [viewFilter, setViewFilter] = useState('all') // all, wp, tp
  
  // Sezioni collassabili
  const [showWPSection, setShowWPSection] = useState(false)
  const [showTPSection, setShowTPSection] = useState(false)
  
  // Scroll ref
  const ganttRef = useRef(null)

  // === FUNZIONI HELPER ===
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

  // Calcola range basato su preset
  const calculateDateRange = useCallback(() => {
    const oggi = new Date()
    let start, end
    
    switch (rangePreset) {
      case '3months':
        start = new Date(oggi)
        start.setMonth(start.getMonth() - 1)
        end = new Date(oggi)
        end.setMonth(end.getMonth() + 2)
        break
      case '6months':
        start = new Date(oggi)
        start.setMonth(start.getMonth() - 2)
        end = new Date(oggi)
        end.setMonth(end.getMonth() + 4)
        break
      case '1year':
        start = new Date(oggi)
        start.setMonth(start.getMonth() - 3)
        end = new Date(oggi)
        end.setMonth(end.getMonth() + 9)
        break
      case 'project':
        start = progetto?.data_inizio ? new Date(progetto.data_inizio) : new Date(oggi)
        start.setMonth(start.getMonth() - 1)
        end = progetto?.data_fine_prevista ? new Date(progetto.data_fine_prevista) : new Date(oggi)
        end.setMonth(end.getMonth() + 1)
        break
      case 'lastyear':
        start = new Date(oggi.getFullYear() - 1, 0, 1) // 1 Jan anno scorso
        end = new Date(oggi) // oggi
        break
      case 'custom':
        start = customRange.startDate ? new Date(customRange.startDate) : new Date(oggi)
        end = customRange.endDate ? new Date(customRange.endDate) : new Date(oggi)
        end.setMonth(end.getMonth() + 6)
        break
      default:
        start = new Date(oggi)
        start.setMonth(start.getMonth() - 2)
        end = new Date(oggi)
        end.setMonth(end.getMonth() + 4)
    }
    
    // Imposta al primo del mese per start
    start.setDate(1)
    
    setDateRange({ start, end })
  }, [rangePreset, customRange, progetto])

  useEffect(() => {
    calculateDateRange()
  }, [calculateDateRange])

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

      // Test Packages con disciplina
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

      console.log('Pianificazioni caricate:', pianData?.length, pianData?.filter(p => p.test_package_id))
      setPianificazioni(pianData || [])

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

  // Raggruppa pianificazioni per disciplina - CON FIX PER TP
  const ganttRows = useMemo(() => {
    const byDiscipline = {}
    
    // Filtra in base a viewFilter
    const filteredPian = pianificazioni.filter(p => {
      if (viewFilter === 'all') return true
      if (viewFilter === 'wp') return p.work_package_id && !p.test_package_id && !p.componente_id
      if (viewFilter === 'tp') return p.test_package_id
      return true
    })
    
    console.log('Filtrate per', viewFilter, ':', filteredPian.length)
    
    filteredPian.forEach(p => {
      // Determina se è un WP, TP o un componente
      const isTP = !!p.test_package_id
      const isWP = !!p.work_package_id && !p.componente_id && !p.test_package_id
      const item = isTP ? p.test_package : (isWP ? p.work_package : p.componente)
      
      if (!item) {
        console.log('Item null per pianificazione:', p.id, 'TP:', p.test_package_id, 'WP:', p.work_package_id)
        return // Skip se non c'è item
      }
      
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
        codice: item?.codice || 'N/D',
        nome: isTP ? item?.nome : (isWP ? item?.nome : item?.descrizione),
        descrizione: item?.descrizione,
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
        colore: isTP ? (p.test_package?.colore || '#06B6D4') : (isWP ? (p.work_package?.colore || '#3B82F6') : null),
        // Info extra per TP
        pressione_test: isTP ? p.test_package?.pressione_test : null,
        durata_holding: isTP ? p.test_package?.durata_holding_minuti : null
      })
    })
    
    return Object.values(byDiscipline).sort((a, b) => a.name.localeCompare(b.name))
  }, [pianificazioni, viewFilter])

  // Attività per una specifica CW (per il modal)
  const getActivitiesForCW = (year, week) => {
    return pianificazioni.filter(p => p.anno === year && p.settimana === week).map(p => {
      const isTP = !!p.test_package_id
      const isWP = !!p.work_package_id && !p.componente_id && !p.test_package_id
      const item = isTP ? p.test_package : (isWP ? p.work_package : p.componente)
      
      let tipo = 'COMP'
      if (isTP) tipo = 'TP'
      else if (isWP) tipo = 'WP'
      
      return {
        id: p.id,
        tipo,
        tipoIcona: isTP ? getTipoTestIcon(p.test_package?.tipo) : (isWP ? '📦' : '🔩'),
        codice: item?.codice || 'N/D',
        nome: isTP ? item?.nome : (isWP ? item?.nome : item?.descrizione),
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
        colore: isTP ? (p.test_package?.colore || '#06B6D4') : (isWP ? (p.work_package?.colore || '#3B82F6') : null),
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
  
  // Badge per tipo
  const getTPBadgeColor = (tipo) => {
    switch (tipo) {
      case 'TP': return 'bg-cyan-100 text-cyan-700'
      case 'WP': return 'bg-purple-100 text-purple-700'
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
          {/* Filtro Vista */}
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
                viewFilter === 'wp' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 WP
            </button>
            <button
              onClick={() => setViewFilter('tp')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewFilter === 'tp' ? 'bg-white shadow text-cyan-600' : 'text-gray-500 hover:text-gray-700'
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

      {/* NUOVO: Controllo Range Date */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">📅 Vista:</span>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="3months">3 Mesi</option>
              <option value="6months">6 Mesi</option>
              <option value="1year">1 Anno</option>
              <option value="project">Durata Progetto</option>
              <option value="lastyear">Anno Scorso → Oggi</option>
              <option value="custom">Personalizzato</option>
            </select>
          </div>
          
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Da:</span>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange({...customRange, startDate: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <span className="text-sm text-gray-500">A:</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange({...customRange, endDate: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          )}
          
          <div className="ml-auto text-sm text-gray-500">
            {dateRange.start && dateRange.end && (
              <span>
                {dateRange.start.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })} 
                {' → '}
                {dateRange.end.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}
                {' • '}{weeks.length} settimane
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-800">{workPackages.length}</p>
          <p className="text-sm text-gray-500">📦 Work Packages</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-cyan-600">{testPackages.length}</p>
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

      {/* Empty state per Gantt */}
      {ganttRows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {viewFilter === 'tp' ? 'Nessun Test Package pianificato' : 
             viewFilter === 'wp' ? 'Nessun Work Package pianificato' :
             'Nessuna attività pianificata'}
          </h3>
          <p className="text-gray-500">
            Vai alla sezione Pianificazione per assegnare {viewFilter === 'tp' ? 'Test Packages' : 'attività'} alle settimane
          </p>
          {pianificazioni.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              (Ci sono {pianificazioni.length} pianificazioni totali, di cui {pianificazioni.filter(p => p.test_package_id).length} Test Packages)
            </p>
          )}
        </div>
      ) : (
        /* Gantt Chart */
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {/* Legend */}
          <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Legenda:</span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">📦 WP</span>
              <span className="text-xs text-gray-500">Work Package</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-700">💧 TP</span>
              <span className="text-xs text-gray-500">Test Package</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">🔩 COMP</span>
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
                <div className="w-3 h-3 bg-cyan-500 rounded"></div>
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
                  {discipline.items
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
                                {item.nome.length > 20 ? item.nome.substring(0, 20) + '...' : item.nome}
                              </span>
                            )}
                            {item.pressione_test && (
                              <span className="text-xs text-cyan-500 ml-auto">
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
      )}

      {/* Work Packages Summary - Collapsabile */}
      {workPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border mt-6 overflow-hidden">
          <button
            onClick={() => setShowWPSection(!showWPSection)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              📦 Work Packages ({workPackages.length})
            </h3>
            <span className="text-gray-400 text-xl">{showWPSection ? '▼' : '▶'}</span>
          </button>
          
          {showWPSection && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {workPackages.map((wp, idx) => {
                  const wpPianificazioni = pianificazioni.filter(p => p.work_package_id === wp.id)
                  const completati = wpPianificazioni.filter(p => p.stato === 'completato').length
                  const progress = wpPianificazioni.length > 0 ? Math.round((completati / wpPianificazioni.length) * 100) : 0
                  
                  return (
                    <div 
                      key={idx} 
                      className="px-3 py-2 border rounded-lg hover:shadow-sm transition-shadow flex items-center gap-2"
                      title={`${wp.codice} - ${wp.nome}\n${wp.disciplina?.nome || 'N/D'}\nProgresso: ${progress}%`}
                    >
                      <span className="font-mono text-sm font-bold text-purple-600">{wp.codice}</span>
                      <span className="text-sm text-gray-600 max-w-[150px] truncate">{wp.nome}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{progress}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Packages Summary - Collapsabile */}
      {testPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border mt-6 overflow-hidden">
          <button
            onClick={() => setShowTPSection(!showTPSection)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              💧 Test Packages ({testPackages.length})
            </h3>
            <span className="text-gray-400 text-xl">{showTPSection ? '▼' : '▶'}</span>
          </button>
          
          {showTPSection && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {testPackages.map((tp, idx) => {
                  const getTPStatoColor = (stato) => {
                    const colors = {
                      draft: 'bg-gray-100 text-gray-600',
                      planned: 'bg-blue-100 text-blue-600',
                      ready: 'bg-indigo-100 text-indigo-600',
                      in_progress: 'bg-amber-100 text-amber-600',
                      holding: 'bg-purple-100 text-purple-600',
                      passed: 'bg-green-100 text-green-600',
                      failed: 'bg-red-100 text-red-600'
                    }
                    return colors[stato] || colors.draft
                  }
                  
                  return (
                    <div 
                      key={idx} 
                      className="px-3 py-2 border rounded-lg hover:shadow-sm transition-shadow flex items-center gap-2"
                      style={{ borderLeftWidth: '3px', borderLeftColor: tp.colore || '#06B6D4' }}
                      title={`${tp.codice} - ${tp.nome}\n${tp.pressione_test ? tp.pressione_test + ' bar / ' + tp.durata_holding_minuti + ' min' : ''}\n${tp.disciplina?.nome || 'N/D'}`}
                    >
                      <span className="text-lg">{getTipoTestIcon(tp.tipo)}</span>
                      <span className="font-mono text-sm font-bold text-cyan-600">{tp.codice}</span>
                      <span className="text-sm text-gray-600 max-w-[150px] truncate">{tp.nome}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getTPStatoColor(tp.stato)}`}>
                        {tp.stato === 'planned' ? 'Plan' : 
                         tp.stato === 'in_progress' ? 'In Corso' : 
                         tp.stato === 'passed' ? '✓' : 
                         tp.stato === 'failed' ? '✗' : 
                         tp.stato}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal CW Detail */}
      {selectedCW && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCW(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCW.label} - {selectedCW.year}</h3>
                  <p className="text-blue-100 mt-1">
                    {getActivitiesForCW(selectedCW.year, selectedCW.week).length} attività pianificate
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCW(null)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="🔍 Cerca attività..."
                  value={cwSearch}
                  onChange={e => setCwSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/20 placeholder-blue-200 text-white border border-white/30 focus:outline-none focus:bg-white/30"
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const activities = getActivitiesForCW(selectedCW.year, selectedCW.week)
                  .filter(a => {
                    if (!cwSearch) return true
                    const search = cwSearch.toLowerCase()
                    return (
                      a.codice?.toLowerCase().includes(search) ||
                      a.nome?.toLowerCase().includes(search) ||
                      a.squadra?.toLowerCase().includes(search) ||
                      a.foreman?.toLowerCase().includes(search) ||
                      a.disciplina?.nome?.toLowerCase().includes(search)
                    )
                  })
                  .sort((a, b) => (a.priorita || 0) - (b.priorita || 0))
                
                if (activities.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📭</div>
                      <p className="text-gray-500">
                        {cwSearch ? 'Nessuna attività trovata' : 'Nessuna attività pianificata per questa settimana'}
                      </p>
                    </div>
                  )
                }
                
                const byDisc = {}
                activities.forEach(a => {
                  const disc = a.disciplina?.nome || 'Senza Disciplina'
                  if (!byDisc[disc]) byDisc[disc] = { nome: disc, colore: a.disciplina?.colore || '#6B7280', items: [] }
                  byDisc[disc].items.push(a)
                })
                
                return (
                  <div className="space-y-6">
                    {Object.values(byDisc).map((disc, dIdx) => (
                      <div key={dIdx}>
                        <div 
                          className="flex items-center gap-2 mb-3 pb-2 border-b"
                          style={{ borderColor: disc.colore }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: disc.colore }}
                          ></div>
                          <span className="font-semibold text-gray-700">{disc.nome}</span>
                          <span className="text-sm text-gray-400">({disc.items.length})</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {disc.items.map((activity, aIdx) => (
                            <div 
                              key={aIdx}
                              className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                              style={activity.tipo === 'TP' ? { borderLeftWidth: '4px', borderLeftColor: activity.colore || '#06B6D4' } : {}}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTPBadgeColor(activity.tipo)}`}>
                                    {activity.tipoIcona} {activity.tipo}
                                  </span>
                                  <span className="font-mono font-semibold text-gray-800">
                                    {activity.codice}
                                  </span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(activity.statoTP || activity.stato)} text-white`}>
                                  {activity.statoTP || activity.stato}
                                </span>
                              </div>
                              {activity.nome && (
                                <p className="text-sm text-gray-600 mb-2">{activity.nome}</p>
                              )}
                              <div className="text-xs text-gray-500 space-y-1">
                                {activity.tipo === 'TP' && activity.pressione_test && (
                                  <div className="text-cyan-600 font-medium">⏲️ {activity.pressione_test} bar - {activity.tipo_test}</div>
                                )}
                                {activity.fase && (
                                  <div className="flex items-center gap-1">
                                    <span>{activity.fase.icona}</span>
                                    <span>{activity.fase.nome}</span>
                                  </div>
                                )}
                                {activity.squadra && (
                                  <div>👥 {activity.squadra}</div>
                                )}
                                {activity.foreman && (
                                  <div>👷 {activity.foreman}</div>
                                )}
                                {activity.azione && (
                                  <div>🔧 {activity.azione}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedCW(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
