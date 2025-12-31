import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ActivitiesPage() {
  const { progetto, persona, isAtLeast } = useAuth()
  
  // CW corrente
  const oggi = new Date()
  const [annoCorrente, setAnnoCorrente] = useState(getISOWeekYear(oggi))
  const [cwCorrente, setCwCorrente] = useState(getISOWeek(oggi))
  
  // Stati
  const [loading, setLoading] = useState(true)
  const [attivita, setAttivita] = useState([])
  const [riepilogo, setRiepilogo] = useState({})
  const [discipline, setDiscipline] = useState([])
  const [filtroDisc, setFiltroDisc] = useState('tutte')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  
  // Modal dettaglio
  const [selectedAttivita, setSelectedAttivita] = useState(null)
  const [showDettaglio, setShowDettaglio] = useState(false)
  
  // Carica dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)
    
    try {
      // Carica discipline
      const { data: discData } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progetto.id)
        .eq('attivo', true)
        .order('ordine')
      setDiscipline(discData || [])
      
      // Carica attività pianificate per CW
      const { data: attData } = await supabase
        .from('pianificazione_cw')
        .select(`
          *,
          componenti (
            id, codice, descrizione, stato, quantita, unita_misura,
            disciplina_id,
            tipi_componente (nome, icona)
          ),
          fasi_workflow (nome, icona, colore),
          squadre (nome)
        `)
        .eq('progetto_id', progetto.id)
        .eq('anno', annoCorrente)
        .eq('settimana', cwCorrente)
        .order('priorita')
      
      setAttivita(attData || [])
      
      // Calcola riepilogo
      const riepilogoTemp = {}
      ;(attData || []).forEach(att => {
        const discId = att.componenti?.disciplina_id
        if (!discId) return
        if (!riepilogoTemp[discId]) {
          riepilogoTemp[discId] = { totale: 0, completate: 0, inCorso: 0, problemi: 0 }
        }
        riepilogoTemp[discId].totale++
        if (att.stato === 'completato') riepilogoTemp[discId].completate++
        if (att.stato === 'in_corso') riepilogoTemp[discId].inCorso++
        if (att.ha_problema && !att.problema_risolto) riepilogoTemp[discId].problemi++
      })
      setRiepilogo(riepilogoTemp)
      
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }, [progetto?.id, annoCorrente, cwCorrente])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Cerca componente
  const handleSearch = async () => {
    if (!searchQuery.trim() || !progetto?.id) return
    
    const { data } = await supabase
      .from('componenti')
      .select(`
        *,
        tipi_componente (nome, icona),
        discipline (nome, icona, colore),
        fasi_workflow (nome, icona, colore)
      `)
      .eq('progetto_id', progetto.id)
      .ilike('codice', `%${searchQuery}%`)
      .limit(20)
    
    setSearchResults(data || [])
    setShowSearch(true)
  }
  
  // Cambia stato attività
  const handleCambiaStato = async (attivitaId, nuovoStato) => {
    try {
      const updates = { stato: nuovoStato }
      
      if (nuovoStato === 'completato') {
        updates.completato_il = new Date().toISOString()
        updates.completato_da = persona?.id
      }
      
      const { error } = await supabase
        .from('pianificazione_cw')
        .update(updates)
        .eq('id', attivitaId)
      
      if (error) throw error
      
      // Aggiorna anche la fase del componente se completato
      if (nuovoStato === 'completato') {
        const att = attivita.find(a => a.id === attivitaId)
        if (att?.fase_target_id && att?.componente_id) {
          await supabase
            .from('componenti')
            .update({ fase_corrente_id: att.fase_target_id })
            .eq('id', att.componente_id)
          
          // Log storico
          await supabase.from('storico_avanzamento').insert({
            componente_id: att.componente_id,
            fase_a_id: att.fase_target_id,
            persona_id: persona?.id,
            tipo_azione: 'avanzamento',
            pianificazione_cw_id: attivitaId,
            metodo: 'manuale'
          })
        }
      }
      
      loadData()
    } catch (error) {
      console.error('Errore cambio stato:', error)
      alert('Errore durante l\'aggiornamento')
    }
  }
  
  // Segnala problema
  const handleSegnalaProblema = async (attivitaId, descrizione) => {
    try {
      const { error } = await supabase
        .from('pianificazione_cw')
        .update({
          ha_problema: true,
          problema_descrizione: descrizione,
          problema_segnalato_da: persona?.id,
          problema_segnalato_il: new Date().toISOString(),
          stato: 'bloccato'
        })
        .eq('id', attivitaId)
      
      if (error) throw error
      loadData()
      setShowDettaglio(false)
    } catch (error) {
      console.error('Errore segnalazione:', error)
    }
  }
  
  // Naviga CW
  const navigaCW = (direzione) => {
    let nuovaCW = cwCorrente + direzione
    let nuovoAnno = annoCorrente
    
    if (nuovaCW < 1) {
      nuovoAnno--
      nuovaCW = 52
    } else if (nuovaCW > 52) {
      nuovoAnno++
      nuovaCW = 1
    }
    
    setCwCorrente(nuovaCW)
    setAnnoCorrente(nuovoAnno)
  }
  
  // Filtra attività
  const attivitaFiltrate = attivita.filter(att => {
    if (filtroDisc !== 'tutte' && att.componenti?.disciplina_id !== filtroDisc) return false
    if (filtroStato !== 'tutti' && att.stato !== filtroStato) return false
    return true
  })
  
  // Raggruppa per disciplina
  const attivitaPerDisciplina = {}
  attivitaFiltrate.forEach(att => {
    const discId = att.componenti?.disciplina_id || 'altro'
    if (!attivitaPerDisciplina[discId]) attivitaPerDisciplina[discId] = []
    attivitaPerDisciplina[discId].push(att)
  })
  
  // Calcola totali
  const totaleAttivita = attivita.length
  const completate = attivita.filter(a => a.stato === 'completato').length
  const percentuale = totaleAttivita > 0 ? Math.round((completate / totaleAttivita) * 100) : 0
  
  // Date CW
  const { dataInizio, dataFine } = getCWDates(annoCorrente, cwCorrente)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento attività...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2">
          📋 Activities
        </h1>
        <p className="text-gray-500 mt-1">
          Attività pianificate per la settimana
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca componente per codice..."
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Cerca
          </button>
        </div>
        
        {/* Risultati Ricerca */}
        {showSearch && searchResults && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-700">
                Risultati ricerca: {searchResults.length} componenti
              </h3>
              <button
                onClick={() => { setShowSearch(false); setSearchResults(null); setSearchQuery('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕ Chiudi
              </button>
            </div>
            
            {searchResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessun componente trovato</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map(comp => (
                  <div
                    key={comp.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer"
                    onClick={() => { setSelectedAttivita({ componenti: comp, tipo: 'ricerca' }); setShowDettaglio(true) }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{comp.discipline?.icona || '📦'}</span>
                      <div className="flex-1">
                        <p className="font-medium">{comp.codice}</p>
                        <p className="text-sm text-gray-500">
                          {comp.tipi_componente?.nome} • {comp.discipline?.nome}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatoBadgeClass(comp.stato)}`}>
                          {getStatoIcon(comp.stato)} {formatStato(comp.stato)}
                        </span>
                        {comp.cw_lavoro_settimana && (
                          <p className="text-xs text-gray-500 mt-1">
                            Pianificato: CW{comp.cw_lavoro_settimana}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CW Navigator */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            onClick={() => navigaCW(-1)}
            className="px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
          >
            ◀ CW{cwCorrente - 1 < 1 ? 52 : cwCorrente - 1}
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold">CW{cwCorrente.toString().padStart(2, '0')} • {annoCorrente}</h2>
            <p className="text-blue-100 text-sm">
              {formatDate(dataInizio)} - {formatDate(dataFine)}
            </p>
          </div>
          
          <button
            onClick={() => navigaCW(1)}
            className="px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
          >
            CW{cwCorrente + 1 > 52 ? 1 : cwCorrente + 1} ▶
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progresso: {completate}/{totaleAttivita}</span>
            <span>{percentuale}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${percentuale}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={filtroDisc}
          onChange={(e) => setFiltroDisc(e.target.value)}
          className="px-4 py-2 bg-white border rounded-xl"
        >
          <option value="tutte">📂 Tutte le discipline</option>
          {discipline.map(d => (
            <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
          ))}
        </select>
        
        <select
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value)}
          className="px-4 py-2 bg-white border rounded-xl"
        >
          <option value="tutti">📊 Tutti gli stati</option>
          <option value="pianificato">⬜ Da fare</option>
          <option value="in_corso">🔄 In corso</option>
          <option value="completato">✅ Completati</option>
          <option value="bloccato">🔒 Bloccati</option>
        </select>
        
        <button
          onClick={() => { setCwCorrente(getISOWeek(oggi)); setAnnoCorrente(getISOWeekYear(oggi)) }}
          className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200"
        >
          📅 Oggi
        </button>
      </div>

      {/* Lista Attività per Disciplina */}
      {Object.keys(attivitaPerDisciplina).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Nessuna attività pianificata
          </h3>
          <p className="text-gray-500">
            Non ci sono attività pianificate per CW{cwCorrente}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(attivitaPerDisciplina).map(([discId, attivitaDisc]) => {
            const disc = discipline.find(d => d.id === discId) || { nome: 'Altro', icona: '📦', colore: '#6B7280' }
            const stats = riepilogo[discId] || { totale: 0, completate: 0, inCorso: 0, problemi: 0 }
            
            return (
              <div key={discId} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {/* Header Disciplina */}
                <div 
                  className="p-4 border-b flex items-center justify-between"
                  style={{ backgroundColor: disc.colore + '15' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{disc.icona}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{disc.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {stats.completate}/{stats.totale} completate
                        {stats.problemi > 0 && <span className="text-red-500 ml-2">• {stats.problemi} problemi</span>}
                      </p>
                    </div>
                  </div>
                  
                  {/* Mini Progress */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${stats.totale > 0 ? (stats.completate / stats.totale) * 100 : 0}%`,
                          backgroundColor: disc.colore
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {stats.totale > 0 ? Math.round((stats.completate / stats.totale) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                {/* Lista Attività */}
                <div className="divide-y">
                  {attivitaDisc.sort((a, b) => a.priorita - b.priorita).map((att, idx) => (
                    <div
                      key={att.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${att.stato === 'completato' ? 'bg-green-50/50' : ''} ${att.stato === 'bloccato' ? 'bg-red-50/50' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Priorità */}
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                          {att.priorita}
                        </div>
                        
                        {/* Checkbox Stato */}
                        <button
                          onClick={() => {
                            if (att.stato === 'pianificato') handleCambiaStato(att.id, 'in_corso')
                            else if (att.stato === 'in_corso') handleCambiaStato(att.id, 'completato')
                          }}
                          disabled={att.stato === 'completato' || att.stato === 'bloccato'}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                            att.stato === 'completato' 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : att.stato === 'in_corso'
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : att.stato === 'bloccato'
                                  ? 'bg-red-100 border-red-300 text-red-500'
                                  : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {att.stato === 'completato' && '✓'}
                          {att.stato === 'in_corso' && '⟳'}
                          {att.stato === 'bloccato' && '🔒'}
                        </button>
                        
                        {/* Info Componente */}
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => { setSelectedAttivita(att); setShowDettaglio(true) }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{att.componenti?.codice}</span>
                            <span className="text-sm text-gray-500">{att.componenti?.tipi_componente?.nome}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {att.fasi_workflow && (
                              <span 
                                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: att.fasi_workflow.colore }}
                              >
                                {att.fasi_workflow.icona} {att.azione || att.fasi_workflow.nome}
                              </span>
                            )}
                            {att.squadre && (
                              <span className="text-xs text-gray-500">👷 {att.squadre.nome}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Istruzioni (troncate) */}
                        {att.istruzioni && (
                          <div className="hidden lg:block max-w-xs">
                            <p className="text-sm text-gray-600 truncate" title={att.istruzioni}>
                              💡 {att.istruzioni}
                            </p>
                          </div>
                        )}
                        
                        {/* Problema */}
                        {att.ha_problema && !att.problema_risolto && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs">
                            ⚠️ Problema
                          </span>
                        )}
                        
                        {/* Azioni */}
                        <button
                          onClick={() => { setSelectedAttivita(att); setShowDettaglio(true) }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          ℹ️
                        </button>
                      </div>
                      
                      {/* Istruzioni su mobile */}
                      {att.istruzioni && (
                        <div className="lg:hidden mt-2 ml-20">
                          <p className="text-sm text-gray-600">
                            💡 {att.istruzioni}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>⬜ Da fare</span>
          <span>🔄 In corso</span>
          <span>✅ Completato</span>
          <span>🔒 Bloccato</span>
          <span>⚠️ Con problema</span>
        </div>
      </div>

      {/* Modal Dettaglio */}
      {showDettaglio && selectedAttivita && (
        <DettaglioModal
          attivita={selectedAttivita}
          onClose={() => { setShowDettaglio(false); setSelectedAttivita(null) }}
          onCambiaStato={handleCambiaStato}
          onSegnalaProblema={handleSegnalaProblema}
          persona={persona}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DETTAGLIO COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════
function DettaglioModal({ attivita, onClose, onCambiaStato, onSegnalaProblema, persona }) {
  const [showProblemaForm, setShowProblemaForm] = useState(false)
  const [problemaDescrizione, setProblemaDescrizione] = useState('')
  const [storico, setStorico] = useState([])
  const [loadingStorico, setLoadingStorico] = useState(true)
  const [pianificazioni, setPianificazioni] = useState([])
  
  const comp = attivita?.componenti || attivita
  const isRicerca = attivita?.tipo === 'ricerca'
  
  useEffect(() => {
    const loadStorico = async () => {
      if (!comp?.id) return
      
      // Carica storico
      const { data: storicoData } = await supabase
        .from('storico_avanzamento')
        .select(`
          *,
          persone (nome, cognome),
          fase_da:fasi_workflow!storico_avanzamento_fase_da_id_fkey (nome, icona),
          fase_a:fasi_workflow!storico_avanzamento_fase_a_id_fkey (nome, icona)
        `)
        .eq('componente_id', comp.id)
        .order('data_cambio', { ascending: false })
        .limit(10)
      
      setStorico(storicoData || [])
      
      // Carica tutte le pianificazioni per questo componente
      const { data: pianData } = await supabase
        .from('pianificazione_cw')
        .select(`
          *,
          fasi_workflow (nome, icona, colore)
        `)
        .eq('componente_id', comp.id)
        .order('anno')
        .order('settimana')
      
      setPianificazioni(pianData || [])
      setLoadingStorico(false)
    }
    
    loadStorico()
  }, [comp?.id])
  
  const handleSegnala = () => {
    if (!problemaDescrizione.trim()) return
    onSegnalaProblema(attivita.id, problemaDescrizione)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{comp?.codice}</h2>
            <p className="text-gray-500">{comp?.tipi_componente?.nome || comp?.tipo_nome}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
          {/* Stato Attuale */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              📍 Stato Attuale
            </h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg font-medium ${getStatoBadgeClass(comp?.stato)}`}>
                {getStatoIcon(comp?.stato)} {formatStato(comp?.stato)}
              </span>
              {comp?.fase_corrente_id && comp?.fasi_workflow && (
                <span className="text-gray-600">
                  Fase: {comp.fasi_workflow.icona} {comp.fasi_workflow.nome}
                </span>
              )}
            </div>
            
            {/* Date rilevanti */}
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              {comp?.data_arrivo_warehouse && (
                <div>
                  <span className="text-gray-500">📦 In Warehouse:</span>
                  <span className="ml-2">{formatDateTime(comp.data_arrivo_warehouse)}</span>
                </div>
              )}
              {comp?.data_arrivo_site && (
                <div>
                  <span className="text-gray-500">🏗️ Al Site:</span>
                  <span className="ml-2">{formatDateTime(comp.data_arrivo_site)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Pianificazione */}
          {pianificazioni.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                📅 Pianificazione
              </h3>
              <div className="space-y-2">
                {pianificazioni.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">CW{p.settimana}/{p.anno}</span>
                      {p.fasi_workflow && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs text-white"
                          style={{ backgroundColor: p.fasi_workflow.colore }}
                        >
                          {p.fasi_workflow.icona} {p.azione || p.fasi_workflow.nome}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      p.stato === 'completato' ? 'bg-green-100 text-green-700' :
                      p.stato === 'in_corso' ? 'bg-blue-100 text-blue-700' :
                      p.stato === 'bloccato' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.stato}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Istruzioni */}
          {attivita?.istruzioni && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                💡 Istruzioni Ingegneria
              </h3>
              <p className="text-gray-700">{attivita.istruzioni}</p>
            </div>
          )}
          
          {/* Problema (se esiste) */}
          {attivita?.ha_problema && !attivita?.problema_risolto && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                ⚠️ Problema Segnalato
              </h3>
              <p className="text-gray-700">{attivita.problema_descrizione}</p>
              <p className="text-xs text-gray-500 mt-2">
                Segnalato il {formatDateTime(attivita.problema_segnalato_il)}
              </p>
            </div>
          )}
          
          {/* Storico */}
          <div className="p-4 rounded-xl bg-gray-50 border">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📜 Storico
            </h3>
            {loadingStorico ? (
              <p className="text-gray-500 text-center py-4">Caricamento...</p>
            ) : storico.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessuno storico disponibile</p>
            ) : (
              <div className="space-y-2">
                {storico.map(s => (
                  <div key={s.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                    <span className="text-gray-400">{formatDateTime(s.data_cambio)}</span>
                    <span className="flex-1">
                      {s.fase_a?.icona} {s.fase_a?.nome || s.tipo_azione}
                    </span>
                    <span className="text-gray-500">
                      {s.persone ? `${s.persone.nome} ${s.persone.cognome}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Form Segnala Problema */}
          {!isRicerca && attivita?.stato !== 'completato' && !attivita?.ha_problema && (
            <div>
              {showProblemaForm ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <h3 className="font-semibold text-red-800 mb-3">⚠️ Segnala Problema</h3>
                  <textarea
                    value={problemaDescrizione}
                    onChange={(e) => setProblemaDescrizione(e.target.value)}
                    placeholder="Descrivi il problema..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSegnala}
                      disabled={!problemaDescrizione.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Invia Segnalazione
                    </button>
                    <button
                      onClick={() => setShowProblemaForm(false)}
                      className="px-4 py-2 bg-gray-200 rounded-lg"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProblemaForm(true)}
                  className="w-full py-3 border-2 border-dashed border-red-300 text-red-600 rounded-xl hover:bg-red-50"
                >
                  ⚠️ Segnala Problema
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Azioni */}
        {!isRicerca && attivita?.stato !== 'completato' && attivita?.stato !== 'bloccato' && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              {attivita?.stato === 'pianificato' && (
                <button
                  onClick={() => { onCambiaStato(attivita.id, 'in_corso'); onClose() }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                >
                  🔄 Inizia Lavorazione
                </button>
              )}
              {attivita?.stato === 'in_corso' && (
                <button
                  onClick={() => { onCambiaStato(attivita.id, 'completato'); onClose() }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
                >
                  ✅ Segna Completato
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

function getCWDates(anno, settimana) {
  const simple = new Date(anno, 0, 1 + (settimana - 1) * 7)
  const dow = simple.getDay()
  const dataInizio = new Date(simple)
  if (dow <= 4) dataInizio.setDate(simple.getDate() - simple.getDay() + 1)
  else dataInizio.setDate(simple.getDate() + 8 - simple.getDay())
  const dataFine = new Date(dataInizio)
  dataFine.setDate(dataInizio.getDate() + 6)
  return { dataInizio, dataFine }
}

function formatDate(date) {
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('it-IT', { 
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
  })
}

function formatStato(stato) {
  const stati = {
    da_ordinare: 'Da ordinare',
    ordinato: 'Ordinato',
    in_transito: 'In transito',
    in_warehouse: 'In Warehouse',
    at_site: 'Al Site',
    in_lavorazione: 'In lavorazione',
    completato: 'Completato',
    bloccato: 'Bloccato',
    pianificato: 'Pianificato',
    in_corso: 'In corso',
    rimandato: 'Rimandato'
  }
  return stati[stato] || stato
}

function getStatoIcon(stato) {
  const icone = {
    da_ordinare: '📝',
    ordinato: '📋',
    in_transito: '🚛',
    in_warehouse: '📦',
    at_site: '🏗️',
    in_lavorazione: '🔄',
    completato: '✅',
    bloccato: '⛔',
    pianificato: '⬜',
    in_corso: '🔄',
    rimandato: '⏸️'
  }
  return icone[stato] || '❓'
}

function getStatoBadgeClass(stato) {
  const classes = {
    da_ordinare: 'bg-gray-100 text-gray-700',
    ordinato: 'bg-blue-100 text-blue-700',
    in_transito: 'bg-purple-100 text-purple-700',
    in_warehouse: 'bg-amber-100 text-amber-700',
    at_site: 'bg-cyan-100 text-cyan-700',
    in_lavorazione: 'bg-blue-100 text-blue-700',
    completato: 'bg-green-100 text-green-700',
    bloccato: 'bg-red-100 text-red-700',
    pianificato: 'bg-gray-100 text-gray-700',
    in_corso: 'bg-blue-100 text-blue-700',
    rimandato: 'bg-orange-100 text-orange-700'
  }
  return classes[stato] || 'bg-gray-100 text-gray-700'
}
