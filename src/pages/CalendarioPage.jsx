import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function CalendarioPage() {
  const { persona } = useAuth()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [presenze, setPresenze] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Carica presenze del mese
  useEffect(() => {
    if (persona?.id) {
      loadPresenze()
    }
  }, [persona?.id, year, month])

  const loadPresenze = async () => {
    setLoading(true)
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', persona.id)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data')

    if (!error) {
      setPresenze(data || [])
    }
    setLoading(false)
  }

  // Navigazione mesi
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().getDate())
  }

  // Genera giorni del mese
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Giorni vuoti prima del primo giorno del mese
    const startDay = firstDay === 0 ? 6 : firstDay - 1 // Lunedì = 0
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Giorni del mese
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  // Trova presenza per un giorno
  const getPresenzaForDay = (day) => {
    if (!day) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return presenze.find(p => p.data === dateStr)
  }

  // Stato del giorno
  const getDayStatus = (day) => {
    const presenza = getPresenzaForDay(day)
    if (!presenza) return 'empty'
    if (presenza.stato === 'ferie') return 'ferie'
    if (presenza.stato === 'malattia') return 'malattia'
    if (presenza.stato === 'permesso') return 'permesso'
    if (presenza.ora_uscita) return 'complete'
    if (presenza.ora_entrata) return 'partial'
    return 'empty'
  }

  // Colore del giorno
  const getDayColor = (day, isToday, isWeekend) => {
    if (!day) return ''
    
    const status = getDayStatus(day)
    const selected = selectedDay === day
    
    if (selected) return 'bg-blue-600 text-white'
    if (status === 'complete') return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (status === 'partial') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    if (status === 'ferie') return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
    if (status === 'malattia') return 'bg-red-100 text-red-800 hover:bg-red-200'
    if (status === 'permesso') return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    if (isToday) return 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-2 ring-blue-300'
    if (isWeekend) return 'bg-gray-50 text-gray-400'
    return 'hover:bg-gray-100'
  }

  const days = getDaysInMonth()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  // Calcola statistiche mese
  const stats = {
    giorniLavorati: presenze.filter(p => p.ora_uscita).length,
    oreTotali: presenze.reduce((sum, p) => sum + (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0), 0),
    oreOrdinarie: presenze.reduce((sum, p) => sum + (parseFloat(p.ore_ordinarie) || 0), 0),
    oreStraordinario: presenze.reduce((sum, p) => sum + (parseFloat(p.ore_straordinarie) || 0), 0),
    ferie: presenze.filter(p => p.stato === 'ferie').length,
    malattia: presenze.filter(p => p.stato === 'malattia').length,
  }

  const selectedPresenza = selectedDay ? getPresenzaForDay(selectedDay) : null

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 Calendario</h1>
          <p className="text-gray-500">Le tue presenze mensili</p>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors"
        >
          Oggi
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Caricamento...
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const isToday = isCurrentMonth && day === today.getDate()
                  const isWeekend = (index % 7 === 5) || (index % 7 === 6)
                  const status = getDayStatus(day)
                  
                  return (
                    <button
                      key={index}
                      onClick={() => day && setSelectedDay(day)}
                      disabled={!day}
                      className={`aspect-square p-1 border-b border-r border-gray-50 transition-colors ${getDayColor(day, isToday, isWeekend)}`}
                    >
                      {day && (
                        <div className="h-full flex flex-col items-center justify-center">
                          <span className="text-sm lg:text-base font-medium">{day}</span>
                          {status !== 'empty' && (
                            <span className="text-xs mt-0.5">
                              {status === 'complete' && '✓'}
                              {status === 'partial' && '◐'}
                              {status === 'ferie' && '🏖️'}
                              {status === 'malattia' && '🏥'}
                              {status === 'permesso' && '📋'}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> Completato</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 rounded"></span> Parziale</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 rounded"></span> Ferie</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> Malattia</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded"></span> Permesso</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Riepilogo Mese</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Giorni lavorati</span>
                <span className="font-semibold">{stats.giorniLavorati}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ore totali</span>
                <span className="font-semibold">{stats.oreTotali.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">↳ Ordinarie</span>
                <span className="text-gray-600">{stats.oreOrdinarie.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">↳ Straordinario</span>
                <span className="text-gray-600">{stats.oreStraordinario.toFixed(1)}h</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-500">Ferie</span>
                <span className="font-semibold text-purple-600">{stats.ferie}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Malattia</span>
                <span className="font-semibold text-red-600">{stats.malattia}g</span>
              </div>
            </div>
          </div>

          {/* Selected Day Detail */}
          {selectedDay && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-3">
                📋 {selectedDay} {currentDate.toLocaleDateString('it-IT', { month: 'long' })}
              </h3>
              
              {selectedPresenza ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stato</span>
                    <span className={`font-medium ${
                      selectedPresenza.stato === 'presente' ? 'text-green-600' :
                      selectedPresenza.stato === 'ferie' ? 'text-purple-600' :
                      'text-gray-600'
                    }`}>
                      {selectedPresenza.stato?.charAt(0).toUpperCase() + selectedPresenza.stato?.slice(1)}
                    </span>
                  </div>
                  
                  {selectedPresenza.ora_entrata && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entrata</span>
                      <span className="font-medium">{selectedPresenza.ora_entrata}</span>
                    </div>
                  )}
                  
                  {selectedPresenza.ora_uscita && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uscita</span>
                      <span className="font-medium">{selectedPresenza.ora_uscita}</span>
                    </div>
                  )}
                  
                  {(selectedPresenza.ore_ordinarie || selectedPresenza.ore_straordinarie) && (
                    <>
                      <hr className="border-gray-100" />
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ore ordinarie</span>
                        <span className="font-medium">{selectedPresenza.ore_ordinarie || 0}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Straordinario</span>
                        <span className="font-medium">{selectedPresenza.ore_straordinarie || 0}h</span>
                      </div>
                    </>
                  )}
                  
                  {selectedPresenza.note && (
                    <>
                      <hr className="border-gray-100" />
                      <div>
                        <span className="text-gray-500 text-sm">Note:</span>
                        <p className="text-gray-700 mt-1">{selectedPresenza.note}</p>
                      </div>
                    </>
                  )}
                  
                  {selectedPresenza.meteo_entrata && (
                    <div className="text-xs text-gray-400 mt-2">
                      Meteo: {selectedPresenza.meteo_entrata}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  Nessuna presenza registrata
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
