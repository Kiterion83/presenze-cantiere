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

  useEffect(() => {
    if (persona?.id) loadPresenze()
  }, [persona?.id, year, month])

  const loadPresenze = async () => {
    setLoading(true)
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', persona.id)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data')
    setPresenze(data || [])
    setLoading(false)
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

  const days = getDaysInMonth()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const stats = {
    giorni: presenze.filter(p => p.ora_uscita).length,
    ore: presenze.reduce((s, p) => s + (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0), 0),
  }

  const selectedPresenza = selectedDay ? getPresenzaForDay(selectedDay) : null

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📅 Calendario</h1>
        <p className="text-gray-500">Le tue presenze mensili</p>
      </div>

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
                  const isToday = isCurrentMonth && day === today.getDate()
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
              <div className="flex justify-between"><span className="text-gray-500">Ore totali</span><span className="font-semibold">{stats.ore.toFixed(1)}h</span></div>
            </div>
          </div>

          {selectedDay && (
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-3">📋 {selectedDay} {currentDate.toLocaleDateString('it-IT', { month: 'long' })}</h3>
              {selectedPresenza ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Entrata</span><span className="font-medium">{selectedPresenza.ora_entrata}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Uscita</span><span className="font-medium">{selectedPresenza.ora_uscita || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ore</span><span className="font-medium">{((parseFloat(selectedPresenza.ore_ordinarie) || 0) + (parseFloat(selectedPresenza.ore_straordinarie) || 0)).toFixed(1)}h</span></div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Nessuna presenza</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
