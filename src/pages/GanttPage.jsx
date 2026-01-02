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
  const [pianificazioni, setPianificazioni] = useState([])
  
  // Range date
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  // Modal CW Detail
  const [selectedCW, setSelectedCW] = useState(null)
  const [cwSearch, setCwSearch] = useState('')
  
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

      // Pianificazioni CW con componenti E work_packages
      const { data: pianData } = await supabase
        .from('pianificazione_cw')
        .select(`
          *,
          componente:componenti(
            id, codice, descrizione, stato,
            disciplina:discipline(id, nome, colore, icona)
          ),
          work_package:work_packages(
            id, codice, nome, descrizione,
            disciplina:discipline(id, nome, colore, icona),
            squadra:squadre(id, nome),
            foreman:persone!work_packages_foreman_id_fkey(id, nome, cognome)
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

  // Raggruppa pianificazioni per disciplina
  const ganttRows = useMemo(() => {
    const byDiscipline = {}
    
    pianificazioni.forEach(p => {
      // Determina se è un WP o un componente
      const isWP = p.work_package_id && !p.componente_id
      const item = isWP ? p.work_package : p.componente
      
      // Disciplina dal WP o dal componente
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
      
      byDiscipline[disc].items.push({
        id: p.id,
        tipo: isWP ? 'WP' : 'COMP',
        codice: isWP ? p.work_package?.codice : p.componente?.codice,
        nome: isWP ? p.work_package?.nome : p.componente?.descrizione,
        descrizione: isWP ? p.work_package?.descrizione : p.componente?.descrizione,
        stato: p.stato || 'pianificato',
        anno: p.anno,
        settimana: p.settimana,
        azione: p.azione,
        priorita: p.priorita,
        squadra: isWP ? p.work_package?.squadra?.nome : p.squadra?.nome,
        foreman: isWP ? (p.work_package?.foreman ? `${p.work_package.foreman.nome} ${p.work_package.foreman.cognome}` : null) : null,
        fase: p.fase,
        work_package: p.work_package,
        componente: p.componente
      })
    })
    
    return Object.values(byDiscipline).sort((a, b) => a.name.localeCompare(b.name))
  }, [pianificazioni])

  // Attività per una specifica CW (per il modal)
  const getActivitiesForCW = (year, week) => {
    return pianificazioni.filter(p => p.anno === year && p.settimana === week).map(p => {
      const isWP = p.work_package_id && !p.componente_id
      const item = isWP ? p.work_package : p.componente
      return {
        id: p.id,
        tipo: isWP ? 'WP' : 'COMP',
        codice: isWP ? p.work_package?.codice : p.componente?.codice,
        nome: isWP ? p.work_package?.nome : p.componente?.descrizione,
        stato: p.stato,
        disciplina: item?.disciplina,
        squadra: isWP ? p.work_package?.squadra?.nome : p.squadra?.nome,
        foreman: isWP ? (p.work_package?.foreman ? `${p.work_package.foreman.nome} ${p.work_package.foreman.cognome}` : null) : null,
        fase: p.fase,
        priorita: p.priorita,
        azione: p.azione
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
      case 'in_corso': return 'bg-blue-500'
      case 'al_site': return 'bg-purple-500'
      case 'in_warehouse': return 'bg-amber-500'
      case 'pianificato': return 'bg-gray-400'
      case 'da_ordinare': return 'bg-red-400'
      default: return 'bg-gray-400'
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
  if (ganttRows.length === 0) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={scrollToToday}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center gap-2"
          >
            📍 Oggi
          </button>
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('weeks')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'weeks' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              Settimane
            </button>
            <button
              onClick={() => setViewMode('months')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'months' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              Mesi
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={e => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            Mostra completati
          </label>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-600">Legenda:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Completato</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> In Lavorazione</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Al Site</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> In Warehouse</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Pianificato</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400"></span> Da Ordinare</span>
        </div>
      </div>

      {/* Gantt Grid */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="flex">
          {/* Fixed left column - Attività */}
          <div className="w-64 flex-shrink-0 border-r bg-gray-50">
            <div className="h-16 border-b px-4 flex items-center font-semibold text-gray-700 bg-gray-100">
              Attività
            </div>
            {ganttRows.map((discipline, dIdx) => (
              <div key={dIdx}>
                <div
                  className="h-10 px-4 flex items-center bg-gray-50 border-b"
                  style={{ borderLeft: `4px solid ${discipline.color}` }}
                >
                  <span className="mr-2">{discipline.icona}</span>
                  <span className="font-medium text-gray-700">{discipline.name}</span>
                  <span className="ml-2 text-xs text-gray-400">({discipline.items.length})</span>
                </div>
                {discipline.items
                  .filter(item => showCompleted || item.stato !== 'completato')
                  .map((item, iIdx) => (
                  <div key={iIdx} className="h-10 px-4 flex items-center border-b text-sm truncate">
                    <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-medium ${item.tipo === 'WP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {item.tipo}
                    </span>
                    <span className="font-mono text-gray-700 truncate" title={`${item.codice} - ${item.nome}`}>
                      {item.codice || '—'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div className="flex-1 overflow-x-auto" ref={ganttRef}>
            <div className="min-w-max relative">
              {/* Months header */}
              <div className="h-8 flex border-b bg-gray-100">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="text-xs font-medium text-gray-600 flex items-center justify-center border-r capitalize"
                    style={{ width: m.count * 60 }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Weeks header */}
              <div className="h-8 flex border-b">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className={`w-[60px] text-xs font-medium flex items-center justify-center border-r cursor-pointer hover:bg-blue-50 transition-colors ${
                      w.isCurrentWeek ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600'
                    }`}
                    onClick={() => setSelectedCW({ year: w.year, week: w.week, label: w.label })}
                    title={`Clicca per vedere le attività di ${w.label}`}
                  >
                    {w.label}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div>
                {ganttRows.map((discipline, dIdx) => (
                  <div key={dIdx}>
                    {/* Discipline row */}
                    <div className="h-10 flex bg-gray-50 border-b">
                      {weeks.map((w, wIdx) => (
                        <div
                          key={wIdx}
                          className={`w-[60px] border-r cursor-pointer hover:bg-gray-100 ${w.isCurrentWeek ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedCW({ year: w.year, week: w.week, label: w.label })}
                        ></div>
                      ))}
                    </div>
                    {/* Item rows */}
                    {discipline.items
                      .filter(item => showCompleted || item.stato !== 'completato')
                      .map((item, iIdx) => (
                      <div key={iIdx} className="h-10 flex border-b">
                        {weeks.map((w, wIdx) => {
                          const hasItem = item.anno === w.year && item.settimana === w.week
                          return (
                            <div
                              key={wIdx}
                              className={`w-[60px] border-r flex items-center justify-center cursor-pointer hover:bg-gray-50 ${w.isCurrentWeek ? 'bg-blue-50/50' : ''}`}
                              onClick={() => setSelectedCW({ year: w.year, week: w.week, label: w.label })}
                            >
                              {hasItem && (
                                <div
                                  className={`w-10 h-6 rounded ${getStatusColor(item.stato)} flex items-center justify-center`}
                                  title={`${item.codice} - ${item.nome}\nStato: ${item.stato}\n${w.label}`}
                                >
                                  <span className="text-white text-xs">
                                    {item.tipo === 'WP' ? '📦' : '•'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Today Line - solo se la settimana corrente è visibile */}
              {currentWeekIndex >= 0 && (
                <div
                  className="absolute top-16 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                  style={{ left: currentWeekIndex * 60 + 30 }}
                >
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              )}
            </div>
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
                    {wp.squadra && <div>👥 {wp.squadra.nome}</div>}
                    {wp.foreman && <div>👷 {wp.foreman.nome} {wp.foreman.cognome}</div>}
                    {wp.data_inizio_pianificata && (
                      <div>📅 {new Date(wp.data_inizio_pianificata).toLocaleDateString('it-IT')} - {wp.data_fine_pianificata ? new Date(wp.data_fine_pianificata).toLocaleDateString('it-IT') : '?'}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{progress}%</span>
                  </div>
                </div>
              )
            })}
          </div>
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
              {/* Search */}
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
                
                // Raggruppa per disciplina
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
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${activity.tipo === 'WP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {activity.tipo}
                                  </span>
                                  <span className="font-mono font-semibold text-gray-800">
                                    {activity.codice}
                                  </span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(activity.stato)} text-white`}>
                                  {activity.stato}
                                </span>
                              </div>
                              {activity.nome && (
                                <p className="text-sm text-gray-600 mb-2">{activity.nome}</p>
                              )}
                              <div className="text-xs text-gray-500 space-y-1">
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
            
            {/* Footer */}
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
