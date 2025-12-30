import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function CalendarioPage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [presenze, setPresenze] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Ricerca persone
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [tuttePersone, setTuttePersone] = useState([])
  const searchRef = useRef(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Carica lista persone per supervisor+
  useEffect(() => {
    if (isAtLeast('supervisor') && assegnazione?.progetto_id) {
      loadPersone()
    }
  }, [assegnazione?.progetto_id])

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadPersone = async () => {
    const { data } = await supabase
      .from('assegnazioni_progetto')
      .select('*, persona:persone(id, nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('persona(cognome)')
    setTuttePersone(data?.map(a => a.persona).filter(Boolean) || [])
  }

  useEffect(() => {
    const personaId = selectedPersona?.id || persona?.id
    if (personaId) loadPresenze(personaId)
  }, [persona?.id, selectedPersona?.id, year, month])

  const loadPresenze = async (personaId) => {
    setLoading(true)
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', personaId)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data')
    setPresenze(data || [])
    setLoading(false)
  }

  // Ricerca autocomplete
  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query.length < 1) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    const filtered = tuttePersone.filter(p => 
      `${p.nome} ${p.cognome}`.toLowerCase().includes(query.toLowerCase())
    )
    setSearchResults(filtered)
    setShowResults(true)
  }

  const selectPersona = (p) => {
    setSelectedPersona(p)
    setSearchQuery(`${p.nome} ${p.cognome}`)
    setShowResults(false)
  }

  const resetToMe = () => {
    setSelectedPersona(null)
    setSearchQuery('')
  }

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    const startDay = firstDay === 0 ? 6 : firstDay - 1
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const getPresenzaForDay = (day) => {
    if (!day) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return presenze.find(p => p.data === dateStr)
  }

  const getDayStatus = (day) => {
    const p = getPresenzaForDay(day)
    if (!p) return 'empty'
    if (p.stato === 'ferie') return 'ferie'
    if (p.stato === 'malattia') return 'malattia'
    if (p.ora_uscita) return 'complete'
    if (p.ora_entrata) return 'partial'
    return 'empty'
  }

  const getDayColor = (day, isToday, isWeekend) => {
    if (!day) return ''
    const status = getDayStatus(day)
    if (selectedDay === day) return 'bg-blue-600 text-white'
    if (status === 'complete') return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (status === 'partial') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    if (status === 'ferie') return 'bg-purple-100 text-purple-800'
    if (status === 'malattia') return 'bg-red-100 text-red-800'
    if (isToday) return 'bg-blue-50 text-blue-700 ring-2 ring-blue-300'
    if (isWeekend) return 'bg-gray-50 text-gray-400'
    return 'hover:bg-gray-100'
  }

  // Export CSV singola persona
  const exportCSV = () => {
    const personaNome = selectedPersona 
      ? `${selectedPersona.nome}_${selectedPersona.cognome}` 
      : `${persona.nome}_${persona.cognome}`
    const meseNome = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    
    let csv = `Calendario Presenze - ${personaNome}\n`
    csv += `Mese: ${meseNome}\n`
    csv += `Progetto: ${progetto?.nome}\n\n`
    csv += `Data,Giorno,Entrata,Uscita,Ore Ordinarie,Ore Straordinarie,Ore Totali,Stato,Note\n`
    
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(year, month, day)
      const giorno = giorniSettimana[date.getDay()]
      const p = presenze.find(pr => pr.data === dateStr)
      
      if (p) {
        const oreOrd = parseFloat(p.ore_ordinarie) || 0
        const oreStra = parseFloat(p.ore_straordinarie) || 0
        csv += `${dateStr},${giorno},${p.ora_entrata || ''},${p.ora_uscita || ''},${oreOrd},${oreStra},${(oreOrd + oreStra).toFixed(1)},${p.stato || 'presente'},"${p.note || ''}"\n`
      } else {
        csv += `${dateStr},${giorno},,,,,,assente,\n`
      }
    }
    
    csv += `\nRIEPILOGO\n`
    csv += `Giorni lavorati,${stats.giorni}\n`
    csv += `Ore ordinarie,${stats.oreOrdinarie.toFixed(1)}\n`
    csv += `Ore straordinarie,${stats.oreStraordinarie.toFixed(1)}\n`
    csv += `Ore totali,${stats.ore.toFixed(1)}\n`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `calendario_${personaNome.toLowerCase()}_${year}_${month + 1}.csv`
    link.click()
  }

  // Export multiplo (tutte le persone)
  const exportAllCSV = async () => {
    if (!isAtLeast('supervisor')) return
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const meseNome = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    
    // Carica tutte le presenze del mese
    const { data: tuttePresenze } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data')
    
    let csv = `Riepilogo Ore - ${progetto?.nome}\n`
    csv += `Mese: ${meseNome}\n\n`
    csv += `Nome,Cognome,Giorni Lavorati,Ore Ordinarie,Ore Straordinarie,Ore Totali\n`
    
    // Raggruppa per persona
    const orePerPersona = {}
    tuttePresenze?.forEach(p => {
      const key = p.persona_id
      if (!orePerPersona[key]) {
        orePerPersona[key] = {
          nome: p.persona?.nome || '',
          cognome: p.persona?.cognome || '',
          giorni: 0,
          oreOrd: 0,
          oreStra: 0
        }
      }
      if (p.ora_uscita) orePerPersona[key].giorni++
      orePerPersona[key].oreOrd += parseFloat(p.ore_ordinarie) || 0
      orePerPersona[key].oreStra += parseFloat(p.ore_straordinarie) || 0
    })
    
    // Ordina per cognome
    const sorted = Object.values(orePerPersona).sort((a, b) => a.cognome.localeCompare(b.cognome))
    
    let totGiorni = 0, totOrd = 0, totStra = 0
    sorted.forEach(p => {
      const oreTot = p.oreOrd + p.oreStra
      csv += `${p.nome},${p.cognome},${p.giorni},${p.oreOrd.toFixed(1)},${p.oreStra.toFixed(1)},${oreTot.toFixed(1)}\n`
      totGiorni += p.giorni
      totOrd += p.oreOrd
      totStra += p.oreStra
    })
    
    csv += `\nTOTALE,,${totGiorni},${totOrd.toFixed(1)},${totStra.toFixed(1)},${(totOrd + totStra).toFixed(1)}\n`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `riepilogo_ore_${year}_${month + 1}.csv`
    link.click()
  }

  const days = getDaysInMonth()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const stats = {
    giorni: presenze.filter(p => p.ora_uscita).length,
    oreOrdinarie: presenze.reduce((s, p) => s + (parseFloat(p.ore_ordinarie) || 0), 0),
    oreStraordinarie: presenze.reduce((s, p) => s + (parseFloat(p.ore_straordinarie) || 0), 0),
    ore: presenze.reduce((s, p) => s + (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0), 0),
  }

  const selectedPresenza = selectedDay ? getPresenzaForDay(selectedDay) : null
  const viewingOther = selectedPersona && selectedPersona.id !== persona.id

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 Calendario</h1>
          <p className="text-gray-500">
            {viewingOther 
              ? `Presenze di ${selectedPersona.nome} ${selectedPersona.cognome}`
              : 'Le tue presenze mensili'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
          >
            📥 Esporta CSV
          </button>
          {isAtLeast('supervisor') && (
            <button
              onClick={exportAllCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              📊 Riepilogo Team
            </button>
          )}
        </div>
      </div>

      {/* Ricerca Persone (solo supervisor+) */}
      {isAtLeast('supervisor') && (
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative" ref={searchRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">👤 Visualizza calendario di:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowResults(true)}
                placeholder="Cerca persona... (nome o cognome)"
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Dropdown risultati */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPersona(p)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {p.nome?.[0]}{p.cognome?.[0]}
                      </div>
                      <span className="font-medium">{p.nome} {p.cognome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {viewingOther && (
              <button
                onClick={resetToMe}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300"
              >
                ← Torna al mio calendario
              </button>
            )}
          </div>
          
          {viewingOther && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
              <span className="text-blue-600">👁️</span>
              <span className="text-blue-800">
                Stai visualizzando il calendario di <strong>{selectedPersona.nome} {selectedPersona.cognome}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null) }} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <h2 className="text-lg font-semibold">{currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null) }} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
            </div>

            <div className="grid grid-cols-7 border-b">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Caricamento...</div>
            ) : (
              <div className="grid grid-cols-7">
                {days.map((day, i) => {
                  const isToday = isCurrentMonth && day === today.getDate() && !viewingOther
                  const isWeekend = (i % 7 === 5) || (i % 7 === 6)
                  const status = getDayStatus(day)
                  return (
                    <button
                      key={i}
                      onClick={() => day && setSelectedDay(day)}
                      disabled={!day}
                      className={`aspect-square p-1 border-b border-r border-gray-50 ${getDayColor(day, isToday, isWeekend)}`}
                    >
                      {day && (
                        <div className="h-full flex flex-col items-center justify-center">
                          <span className="text-sm font-medium">{day}</span>
                          {status !== 'empty' && <span className="text-xs">{status === 'complete' ? '✓' : status === 'partial' ? '◐' : ''}</span>}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="p-4 border-t flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> Completato</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 rounded"></span> Parziale</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 rounded"></span> Ferie</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> Malattia</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Riepilogo Mese</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Giorni lavorati</span><span className="font-semibold">{stats.giorni}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ore ordinarie</span><span className="font-semibold">{stats.oreOrdinarie.toFixed(1)}h</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ore straordinarie</span><span className="font-semibold">{stats.oreStraordinarie.toFixed(1)}h</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-700 font-medium">Ore totali</span><span className="font-bold text-blue-600">{stats.ore.toFixed(1)}h</span></div>
            </div>
          </div>

          {selectedDay && (
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-3">📋 {selectedDay} {currentDate.toLocaleDateString('it-IT', { month: 'long' })}</h3>
              {selectedPresenza ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Entrata</span><span className="font-medium">{selectedPresenza.ora_entrata}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Uscita</span><span className="font-medium">{selectedPresenza.ora_uscita || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ore ordinarie</span><span className="font-medium">{parseFloat(selectedPresenza.ore_ordinarie || 0).toFixed(1)}h</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ore straordinarie</span><span className="font-medium">{parseFloat(selectedPresenza.ore_straordinarie || 0).toFixed(1)}h</span></div>
                  {selectedPresenza.note && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-500 block mb-1">Note:</span>
                      <span className="text-gray-700">{selectedPresenza.note}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Nessuna presenza</p>
              )}
            </div>
          )}

          {/* Quick stats per supervisor */}
          {isAtLeast('supervisor') && !viewingOther && (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <h3 className="font-semibold mb-2">💡 Suggerimento</h3>
              <p className="text-sm text-blue-100">
                Usa la casella di ricerca sopra per visualizzare il calendario di qualsiasi membro del team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
