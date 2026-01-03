import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ForemanPage() {
  const { progettoId, progetto, persona } = useAuth()
  
  // Dati
  const [attivita, setAttivita] = useState([])
  const [squadre, setSquadre] = useState([])
  const [miaSquadra, setMiaSquadra] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Navigazione CW
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  
  // Filtro vista
  const [filtroVista, setFiltroVista] = useState('da_fare') // 'tutte', 'da_fare', 'completate', 'problemi'
  
  // Modali
  const [expandedId, setExpandedId] = useState(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showProblemModal, setShowProblemModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  
  // Form
  const [completeNote, setCompleteNote] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  
  // Pull to refresh simulation
  const [refreshing, setRefreshing] = useState(false)

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
  
  function formatDateShort(date) {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }
  
  function isCurrentWeek(year, week) {
    return year === new Date().getFullYear() && week === getCurrentWeek()
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
      // Carica squadre per trovare quella del foreman
      const { data: squadreData } = await supabase
        .from('squadre')
        .select('*, caposquadra:persone!squadre_caposquadra_id_fkey(id, nome, cognome)')
        .eq('progetto_id', progettoId)
        .eq('attiva', true)
      
      setSquadre(squadreData || [])
      
      // Trova la squadra del foreman corrente
      const miaSquadraFound = squadreData?.find(s => s.caposquadra_id === persona?.id)
      setMiaSquadra(miaSquadraFound)
      
      // Carica attività della CW
      let query = supabase
        .from('pianificazione_cw')
        .select(`
          *,
          componente:componenti(
            id, codice, descrizione, stato, quantita, unita_misura,
            disciplina:discipline(id, nome, codice, icona, colore),
            tipo:tipi_componente(id, nome, icona)
          ),
          fase:fasi_workflow(id, nome, icona, colore),
          squadra:squadre(id, nome)
        `)
        .eq('progetto_id', progettoId)
        .eq('anno', selectedYear)
        .eq('settimana', selectedWeek)
        .order('priorita')
      
      // Se foreman ha una squadra, filtra solo le sue attività
      // Altrimenti mostra tutte (per admin/pm/cm che testano)
      if (miaSquadraFound) {
        query = query.eq('squadra_id', miaSquadraFound.id)
      }
      
      const { data: attData } = await query
      setAttivita(attData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setTimeout(() => setRefreshing(false), 500)
  }

  // ══════════════════════════════════════════════════════════════════════
  // STATISTICHE
  // ══════════════════════════════════════════════════════════════════════
  
  const stats = useMemo(() => {
    const totale = attivita.length
    const completate = attivita.filter(a => a.stato === 'completato').length
    const daFare = attivita.filter(a => a.stato === 'pianificato' || a.stato === 'in_corso').length
    const problemi = attivita.filter(a => a.ha_problema && !a.problema_risolto).length
    const percentuale = totale > 0 ? Math.round((completate / totale) * 100) : 0
    
    return { totale, completate, daFare, problemi, percentuale }
  }, [attivita])
  
  // Filtra attività
  const attivitaFiltrate = useMemo(() => {
    switch (filtroVista) {
      case 'da_fare':
        return attivita.filter(a => a.stato === 'pianificato' || a.stato === 'in_corso')
      case 'completate':
        return attivita.filter(a => a.stato === 'completato')
      case 'problemi':
        return attivita.filter(a => a.ha_problema && !a.problema_risolto)
      default:
        return attivita
    }
  }, [attivita, filtroVista])

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
  
  // Quick start - metti in corso
  const handleStart = async (activity) => {
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({ stato: 'in_corso' })
        .eq('id', activity.id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  // Apri modal completa
  const openCompleteModal = (activity) => {
    setSelectedActivity(activity)
    setCompleteNote('')
    setShowCompleteModal(true)
  }
  
  // Completa attività
  const handleComplete = async () => {
    if (!selectedActivity) return
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          stato: 'completato',
          completato_il: new Date().toISOString(),
          completato_da: persona?.id,
          note_completamento: completeNote || null
        })
        .eq('id', selectedActivity.id)
      
      if (error) throw error
      
      // Aggiorna anche stato componente se necessario
      if (selectedActivity.componente_id) {
        await supabase
          .from('componenti')
          .update({ stato: 'completato' })
          .eq('id', selectedActivity.componente_id)
      }
      
      setShowCompleteModal(false)
      setSelectedActivity(null)
      loadData()
      
      // Feedback visivo
      showToast('✅ Attività completata!')
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  // Apri modal problema
  const openProblemModal = (activity) => {
    setSelectedActivity(activity)
    setProblemDescription('')
    setShowProblemModal(true)
  }
  
  // Segnala problema
  const handleReportProblem = async () => {
    if (!selectedActivity || !problemDescription.trim()) {
      alert('Descrivi il problema')
      return
    }
    
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          ha_problema: true,
          problema_descrizione: problemDescription,
          problema_segnalato_da: persona?.id,
          problema_segnalato_il: new Date().toISOString(),
          stato: 'bloccato'
        })
        .eq('id', selectedActivity.id)
      
      if (error) throw error
      
      setShowProblemModal(false)
      setSelectedActivity(null)
      loadData()
      
      showToast('⚠️ Problema segnalato')
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  // Toast semplice
  const [toast, setToast] = useState(null)
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  const weekDates = getWeekDates(selectedYear, selectedWeek)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Caricamento attività...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header fisso */}
      <div className="bg-blue-600 text-white sticky top-0 z-40 safe-area-top">
        <div className="px-4 py-3">
          {/* Titolo e refresh */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">👷 Attività Campo</h1>
              {miaSquadra && (
                <p className="text-blue-200 text-sm">Squadra: {miaSquadra.nome}</p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full hover:bg-blue-500 ${refreshing ? 'animate-spin' : ''}`}
            >
              🔄
            </button>
          </div>
          
          {/* Navigazione CW */}
          <div className="flex items-center justify-between bg-blue-700/50 rounded-xl p-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-blue-600 rounded-lg text-xl"
            >
              ◀️
            </button>
            
            <button
              onClick={goToCurrentWeek}
              className="text-center flex-1"
            >
              <div className="text-xl font-bold">CW {String(selectedWeek).padStart(2, '0')}</div>
              <div className="text-xs text-blue-200">
                {formatDateShort(weekDates.start)} - {formatDateShort(weekDates.end)}
              </div>
              {isCurrentWeek(selectedYear, selectedWeek) && (
                <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full">Questa settimana</span>
              )}
            </button>
            
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-blue-600 rounded-lg text-xl"
            >
              ▶️
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Completamento</span>
            <span className="font-bold">{stats.completate}/{stats.totale} ({stats.percentuale}%)</span>
          </div>
          <div className="w-full bg-blue-800 rounded-full h-3">
            <div 
              className="bg-green-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentuale}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Filtri tab */}
      <div className="bg-white border-b sticky top-[180px] z-30">
        <div className="flex">
          {[
            { key: 'da_fare', label: 'Da fare', count: stats.daFare, emoji: '📋' },
            { key: 'completate', label: 'Fatte', count: stats.completate, emoji: '✅' },
            { key: 'problemi', label: 'Problemi', count: stats.problemi, emoji: '⚠️' },
            { key: 'tutte', label: 'Tutte', count: stats.totale, emoji: '📊' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFiltroVista(tab.key)}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                filtroVista === tab.key 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{tab.emoji}</span>
              <span className="block text-xs mt-0.5">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs mt-1 ${
                  filtroVista === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lista attività */}
      <div className="p-4 space-y-3">
        {attivitaFiltrate.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">
              {filtroVista === 'da_fare' ? '🎉' : 
               filtroVista === 'problemi' ? '✨' : '📭'}
            </div>
            <p className="text-gray-500">
              {filtroVista === 'da_fare' ? 'Tutto fatto! Nessuna attività da completare.' :
               filtroVista === 'problemi' ? 'Nessun problema segnalato.' :
               filtroVista === 'completate' ? 'Nessuna attività completata ancora.' :
               'Nessuna attività per questa settimana.'}
            </p>
          </div>
        ) : (
          attivitaFiltrate.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isExpanded={expandedId === activity.id}
              onToggle={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
              onStart={() => handleStart(activity)}
              onComplete={() => openCompleteModal(activity)}
              onProblem={() => openProblemModal(activity)}
            />
          ))
        )}
      </div>
      
      {/* Stats footer */}
      {stats.totale > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 safe-area-bottom z-30">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.daFare}</div>
              <div className="text-xs text-gray-500">Da fare</div>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completate}</div>
              <div className="text-xs text-gray-500">Fatte</div>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.problemi}</div>
              <div className="text-xs text-gray-500">Problemi</div>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.percentuale}%</div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Completa attività
          ══════════════════════════════════════════════════════════════════════ */}
      {showCompleteModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-hidden safe-area-bottom">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">✅ Completa attività</h2>
                <button 
                  onClick={() => setShowCompleteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Info componente */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span 
                    className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (selectedActivity.componente?.disciplina?.colore || '#6B7280') + '20' }}
                  >
                    {selectedActivity.componente?.disciplina?.icona || '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold truncate">{selectedActivity.componente?.codice}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {selectedActivity.componente?.descrizione || selectedActivity.componente?.tipo?.nome}
                    </div>
                  </div>
                </div>
                {selectedActivity.azione && (
                  <div className="mt-3 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                    🎯 {selectedActivity.azione}
                  </div>
                )}
              </div>
              
              {/* Note (opzionale) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (opzionale)
                </label>
                <textarea
                  value={completeNote}
                  onChange={e => setCompleteNote(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-base resize-none"
                  rows="3"
                  placeholder="Aggiungi note sul lavoro svolto..."
                />
              </div>
              
              {/* Bottone grande */}
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 active:scale-98 transition-transform"
              >
                ✅ Conferma Completamento
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Segnala problema
          ══════════════════════════════════════════════════════════════════════ */}
      {showProblemModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-hidden safe-area-bottom">
            <div className="p-4 border-b bg-red-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-700">⚠️ Segnala problema</h2>
                <button 
                  onClick={() => setShowProblemModal(false)}
                  className="p-2 hover:bg-red-100 rounded-full text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Info componente */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <span 
                    className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (selectedActivity.componente?.disciplina?.colore || '#6B7280') + '20' }}
                  >
                    {selectedActivity.componente?.disciplina?.icona || '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold truncate">{selectedActivity.componente?.codice}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {selectedActivity.componente?.descrizione || selectedActivity.componente?.tipo?.nome}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Descrizione problema */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrivi il problema *
                </label>
                <textarea
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-red-200 rounded-xl text-base resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows="4"
                  placeholder="Cosa impedisce di completare questa attività?"
                  autoFocus
                />
              </div>
              
              {/* Suggerimenti rapidi */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Problemi comuni:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Materiale mancante',
                    'Materiale danneggiato',
                    'Manca personale',
                    'Attesa gru',
                    'Maltempo',
                    'Interferenza con altri lavori',
                    'Difetto di fabbricazione'
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setProblemDescription(prev => prev ? `${prev}. ${hint}` : hint)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bottone grande */}
              <button
                onClick={handleReportProblem}
                disabled={!problemDescription.trim()}
                className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 active:scale-98 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚠️ Segnala Problema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE CARD ATTIVITÀ
// ══════════════════════════════════════════════════════════════════════

function ActivityCard({ activity, isExpanded, onToggle, onStart, onComplete, onProblem }) {
  const comp = activity.componente
  const isCompleted = activity.stato === 'completato'
  const isInProgress = activity.stato === 'in_corso'
  const hasProblem = activity.ha_problema && !activity.problema_risolto
  
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${
        isCompleted ? 'opacity-60' : ''
      } ${hasProblem ? 'ring-2 ring-red-400' : ''}`}
    >
      {/* Header card - sempre visibile */}
      <div 
        className="p-4 cursor-pointer active:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          {/* Icona stato */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            isCompleted ? 'bg-green-100' :
            hasProblem ? 'bg-red-100' :
            isInProgress ? 'bg-yellow-100' :
            'bg-blue-100'
          }`}>
            {isCompleted ? '✅' :
             hasProblem ? '⚠️' :
             isInProgress ? '🔄' :
             comp?.disciplina?.icona || '📦'}
          </div>
          
          {/* Info principale */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-900 truncate">{comp?.codice}</span>
              {activity.priorita <= 3 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                  #{activity.priorita}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {comp?.descrizione || comp?.tipo?.nome}
            </div>
            {activity.azione && (
              <div className="mt-1">
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {activity.azione}
                </span>
              </div>
            )}
          </div>
          
          {/* Badge stato */}
          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
            isCompleted ? 'bg-green-100 text-green-700' :
            hasProblem ? 'bg-red-100 text-red-700' :
            isInProgress ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {isCompleted ? 'Fatto' :
             hasProblem ? 'Bloccato' :
             isInProgress ? 'In corso' :
             'Da fare'}
          </div>
        </div>
        
        {/* Problema banner */}
        {hasProblem && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-sm text-red-700 flex-1">{activity.problema_descrizione}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Dettagli espansi */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <div className="py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Disciplina:</span>
              <span 
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ 
                  backgroundColor: (comp?.disciplina?.colore || '#6B7280') + '20', 
                  color: comp?.disciplina?.colore || '#6B7280' 
                }}
              >
                {comp?.disciplina?.nome}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tipo:</span>
              <span>{comp?.tipo?.icona} {comp?.tipo?.nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Quantità:</span>
              <span>{comp?.quantita} {comp?.unita_misura}</span>
            </div>
            {activity.fase && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fase:</span>
                <span>{activity.fase.icona} {activity.fase.nome}</span>
              </div>
            )}
            {activity.istruzioni && (
              <div className="pt-2">
                <span className="text-gray-500 block mb-1">Istruzioni:</span>
                <div className="p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  {activity.istruzioni}
                </div>
              </div>
            )}
          </div>
          
          {/* Azioni */}
          {!isCompleted && (
            <div className="flex gap-2 pt-3 border-t">
              {!isInProgress && !hasProblem && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStart(); }}
                  className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 active:scale-98 transition-transform"
                >
                  ▶️ Inizia
                </button>
              )}
              {!hasProblem && (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete(); }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 active:scale-98 transition-transform"
                >
                  ✅ Completa
                </button>
              )}
              {!hasProblem && (
                <button
                  onClick={(e) => { e.stopPropagation(); onProblem(); }}
                  className="py-3 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 active:scale-98 transition-transform"
                >
                  ⚠️
                </button>
              )}
            </div>
          )}
          
          {isCompleted && activity.completato_il && (
            <div className="pt-3 border-t text-center text-sm text-gray-500">
              Completato il {new Date(activity.completato_il).toLocaleString('it-IT')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
