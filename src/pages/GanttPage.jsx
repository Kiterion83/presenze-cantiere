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
  const [activities, setActivities] = useState([])
  
  // Range date
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  // Scroll ref
  const ganttRef = useRef(null)

  // Carica dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)

    try {
      // Work Packages
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('*')
        .eq('progetto_id', progetto.id)
        .order('data_inizio')

      setWorkPackages(wpData || [])

      // Pianificazioni CW con componenti
      const { data: pianData } = await supabase
        .from('pianificazione_cw')
        .select(`
          *,
          componenti (
            id, codice, descrizione, stato,
            discipline (nome, colore)
          )
        `)
        .eq('progetto_id', progetto.id)
        .order('anno')
        .order('settimana')

      setPianificazioni(pianData || [])

      // Activities
      const { data: actData } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', progetto.id)
        .order('start_date')

      setActivities(actData || [])

      // Calcola range date
      const oggi = new Date()
      const inizio = new Date(progetto.data_inizio || oggi)
      inizio.setDate(1) // Primo del mese
      
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

  // Raggruppa pianificazioni per disciplina/tipo
  const ganttRows = useMemo(() => {
    // Raggruppa per disciplina
    const byDiscipline = {}
    
    pianificazioni.forEach(p => {
      const disc = p.componenti?.discipline?.nome || 'Senza Disciplina'
      const color = p.componenti?.discipline?.colore || '#6B7280'
      
      if (!byDiscipline[disc]) {
        byDiscipline[disc] = {
          name: disc,
          color,
          items: [],
          expanded: true
        }
      }
      
      byDiscipline[disc].items.push({
        id: p.id,
        codice: p.componenti?.codice || p.id,
        descrizione: p.componenti?.descrizione || '',
        stato: p.componenti?.stato || 'pianificato',
        anno: p.anno,
        settimana: p.settimana,
        azione: p.azione,
        priorita: p.priorita
      })
    })
    
    return Object.values(byDiscipline)
  }, [pianificazioni])

  // Funzioni helper
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

  function getWeekIndex(anno, settimana) {
    return weeks.findIndex(w => w.year === anno && w.week === settimana)
  }

  function getStatusColor(stato) {
    const colors = {
      'completato': '#22C55E',
      'in_progress': '#3B82F6',
      'at_site': '#8B5CF6',
      'in_warehouse': '#F59E0B',
      'pianificato': '#6B7280',
      'da_ordinare': '#EF4444'
    }
    return colors[stato] || '#6B7280'
  }

  // Scroll a oggi
  const scrollToToday = () => {
    const todayIndex = weeks.findIndex(w => w.isCurrentWeek)
    if (todayIndex >= 0 && ganttRef.current) {
      const scrollPos = todayIndex * 60 - 200
      ganttRef.current.scrollLeft = Math.max(0, scrollPos)
    }
  }

  useEffect(() => {
    if (!loading && weeks.length) {
      setTimeout(scrollToToday, 100)
    }
  }, [loading, weeks.length])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📅 Gantt Chart
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Vai a Oggi */}
          <button
            onClick={scrollToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            📍 Oggi
          </button>

          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('weeks')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'weeks' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Settimane
            </button>
            <button
              onClick={() => setViewMode('months')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'months' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Mesi
            </button>
          </div>

          {/* Mostra Completati */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            Mostra completati
          </label>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 bg-white rounded-xl p-4 border">
        <span className="text-sm font-medium text-gray-600">Legenda:</span>
        {[
          { label: 'Completato', color: '#22C55E' },
          { label: 'In Lavorazione', color: '#3B82F6' },
          { label: 'Al Site', color: '#8B5CF6' },
          { label: 'In Warehouse', color: '#F59E0B' },
          { label: 'Pianificato', color: '#6B7280' },
          { label: 'Da Ordinare', color: '#EF4444' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="flex">
          {/* Colonna sinistra - Labels */}
          <div className="w-64 flex-shrink-0 border-r bg-gray-50">
            {/* Header vuoto per allineamento */}
            <div className="h-16 border-b bg-gray-100 flex items-center px-4">
              <span className="font-semibold text-gray-700">Attività</span>
            </div>
            
            {/* Rows Labels */}
            <div className="divide-y">
              {ganttRows.map((discipline, dIdx) => (
                <div key={dIdx}>
                  {/* Discipline Header */}
                  <div 
                    className="h-10 flex items-center px-4 bg-gray-100 cursor-pointer hover:bg-gray-200"
                    style={{ borderLeft: `4px solid ${discipline.color}` }}
                  >
                    <span className="font-medium text-gray-700">{discipline.name}</span>
                    <span className="ml-2 text-xs text-gray-400">({discipline.items.length})</span>
                  </div>
                  
                  {/* Items */}
                  {discipline.items
                    .filter(item => showCompleted || item.stato !== 'completato')
                    .map((item, iIdx) => (
                    <div 
                      key={iIdx}
                      className="h-10 flex items-center px-4 pl-8 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-sm text-gray-600 truncate" title={item.descrizione}>
                        {item.codice}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Colonna destra - Timeline */}
          <div className="flex-1 overflow-x-auto" ref={ganttRef}>
            <div style={{ minWidth: weeks.length * 60 }}>
              {/* Header Mesi */}
              <div className="h-8 flex border-b bg-gray-50">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="border-r text-center text-xs font-medium text-gray-600 flex items-center justify-center"
                    style={{ width: month.count * 60 }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>

              {/* Header Settimane */}
              <div className="h-8 flex border-b">
                {weeks.map((week, idx) => (
                  <div
                    key={idx}
                    className={`w-[60px] flex-shrink-0 border-r text-center text-xs flex items-center justify-center ${
                      week.isCurrentWeek 
                        ? 'bg-blue-100 text-blue-700 font-bold' 
                        : 'text-gray-500'
                    }`}
                  >
                    {week.label}
                  </div>
                ))}
              </div>

              {/* Timeline Rows */}
              <div className="divide-y">
                {ganttRows.map((discipline, dIdx) => (
                  <div key={dIdx}>
                    {/* Discipline Row (vuota, solo per spazio) */}
                    <div className="h-10 flex relative bg-gray-50">
                      {weeks.map((week, wIdx) => (
                        <div
                          key={wIdx}
                          className={`w-[60px] flex-shrink-0 border-r ${
                            week.isCurrentWeek ? 'bg-blue-50' : ''
                          }`}
                        ></div>
                      ))}
                    </div>

                    {/* Item Rows */}
                    {discipline.items
                      .filter(item => showCompleted || item.stato !== 'completato')
                      .map((item, iIdx) => {
                      const weekIdx = getWeekIndex(item.anno, item.settimana)
                      
                      return (
                        <div key={iIdx} className="h-10 flex relative">
                          {/* Grid */}
                          {weeks.map((week, wIdx) => (
                            <div
                              key={wIdx}
                              className={`w-[60px] flex-shrink-0 border-r ${
                                week.isCurrentWeek ? 'bg-blue-50' : ''
                              }`}
                            ></div>
                          ))}
                          
                          {/* Bar */}
                          {weekIdx >= 0 && (
                            <div
                              className="absolute top-1.5 h-7 rounded-lg shadow-sm flex items-center px-2 cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                left: weekIdx * 60 + 4,
                                width: 52,
                                backgroundColor: getStatusColor(item.stato)
                              }}
                              title={`${item.codice} - ${item.descrizione}\nStato: ${item.stato}\nCW${item.settimana}`}
                            >
                              <span className="text-white text-xs font-medium truncate">
                                {item.azione?.[0] || '•'}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Today Line */}
              {weeks.findIndex(w => w.isCurrentWeek) >= 0 && (
                <div
                  className="absolute top-16 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                  style={{ left: weeks.findIndex(w => w.isCurrentWeek) * 60 + 30 }}
                ></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Work Packages Timeline (se esistono) */}
      {workPackages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">📋 Work Packages</h3>
          <div className="space-y-3">
            {workPackages.map((wp, idx) => {
              const progress = 60 // TODO: calcolare reale
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <span className="font-medium text-sm text-gray-700">{wp.codice}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{wp.nome}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-24 text-xs text-gray-500 text-right">
                    {wp.data_fine ? new Date(wp.data_fine).toLocaleDateString('it-IT') : '-'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ganttRows.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <span className="text-6xl">📅</span>
          <h3 className="mt-4 font-semibold text-gray-700">Nessuna pianificazione</h3>
          <p className="text-gray-500 mt-2">
            Vai alla sezione Pianificazione per assegnare materiali alle settimane
          </p>
        </div>
      )}
    </div>
  )
}
