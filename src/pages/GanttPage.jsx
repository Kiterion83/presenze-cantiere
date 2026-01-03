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
  
  // Range date
  const [rangePreset, setRangePreset] = useState('activities')
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' })
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  // Modal CW Detail
  const [selectedCW, setSelectedCW] = useState(null)
  const [cwSearch, setCwSearch] = useState('')
  
  // Modal TP non pianificati
  const [showUnplannedTPModal, setShowUnplannedTPModal] = useState(false)
  
  // Filtro vista
  const [viewFilter, setViewFilter] = useState('all')
  
  // Sezioni collassabili
  const [showWPSection, setShowWPSection] = useState(false)
  const [showTPSection, setShowTPSection] = useState(false)
  
  // Tooltip
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null })
  
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
  
  // Calcola CW da una data
  function getYearWeekFromDate(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return { year: d.getFullYear(), week: getWeekNumber(d) }
  }

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

  // Calcola range basato su preset E sulle date effettive delle attività
  const calculateDateRange = useCallback(() => {
    const oggi = new Date()
    
    // Trova la prima e ultima data tra WP e TP
    const allDates = [
      ...workPackages.filter(wp => wp.data_inizio_pianificata).map(wp => new Date(wp.data_inizio_pianificata)),
      ...workPackages.filter(wp => wp.data_fine_pianificata).map(wp => new Date(wp.data_fine_pianificata)),
      ...testPackages.filter(tp => tp.data_inizio_pianificata).map(tp => new Date(tp.data_inizio_pianificata)),
      ...testPackages.filter(tp => tp.data_fine_pianificata).map(tp => new Date(tp.data_fine_pianificata))
    ]
    
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : oggi
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : oggi
    
    let start, end
    
    switch (rangePreset) {
      case '3months':
        // Parte 2 settimane prima della prima attività, finisce 3 mesi dopo
        start = new Date(minDate)
        start.setDate(start.getDate() - 14)
        end = new Date(maxDate)
        end.setMonth(end.getMonth() + 1)
        // Ma almeno 3 mesi di range
        const min3m = new Date(start)
        min3m.setMonth(min3m.getMonth() + 3)
        if (end < min3m) end = min3m
        break
      case '6months':
        start = new Date(minDate)
        start.setDate(start.getDate() - 14)
        end = new Date(maxDate)
        end.setMonth(end.getMonth() + 2)
        const min6m = new Date(start)
        min6m.setMonth(min6m.getMonth() + 6)
        if (end < min6m) end = min6m
        break
      case '1year':
        start = new Date(minDate)
        start.setDate(start.getDate() - 14)
        end = new Date(maxDate)
        end.setMonth(end.getMonth() + 3)
        const min1y = new Date(start)
        min1y.setMonth(min1y.getMonth() + 12)
        if (end < min1y) end = min1y
        break
      case 'project':
        start = progetto?.data_inizio ? new Date(progetto.data_inizio) : new Date(minDate)
        start.setDate(start.getDate() - 7)
        end = progetto?.data_fine_prevista ? new Date(progetto.data_fine_prevista) : new Date(maxDate)
        end.setMonth(end.getMonth() + 1)
        break
      case 'activities':
        // Mostra solo il range delle attività
        start = new Date(minDate)
        start.setDate(start.getDate() - 14)
        end = new Date(maxDate)
        end.setDate(end.getDate() + 14)
        break
      case 'custom':
        start = customRange.startDate ? new Date(customRange.startDate) : new Date(minDate)
        end = customRange.endDate ? new Date(customRange.endDate) : new Date(maxDate)
        break
      default:
        start = new Date(minDate)
        start.setDate(start.getDate() - 14)
        end = new Date(maxDate)
        end.setMonth(end.getMonth() + 2)
    }
    
    // Imposta al primo del mese per start
    start.setDate(1)
    
    setDateRange({ start, end })
  }, [rangePreset, customRange, progetto, workPackages, testPackages])

  useEffect(() => {
    calculateDateRange()
  }, [calculateDateRange])

  // Carica dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)

    try {
      // Work Packages
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

      // Test Packages
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

      // Pianificazioni CW (per componenti)
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

  // KPI: TP senza date pianificate
  const tpSenzaDate = useMemo(() => {
    return testPackages.filter(tp => !tp.data_inizio_pianificata)
  }, [testPackages])

  // KPI: TP con date pianificate
  const tpConDate = useMemo(() => {
    return testPackages.filter(tp => tp.data_inizio_pianificata)
  }, [testPackages])

  // Raggruppa per disciplina - ORA INCLUDE WP E TP DIRETTAMENTE DALLE DATE
  const ganttRows = useMemo(() => {
    const byDiscipline = {}
    
    // === 1. AGGIUNGI WP DIRETTAMENTE DALLE DATE ===
    if (viewFilter === 'all' || viewFilter === 'wp') {
      workPackages.forEach(wp => {
        if (!wp.data_inizio_pianificata) return // Skip WP senza date
        if (!showCompleted && wp.stato === 'completato') return
        
        const startYW = getYearWeekFromDate(wp.data_inizio_pianificata)
        const endYW = getYearWeekFromDate(wp.data_fine_pianificata)
        if (!startYW) return
        
        const disc = wp.disciplina?.nome || 'Senza Disciplina'
        const color = wp.disciplina?.colore || '#6B7280'
        const icona = wp.disciplina?.icona || '📦'
        
        if (!byDiscipline[disc]) {
          byDiscipline[disc] = { name: disc, color, icona, items: [], expanded: true }
        }
        
        byDiscipline[disc].items.push({
          id: `wp-${wp.id}`,
          originalId: wp.id,
          tipo: 'WP',
          tipoIcona: '📦',
          codice: wp.codice,
          nome: wp.nome,
          descrizione: wp.descrizione,
          stato: wp.stato || 'pianificato',
          statoTP: null,
          annoInizio: startYW.year,
          settimanaInizio: startYW.week,
          annoFine: endYW?.year,
          settimanaFine: endYW?.week,
          dataInizio: wp.data_inizio_pianificata,
          dataFine: wp.data_fine_pianificata,
          squadra: wp.squadra?.nome,
          foreman: wp.foreman ? `${wp.foreman.nome} ${wp.foreman.cognome}` : null,
          disciplina: wp.disciplina,
          colore: wp.colore || '#8B5CF6',
          priorita: wp.priorita
        })
      })
    }
    
    // === 2. AGGIUNGI TP DIRETTAMENTE DALLE DATE ===
    if (viewFilter === 'all' || viewFilter === 'tp') {
      testPackages.forEach(tp => {
        if (!tp.data_inizio_pianificata) return // Skip TP senza date
        if (!showCompleted && (tp.stato === 'passed' || tp.stato === 'failed')) return
        
        const startYW = getYearWeekFromDate(tp.data_inizio_pianificata)
        const endYW = getYearWeekFromDate(tp.data_fine_pianificata)
        if (!startYW) return
        
        const disc = tp.disciplina?.nome || 'Commissioning'
        const color = tp.disciplina?.colore || '#06B6D4'
        const icona = tp.disciplina?.icona || '💧'
        
        if (!byDiscipline[disc]) {
          byDiscipline[disc] = { name: disc, color, icona, items: [], expanded: true }
        }
        
        byDiscipline[disc].items.push({
          id: `tp-${tp.id}`,
          originalId: tp.id,
          tipo: 'TP',
          tipoIcona: getTipoTestIcon(tp.tipo),
          codice: tp.codice,
          nome: tp.nome,
          descrizione: tp.descrizione,
          stato: tp.stato || 'draft',
          statoTP: tp.stato,
          annoInizio: startYW.year,
          settimanaInizio: startYW.week,
          annoFine: endYW?.year,
          settimanaFine: endYW?.week,
          dataInizio: tp.data_inizio_pianificata,
          dataFine: tp.data_fine_pianificata,
          squadra: tp.squadra?.nome,
          foreman: tp.foreman ? `${tp.foreman.nome} ${tp.foreman.cognome}` : null,
          disciplina: tp.disciplina,
          colore: tp.colore || '#06B6D4',
          pressione_test: tp.pressione_test,
          durata_holding: tp.durata_holding_minuti,
          fluido_test: tp.fluido_test,
          tipoTest: tp.tipo,
          priorita: tp.priorita
        })
      })
    }
    
    // === 3. AGGIUNGI COMPONENTI DA PIANIFICAZIONE_CW (se viewFilter = all) ===
    if (viewFilter === 'all') {
      pianificazioni.forEach(p => {
        // Solo componenti singoli (non WP e non TP che sono già aggiunti dalle date)
        if (!p.componente_id || p.work_package_id || p.test_package_id) return
        if (!showCompleted && p.stato === 'completato') return
        
        const comp = p.componente
        if (!comp) return
        
        const disc = comp.disciplina?.nome || 'Senza Disciplina'
        const color = comp.disciplina?.colore || '#6B7280'
        const icona = comp.disciplina?.icona || '🔩'
        
        if (!byDiscipline[disc]) {
          byDiscipline[disc] = { name: disc, color, icona, items: [], expanded: true }
        }
        
        byDiscipline[disc].items.push({
          id: `comp-${p.id}`,
          originalId: p.id,
          tipo: 'COMP',
          tipoIcona: '🔩',
          codice: comp.codice,
          nome: comp.descrizione,
          descrizione: comp.descrizione,
          stato: p.stato || 'pianificato',
          statoTP: null,
          annoInizio: p.anno,
          settimanaInizio: p.settimana,
          annoFine: null,
          settimanaFine: null,
          squadra: p.squadra?.nome,
          foreman: null,
          disciplina: comp.disciplina,
          colore: null,
          fase: p.fase
        })
      })
    }
    
    // Ordina items per settimana
    Object.values(byDiscipline).forEach(disc => {
      disc.items.sort((a, b) => {
        if (a.annoInizio !== b.annoInizio) return a.annoInizio - b.annoInizio
        return a.settimanaInizio - b.settimanaInizio
      })
    })
    
    return Object.values(byDiscipline).sort((a, b) => a.name.localeCompare(b.name))
  }, [workPackages, testPackages, pianificazioni, viewFilter, showCompleted])

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
    const colors = {
      completato: 'bg-green-500', passed: 'bg-green-500',
      in_corso: 'bg-blue-500', in_progress: 'bg-blue-500',
      holding: 'bg-purple-500', ready: 'bg-indigo-500',
      planned: 'bg-cyan-500', pianificato: 'bg-cyan-500',
      draft: 'bg-gray-400', failed: 'bg-red-500'
    }
    return colors[stato] || 'bg-gray-400'
  }
  
  const getTPBadgeColor = (tipo) => {
    const colors = { TP: 'bg-cyan-100 text-cyan-700', WP: 'bg-purple-100 text-purple-700' }
    return colors[tipo] || 'bg-gray-100 text-gray-700'
  }

  // Tooltip handlers
  const showTooltip = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: item
    })
  }
  
  const hideTooltip = () => {
    setTooltip({ show: false, x: 0, y: 0, content: null })
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
      {/* Tooltip */}
      {tooltip.show && tooltip.content && (
        <div 
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-bold text-sm mb-1">
            {tooltip.content.tipoIcona} {tooltip.content.codice}
          </div>
          <div className="text-gray-300 mb-2">{tooltip.content.nome}</div>
          <div className="space-y-1 text-gray-400">
            {tooltip.content.disciplina && (
              <div>📁 {tooltip.content.disciplina.nome}</div>
            )}
            {tooltip.content.squadra && (
              <div>👥 {tooltip.content.squadra}</div>
            )}
            {tooltip.content.foreman && (
              <div>👷 {tooltip.content.foreman}</div>
            )}
            {tooltip.content.dataInizio && (
              <div>📅 {new Date(tooltip.content.dataInizio).toLocaleDateString('it-IT')} 
                {tooltip.content.dataFine && ` → ${new Date(tooltip.content.dataFine).toLocaleDateString('it-IT')}`}
              </div>
            )}
            {tooltip.content.pressione_test && (
              <div>⏲️ {tooltip.content.pressione_test} bar / {tooltip.content.durata_holding} min</div>
            )}
            {tooltip.content.fluido_test && (
              <div>💧 {tooltip.content.fluido_test}</div>
            )}
            <div className="pt-1 border-t border-gray-700">
              Stato: <span className="font-medium text-white">{tooltip.content.statoTP || tooltip.content.stato}</span>
            </div>
          </div>
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}

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
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            📍 Oggi
          </button>
          
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            Mostra completati
          </label>
        </div>
      </div>

      {/* Controllo Range Date */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">📅 Vista:</span>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="activities">📍 Solo Attività</option>
              <option value="3months">3 Mesi</option>
              <option value="6months">6 Mesi</option>
              <option value="1year">1 Anno</option>
              <option value="project">Durata Progetto</option>
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-800">{workPackages.length}</p>
          <p className="text-sm text-gray-500">📦 Work Packages</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-cyan-600">{testPackages.length}</p>
          <p className="text-sm text-gray-500">💧 Test Packages</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{tpConDate.length}</p>
          <p className="text-sm text-gray-500">📅 TP Pianificati</p>
        </div>
        {/* KPI: TP senza date - CLICCABILE */}
        <div 
          className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
            tpSenzaDate.length > 0 ? 'border-orange-300 bg-orange-50' : ''
          }`}
          onClick={() => tpSenzaDate.length > 0 && setShowUnplannedTPModal(true)}
        >
          <p className={`text-2xl font-bold ${tpSenzaDate.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {tpSenzaDate.length}
          </p>
          <p className="text-sm text-gray-500">⚠️ TP Senza Date</p>
          {tpSenzaDate.length > 0 && (
            <p className="text-xs text-orange-500 mt-1">Clicca per vedere</p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">
            {testPackages.filter(tp => tp.stato === 'passed').length}
          </p>
          <p className="text-sm text-gray-500">🏆 Test Superati</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">
            {ganttRows.reduce((acc, d) => acc + d.items.length, 0)}
          </p>
          <p className="text-sm text-gray-500">📊 Nel Gantt</p>
        </div>
      </div>

      {/* Empty state */}
      {ganttRows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {viewFilter === 'tp' ? 'Nessun Test Package con date pianificate' : 
             viewFilter === 'wp' ? 'Nessun Work Package con date pianificate' :
             'Nessuna attività con date pianificate'}
          </h3>
          <p className="text-gray-500 mb-4">
            Imposta le date di inizio e fine nei WP/TP per vederli nel Gantt
          </p>
          {tpSenzaDate.length > 0 && (
            <button
              onClick={() => setShowUnplannedTPModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              ⚠️ Vedi {tpSenzaDate.length} TP senza date
            </button>
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
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-700">💧 TP</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">🔩 COMP</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Completato</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>In corso</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                <span>Pianificato</span>
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
                        week.isCurrentWeek ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => { setSelectedCW(week); setCwSearch('') }}
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
                  <div className="flex items-center p-3 bg-gray-50 font-medium text-gray-700">
                    <span className="mr-2">{discipline.icona}</span>
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: discipline.color }}
                    ></span>
                    <span>{discipline.name}</span>
                    <span className="ml-2 text-gray-400 text-sm">({discipline.items.length})</span>
                  </div>

                  {/* Items */}
                  {discipline.items.map((item, iIdx) => {
                    const startWeekIndex = weeks.findIndex(w => 
                      w.year === item.annoInizio && w.week === item.settimanaInizio
                    )
                    const endWeekIndex = item.annoFine && item.settimanaFine 
                      ? weeks.findIndex(w => w.year === item.annoFine && w.week === item.settimanaFine)
                      : startWeekIndex
                    
                    const barStart = Math.max(0, startWeekIndex)
                    const barEnd = Math.max(barStart, endWeekIndex >= 0 ? endWeekIndex : barStart)
                    const barWidth = barEnd - barStart + 1
                    
                    return (
                      <div key={iIdx} className="flex border-t border-gray-100 hover:bg-gray-50">
                        {/* Item label */}
                        <div 
                          className="w-[300px] flex-shrink-0 p-2 border-r flex items-center gap-2 cursor-pointer"
                          onMouseEnter={(e) => showTooltip(e, item)}
                          onMouseLeave={hideTooltip}
                        >
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getTPBadgeColor(item.tipo)}`}>
                            {item.tipoIcona}
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-700 truncate">
                            {item.codice}
                          </span>
                          <span className="text-xs text-gray-400 truncate hidden lg:inline flex-1">
                            {item.nome?.length > 20 ? item.nome.substring(0, 20) + '...' : item.nome}
                          </span>
                          {item.pressione_test && (
                            <span className="text-xs text-cyan-500">{item.pressione_test} bar</span>
                          )}
                        </div>
                        
                        {/* Timeline */}
                        <div className="flex relative">
                          {weeks.map((week, wIdx) => {
                            const isInRange = wIdx >= barStart && wIdx <= barEnd && startWeekIndex >= 0
                            const isStart = wIdx === barStart && startWeekIndex >= 0
                            const isEnd = wIdx === barEnd && startWeekIndex >= 0
                            const isCurrent = week.isCurrentWeek
                            
                            return (
                              <div 
                                key={wIdx}
                                className={`w-[60px] h-10 border-r border-gray-100 relative ${isCurrent ? 'bg-blue-50' : ''}`}
                              >
                                {isInRange && (
                                  <div 
                                    className={`absolute top-1 bottom-1 flex items-center justify-center text-white text-xs font-medium ${getStatusColor(item.statoTP || item.stato)} ${
                                      isStart && isEnd ? 'left-1 right-1 rounded-lg' :
                                      isStart ? 'left-1 right-0 rounded-l-lg' :
                                      isEnd ? 'left-0 right-1 rounded-r-lg' :
                                      'left-0 right-0'
                                    }`}
                                    style={item.colore && !['completato', 'passed', 'failed'].includes(item.statoTP || item.stato) ? {
                                      backgroundColor: item.colore
                                    } : {}}
                                    onMouseEnter={(e) => showTooltip(e, item)}
                                    onMouseLeave={hideTooltip}
                                  >
                                    {isStart && item.tipoIcona}
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

      {/* Work Packages - Collapsabile */}
      {workPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border mt-6 overflow-hidden">
          <button
            onClick={() => setShowWPSection(!showWPSection)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              📦 Work Packages ({workPackages.length})
            </h3>
            <span className="text-gray-400 text-xl">{showWPSection ? '▼' : '▶'}</span>
          </button>
          
          {showWPSection && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {workPackages.map((wp, idx) => (
                  <div 
                    key={idx} 
                    className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${
                      !wp.data_inizio_pianificata ? 'border-orange-300 bg-orange-50' : ''
                    }`}
                    title={`${wp.codice} - ${wp.nome}\n${wp.disciplina?.nome || 'N/D'}\n${wp.data_inizio_pianificata ? new Date(wp.data_inizio_pianificata).toLocaleDateString('it-IT') : '⚠️ Senza date'}`}
                  >
                    <span className="font-mono text-sm font-bold text-purple-600">{wp.codice}</span>
                    <span className="text-sm text-gray-600 max-w-[150px] truncate">{wp.nome}</span>
                    {!wp.data_inizio_pianificata && (
                      <span className="text-xs text-orange-500">⚠️</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Packages - Collapsabile */}
      {testPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border mt-6 overflow-hidden">
          <button
            onClick={() => setShowTPSection(!showTPSection)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              💧 Test Packages ({testPackages.length})
              {tpSenzaDate.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                  {tpSenzaDate.length} senza date
                </span>
              )}
            </h3>
            <span className="text-gray-400 text-xl">{showTPSection ? '▼' : '▶'}</span>
          </button>
          
          {showTPSection && (
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {testPackages.map((tp, idx) => (
                  <div 
                    key={idx} 
                    className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${
                      !tp.data_inizio_pianificata ? 'border-orange-300 bg-orange-50' : ''
                    }`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: tp.colore || '#06B6D4' }}
                    title={`${tp.codice} - ${tp.nome}\n${tp.pressione_test ? tp.pressione_test + ' bar / ' + tp.durata_holding_minuti + ' min' : ''}\n${tp.data_inizio_pianificata ? new Date(tp.data_inizio_pianificata).toLocaleDateString('it-IT') : '⚠️ Senza date'}`}
                  >
                    <span className="text-lg">{getTipoTestIcon(tp.tipo)}</span>
                    <span className="font-mono text-sm font-bold text-cyan-600">{tp.codice}</span>
                    <span className="text-sm text-gray-600 max-w-[150px] truncate">{tp.nome}</span>
                    {!tp.data_inizio_pianificata && (
                      <span className="text-xs text-orange-500">⚠️</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal TP Senza Date */}
      {showUnplannedTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUnplannedTPModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">⚠️ Test Packages Senza Date</h3>
                  <p className="text-orange-100 mt-1">
                    {tpSenzaDate.length} TP non hanno date pianificate
                  </p>
                </div>
                <button
                  onClick={() => setShowUnplannedTPModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-600 mb-4">
                Questi Test Packages non appariranno nel Gantt finché non avranno date di inizio e fine.
                Vai su <strong>Test Packages</strong> e imposta le date pianificate.
              </p>
              
              <div className="space-y-3">
                {tpSenzaDate.map((tp, idx) => (
                  <div 
                    key={idx}
                    className="border rounded-xl p-4 bg-orange-50 border-orange-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTipoTestIcon(tp.tipo)}</span>
                        <div>
                          <span className="font-mono font-bold text-orange-700">{tp.codice}</span>
                          <p className="text-sm text-gray-600">{tp.nome}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                        {tp.stato}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-gray-500 flex flex-wrap gap-4">
                      {tp.disciplina && <span>📁 {tp.disciplina.nome}</span>}
                      {tp.pressione_test && <span>⏲️ {tp.pressione_test} bar</span>}
                      {tp.squadra && <span>👥 {tp.squadra.nome}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowUnplannedTPModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal CW Detail */}
      {selectedCW && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCW(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCW.label} - {selectedCW.year}</h3>
                  <p className="text-blue-100 mt-1">
                    {ganttRows.reduce((acc, d) => 
                      acc + d.items.filter(i => 
                        i.annoInizio <= selectedCW.year && i.settimanaInizio <= selectedCW.week &&
                        (!i.annoFine || i.annoFine >= selectedCW.year) && 
                        (!i.settimanaFine || i.settimanaFine >= selectedCW.week || i.annoFine > selectedCW.year)
                      ).length
                    , 0)} attività in questa settimana
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
                  placeholder="🔍 Cerca..."
                  value={cwSearch}
                  onChange={e => setCwSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/20 placeholder-blue-200 text-white border border-white/30"
                />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const cwItems = ganttRows.flatMap(d => d.items.filter(i => {
                  // Item è in questa CW se:
                  // (annoInizio, settimanaInizio) <= CW <= (annoFine, settimanaFine)
                  const startOK = i.annoInizio < selectedCW.year || 
                    (i.annoInizio === selectedCW.year && i.settimanaInizio <= selectedCW.week)
                  const endOK = !i.annoFine || i.annoFine > selectedCW.year ||
                    (i.annoFine === selectedCW.year && i.settimanaFine >= selectedCW.week)
                  return startOK && endOK
                })).filter(i => {
                  if (!cwSearch) return true
                  const s = cwSearch.toLowerCase()
                  return i.codice?.toLowerCase().includes(s) || 
                         i.nome?.toLowerCase().includes(s) ||
                         i.squadra?.toLowerCase().includes(s)
                })
                
                if (cwItems.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📭</div>
                      <p className="text-gray-500">Nessuna attività in questa settimana</p>
                    </div>
                  )
                }
                
                return (
                  <div className="grid gap-3 md:grid-cols-2">
                    {cwItems.map((item, idx) => (
                      <div 
                        key={idx}
                        className="border rounded-xl p-4 hover:shadow-md"
                        style={item.tipo === 'TP' ? { borderLeftWidth: '4px', borderLeftColor: item.colore } : {}}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTPBadgeColor(item.tipo)}`}>
                              {item.tipoIcona} {item.tipo}
                            </span>
                            <span className="font-mono font-semibold">{item.codice}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(item.statoTP || item.stato)}`}>
                            {item.statoTP || item.stato}
                          </span>
                        </div>
                        {item.nome && <p className="text-sm text-gray-600 mb-2">{item.nome}</p>}
                        <div className="text-xs text-gray-500 space-y-1">
                          {item.pressione_test && (
                            <div className="text-cyan-600 font-medium">⏲️ {item.pressione_test} bar</div>
                          )}
                          {item.squadra && <div>👥 {item.squadra}</div>}
                          {item.foreman && <div>👷 {item.foreman}</div>}
                          {item.dataInizio && (
                            <div>📅 {new Date(item.dataInizio).toLocaleDateString('it-IT')} 
                              {item.dataFine && ` → ${new Date(item.dataFine).toLocaleDateString('it-IT')}`}
                            </div>
                          )}
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
